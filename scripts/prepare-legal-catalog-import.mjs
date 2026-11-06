#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import { once } from 'node:events';
import { finished } from 'node:stream/promises';
import { basename, resolve } from 'node:path';

const HASH=/^[a-f0-9]{64}$/;
const fail=(condition,message)=>{if(!condition)throw new Error(message);};
const nullable=value=>value===undefined||value===''?null:value;

export function compactNormRecord(row){
  fail(['infoleg_national','saij_provincial'].includes(row.source_code),'Código de fuente de norma inválido');
  fail(typeof row.source_record_key==='string'&&row.source_record_key.length>0,'Falta source_record_key');
  fail(HASH.test(row.source_file_sha256||''),'SHA-256 de archivo inválido');
  fail(Number.isInteger(row.source_row_number)&&row.source_row_number>=2,'Número de fila inválido');
  fail(HASH.test(row.source_row_hash||''),'SHA-256 de fila inválido');
  fail(row.source_record_key.includes(row.source_file_sha256)&&row.source_record_key.endsWith(':'+row.source_row_number),'Clave de fila no corresponde a archivo/fila');
  fail(typeof row.title==='string'&&row.title.trim().length>0,'Norma sin título');
  fail(typeof row.jurisdiction_normalized==='string'&&row.jurisdiction_normalized.length>0,'Norma sin jurisdicción');
  return {
    source_code:row.source_code==='infoleg_national'?1:2, // 1=Infoleg nacional; 2=SAIJ provincial. El lote aporta SHA, captura y recurso.
    source_id:nullable(row.source_id),
    jurisdiction_type:row.jurisdiction_type,
    jurisdiction_normalized:row.jurisdiction_normalized,
    source_province_id:nullable(row.source_province_id),
    resource_type:row.resource_type,
    title:row.title,
    authority:nullable(row.authority),
    citation:nullable(row.citation),
    source_url:nullable(row.source_url),
    original_source_url:nullable(row.original_source_url),
    updated_source_url:nullable(row.updated_source_url),
    publication_date:nullable(row.publication_date),
    enactment_date:nullable(row.enactment_date),
    bulletin_number:nullable(row.bulletin_number),
    bulletin_page:nullable(row.bulletin_page),
    source_status:nullable(row.source_status),
    source_status_as_of:nullable(row.source_status_as_of),
    modified_by_count:nullable(row.modified_by_count),
    modifies_count:nullable(row.modifies_count),
    deduplication_key:nullable(row.deduplication_key),
    duplicate_candidate:Boolean(row.duplicate_candidate),
    duplicate_exact:Boolean(row.duplicate_exact),
    duplicate_conflict:Boolean(row.duplicate_conflict),
    source_row_number:row.source_row_number,
    source_row_hash:row.source_row_hash // Hex SHA-256; el cargador lo convierte a bytea (32 bytes).
  };
}

export function compactRelationObservation(row){
  fail(row.source_code==='infoleg_national','Código de fuente de relación inválido');
  fail(['modificatorias','modificadas'].includes(row.source_resource),'Recurso de relación inválido');
  fail(typeof row.source_record_key==='string'&&row.source_record_key.length>0,'Falta clave de observación');
  fail(HASH.test(row.source_file_sha256||''),'SHA-256 de archivo de relación inválido');
  fail(Number.isInteger(row.source_row_number)&&row.source_row_number>=2,'Número de fila de relación inválido');
  fail(HASH.test(row.source_row_hash||''),'SHA-256 de observación inválido');
  fail(row.source_record_key.includes(row.source_file_sha256)&&row.source_record_key.endsWith(':'+row.source_row_number),'Clave de observación no corresponde a archivo/fila');
  fail(Boolean(row.modifying_norm_id)&&Boolean(row.modified_norm_id),'Relación sin ambos IDs');
  return {
    source_code:row.source_code,
    source_resource:row.source_resource,
    source_record_key:row.source_record_key,
    source_file_sha256:row.source_file_sha256,
    source_row_number:row.source_row_number,
    source_row_hash:row.source_row_hash,
    modifying_source_record_id:String(row.modifying_norm_id),
    modified_source_record_id:String(row.modified_norm_id),
    relation_type:row.relation_type||'modifies',
    duplicate_candidate:Boolean(row.duplicate_candidate),
    verification_status:row.verification_status||'pending'
  };
}

export function compactCanonicalRelation(row){
  fail(Boolean(row.modifying_norm_id)&&Boolean(row.modified_norm_id),'Relación canónica sin ambos IDs');
  fail(Number.isInteger(row.observation_count)&&row.observation_count>0,'Cantidad de observaciones inválida');
  return {
    modifying_source_record_id:String(row.modifying_norm_id),
    modified_source_record_id:String(row.modified_norm_id),
    observation_count:row.observation_count
  };
}

async function writeCompactJsonl(inputPaths,outputPath,mapper){
  const output=createWriteStream(outputPath);
  const completion=finished(output);
  const digest=createHash('sha256');
  let rows=0,bytes=0;
  try{
    for(const inputPath of inputPaths){
      const lines=createInterface({input:createReadStream(inputPath),crlfDelay:Infinity});
      for await(const line of lines){
        if(!line.trim())continue;
        const source=JSON.parse(line);
        const compact=mapper(source);
        const buffer=Buffer.from(JSON.stringify(compact)+'\n','utf8');
        digest.update(buffer);
        bytes+=buffer.length;
        if(!output.write(buffer))await once(output,'drain');
        rows++;
      }
    }
    output.end();
    await completion;
    return {path:basename(outputPath),rows,bytes,sha256:digest.digest('hex')};
  }catch(error){
    output.destroy(error);
    await completion.catch(()=>{});
    throw error;
  }
}

async function main(){
  const args=process.argv.slice(2);
  const get=flag=>{const i=args.indexOf(flag);return i>=0?args[i+1]:null;};
  const required=['--saij','--infoleg','--relations','--canonical','--saij-report','--national-report','--relations-report','--out'];
  for(const flag of required)fail(get(flag),`Falta argumento ${flag}`);
  const output=resolve(get('--out'));
  await mkdir(output,{recursive:true});
  const [saijReport,nationalReport,relationsReport]=await Promise.all([
    readFile(resolve(get('--saij-report')),'utf8').then(JSON.parse),
    readFile(resolve(get('--national-report')),'utf8').then(JSON.parse),
    readFile(resolve(get('--relations-report')),'utf8').then(JSON.parse)
  ]);
  const files={};
  files.legal_norms=await writeCompactJsonl(
    [resolve(get('--saij')),resolve(get('--infoleg'))],
    resolve(output,'legal-norms.jsonl'),
    compactNormRecord
  );
  const includeObservations=args.includes('--include-observations');
  if(includeObservations){
    files.legal_norm_relationship_observations=await writeCompactJsonl(
      [resolve(get('--relations'))],
      resolve(output,'legal-norm-relationship-observations.jsonl'),
      compactRelationObservation
    );
  }
  files.legal_norm_relationships=await writeCompactJsonl(
    [resolve(get('--canonical'))],
    resolve(output,'legal-norm-relationships.jsonl'),
    compactCanonicalRelation
  );
  const manifest={
    schema_version:3,
    source_code_codes:{'1':'infoleg_national','2':'saij_provincial'},
    generated_at:new Date().toISOString(),
    sources:[
      {source_code:'saij_provincial',source_resource:'normativa_provincial',source_name:saijReport.source,dataset_url:saijReport.dataset_url,license:saijReport.license,source_file_sha256:saijReport.sha256,source_updated_through:saijReport.source_updated_through,input_rows:saijReport.input_rows,accepted_rows:saijReport.valid_records,rejected_rows:saijReport.rows_with_errors},
      {source_code:'infoleg_national',source_resource:'normativa_nacional',source_name:nationalReport.source,dataset_url:nationalReport.dataset_url,license:nationalReport.license,source_file_sha256:nationalReport.sha256_zip,source_updated_through:nationalReport.source_updated_through,input_rows:nationalReport.input_rows,accepted_rows:nationalReport.valid_records,rejected_rows:nationalReport.rows_with_errors},
      {source_code:'infoleg_national',source_resource:'modificatorias',dataset_url:relationsReport.dataset_url,license:relationsReport.license,source_file_sha256:relationsReport.sha256_modificatorias_zip,input_rows:relationsReport.modificatorias.input_rows,accepted_rows:relationsReport.modificatorias.valid_records,rejected_rows:relationsReport.modificatorias.rows_with_errors},
      {source_code:'infoleg_national',source_resource:'modificadas',dataset_url:relationsReport.dataset_url,license:relationsReport.license,source_file_sha256:relationsReport.sha256_modificadas_zip,input_rows:relationsReport.modificadas.input_rows,accepted_rows:relationsReport.modificadas.valid_records,rejected_rows:relationsReport.modificadas.rows_with_errors}
    ],
    counts:{
      legal_norms:files.legal_norms.rows,
      legal_norm_relationship_observations:relationsReport.modificatorias.input_rows+relationsReport.modificadas.input_rows,
      legal_norm_relationships:files.legal_norm_relationships.rows
    },
    observations_exported:includeObservations,
    files
  };
  await writeFile(resolve(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  console.log(JSON.stringify({output,manifest},null,2));
}

if(process.argv[1]&&import.meta.url===new URL(`file://${resolve(process.argv[1])}`).href){
  main().catch(error=>{console.error(error.message);process.exitCode=1;});
}
