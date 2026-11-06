#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root=process.cwd();
const output=resolve(root,'output/compact');
const readJson=async path=>JSON.parse(await readFile(resolve(root,path),'utf8'));
const literal=value=>value==null?'NULL':"'" + String(value).replace(/'/g,"''") + "'";
const runDocker=(args,options={})=>execFileSync('docker',args,{encoding:'utf8',maxBuffer:32*1024*1024,...options});
const container=runDocker(['ps','--filter','ancestor=postgres:17','--format','{{.ID}}']).trim().split('\n')[0];
if(!container)throw new Error('No se encontró el contenedor PostgreSQL 17 del servicio de GitHub Actions.');
const psql=sql=>runDocker(['exec','-i',container,'psql','-X','-v','ON_ERROR_STOP=1','-U','postgres','-d','postgres'],{input:sql});
const query=sql=>runDocker(['exec',container,'psql','-X','-A','-t','-U','postgres','-d','postgres','-c',sql]).trim();

const [saij,national,relations]=await Promise.all([
  readJson('output/saij/report.json'),
  readJson('output/infoleg-national/report.json'),
  readJson('output/infoleg-complementary/report.json')
]);

runDocker(['cp',resolve(output,'legal-norms.jsonl'),container+':/tmp/legal-norms.jsonl']);
runDocker(['cp',resolve(output,'legal-norm-relationships.jsonl'),container+':/tmp/legal-norm-relationships.jsonl']);

psql('create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;\n');
psql(await readFile(resolve(root,'docs/sql-proposals/create_legal_catalog.sql'),'utf8'));

const batches=[
  {source_code:2,source_resource:'normativa_provincial',source_name:saij.source,dataset_url:saij.dataset_url,license:saij.license,sha256:saij.sha256,updated:saij.source_updated_through,input:saij.input_rows,accepted:saij.valid_records,rejected:saij.rows_with_errors,duplicates:saij.duplicate_candidates},
  {source_code:1,source_resource:'normativa_nacional',source_name:national.source,dataset_url:national.dataset_url,license:national.license,sha256:national.sha256_zip,updated:national.source_updated_through,input:national.input_rows,accepted:national.valid_records,rejected:national.rows_with_errors,duplicates:national.duplicate_id_groups},
  {source_code:1,source_resource:'modificatorias',source_name:'Infoleg — Normas modificatorias',dataset_url:relations.dataset_url,license:relations.license,sha256:relations.sha256_modificatorias_zip,updated:null,input:relations.modificatorias.input_rows,accepted:relations.modificatorias.valid_records,rejected:relations.modificatorias.rows_with_errors,duplicates:relations.modificatorias.duplicate_rows},
  {source_code:1,source_resource:'modificadas',source_name:'Infoleg — Normas modificadas',dataset_url:relations.dataset_url,license:relations.license,sha256:relations.sha256_modificadas_zip,updated:null,input:relations.modificadas.input_rows,accepted:relations.modificadas.valid_records,rejected:relations.modificadas.rows_with_errors,duplicates:relations.modificadas.duplicate_rows}
];
const values=batches.map(b=>'('+
  [b.source_code,b.source_resource,b.source_name,b.dataset_url,b.license,b.sha256,b.updated,'catalog-import-v3',b.input,b.accepted,b.rejected,b.duplicates,'validated'].map(literal).join(',')+
')').join(',\n');
psql(
  'insert into private.legal_import_batches (source_code,source_resource,source_name,dataset_url,license,source_file_sha256,source_updated_through,importer_version,input_rows,accepted_rows,rejected_rows,duplicate_groups,status) values\n'+values+';\n'
);

const loadSql=[
"create temporary table stage_norms(payload jsonb not null);",
"\\copy stage_norms(payload) from '/tmp/legal-norms.jsonl' with (format csv, delimiter E'\\x01', quote E'\\x02', escape E'\\x02');",
"insert into public.legal_norms (source_code,source_id,jurisdiction_type,jurisdiction_normalized,source_province_id,resource_type,title,authority,citation,source_url,original_source_url,updated_source_url,publication_date,enactment_date,bulletin_number,bulletin_page,source_status,source_status_as_of,modified_by_count,modifies_count,deduplication_key,duplicate_candidate,duplicate_exact,duplicate_conflict,source_row_number,source_row_hash,batch_id)",
"select (p.payload->>'source_code')::smallint,p.payload->>'source_id',p.payload->>'jurisdiction_type',p.payload->>'jurisdiction_normalized',p.payload->>'source_province_id',p.payload->>'resource_type',p.payload->>'title',p.payload->>'authority',p.payload->>'citation',p.payload->>'source_url',p.payload->>'original_source_url',p.payload->>'updated_source_url',nullif(p.payload->>'publication_date','')::date,nullif(p.payload->>'enactment_date','')::date,p.payload->>'bulletin_number',p.payload->>'bulletin_page',p.payload->>'source_status',nullif(p.payload->>'source_status_as_of','')::date,p.payload->>'modified_by_count',p.payload->>'modifies_count',p.payload->>'deduplication_key',coalesce((p.payload->>'duplicate_candidate')::boolean,false),coalesce((p.payload->>'duplicate_exact')::boolean,false),coalesce((p.payload->>'duplicate_conflict')::boolean,false),(p.payload->>'source_row_number')::integer,decode(p.payload->>'source_row_hash','hex'),b.id",
"from stage_norms p join private.legal_import_batches b on b.source_code=(p.payload->>'source_code')::smallint and b.source_resource=case (p.payload->>'source_code')::smallint when 1 then 'normativa_nacional' when 2 then 'normativa_provincial' end;",
"create temporary table stage_relationships(payload jsonb not null);",
"\\copy stage_relationships(payload) from '/tmp/legal-norm-relationships.jsonl' with (format csv, delimiter E'\\x01', quote E'\\x02', escape E'\\x02');",
"insert into public.legal_norm_relationships (modifying_source_record_id,modified_source_record_id,observation_count,modificatorias_batch_id,modificadas_batch_id)",
"select p.payload->>'modifying_source_record_id',p.payload->>'modified_source_record_id',(p.payload->>'observation_count')::integer,(select id from private.legal_import_batches where source_code=1 and source_resource='modificatorias'),(select id from private.legal_import_batches where source_code=1 and source_resource='modificadas') from stage_relationships p;"
].join('\n');
psql(loadSql);
psql(await readFile(resolve(root,'docs/sql-proposals/index_legal_catalog_after_import.sql'),'utf8'));
psql('analyze public.legal_norms; analyze public.legal_norm_relationships; analyze private.legal_import_batches;\n');

const result=JSON.parse(query(
  "select json_build_object("+
  "'database_bytes',pg_database_size(current_database()),"+
  "'norms_rows',(select count(*) from public.legal_norms),"+
  "'norms_heap_bytes',pg_relation_size('public.legal_norms'),"+
  "'norms_indexes_bytes',pg_indexes_size('public.legal_norms'),"+
  "'norms_total_bytes',pg_total_relation_size('public.legal_norms'),"+
  "'relationships_rows',(select count(*) from public.legal_norm_relationships),"+
  "'relationships_heap_bytes',pg_relation_size('public.legal_norm_relationships'),"+
  "'relationships_indexes_bytes',pg_indexes_size('public.legal_norm_relationships'),"+
  "'relationships_total_bytes',pg_total_relation_size('public.legal_norm_relationships'),"+
  "'batches_total_bytes',pg_total_relation_size('private.legal_import_batches')"+
  ")"
));
if(result.norms_rows!==510732)throw new Error('La cantidad de normas insertadas no coincide: '+result.norms_rows);
if(result.relationships_rows!==377106)throw new Error('La cantidad de relaciones insertadas no coincide: '+result.relationships_rows);
result.postgres_version=query('show server_version');
result.environment='PostgreSQL 17 efímero en GitHub Actions; no modifica Supabase remoto';
result.total_catalog_bytes=result.norms_total_bytes+result.relationships_total_bytes+result.batches_total_bytes;
result.total_catalog_mib=Number((result.total_catalog_bytes/1024/1024).toFixed(2));
result.existing_supabase_database_bytes=13522611;
result.estimated_supabase_total_bytes=result.total_catalog_bytes+result.existing_supabase_database_bytes;
result.estimated_supabase_total_mib=Number((result.estimated_supabase_total_bytes/1024/1024).toFixed(2));
result.budget_reference_bytes=350*1024*1024;
result.within_preventive_350_mib_budget=result.estimated_supabase_total_bytes<result.budget_reference_bytes;
await mkdir(output,{recursive:true});
await writeFile(resolve(output,'postgres-size-report.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
