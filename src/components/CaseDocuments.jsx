import { useCallback,useEffect,useState } from 'react';
import { FileText, FileUp, Download, Trash2, X, ShieldCheck, ScanText } from 'lucide-react';
import { extractDocumentChunks } from '../lib/documentIndexer';

const bucket='jurisflow-documentos';
const maxBytes=20*1024*1024;
const allowedTypes=new Set([
  'application/pdf','application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg','image/png'
]);
const sizeLabel=bytes=>bytes<1024*1024?Math.round(bytes/1024)+' KB':(bytes/1024/1024).toFixed(1)+' MB';

export default function CaseDocuments({supabase,firm,caseItem,user,canWrite,canDelete}) {
  const [documents,setDocuments]=useState([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const load=useCallback(async()=>{
    setLoading(true);setError('');
    try{
      const {data,error:queryError}=await supabase.from('documents')
        .select('id,file_name,storage_path,mime_type,file_size,notes,created_at,index_status,indexed_at,index_error')
        .eq('firm_id',firm.id).eq('case_id',caseItem.id).order('created_at',{ascending:false});
      if(queryError)throw queryError;
      setDocuments(data||[]);
    }catch(err){setError(err.message||'No se pudieron cargar los documentos.');}
    finally{setLoading(false);}
  },[supabase,firm.id,caseItem.id]);
  useEffect(()=>{load();},[load]);

  const indexDocument=async item=>{
    if(!canWrite)return;
    const extension=String(item.file_name||'').split('.').pop().toLowerCase();
    if(!['pdf','docx'].includes(extension)){
      setBusy(true);
      const {error:updateError}=await supabase.from('documents').update({index_status:'unsupported',index_error:'Por ahora se indexan archivos PDF y DOCX.'}).eq('id',item.id).eq('firm_id',firm.id);
      setBusy(false);
      if(updateError)setError(updateError.message);
      else await load();
      return;
    }
    setBusy(true);setError('');
    try{
      const {data:blob,error:downloadError}=await supabase.storage.from(bucket).download(item.storage_path);
      if(downloadError)throw downloadError;
      const chunks=await extractDocumentChunks(item.file_name,blob);
      if(!chunks?.length)throw new Error('No se pudo extraer texto del archivo.');
      const {error:clearError}=await supabase.from('document_chunks').delete()
        .eq('firm_id',firm.id).eq('case_id',caseItem.id).eq('document_id',item.id);
      if(clearError)throw clearError;
      for(let offset=0;offset<chunks.length;offset+=40){
        const rows=chunks.slice(offset,offset+40).map(chunk=>({
          firm_id:firm.id,case_id:caseItem.id,document_id:item.id,
          chunk_index:chunk.chunk_index,page_number:chunk.page_number,content:chunk.content
        }));
        const {error:insertError}=await supabase.from('document_chunks').insert(rows);
        if(insertError)throw insertError;
      }
      const {error:updateError}=await supabase.from('documents').update({
        index_status:'indexed',indexed_at:new Date().toISOString(),index_error:null
      }).eq('id',item.id).eq('firm_id',firm.id);
      if(updateError)throw updateError;
      await load();
    }catch(err){
      await supabase.from('document_chunks').delete().eq('firm_id',firm.id).eq('case_id',caseItem.id).eq('document_id',item.id);
      await supabase.from('documents').update({index_status:'failed',index_error:err.message||'Error de indexación'}).eq('id',item.id).eq('firm_id',firm.id);
      await load();
      setError('El documento se guardó, pero no se pudo indexar: '+(err.message||'Error desconocido'));
    }finally{setBusy(false);}
  };

  const upload=async event=>{
    const file=event.target.files?.[0];
    event.target.value='';
    if(!file)return;
    if(file.size>maxBytes){setError('El archivo supera el límite de 20 MB.');return;}
    if(!allowedTypes.has(file.type)){setError('Tipo de archivo no permitido. Usá PDF, Office, JPG o PNG.');return;}
    setBusy(true);setError('');
    const safeName=file.name.replace(/[^a-zA-Z0-9._() -]/g,'_');
    const path=firm.id+'/'+caseItem.id+'/'+crypto.randomUUID()+'-'+safeName;
    try{
      const {error:uploadError}=await supabase.storage.from(bucket).upload(path,file,{contentType:file.type,upsert:false});
      if(uploadError)throw uploadError;
      const {data:documentRow,error:metadataError}=await supabase.from('documents').insert({
        firm_id:firm.id,case_id:caseItem.id,file_name:file.name,storage_path:path,
        mime_type:file.type,file_size:file.size,uploaded_by:user.id,index_status:'pending'
      }).select('id,file_name,storage_path').single();
      if(metadataError){
        await supabase.storage.from(bucket).remove([path]);
        throw metadataError;
      }
      await indexDocument(documentRow);
    }catch(err){setError(err.message||'No se pudo subir el documento.');}
    finally{setBusy(false);}
  };

  const download=async item=>{
    setBusy(true);setError('');
    try{
      const {data,error:signError}=await supabase.storage.from(bucket).createSignedUrl(item.storage_path,60);
      if(signError)throw signError;
      window.location.assign(data.signedUrl);
    }catch(err){setError(err.message||'No se pudo abrir el documento.');}
    finally{setBusy(false);}
  };

  const remove=async item=>{
    if(!canDelete||!window.confirm('¿Querés eliminar este documento del expediente?'))return;
    setBusy(true);setError('');
    try{
      const {error:metadataError}=await supabase.from('documents').delete().eq('id',item.id).eq('firm_id',firm.id);
      if(metadataError)throw metadataError;
      const {error:storageError}=await supabase.storage.from(bucket).remove([item.storage_path]);
      if(storageError)throw storageError;
      await load();
    }catch(err){setError(err.message||'No se pudo eliminar el documento.');}
    finally{setBusy(false);}
  };

  return <section className="case-documents">
    <div className="assignment-heading"><h3>Documentación del expediente</h3><span><ShieldCheck size={12}/> Archivos privados</span></div>
    <p className="documents-hint">Los archivos quedan guardados en una carpeta privada y respetan el acceso asignado a esta causa. Límite actual: 20 MB por archivo.</p>
    {error&&<div className="alert error">{error}<button onClick={()=>setError('')}><X size={14}/></button></div>}
    {canWrite&&<label className="upload-button"><FileUp size={15}/>{busy?'Procesando…':'Subir documento'}<input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png" disabled={busy} onChange={upload}/></label>}
    <div className="document-list">
      {loading&&<p className="empty-inline">Cargando documentos…</p>}
      {!loading&&!documents.length&&<p className="empty-inline">Todavía no hay documentos en este expediente.</p>}
      {documents.map(item=><div className="document-row" key={item.id}>
        <span className="document-icon"><FileText size={17}/></span>
        <span className="document-info"><strong>{item.file_name}</strong><small>{item.mime_type||'Archivo'} · {sizeLabel(item.file_size||0)} · {new Date(item.created_at).toLocaleDateString('es-AR')}</small><small className={item.index_status==='indexed'?'index-ok':item.index_status==='failed'?'index-error':'index-pending'}>{item.index_status==='indexed'?'Texto indexado':item.index_status==='unsupported'?'Formato sin indexación':item.index_status==='failed'?'Error al indexar':'Texto pendiente'}{item.indexed_at?' · '+new Date(item.indexed_at).toLocaleDateString('es-AR'):''}</small>{item.index_error&&item.index_status!=='unsupported'&&<small className="index-error">{item.index_error}</small>}</span>
        {canWrite&&item.index_status!=='indexed'&&item.index_status!=='unsupported'&&<button className="icon-button index-document" title="Indexar texto" disabled={busy} onClick={()=>indexDocument(item)}><ScanText size={15}/></button>}
        <button className="icon-button download-document" title="Abrir documento" disabled={busy} onClick={()=>download(item)}><Download size={15}/></button>
        {canDelete&&<button className="icon-button" title="Eliminar documento" disabled={busy} onClick={()=>remove(item)}><Trash2 size={15}/></button>}
      </div>)}
    </div>
  </section>;
}
