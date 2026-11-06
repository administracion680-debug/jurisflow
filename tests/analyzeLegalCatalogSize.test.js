import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { analyzeJsonl } from '../scripts/analyze-legal-catalog-size.mjs';

test('analyzes JSONL field bytes without retaining rows in memory',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'jurisflow-size-'));
  try{
    const path=join(dir,'norms.jsonl');
    await writeFile(path,[
      JSON.stringify({title:'Ley nacional',summary:null,source_file_sha256:'a'.repeat(64)}),
      JSON.stringify({title:'Una norma provincial con un título más largo',summary:null,source_file_sha256:'b'.repeat(64)})
    ].join('\n')+'\n');
    const report=await analyzeJsonl(path);
    assert.equal(report.rows,2);
    assert.equal(report.fields.summary.nulls,2);
    assert.equal(report.fields.source_file_sha256.string_bytes,128);
    assert.ok(report.fields.title.value_bytes>0);
    assert.equal(report.file_bytes,report.structural_bytes+report.total_value_bytes);
  }finally{
    await rm(dir,{recursive:true,force:true});
  }
});
