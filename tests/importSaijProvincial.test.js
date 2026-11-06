import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, normalizeRows, normalizeProvince, normalizeJurisdiction, normalizeDate } from '../scripts/import-saij-provincial.mjs';
const header='provincia_nombre,tipo_norma,numero_norma,estado_vigencia,fecha,fecha_publicacion,nombre_norma,titulo_resumido,titulo_sumario,informacion_digesto,texto_actualizado,provincia_id';
const row='Córdoba,Ley,1234,vigente de alcance general,2020-01-02,2020-01-10,Ley de prueba,"Resumen, con coma",Sumario,,https://www.cba.gov.ar/norma,14';

test('CSV parser handles quoted commas, escaped quotes and multiline fields',()=>{
 assert.deepEqual(parseCsv('a,b\n"x, y","dijo ""hola"""\n"línea 1\nlínea 2",z\n'),[['a','b'],['x, y','dijo "hola"'],['línea 1\nlínea 2','z']]);
});
test('CSV parser rejects unclosed quoted fields',()=>assert.throws(()=>parseCsv('a\n"no termina'),/sin cerrar/));
test('province normalization maps names and does not guess unknown values',()=>{
 assert.equal(normalizeProvince('Cordoba'),'Córdoba');
 assert.equal(normalizeProvince('Tierra del Fuego, Antártida e Islas del Atlántico Sur'),'Tierra del Fuego');
 assert.equal(normalizeProvince('Provincia inventada'),null);
});
test('normalizes CABA as an autonomous city rather than a province',()=>{
 assert.equal(normalizeJurisdiction('Ciudad Autónoma de Buenos Aires'),'Ciudad Autónoma de Buenos Aires');
 assert.equal(normalizeJurisdiction('CABA'),'Ciudad Autónoma de Buenos Aires');
 assert.equal(normalizeProvince('Capital Federal'),'Ciudad Autónoma de Buenos Aires');
 const header='provincia_nombre,tipo_norma,numero_norma,estado_vigencia,fecha,fecha_publicacion,nombre_norma,titulo_resumido,titulo_sumario,informacion_digesto,texto_actualizado,provincia_id';
 const row='CABA,Ley,1,vigente,2020-01-01,2020-01-02,Ley local,,,,https://example.gob.ar,1';
 const {records,report}=normalizeRows(parseCsv(header+'\\n'+row));
 assert.equal(records[0].jurisdiction_type,'autonomous_city');
 assert.equal(report.autonomous_city_count,1);
 assert.equal(report.province_count,0);
});
test('date normalization accepts ISO and day/month/year, rejects impossible dates',()=>{
 assert.equal(normalizeDate('2024-02-29'),'2024-02-29');
 assert.equal(normalizeDate('31/12/2023'),'2023-12-31');
 assert.equal(normalizeDate('2023-02-29'),null);
});
test('normalizer preserves source values, flags duplicates and never auto-verifies',()=>{
 const {records,report}=normalizeRows(parseCsv(header+'\n'+row+'\n'+row),{capturedAt:'2026-11-05T00:00:00.000Z',sourceUpdatedThrough:'2026-10-31'});
 assert.equal(records.length,2);assert.equal(records[0].verification_status,'pending');
 assert.equal(records[0].jurisdiction_normalized,'Córdoba');
 assert.equal(records[0].source_status,'vigente de alcance general');
 assert.equal(records[0].source_record.provincia_nombre,'Córdoba');
 assert.equal(records[1].duplicate_candidate,true);assert.equal(report.duplicate_candidates,1);
 assert.equal(report.province_count,1);
});
test('normalizer reports malformed rows without silently dropping valid records',()=>{
 const {records,report}=normalizeRows(parseCsv(header+'\n'+row+'\n'+row+',extra'));
 assert.equal(records.length,1);assert.equal(report.rows_with_errors,1);
});
test('normalizer rejects missing required headers',()=>assert.throws(()=>normalizeRows(parseCsv('provincia_nombre,nombre_norma\nCórdoba,Ley')),/Faltan columnas/));
