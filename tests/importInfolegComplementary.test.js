import test from 'node:test';
import assert from 'node:assert/strict';
import { zipSync, strToU8 } from 'fflate';
import { findComplementaryCsv, normalizeComplementaryRows } from '../scripts/import-infoleg-complementary.mjs';

const headers='id_norma_modificatoria,id_norma_modificada,tipo_norma,nro_norma,clase_norma,organismo_origen,fecha_boletin,titulo_sumario,titulo_resumido';
const row='400343,1,Decreto,1256,,PODER EJECUTIVO NACIONAL,1988-10-04,EXPROPIACIONES,LEY N° 23.600';

test('detects the official complementary schema inside ZIP',()=>{
 const zip=zipSync({'data/base.csv':strToU8(headers+'\n'+row)});
 const found=findComplementaryCsv(zip,'modificatorias');
 assert.equal(found.name,'data/base.csv');
 assert.equal(found.rows.length,2);
});
test('normalizes both sides to the same modifies relation',()=>{
 const forward=normalizeComplementaryRows([headers.split(','),row.split(',')],'modificatorias');
 const reverseHeaders='id_norma_modificada,id_norma_modificatoria,tipo_norma,nro_norma,clase_norma,organismo_origen,fecha_boletin,titulo_sumario,titulo_resumido';
 const reverseRow='1,400343,Decreto,1256,,PODER EJECUTIVO NACIONAL,1988-10-04,EXPROPIACIONES,LEY N° 23.600';
 const reverse=normalizeComplementaryRows([reverseHeaders.split(','),reverseRow.split(',')],'modificadas');
 assert.equal(forward.records[0].relation_key,reverse.records[0].relation_key);
 assert.equal(forward.records[0].modifying_norm_id,'400343');
 assert.equal(forward.records[0].modified_norm_id,'1');
 assert.equal(forward.records[0].verification_status,'pending');
});
test('flags duplicate relations and malformed rows',()=>{
 const {records,report}=normalizeComplementaryRows([headers.split(','),row.split(','),row.split(','),['only','two']],'modificatorias');
 assert.equal(records.length,2);
 assert.equal(report.unique_relations,1);
 assert.equal(report.duplicate_rows,1);
 assert.equal(report.rows_with_errors,1);
 assert.equal(records[1].duplicate_candidate,true);
});
test('rejects unknown schema and missing columns',()=>{
 assert.throws(()=>findComplementaryCsv(zipSync({'x.txt':strToU8('no')}),'modificatorias'),/No se encontró/);
 assert.throws(()=>normalizeComplementaryRows([['id_norma_modificatoria'],['1']],'modificatorias'),/Faltan columnas/);
});
