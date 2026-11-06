import test from 'node:test';
import assert from 'node:assert/strict';
import { compactNormRecord, compactRelationObservation, compactCanonicalRelation } from '../scripts/prepare-legal-catalog-import.mjs';

const hash='a'.repeat(64);

test('compacts a national norm while preserving source provenance and excluding raw payload',()=>{
  const source={
    source_code:'infoleg_national',
    source_record_key:`infoleg_national:${hash}:2`,
    source_id:'123',
    jurisdiction_type:'national',
    jurisdiction_normalized:'Argentina',
    resource_type:'law',
    title:'Ley de prueba',
    authority:'Congreso de la Nación',
    citation:'Ley 27.777',
    source_url:'https://infoleg.gob.ar/ley',
    publication_date:'2024-02-05',
    enactment_date:'2024-02-01',
    summary:'Resumen',
    verification_status:'pending',
    source_file_sha256:hash,
    source_row_number:2,
    source_row_hash:hash,
    captured_at:'2026-11-06T00:00:00.000Z',
    source_record:{id_norma:'123',texto_original:'contenido fuente'}
  };
  const compact=compactNormRecord(source);
  assert.equal(compact.source_code,'infoleg_national');
  assert.equal(compact.source_id,'123');
  assert.equal(compact.source_record_key,source.source_record_key);
  assert.equal(compact.source_row_hash,hash);
  assert.equal(compact.captured_at,'2026-11-06T00:00:00.000Z');
  assert.equal(compact.summary,null,'El resumen extenso no debe duplicarse en la base');
  assert.equal(compact.duplicate_candidate,false);
  assert.equal(Object.hasOwn(compact,'source_record'),false);
  assert.equal(Object.hasOwn(compact,'source_dataset_url'),false);
});

test('compacts a SAIJ norm and normalizes absent duplicate flags to false',()=>{
  const compact=compactNormRecord({
    source_code:'saij_provincial',
    source_record_key:`saij_provincial:${hash}:3`,
    jurisdiction_type:'provincial',
    jurisdiction_normalized:'Córdoba',
    resource_type:'law',
    title:'Ley provincial',
    authority:'Córdoba',
    source_file_sha256:hash,
    source_row_number:3,
    source_row_hash:hash
  });
  assert.equal(compact.source_id,null);
  assert.equal(compact.duplicate_candidate,false);
  assert.equal(compact.duplicate_exact,false);
  assert.equal(compact.duplicate_conflict,false);
});

test('rejects incomplete norm provenance instead of silently preparing it',()=>{
  assert.throws(()=>compactNormRecord({source_code:'saij_provincial',title:'Ley'}),/source_record_key/);
});

test('compacts every relation observation with source resource and provenance',()=>{
  const compact=compactRelationObservation({
    source_code:'infoleg_national',
    source_resource:'modificatorias',
    source_record_key:`infoleg_national:modificatorias:${hash}:4`,
    source_file_sha256:hash,
    source_row_number:4,
    source_row_hash:hash,
    modifying_norm_id:'400343',
    modified_norm_id:'1',
    relation_type:'modifies',
    duplicate_candidate:true,
    verification_status:'pending',
    source_record:{id_norma_modificatoria:'400343'}
  });
  assert.equal(compact.modifying_source_record_id,'400343');
  assert.equal(compact.modified_source_record_id,'1');
  assert.equal(compact.duplicate_candidate,true);
  assert.equal(Object.hasOwn(compact,'source_record'),false);
});

test('compacts a canonical relation with its full observation count',()=>{
  const compact=compactCanonicalRelation({modifying_norm_id:'400343',modified_norm_id:'1',relation_type:'modifies',observation_count:4});
  assert.equal(compact.source_code,'infoleg_national');
  assert.equal(compact.observation_count,4);
  assert.equal(compact.verification_status,'pending');
  assert.throws(()=>compactCanonicalRelation({modifying_norm_id:'1',modified_norm_id:'2',observation_count:0}),/Cantidad de observaciones/);
});
