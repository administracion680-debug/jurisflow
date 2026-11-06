const MAX_PAGES=300;
const MAX_OCR_PAGES=40;
const MAX_CHARS=300000;
const CHUNK_SIZE=1800;
const OVERLAP=180;
const MAX_CHUNKS=160;

export function chunkText(text,pageNumber=null,startIndex=0){
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

async function createSpanishOcrWorker(){
  const {createWorker}=await import('tesseract.js');
  return createWorker('spa',1,{
    logger:()=>{},
    errorHandler:error=>console.warn('OCR local:',error)
  });
}

async function recognizePdfPage(page,worker){
  const viewport=page.getViewport({scale:1.6});
  const canvas=document.createElement('canvas');
  canvas.width=Math.ceil(viewport.width);
  canvas.height=Math.ceil(viewport.height);
  const context=canvas.getContext('2d',{willReadFrequently:true});
  if(!context)throw new Error('No se pudo preparar la página para OCR.');
  await page.render({canvasContext:context,viewport}).promise;
  try{
    const result=await worker.recognize(canvas);
    return result.data.text||'';
  }finally{
    canvas.width=0;
    canvas.height=0;
  }
}

async function extractPdf(blob){
  const [pdfjs,workerModule]=await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc=workerModule.default;
  const bytes=new Uint8Array(await blob.arrayBuffer());
  const pdf=await pdfjs.getDocument({data:bytes}).promise;
  if(pdf.numPages>MAX_PAGES){await pdf.destroy();throw new Error('El PDF supera el máximo de 300 páginas para indexación.');}
  const chunks=[];
  let totalChars=0;
  let ocrWorker=null;
  let ocrPages=0;
  try{
    for(let pageNo=1;pageNo<=pdf.numPages;pageNo++){
      const page=await pdf.getPage(pageNo);
      const content=await page.getTextContent();
      let text=content.items.map(item=>typeof item.str==='string'?item.str:'').join(' ').trim();
      if(text.length<40){
        if(ocrPages>=MAX_OCR_PAGES)throw new Error('El PDF tiene más de 40 páginas escaneadas. Dividilo en archivos más pequeños para completar el OCR.');
        if(!ocrWorker)ocrWorker=await createSpanishOcrWorker();
        text=await recognizePdfPage(page,ocrWorker);
        ocrPages++;
      }
      totalChars+=text.length;
      if(totalChars>MAX_CHARS)throw new Error('El texto del documento supera el máximo de indexación.');
      chunks.push(...chunkText(text,pageNo,chunks.length));
      if(chunks.length>=MAX_CHUNKS)break;
    }
  }finally{
    if(ocrWorker)await ocrWorker.terminate();
    await pdf.destroy();
  }
  if(!chunks.length)throw new Error('No se pudo extraer texto del PDF. Verificá la calidad del escaneo o el idioma.');
  return chunks.slice(0,MAX_CHUNKS);
}

async function extractDocx(blob){
  const mammothModule=await import('mammoth/mammoth.browser');
  const mammoth=mammothModule.default||mammothModule;
  const arrayBuffer=await blob.arrayBuffer();
  const result=await mammoth.extractRawText({arrayBuffer});
  if(!result.value?.trim())throw new Error('El documento Word no contiene texto extraíble.');
  if(result.value.length>MAX_CHARS)throw new Error('El texto del documento supera el máximo de indexación.');
  const chunks=chunkText(result.value,null,0);
  if(!chunks.length)throw new Error('No se pudo dividir el contenido del documento.');
  return chunks;
}

async function extractImage(blob){
  const worker=await createSpanishOcrWorker();
  try{
    const result=await worker.recognize(blob);
    const chunks=chunkText(result.data.text||'',1,0);
    if(!chunks.length)throw new Error('El OCR no detectó texto legible en la imagen.');
    return chunks;
  }finally{
    await worker.terminate();
  }
}

export async function extractDocumentChunks(fileName,blob){
  const extension=String(fileName||'').split('.').pop().toLowerCase();
  if(extension==='pdf')return extractPdf(blob);
  if(extension==='docx')return extractDocx(blob);
  if(['jpg','jpeg','png'].includes(extension))return extractImage(blob);
  return null;
}
