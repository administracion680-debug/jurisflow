#!/usr/bin/env node
import { createReadStream } from 'node:fs';
import { stat, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';

const fail=(condition,message)=>{if(!condition)throw new Error(message);};

export async function analyzeJsonl(path){
  const absolute=resolve(path);
  const file=await stat(absolute);
  const fields={};
  let rows=0,totalValueBytes=0;
  const lines=createInterface({input:createReadStream(absolute),crlfDelay:Infinity});
  for await(const line of lines){
    if(!line.trim())continue;
    const record=JSON.parse(line);
    rows++;
    for(const [name,value] of Object.entries(record)){
      const item=fields[name]??={rows:0,nulls:0,value_bytes:0,string_bytes:0,max_string_bytes:0};
      item.rows++;
      if(value===null||value===undefined){item.nulls++;continue;}
      const valueBytes=Buffer.byteLength(JSON.stringify(value));
      item.value_bytes+=valueBytes;
      totalValueBytes+=valueBytes;
      if(typeof value==='string'){
        const stringBytes=Buffer.byteLength(value);
        item.string_bytes+=stringBytes;
        if(stringBytes>item.max_string_bytes)item.max_string_bytes=stringBytes;
      }
    }
  }
  for(const item of Object.values(fields)){
    item.average_value_bytes=item.rows?Number((item.value_bytes/item.rows).toFixed(2)):0;
  }
  return {
    file: absolute,
    rows,
    file_bytes:file.size,
    total_value_bytes:totalValueBytes,
    structural_bytes:file.size-totalValueBytes,
    fields:Object.fromEntries(Object.entries(fields).sort((a,b)=>b[1].value_bytes-a[1].value_bytes))
  };
}

async function main(){
  const args=process.argv.slice(2);
  const get=flag=>{const i=args.indexOf(flag);return i>=0?args[i+1]:null;};
  fail(get('--norms'),'Falta --norms');
  fail(get('--relationships'),'Falta --relationships');
  fail(get('--out'),'Falta --out');
  const report={
    schema_version:1,
    generated_at:new Date().toISOString(),
    norms:await analyzeJsonl(get('--norms')),
    relationships:await analyzeJsonl(get('--relationships'))
  };
  await writeFile(resolve(get('--out')),JSON.stringify(report,null,2)+'\\n');
  console.log(JSON.stringify(report,null,2));
}
if(process.argv[1]&&import.meta.url===new URL(`file://${resolve(process.argv[1])}`).href){
  main().catch(error=>{console.error(error.message);process.exitCode=1;});
}
