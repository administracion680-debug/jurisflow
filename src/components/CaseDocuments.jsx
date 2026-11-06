import { useCallback,useEffect,useState } from 'react';
import { FileText, FileUp, Download, Trash2, X, ShieldCheck } from 'lucide-react';

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

export default function CaseDocuments({supabase,firm,caseItem,user,canWrite}) {
  const [documents,setDocuments]=useState([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const load=useCallback(async()=>{
    setLoading(true);setError('');
    try{
      const {data,error:queryError}=await supabase.from('documents')
        .select('id,file_name,storage_path,mime_type,file_size,notes,created_at')
        .eq('firm_id',firm.id).eq('case_id',caseItem.id).order('created_at',{ascending:false});
      if(queryError)throw queryError;
      setDocuments(data||[]);
    }catch(err){setError(err.message||'No se pudieron cargar los documentos.');}
    finally{setLoading(false);}
  },[supabase,firm.id,caseItem.id]);
  useEffect(()=>{load();},[load]);

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
      const {error:metadataError}=await supabase.from('documents').insert({
        firm_id:firm.id,case_id:caseItem.id,file_name:file.name,storage_path:path,
        mime_type:file.type,file_size:file.size,uploaded_by:user.id
      });
      if(metadataError){
        await supabase.storage.from(bucket).remove([path]);
        throw metadataError;
      }
      await load();
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
    if(!canWrite||!window.confirm('¿Querés eliminar este documento del expediente?'))return;
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
        <span className="document-info"><strong>{item.file_name}</strong><small>{item.mime_type||'Archivo'} · {sizeLabel(item.file_size||0)} · {new Date(item.created_at).toLocaleDateString('es-AR')}</small></span>
        <button className="icon-button download-document" title="Abrir documento" disabled={busy} onClick={()=>download(item)}><Download size={15}/></button>
        {canWrite&&<button className="icon-button" title="Eliminar documento" disabled={busy} onClick={()=>remove(item)}><Trash2 size={15}/></button>}
      </div>)}
    </div>
  </section>;
}
