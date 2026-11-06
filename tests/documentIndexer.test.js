import test from 'node:test';
import assert from 'node:assert/strict';
import { chunkText, extractDocumentChunks, getDocumentIndexingKind } from '../src/lib/documentIndexer.js';

test('normaliza espacios y conserva el número de página', () => {
  const chunks = chunkText('  texto   de prueba '.repeat(8), 4);
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].page_number, 4);
  assert.equal(chunks[0].chunk_index, 0);
  assert.equal(chunks[0].content.includes('   '), false);
});

test('no genera fragmentos para contenido vacío o demasiado corto', () => {
  assert.deepEqual(chunkText('   \n  ', 1), []);
  assert.deepEqual(chunkText('texto breve', 1), []);
});

test('divide textos extensos en fragmentos acotados con índices consecutivos', () => {
  const chunks = chunkText('palabra '.repeat(1200), 2);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every(chunk => chunk.content.length <= 1800));
  assert.deepEqual(chunks.map(chunk => chunk.chunk_index), chunks.map((_, index) => index));
  assert.ok(chunks.every(chunk => chunk.page_number === 2));
});

test('respeta el límite máximo de 160 fragmentos', () => {
  const chunks = chunkText('dato '.repeat(100000), 1);
  assert.equal(chunks.length, 160);
});

test('clasifica formatos con extracción local y OCR', () => {
  assert.equal(getDocumentIndexingKind('causa.PDF'), 'pdf');
  assert.equal(getDocumentIndexingKind('escrito.docx'), 'docx');
  assert.equal(getDocumentIndexingKind('escaneo.jpg'), 'image');
  assert.equal(getDocumentIndexingKind('captura.png'), 'image');
  assert.equal(getDocumentIndexingKind('planilla.xlsx'), 'spreadsheet');
  assert.equal(getDocumentIndexingKind('presentacion.pptx'), 'presentation');
  assert.equal(getDocumentIndexingKind('planilla.xls'), null);
  assert.equal(getDocumentIndexingKind('presentacion.ppt'), null);
});

test('rechaza archivos XLSX/PPTX que no contienen un ZIP Office válido', async () => {
  await assert.rejects(extractDocumentChunks('anexo.xlsx', new Blob(['contenido'])), /estructura ZIP válida/);
  await assert.rejects(extractDocumentChunks('presentacion.pptx', new Blob(['contenido'])), /estructura ZIP válida/);
});
