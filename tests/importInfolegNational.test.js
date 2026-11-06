import test from 'node:test';
import assert from 'node:assert/strict';
import { zipSync, strToU8 } from 'fflate';
import { findInfolegCsv, normalizeInfolegRows } from '../scripts/import-infoleg-national.mjs';

const headers='id_norma,tipo_norma,numero_norma,clase_norma,organismo_origen,fecha_sancion,numero_boletin,fecha_boletin,pagina_boletin,titulo_resumido,titulo_sumario,texto_resumido,observaciones,texto_original,texto_actualizado,modificada_por,modifica_a';
const row='123,Ley,27777,,Congreso de la Nación,2024-02-01,35000,2024-02-05,4,Título específico,Título general,Resumen,,https://www.infoleg.gob.ar/original,https://www.infoleg.gob.ar/actualizada,2,3';

test('finds official Infoleg CSV inside ZIP without assuming archive path',()=>{
 const zip=zipSync({'carpeta/base.csv':strToU8(headers+'\\n'+row)});
 const found=findInfolegCsv(zip);
 assert.equal(found.name,'carpeta/base.csv');
 assert.equal(found.rows.length,2);
});
test('rejects ZIP without the official Infoleg schema',()=>{
 const zip=zipSync({'readme.txt':strToU8('sin csv')});
 assert.throws(()=>findInfolegCsv(zip),/No se encontró/);
});
test('normalizes national metadata and keeps manual verification pending',()=>{
 const {records,report}=normalizeInfolegRows([headers.split(','),row.split(',')],{sourceUpdatedThrough:'2026-10-31'});
 assert.equal(records.length,1);
 assert.equal(records[0].jurisdiction_type,'national');
 assert.equal(records[0].authority,'Congreso de la Nación');
 assert.equal(records[0].publication_date,'2024-02-05');
 assert.equal(records[0].verification_status,'pending');
 assert.equal(records[0].source_record.id_norma,'123');
 assert.equal(report.valid_records,1);
});
test('reports malformed rows and rejects missing required columns',()=>{
 const {report}=normalizeInfolegRows([headers.split(','),['123','Ley']]);
 assert.equal(report.rows_with_errors,1);
 assert.throws(()=>normalizeInfolegRows([['id_norma'],['1']]),/Faltan columnas/);
});
