#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { once } from 'node:events';
import { finished } from 'node:stream/promises';
import { basename, resolve } from 'node:path';
import { unzipSync, strFromU8 } from 'fflate';
import { parseCsv, normalizeDate } from './import-saij-provincial.mjs';

export const DATASET_URL='https://datos.jus.gob.ar/dataset/base-de-datos-legislativos-infoleg';
export const SOURCE_NAME='Infoleg - Base de Normativa Nacional';
export const LICENSE='CC BY 4.0';
const REQUIRED=['id_norma','tipo_norma','numero_norma','clase_norma','organismo_origen','fecha_sancion','numero_boletin','fecha_boletin','pagina_boletin','titulo_resumido','titulo_sumario','texto_resumido','observaciones','texto_original','texto_actualizado','modificada_por','modifica_a'];

async function writeJsonl(path,items){
  const output=createWriteStream(path,{encoding:'utf8'});
  const completion=finished(output);
  for(const item of items){
    if(!output.write(JSON.stringify(item)+'\n'))await once(output,'drain');
  }
  output.end();
  await completion;
}

export function findInfolegCsv(zipBytes){
  const entries=unzipSync(zipBytes);
  for(const [name,bytes] of Object.entries(entries).filter(([name])=>name.toLowerCase().endsWith('.csv'))){
    const csv=strFromU8(bytes),rows=parseCsv(csv);
    if(!rows.length)continue;
    const headers=rows[0].map(v=>String(v??'').replace(/^\uFEFF/,'').trim());
    if(REQUIRED.every(field=>headers.includes(field)))return {name,csv,rows};
  }
  throw new Error('No se encontró dentro del ZIP un CSV con los encabezados oficiales de la base Infoleg nacional.');
}
export function normalizeInfolegRows(rows,{capturedAt=new Date().toISOString(),sourceUpdatedThrough=null,sourceFileSha256=null}={}){
  if(rows.length<2)throw new Error('El CSV Infoleg no contiene filas de datos.');
  const headers=rows[0].map(v=>String(v??'').replace(/^\uFEFF/,'').trim());
  const missing=REQUIRED.filter(h=>!headers.includes(h));
  if(missing.length)throw new Error(`Faltan columnas oficiales Infoleg: ${missing.join(', ')}`);
  const index=Object.fromEntries(headers.map((h,i)=>[h,i]));
  const records=[],errors=[],seen=new Map();
  for(let line=1;line<rows.length;line++){
    const cells=rows[line];
    if(cells.length!==headers.length){errors.push({line:line+1,reason:'Cantidad de columnas inesperada'});continue;}
    const raw=Object.fromEntries(headers.map(h=>[h,String(cells[index[h]]??'').trim()]));
    if(!raw.id_norma||!raw.tipo_norma||!raw.numero_norma||!raw.organismo_origen||(!raw.titulo_resumido&&!raw.titulo_sumario)){
      errors.push({line:line+1,reason:'Falta ID, tipo, número, organismo o ambos campos de título'});continue;
    }
    const enacted=normalizeDate(raw.fecha_sancion),published=normalizeDate(raw.fecha_boletin);
    if(raw.fecha_sancion&&!enacted)errors.push({line:line+1,reason:`Fecha de sanción no reconocida: ${raw.fecha_sancion}`});
    if(raw.fecha_boletin&&!published)errors.push({line:line+1,reason:`Fecha de boletín no reconocida: ${raw.fecha_boletin}`});
    const id=raw.id_norma;
    const sourceRowHash=createHash('sha256').update(JSON.stringify(raw)).digest('hex');
    const previousHashes=seen.get(id);
    const duplicateCandidate=Boolean(previousHashes);
    const duplicateExact=Boolean(previousHashes?.has(sourceRowHash));
    const duplicateConflict=duplicateCandidate&&!duplicateExact;
    if(previousHashes)previousHashes.add(sourceRowHash);else seen.set(id,new Set([sourceRowHash]));
    records.push({
      source_name:SOURCE_NAME,source_dataset_url:DATASET_URL,license:LICENSE,
      source_file_sha256:sourceFileSha256,source_row_number:line+1,
      source_record_key:sourceFileSha256?`infoleg_national:${sourceFileSha256}:${line+1}`:null,
      jurisdiction_type:'national',jurisdiction_normalized:'Argentina',
      resource_type:'law',source_record:raw,source_id:id,title:raw.titulo_resumido||raw.titulo_sumario,
      authority:raw.organismo_origen,
      citation:[raw.tipo_norma,raw.clase_norma,raw.numero_norma].filter(Boolean).join(' '),
      source_url:raw.texto_actualizado||raw.texto_original||null,
      original_source_url:raw.texto_original||null,updated_source_url:raw.texto_actualizado||null,
      publication_date:published,enactment_date:enacted,
      bulletin_number:raw.numero_boletin||null,bulletin_page:raw.pagina_boletin||null,
      summary:[raw.titulo_sumario,raw.texto_resumido,raw.observaciones].filter(Boolean).join('\n'),
      source_status:null,source_status_as_of:sourceUpdatedThrough,
      modified_by_count:raw.modificada_por||null,modifies_count:raw.modifica_a||null,
      ingested_at:capturedAt,verification_status:'pending',
      deduplication_key:`infoleg:${id}`,source_row_hash:sourceRowHash,
      duplicate_candidate:duplicateCandidate,duplicate_exact:duplicateExact,duplicate_conflict:duplicateConflict
    });
  }
  return {records,report:{
    source:SOURCE_NAME,dataset_url:DATASET_URL,license:LICENSE,captured_at:capturedAt,
    source_updated_through:sourceUpdatedThrough,input_rows:rows.length-1,
    valid_records:records.length,rows_with_errors:errors.length,
    duplicate_candidates:records.filter(r=>r.duplicate_candidate).length,
    duplicate_exact_rows:records.filter(r=>r.duplicate_exact).length,
    duplicate_conflicting_rows:records.filter(r=>r.duplicate_conflict).length,
    duplicate_id_groups:[...seen.values()].filter(hashes=>hashes.size>1).length,
    records_without_updated_text:records.filter(r=>!r.updated_source_url).length,
    records_without_original_text:records.filter(r=>!r.original_source_url).length,errors
  }};
}
async function main(){
  const args=process.argv.slice(2),get=flag=>{const i=args.indexOf(flag);return i>=0?args[i+1]:null;};
  const zipPath=args.find(a=>!a.startsWith('--'));
  if(!zipPath)throw new Error('Indicá el ZIP oficial descargado de Infoleg. No se procesa una muestra parcial.');
  const zip=await readFile(resolve(zipPath)),hash=createHash('sha256').update(zip).digest('hex');
  const {name,csv,rows}=findInfolegCsv(zip);
  const {records,report}=normalizeInfolegRows(rows,{sourceUpdatedThrough:get('--updated-through'),sourceFileSha256:hash});
  report.sha256_zip=hash;report.input_file=basename(zipPath);report.csv_entry=name;
  const output=resolve(get('--out')||'artifacts/infoleg-national');
  await mkdir(output,{recursive:true});
  await writeFile(resolve(output,'source-original.zip'),zip);
  await writeFile(resolve(output,'source-original.csv'),csv,'utf8');
  await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');
  await writeJsonl(resolve(output,'records.jsonl'),records);
  console.log(JSON.stringify({output,...report},null,2));
  if(report.rows_with_errors)process.exitCode=2;
}
if(process.argv[1]&&import.meta.url===new URL(`file://${resolve(process.argv[1])}`).href)main().catch(e=>{console.error(e.message);process.exitCode=1;});
