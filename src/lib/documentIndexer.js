const MAX_PAGES=300;
const MAX_CHARS=300000;
const CHUNK_SIZE=1800;
const OVERLAP=180;
const MAX_CHUNKS=160;

function chunkText(text,pageNumber,startIndex){
  const normalized=String(text||'').replace(/\s+/g,' ').trim();
  const chunks=[];
  let cursor=0;
  while(cursor<normalized.length&&chunks.length+startIndex<MAX_CHUNKS){
    let end=Math.min(cursor+CHUNK_SIZE,normalized.length);
    if(end<normalized.length){
      const breakAt=normalized.lastIndexOf(' ',end);
      if(breakAt>cursor+1000)end=breakAt;
    }
    const content=normalized.slice(cursor,end).trim();
    if(content.length>80)chunks.push({chunk_index:startIndex+chunks.length,page_number:pageNumber,content});
    if(end>=normalized.length)break;
    cursor=Math.max(end-OVERLAP,cursor+1);
  }
  return chunks;
}

async function extractPdf(blob){
  const [pdfjs,worker]=await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc=worker.default;
  const bytes=new Uint8Array(await blob.arrayBuffer());
  const pdf=await pdfjs.getDocument({data:bytes}).promise;
  if(pdf.numPages>MAX_PAGES){await pdf.destroy();throw new Error('El PDF supera el máximo de 300 páginas para indexación.');}
  const chunks=[];
  let totalChars=0;
  for(let pageNo=1;pageNo<=pdf.numPages;pageNo++){
    const page=await pdf.getPage(pageNo);
    const content=await page.getTextContent();
    const text=content.items.map(item=>typeof item.str==='string'?item.str:'').join(' ');
    totalChars+=text.length;
    if(totalChars>MAX_CHARS){await pdf.destroy();throw new Error('El texto del documento supera el máximo de indexación.');}
    chunks.push(...chunkText(text,pageNo,chunks.length));
    if(chunks.length>=MAX_CHUNKS)break;
  }
  await pdf.destroy();
  if(!chunks.length)throw new Error('No se detectó texto seleccionable. Si el PDF es un escaneo, todavía requiere OCR.');
  return chunks.slice(0,MAX_CHUNKS);
}

async function extractDocx(blob){
  const mammoth=await import('mammoth/mammoth.browser');
  const arrayBuffer=await blob.arrayBuffer();
  const result=await mammoth.extractRawText({arrayBuffer});
  if(!result.value?.trim())throw new Error('El documento Word no contiene texto extraíble.');
  if(result.value.length>MAX_CHARS)throw new Error('El texto del documento supera el máximo de indexación.');
  const chunks=chunkText(result.value,null,0);
  if(!chunks.length)throw new Error('No se pudo dividir el contenido del documento.');
  return chunks;
}

export async function extractDocumentChunks(fileName,blob){
  const extension=String(fileName||'').split('.').pop().toLowerCase();
  if(extension==='pdf')return extractPdf(blob);
  if(extension==='docx')return extractDocx(blob);
  return null;
}
