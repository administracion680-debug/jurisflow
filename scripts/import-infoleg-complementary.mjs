#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import { unzipSync, strFromU8 } from 'fflate';
import { parseCsv } from './import-saij-provincial.mjs';

const DATASET_URL='https://datos.jus.gob.ar/es_AR/dataset/base-de-datos-legislativos-infoleg';
const LICENSE='CC BY 4.0';
const SCHEMAS={
  modificatorias:{
    file:'base-complementaria-infoleg-normas-modificatorias.csv',
    required:['id_norma_modificatoria','id_norma_modificada','tipo_norma','nro_norma','clase_norma','organismo_origen','fecha_boletin','titulo_sumario','titulo_resumido']
  },
  modificadas:{
    file:'base-complementaria-infoleg-normas-modificadas.csv',
    required:['id_norma_modificada','id_norma_modificatoria','tipo_norma','nro_norma','clase_norma','organismo_origen','fecha_boletin','titulo_sumario','titulo_resumido']
  }
};

export function findComplementaryCsv(zipBytes,kind){
  const schema=SCHEMAS[kind];
  if(!schema)throw new Error(`Tipo de base complementaria desconocido: ${kind}`);
  const entries=unzipSync(zipBytes);
  for(const [name,bytes] of Object.entries(entries).filter(([n])=>n.toLowerCase().endsWith('.csv'))){
    const csv=strFromU8(bytes),rows=parseCsv(csv);
    if(!rows.length)continue;
    const headers=rows[0].map(v=>String(v??'').replace(/^\\uFEFF/,'').trim());
    if(schema.required.every(field=>headers.includes(field)))return {name,csv,rows,headers};
  }
  throw new Error(`No se encontró el esquema oficial de Infoleg (${kind}) dentro del ZIP.`);
}
export function normalizeComplementaryRows(rows,kind,{capturedAt=new Date().toISOString()}={}){
  const schema=SCHEMAS[kind];
  if(!schema)throw new Error(`Tipo de base complementaria desconocido: ${kind}`);
  if(rows.length<2)throw new Error('La base complementaria no contiene registros.');
  const headers=rows[0].map(v=>String(v??'').replace(/^\\uFEFF/,'').trim());
  const missing=schema.required.filter(h=>!headers.includes(h));
  if(missing.length)throw new Error(`Faltan columnas oficiales: ${missing.join(', ')}`);
  const index=Object.fromEntries(headers.map((h,i)=>[h,i]));
  const records=[],errors=[],seen=new Set();
  for(let line=1;line<rows.length;line++){
    const cells=rows[line];
    if(cells.length!==headers.length){errors.push({line:line+1,reason:'Cantidad de columnas inesperada'});continue;}
    const raw=Object.fromEntries(headers.map(h=>[h,String(cells[index[h]]??'').trim()]));
    const modifying=raw.id_norma_modificatoria,modified=raw.id_norma_modificada;
    if(!modifying||!modified){errors.push({line:line+1,reason:'Falta identificador de norma modificatoria o modificada'});continue;}
    const key=`${modifying}|${modified}`;
    records.push({
      source_name:kind==='modificatorias'?'Infoleg - Normas modificatorias':'Infoleg - Normas modificadas',
      source_dataset_url:DATASET_URL,license:LICENSE,
      relation_type:'modifies',modifying_norm_id:modifying,modified_norm_id:modified,
      relation_key:key,source_record:raw,source_row:line+1,
      ingested_at:capturedAt,verification_status:'pending',
      duplicate_candidate:seen.has(key)
    });
    seen.add(key);
  }
  return {records,report:{
    source:kind,dataset_url:DATASET_URL,license:LICENSE,captured_at:capturedAt,
    input_rows:rows.length-1,valid_records:records.length,
    unique_relations:seen.size,duplicate_rows:records.length-seen.size,
    rows_with_errors:errors.length,errors
  }};
}
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
async function loadZip(path,kind){
  const zip=await readFile(resolve(path));
  const found=findComplementaryCsv(zip,kind);
  const normalized=normalizeComplementaryRows(found.rows,kind);
  return {zip,found,...normalized,sha256:sha256(zip),path};
}
async function main(){
  const args=process.argv.slice(2);
  const get=flag=>{const i=args.indexOf(flag);return i>=0?args[i+1]:null;};
  const positional=args.filter((a,i)=>!a.startsWith('--') && !(args[i-1]&&['--out','--national-zip'].includes(args[i-1])));
  const nationalPath=get('--national-zip');
  if(!nationalPath||positional.length!==2)throw new Error('Uso: node scripts/import-infoleg-complementary.mjs --national-zip BASE_NACIONAL.zip BASE_MODIFICATORIAS.zip BASE_MODIFICADAS.zip [--out DIR]');
  const nationalZip=await readFile(resolve(nationalPath));
  const {findInfolegCsv}=await import('./import-infoleg-national.mjs');
  const national=findInfolegCsv(nationalZip);
  const nationalIndex=new Set(national.rows.slice(1).map(row=>String(row[0]??'').trim()).filter(Boolean));
  const modificatorias=await loadZip(positional[0],'modificatorias');
  const modificadas=await loadZip(positional[1],'modificadas');
  const pairSet=items=>new Set(items.records.map(r=>r.relation_key));
  const forward=pairSet(modificatorias),reverse=pairSet(modificadas);
  const missingReverse=[...forward].filter(k=>!reverse.has(k));
  const missingForward=[...reverse].filter(k=>!forward.has(k));
  const relations=[...forward].map(key=>{
    const [modifying,modified]=key.split('|');
    return {modifying_norm_id:modifying,modified_norm_id:modified,relation_type:'modifies'};
  });
  const absentIds=[...new Set(relations.flatMap(r=>[r.modifying_norm_id,r.modified_norm_id]).filter(id=>!nationalIndex.has(id)))];
  const report={
    dataset_url:DATASET_URL,license:LICENSE,national_unique_ids:nationalIndex.size,
    modificatorias:modificatorias.report,modificadas:modificadas.report,
    unique_relations_modificatorias:forward.size,unique_relations_modificadas:reverse.size,
    relations_present_only_in_modificatorias:missingReverse.length,
    relations_present_only_in_modificadas:missingForward.length,
    relations_with_ids_absent_from_national:absentIds.length,
    absent_id_examples:absentIds.slice(0,25),
    symmetric_relations:missingReverse.length===0&&missingForward.length===0,
    all_relation_ids_resolve:nationalIndex.size>0&&absentIds.length===0,
    sha256_modificatorias_zip:modificatorias.sha256,
    sha256_modificadas_zip:modificadas.sha256,
    input_modificatorias:basename(modificatorias.path),input_modificadas:basename(modificadas.path)
  };
  const output=resolve(get('--out')||'artifacts/infoleg-complementary');
  await mkdir(output,{recursive:true});
  await writeFile(resolve(output,'normas-modificatorias-original.zip'),modificatorias.zip);
  await writeFile(resolve(output,'normas-modificadas-original.zip'),modificadas.zip);
  await writeFile(resolve(output,'normas-modificatorias-original.csv'),modificatorias.found.csv,'utf8');
  await writeFile(resolve(output,'normas-modificadas-original.csv'),modificadas.found.csv,'utf8');
  await writeFile(resolve(output,'relations.jsonl'),relations.map(r=>JSON.stringify(r)).join('\\n')+'\\n');
  await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\\n');
  console.log(JSON.stringify({output,...report},null,2));
  if(!report.symmetric_relations||!report.all_relation_ids_resolve||modificatorias.report.rows_with_errors||modificadas.report.rows_with_errors)process.exitCode=2;
}
if(process.argv[1]&&import.meta.url===new URL(`file://${resolve(process.argv[1])}`).href)main().catch(e=>{console.error(e.message);process.exitCode=1;});
