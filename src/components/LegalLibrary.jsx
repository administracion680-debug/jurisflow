import { useCallback,useEffect,useMemo,useState } from 'react';
import { BookOpen, Plus, Search, ExternalLink, ShieldCheck, AlertTriangle, X, CheckCircle2 } from 'lucide-react';

const kinds=[['law','Legislación'],['case_law','Jurisprudencia'],['regulation','Reglamentación'],['doctrine','Doctrina'],['other','Otro']];
const blank={title:'',resource_type:'law',jurisdiction:'Nacional',authority:'',citation:'',source_url:'',publication_date:'',summary:''};

export default function LegalLibrary({supabase,firm,user,role}) {
  const [sources,setSources]=useState([]);
  const [query,setQuery]=useState('');
  const [filter,setFilter]=useState('all');
  const [modal,setModal]=useState(false);
  const [form,setForm]=useState(blank);
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const canManage=['owner','admin','lawyer'].includes(role);

  const load=useCallback(async()=>{
    setLoading(true);setError('');
    try{
      const {data,error:queryError}=await supabase.from('legal_library')
        .select('id,firm_id,title,resource_type,jurisdiction,citation,source_url,summary,authority,publication_date,verification_status,verified_at,last_checked_at,created_at')
        .order('created_at',{ascending:false});
      if(queryError)throw queryError;
      setSources(data||[]);
    }catch(err){setError(err.message||'No se pudo cargar la biblioteca jurídica.');}
    finally{setLoading(false);}
  },[supabase]);

  useEffect(()=>{load();},[load]);
  const filtered=useMemo(()=>sources.filter(source=>{
    const matches=[source.title,source.citation,source.authority,source.jurisdiction,source.summary].join(' ').toLowerCase().includes(query.toLowerCase());
    return matches&&(filter==='all'||source.verification_status===filter);
  }),[sources,query,filter]);

  const setField=(key,value)=>setForm(current=>({...current,[key]:value}));
  const save=async event=>{
    event.preventDefault();setBusy(true);setError('');setNotice('');
    try{
      const {error:insertError}=await supabase.from('legal_library').insert({
        firm_id:firm.id,title:form.title.trim(),resource_type:form.resource_type,
        jurisdiction:form.jurisdiction.trim()||null,authority:form.authority.trim()||null,
        citation:form.citation.trim()||null,source_url:form.source_url.trim()||null,
        publication_date:form.publication_date||null,summary:form.summary.trim()||null,
        verification_status:'pending',created_by:user.id
      });
      if(insertError)throw insertError;
      setModal(false);setForm(blank);setNotice('Fuente agregada. Quedó pendiente de verificación manual.');await load();
    }catch(err){setError(err.message||'No se pudo guardar la fuente.');}
    finally{setBusy(false);}
  };

  const verify=async source=>{
    if(!canManage)return;
    if(!window.confirm('Confirmá que revisaste la fuente original, la cita y su vigencia antes de marcarla como verificada.'))return;
    setBusy(true);setError('');setNotice('');
    try{
      const {error:updateError}=await supabase.from('legal_library').update({verification_status:'verified'})
        .eq('id',source.id).eq('firm_id',firm.id);
      if(updateError)throw updateError;
      setNotice('Verificación manual registrada. Revisá periódicamente su vigencia.');await load();
    }catch(err){setError(err.message||'No se pudo verificar la fuente.');}
    finally{setBusy(false);}
  };

  const reject=async source=>{
    if(!canManage)return;
    setBusy(true);setError('');
    try{
      const {error:updateError}=await supabase.from('legal_library').update({verification_status:'rejected'})
        .eq('id',source.id).eq('firm_id',firm.id);
      if(updateError)throw updateError;
      await load();
    }catch(err){setError(err.message||'No se pudo actualizar la fuente.');}
    finally{setBusy(false);}
  };

  return <section className="content legal-library-content">
    <div className="heading"><div><label>INVESTIGACIÓN JURÍDICA</label><h1>Biblioteca jurídica</h1><p>Organizá legislación, jurisprudencia y fuentes del estudio.</p></div>
      {canManage&&<button className="primary" onClick={()=>{setForm(blank);setModal(true);}}><Plus/> Agregar fuente</button>}
    </div>
    {error&&<div className="alert error page-alert">{error}<button onClick={()=>setError('')}><X size={15}/></button></div>}
    {notice&&<div className="alert success page-alert">{notice}</div>}
    <div className="legal-note"><ShieldCheck size={17}/><span><strong>Fuentes con trazabilidad.</strong> Las fuentes agregadas por el estudio quedan pendientes hasta que un profesional revise la publicación original. La marca de verificación es una revisión manual, no una certificación automática de vigencia.</span></div>
    <section className="panel">
      <div className="panel-title"><div><h2>Fuentes jurídicas</h2><p>Las fuentes globales y las del estudio se muestran según tus permisos.</p></div>
        <select className="case-filter" value={filter} onChange={event=>setFilter(event.target.value)}><option value="all">Todos los estados</option><option value="verified">Verificadas manualmente</option><option value="pending">Pendientes</option><option value="rejected">Descartadas</option></select>
      </div>
      <div className="tools"><div className="search"><Search/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Buscar ley, fallo, autoridad, cita o jurisdicción…"/>{query&&<button onClick={()=>setQuery('')}><X/></button>}</div><small>{filtered.length} fuentes</small></div>
      <div className="source-list">
        {filtered.map(source=><article className="source-card" key={source.id}>
          <div className="source-icon"><BookOpen size={18}/></div>
          <div className="source-main">
            <div className="source-title-row"><strong>{source.title}</strong><em className={source.verification_status==='verified'?'active':source.verification_status==='rejected'?'inactive':'pending'}>{source.verification_status==='verified'?'Verificada manualmente':source.verification_status==='rejected'?'Descartada':'Pendiente'}</em></div>
            <div className="source-meta"><span>{kinds.find(item=>item[0]===source.resource_type)?.[1]||source.resource_type}</span><span>{source.jurisdiction||'Jurisdicción sin especificar'}</span>{source.authority&&<span>{source.authority}</span>}</div>
            {source.citation&&<p className="source-citation">{source.citation}</p>}
            {source.summary&&<p className="source-summary">{source.summary}</p>}
            <div className="source-footer">{source.publication_date&&<small>Publicación: {new Date(source.publication_date+'T12:00:00').toLocaleDateString('es-AR')}</small>}{source.verified_at&&<small>Revisada: {new Date(source.verified_at).toLocaleDateString('es-AR')}</small>}
              {source.source_url&&<a href={source.source_url} target="_blank" rel="noreferrer"><ExternalLink size={13}/> Abrir fuente</a>}
            </div>
          </div>
          {canManage&&source.firm_id===firm.id&&source.verification_status!=='verified'&&<div className="source-actions"><button className="secondary small-action" disabled={busy} onClick={()=>verify(source)}><CheckCircle2 size={13}/> Verificar</button><button className="icon-button" disabled={busy} title="Descartar fuente" onClick={()=>reject(source)}><AlertTriangle size={14}/></button></div>}
        </article>)}
        {!loading&&!filtered.length&&<div className="empty">No hay fuentes para mostrar con estos filtros.</div>}
        {loading&&<div className="empty">Cargando biblioteca…</div>}
      </div>
    </section>
    <footer>JurisFlow Argentina <span>•</span> Las citas deben comprobarse en la publicación oficial antes de utilizarlas en un escrito</footer>
    {modal&&<div className="overlay" onMouseDown={event=>{if(event.target===event.currentTarget)setModal(false);}}>
      <form className="modal" onSubmit={save}><div className="modal-head"><div><label>BIBLIOTECA JURÍDICA</label><h2>Agregar fuente</h2><p>Registrá el origen y la cita exacta para poder verificarla.</p></div><button type="button" className="close" onClick={()=>setModal(false)}><X/></button></div>
        <div className="form-grid">
          <label className="field full"><span>Título</span><input required value={form.title} onChange={event=>setField('title',event.target.value)}/></label>
          <label className="field"><span>Tipo de fuente</span><select value={form.resource_type} onChange={event=>setField('resource_type',event.target.value)}>{kinds.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
          <label className="field"><span>Jurisdicción</span><input value={form.jurisdiction} onChange={event=>setField('jurisdiction',event.target.value)} placeholder="Nacional, Federal, Provincia…"/></label>
          <label className="field"><span>Autoridad emisora / Tribunal</span><input value={form.authority} onChange={event=>setField('authority',event.target.value)} placeholder="Congreso, CSJN, tribunal…"/></label>
          <label className="field"><span>Fecha de publicación</span><input type="date" value={form.publication_date} onChange={event=>setField('publication_date',event.target.value)}/></label>
          <label className="field full"><span>Cita exacta</span><input required value={form.citation} onChange={event=>setField('citation',event.target.value)} placeholder="Ley, artículo, expediente, fallo…"/></label>
          <label className="field full"><span>URL oficial HTTPS</span><input type="url" required value={form.source_url} onChange={event=>setField('source_url',event.target.value)} placeholder="https://…"/></label>
          <label className="field full"><span>Resumen / Notas de revisión</span><textarea rows="3" value={form.summary} onChange={event=>setField('summary',event.target.value)}/></label>
        </div>
        <div className="modal-actions"><button type="button" className="secondary" onClick={()=>setModal(false)}>Cancelar</button><button className="primary" disabled={busy}><Plus/>{busy?'Guardando…':'Guardar pendiente'}</button></div>
      </form>
    </div>}
  </section>;
}
