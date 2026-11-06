import { unzipSync } from 'fflate';

const MAX_PAGES=300;
const MAX_OCR_PAGES=40;
const MAX_CHARS=300000;
const CHUNK_SIZE=1800;
const OVERLAP=180;
const MAX_CHUNKS=160;
const MAX_OFFICE_ARCHIVE_BYTES=20*1024*1024;
const MAX_OFFICE_UNCOMPRESSED_BYTES=25*1024*1024;
const MAX_ZIP_ENTRIES=1000;

export function getDocumentIndexingKind(fileName){
  const extension=String(fileName||'').split('.').pop().toLowerCase();
  if(extension==='pdf')return 'pdf';
  if(extension==='docx')return 'docx';
  if(extension==='xlsx')return 'spreadsheet';
  if(extension==='pptx')return 'presentation';
  if(['jpg','jpeg','png'].includes(extension))return 'image';
  return null;
}

export function chunkText(text,pageNumber=null,startIndex=0){
  const normalized=String(text||'').replace(/\\s+/g,' ').trim();
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

function validateOfficeArchive(bytes){
  if(bytes.byteLength>MAX_OFFICE_ARCHIVE_BYTES)throw new Error('El archivo Office supera el límite de 20 MB.');
  if(bytes.byteLength<22)throw new Error('El archivo Office no contiene una estructura ZIP válida.');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const searchStart=Math.max(0,bytes.byteLength-65557);
  let endRecord=-1;
  for(let offset=bytes.byteLength-22;offset>=searchStart;offset--){
    if(view.getUint32(offset,true)===0x06054b50){endRecord=offset;break;}
  }
  if(endRecord<0)throw new Error('El archivo Office no contiene un directorio ZIP válido.');
  const disk=view.getUint16(endRecord+4,true);
  const directoryDisk=view.getUint16(endRecord+6,true);
  const diskEntries=view.getUint16(endRecord+8,true);
  const entries=view.getUint16(endRecord+10,true);
  const directorySize=view.getUint32(endRecord+12,true);
  const directoryOffset=view.getUint32(endRecord+16,true);
  if(disk!==0||directoryDisk!==0||diskEntries!==entries)throw new Error('No se admiten archivos Office divididos en varios volúmenes.');
  if(entries===0xffff||directorySize===0xffffffff||directoryOffset===0xffffffff)throw new Error('No se admiten archivos Office ZIP64.');
  if(entries>MAX_ZIP_ENTRIES)throw new Error('El archivo Office contiene demasiados elementos.');
  if(directoryOffset+directorySize>endRecord)throw new Error('El directorio ZIP del archivo Office está dañado.');
  let cursor=directoryOffset;
  let uncompressedTotal=0;
  for(let index=0;index<entries;index++){
    if(cursor+46>bytes.byteLength||view.getUint32(cursor,true)!==0x02014b50)throw new Error('El directorio ZIP del archivo Office está dañado.');
    const compressedSize=view.getUint32(cursor+20,true);
    const uncompressedSize=view.getUint32(cursor+24,true);
    const nameLength=view.getUint16(cursor+28,true);
    const extraLength=view.getUint16(cursor+30,true);
    const commentLength=view.getUint16(cursor+32,true);
    if(compressedSize===0xffffffff||uncompressedSize===0xffffffff)throw new Error('No se admiten archivos Office ZIP64.');
    uncompressedTotal+=uncompressedSize;
    if(uncompressedTotal>MAX_OFFICE_UNCOMPRESSED_BYTES)throw new Error('El contenido descomprimido supera el límite de seguridad de 25 MB.');
    cursor+=46+nameLength+extraLength+commentLength;
    if(cursor>directoryOffset+directorySize)throw new Error('El directorio ZIP del archivo Office está dañado.');
  }
  if(cursor>directoryOffset+directorySize)throw new Error('El directorio ZIP del archivo Office está dañado.');
}

function parseOfficeXml(bytes,path){
  if(!bytes)throw new Error('El archivo Office no contiene '+path+'.');
  const xml=new TextDecoder().decode(bytes);
  const document=new DOMParser().parseFromString(xml,'application/xml');
  if(document.getElementsByTagName('parsererror').length)throw new Error('No se pudo leer el XML interno del archivo Office.');
  return document;
}

function unzipOffice(blob){
  if(blob.size>MAX_OFFICE_ARCHIVE_BYTES)throw new Error('El archivo Office supera el límite de 20 MB.');
  return blob.arrayBuffer().then(buffer=>{
    const bytes=new Uint8Array(buffer);
    validateOfficeArchive(bytes);
    const files=unzipSync(bytes);
    const actualSize=Object.values(files).reduce((total,file)=>total+file.byteLength,0);
    if(actualSize>MAX_OFFICE_UNCOMPRESSED_BYTES)throw new Error('El contenido descomprimido supera el límite de seguridad de 25 MB.');
    return files;
  });
}

async function extractSpreadsheet(blob){
  const files=await unzipOffice(blob);
  const sheetPaths=Object.keys(files)
    .filter(path=>/^xl\\/worksheets\\/sheet\\d+\\.xml$/.test(path))
    .sort((a,b)=>Number(a.match(/sheet(\\d+)/)[1])-Number(b.match(/sheet(\\d+)/)[1]));
  if(!sheetPaths.length)throw new Error('El archivo XLSX no contiene hojas de cálculo legibles.');
  const sharedStrings=[];
  if(files['xl/sharedStrings.xml']){
    const sharedDoc=parseOfficeXml(files['xl/sharedStrings.xml'],'xl/sharedStrings.xml');
    for(const item of Array.from(sharedDoc.getElementsByTagNameNS('*','si'))){
      sharedStrings.push(Array.from(item.getElementsByTagNameNS('*','t')).map(node=>node.textContent||'').join(''));
    }
  }
  const chunks=[];
  let totalChars=0;
  for(let sheetIndex=0;sheetIndex<sheetPaths.length;sheetIndex++){
    const sheetDoc=parseOfficeXml(files[sheetPaths[sheetIndex]],sheetPaths[sheetIndex]);
    const lines=[];
    for(const row of Array.from(sheetDoc.getElementsByTagNameNS('*','row'))){
      const cells=Array.from(row.getElementsByTagNameNS('*','c')).filter(cell=>cell.parentNode===row);
      const values=cells.map(cell=>{
        const type=cell.getAttribute('t');
        if(type==='inlineStr')return Array.from(cell.getElementsByTagNameNS('*','t')).map(node=>node.textContent||'').join('');
        const value=cell.getElementsByTagNameNS('*','v')[0]?.textContent||'';
        if(type==='s')return sharedStrings[Number(value)]||'';
        return value;
      });
      if(values.some(value=>String(value).trim()))lines.push(values.join(' | '));
    }
    const sheetText=lines.join('\\n');
    totalChars+=sheetText.length;
    if(totalChars>MAX_CHARS)throw new Error('El texto de la planilla supera el máximo de indexación.');
    chunks.push(...chunkText(sheetText,sheetIndex+1,chunks.length));
    if(chunks.length>=MAX_CHUNKS)break;
  }
  if(!chunks.length)throw new Error('La planilla XLSX no contiene texto suficiente para indexar.');
  return chunks.slice(0,MAX_CHUNKS);
}

async function extractPresentation(blob){
  const files=await unzipOffice(blob);
  const slidePaths=Object.keys(files)
    .filter(path=>/^ppt\\/slides\\/slide\\d+\\.xml$/.test(path))
    .sort((a,b)=>Number(a.match(/slide(\\d+)/)[1])-Number(b.match(/slide(\\d+)/)[1]));
  if(!slidePaths.length)throw new Error('La presentación PPTX no contiene diapositivas legibles.');
  const chunks=[];
  let totalChars=0;
  for(let slideIndex=0;slideIndex<slidePaths.length;slideIndex++){
    const slideDoc=parseOfficeXml(files[slidePaths[slideIndex]],slidePaths[slideIndex]);
    const slideText=Array.from(slideDoc.getElementsByTagNameNS('*','t'))
      .map(node=>node.textContent||'').filter(Boolean).join(' ');
    totalChars+=slideText.length;
    if(totalChars>MAX_CHARS)throw new Error('El texto de la presentación supera el máximo de indexación.');
    chunks.push(...chunkText(slideText,slideIndex+1,chunks.length));
    if(chunks.length>=MAX_CHUNKS)break;
  }
  if(!chunks.length)throw new Error('La presentación PPTX no contiene texto suficiente para indexar.');
  return chunks.slice(0,MAX_CHUNKS);
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
  const kind=getDocumentIndexingKind(fileName);
  if(kind==='pdf')return extractPdf(blob);
  if(kind==='docx')return extractDocx(blob);
  if(kind==='spreadsheet')return extractSpreadsheet(blob);
  if(kind==='presentation')return extractPresentation(blob);
  if(kind==='image')return extractImage(blob);
  return null;
}
