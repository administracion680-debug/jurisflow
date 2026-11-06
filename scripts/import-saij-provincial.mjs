#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

export const SOURCE_URL = 'https://datos.jus.gob.ar/dataset/d59c2d29-d561-4ad2-a032-cc82b40db2d3/resource/0ebc70cc-0e71-4158-ab75-9759339e4cbd/download/base-saij-normativa-provincial.csv';
export const DATASET_URL = 'https://datos.jus.gob.ar/dataset/base-saij-de-normativa-provincial';
export const SOURCE_NAME = 'SAIJ - Base de Normativa Provincial';
export const LICENSE = 'CC BY 4.0';

const PROVINCES = new Map([
  ['ciudad autónoma de buenos aires','Ciudad Autónoma de Buenos Aires'],['ciudad autonoma de buenos aires','Ciudad Autónoma de Buenos Aires'],['caba','Ciudad Autónoma de Buenos Aires'],['capital federal','Ciudad Autónoma de Buenos Aires'],
  ['buenos aires','Buenos Aires'],['catamarca','Catamarca'],['chaco','Chaco'],['chubut','Chubut'],
  ['cordoba','Córdoba'],['córdoba','Córdoba'],['corrientes','Corrientes'],
  ['entre rios','Entre Ríos'],['entre ríos','Entre Ríos'],['formosa','Formosa'],['jujuy','Jujuy'],
  ['la pampa','La Pampa'],['la rioja','La Rioja'],['mendoza','Mendoza'],['misiones','Misiones'],
  ['neuquen','Neuquén'],['neuquén','Neuquén'],['rio negro','Río Negro'],['río negro','Río Negro'],
  ['salta','Salta'],['san juan','San Juan'],['san luis','San Luis'],['santa cruz','Santa Cruz'],
  ['santa fe','Santa Fe'],['santiago del estero','Santiago del Estero'],
  ['tierra del fuego','Tierra del Fuego'],
  ['tierra del fuego, antartida e islas del atlantico sur','Tierra del Fuego'],
  ['tierra del fuego, antártida e islas del atlántico sur','Tierra del Fuego'],
  ['tucuman','Tucumán'],['tucumán','Tucumán']
]);
const REQUIRED = ['provincia_nombre','tipo_norma','numero_norma','estado_vigencia','fecha','fecha_publicacion','nombre_norma','titulo_resumido','titulo_sumario','informacion_digesto','texto_actualizado'];

export function parseCsv(input) {
  const rows=[]; let row=[], field='', quoted=false;
  for(let i=0;i<input.length;i++){
    const c=input[i];
    if(quoted){
      if(c==='"' && input[i+1]==='"'){field+='"';i++;}
      else if(c==='"') quoted=false;
      else field+=c;
    } else if(c==='"' && field.length===0) quoted=true;
    else if(c===','){row.push(field);field='';}
    else if(c==='\n'){row.push(field.replace(/\r$/,''));rows.push(row);row=[];field='';}
    else field+=c;
  }
  if(quoted) throw new Error('CSV inválido: campo entre comillas sin cerrar.');
  if(field.length || row.length){row.push(field.replace(/\r$/,''));rows.push(row);}
  return rows.filter(r=>!(r.length===1 && r[0]===''));
}
export function normalizeJurisdiction(value){
  const raw=String(value??'').trim();
  const key=raw.normalize('NFC').toLocaleLowerCase('es-AR').replace(/\s+/g,' ');
  return PROVINCES.get(key) ?? null;
}
export function normalizeProvince(value){ return normalizeJurisdiction(value); }
export function normalizeDate(value){
  const v=String(value??'').trim();
  if(!v) return null;
  let parts=v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(!parts){const dmy=v.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);if(dmy)parts=[v,dmy[3],dmy[2],dmy[1]];}
  if(!parts)return null;
  const iso=`${parts[1]}-${parts[2]}-${parts[3]}`;
  const d=new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0,10)!==iso ? null : iso;
}
const clean=v=>String(v??'').trim();
function deduplicationKey(raw,province,date){
  return [province??clean(raw.provincia_nombre).toLocaleLowerCase('es-AR'),clean(raw.tipo_norma).toLocaleLowerCase('es-AR'),clean(raw.numero_norma).toLocaleLowerCase('es-AR'),date??clean(raw.fecha)].join('|');
}
export function normalizeRows(rows,{capturedAt=new Date().toISOString(),sourceUpdatedThrough=null,sourceFileSha256=null}={}){
  if(rows.length<2)throw new Error('El CSV no contiene filas de datos.');
  const headers=rows[0].map(v=>String(v??'').replace(/^\uFEFF/,'').trim());
  const missing=REQUIRED.filter(h=>!headers.includes(h));
  if(missing.length)throw new Error(`Faltan columnas obligatorias: ${missing.join(', ')}`);
  const index=Object.fromEntries(headers.map((h,i)=>[h,i]));
  const records=[],errors=[],jurisdictions=new Set(),statuses=new Map(),keys=new Map();
  for(let line=1;line<rows.length;line++){
    const cells=rows[line];
    if(cells.length!==headers.length){errors.push({line:line+1,reason:`Cantidad de columnas inesperada: ${cells.length}; esperadas: ${headers.length}`});continue;}
    const raw=Object.fromEntries(headers.map(h=>[h,clean(cells[index[h]])]));
    if(!raw.provincia_nombre||!raw.tipo_norma||!raw.nombre_norma){errors.push({line:line+1,reason:'Falta provincia, tipo de norma o nombre de norma'});continue;}
    const province=normalizeJurisdiction(raw.provincia_nombre);
    if(province)jurisdictions.add(province);else errors.push({line:line+1,reason:`Provincia no reconocida: ${raw.provincia_nombre}`});
    const enactment=normalizeDate(raw.fecha),publication=normalizeDate(raw.fecha_publicacion);
    if(raw.fecha&&!enactment)errors.push({line:line+1,reason:`Fecha de sanción no reconocida: ${raw.fecha}`});
    if(raw.fecha_publicacion&&!publication)errors.push({line:line+1,reason:`Fecha de publicación no reconocida: ${raw.fecha_publicacion}`});
    const key=deduplicationKey(raw,province,enactment),seen=keys.get(key)||0;keys.set(key,seen+1);
    const sourceRowNumber=line+1;
    const sourceRowHash=createHash('sha256').update(JSON.stringify(raw)).digest('hex');
    const record={
      source_name:SOURCE_NAME,source_dataset_url:DATASET_URL,
      source_file_sha256:sourceFileSha256,source_row_number:sourceRowNumber,source_row_hash:sourceRowHash,
      source_record_key:sourceFileSha256?`saij_provincial:${sourceFileSha256}:${sourceRowNumber}`:null,
      jurisdiction_type:province==='Ciudad Autónoma de Buenos Aires'?'autonomous_city':'provincial',jurisdiction_normalized:province,
      source_province_id:raw.provincia_id||null,resource_type:'law',title:raw.nombre_norma,
      authority:raw.provincia_nombre,citation:[raw.tipo_norma,raw.numero_norma].filter(Boolean).join(' '),
      source_url:raw.texto_actualizado||null,source_status:raw.estado_vigencia||null,
      source_status_as_of:sourceUpdatedThrough,publication_date:publication,enactment_date:enactment,
      summary:[raw.titulo_resumido,raw.titulo_sumario,raw.informacion_digesto].filter(Boolean).join('\n'),
      source_record:raw,ingested_at:capturedAt,verification_status:'pending',
      deduplication_key:key,duplicate_candidate:seen>0
    };
    records.push(record);
    if(raw.estado_vigencia)statuses.set(raw.estado_vigencia,(statuses.get(raw.estado_vigencia)||0)+1);
  }
  const jurisdictionList=[...jurisdictions].sort();
  const provinceList=jurisdictionList.filter(value=>value!=='Ciudad Autónoma de Buenos Aires');
  return {records,report:{
    source:SOURCE_NAME,source_url:SOURCE_URL,dataset_url:DATASET_URL,license:LICENSE,
    captured_at:capturedAt,source_updated_through:sourceUpdatedThrough,
    input_rows:rows.length-1,valid_records:records.length,rows_with_errors:errors.length,
    jurisdictions:jurisdictionList,jurisdiction_count:jurisdictionList.length,
    provinces:provinceList,province_count:provinceList.length,
    autonomous_city_count:jurisdictions.has('Ciudad Autónoma de Buenos Aires')?1:0,
    records_without_province_id:records.filter(r=>!r.source_province_id).length,
    records_without_source_url:records.filter(r=>!r.source_url).length,
    duplicate_candidates:records.filter(r=>r.duplicate_candidate).length,
    source_status_counts:Object.fromEntries(statuses),errors
  }};
}
async function main(){
  const args=process.argv.slice(2);
  const get=flag=>{const i=args.indexOf(flag);return i>=0?args[i+1]:null;};
  const valueFlags=new Set(['--out','--updated-through']);
  let inputArg=null;
  for(let i=0;i<args.length;i++){
    if(valueFlags.has(args[i])){i++;continue;}
    if(args[i].startsWith('--'))throw new Error(`Opción desconocida: ${args[i]}`);
    if(inputArg)throw new Error('Indicá un solo archivo CSV de entrada.');
    inputArg=args[i];
  }
  const output=resolve(get('--out')||'artifacts/saij-provincial');
  let csv;
  if(inputArg)csv=await readFile(resolve(inputArg),'utf8');
  else{
    const response=await fetch(SOURCE_URL,{headers:{'user-agent':'JurisFlow-SAIJ-importer/1.0'}});
    if(!response.ok)throw new Error(`Descarga SAIJ fallida: HTTP ${response.status}`);
    if((response.headers.get('content-type')||'').includes('text/html'))throw new Error('SAIJ devolvió HTML en lugar del CSV; no se procesó.');
    csv=await response.text();
  }
  const hash=createHash('sha256').update(csv,'utf8').digest('hex');
  const {records,report}=normalizeRows(parseCsv(csv),{sourceUpdatedThrough:get('--updated-through'),sourceFileSha256:hash});
  report.sha256=hash;report.input_file=inputArg?basename(inputArg):'downloaded-from-source';
  await mkdir(output,{recursive:true});
  await writeFile(resolve(output,'source-original.csv'),csv,'utf8');
  await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2)+'\n');
  await writeFile(resolve(output,'records.jsonl'),records.map(r=>JSON.stringify(r)).join('\n')+'\n');
  console.log(JSON.stringify({output,...report},null,2));
  if(report.rows_with_errors)process.exitCode=2;
}
if(process.argv[1] && import.meta.url===new URL(`file://${resolve(process.argv[1])}`).href)
  main().catch(err=>{console.error(err.message);process.exitCode=1;});
