import { useCallback,useEffect,useMemo,useState } from 'react';
import { CalendarDays, Clock3, Plus, X, CheckCircle2, MapPin, FileText, Search } from 'lucide-react';

const blank={title:'',description:'',case_id:'',event_type:'hearing',starts_at:'',ends_at:'',location:'',due_at:'',status:'pending'};
const dateValue=value=>value?new Date(value).toLocaleString('es-AR',{dateStyle:'medium',timeStyle:'short'}):'—';

export default function Agenda({supabase,firm,user,role}) {
  const [events,setEvents]=useState([]);
  const [deadlines,setDeadlines]=useState([]);
  const [cases,setCases]=useState([]);
  const [writableCaseIds,setWritableCaseIds]=useState([]);
  const [tab,setTab]=useState('events');
  const [modal,setModal]=useState(false);
  const [form,setForm]=useState(blank);
  const [query,setQuery]=useState('');
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const canCreate=['owner','admin','lawyer','assistant'].includes(role);

  const load=useCallback(async()=>{
    if(!firm?.id)return;
    setLoading(true);setError('');
    try{
      const [eventResult,deadlineResult,caseResult,assignmentResult]=await Promise.all([
        supabase.from('calendar_events').select('id,case_id,title,description,event_type,starts_at,ends_at,location').eq('firm_id',firm.id).order('starts_at'),
        supabase.from('deadlines').select('id,case_id,title,description,due_at,status').eq('firm_id',firm.id).order('due_at'),
        supabase.from('cases').select('id,title,case_number').eq('firm_id',firm.id).order('title'),
        supabase.from('case_members').select('case_id,access_level').eq('firm_id',firm.id).eq('user_id',user.id)
      ]);
      if(eventResult.error)throw eventResult.error;
      if(deadlineResult.error)throw deadlineResult.error;
      if(caseResult.error)throw caseResult.error;
      if(assignmentResult.error)throw assignmentResult.error;
      setEvents(eventResult.data||[]);
      setDeadlines(deadlineResult.data||[]);
      setCases(caseResult.data||[]);
      setWritableCaseIds((assignmentResult.data||[]).filter(row=>row.access_level==='write').map(row=>row.case_id));
    }catch(err){setError(err.message||'No se pudo cargar la agenda.');}
    finally{setLoading(false);}
  },[firm?.id,user.id,supabase]);

  useEffect(()=>{load();},[load]);
  const caseName=id=>cases.find(item=>item.id===id)?.title||'Agenda general';
  const filteredEvents=useMemo(()=>events.filter(item=>[item.title,item.description,item.location,caseName(item.case_id)].join(' ').toLowerCase().includes(query.toLowerCase())),[events,query,cases]);
  const filteredDeadlines=useMemo(()=>deadlines.filter(item=>[item.title,item.description,caseName(item.case_id)].join(' ').toLowerCase().includes(query.toLowerCase())),[deadlines,query,cases]);
  const setField=(key,value)=>setForm(current=>({...current,[key]:value}));
  const openNew=()=>{setForm({...blank,starts_at:new Date(Date.now()+3600000).toISOString().slice(0,16),due_at:new Date(Date.now()+86400000).toISOString().slice(0,16)});setModal(true);setError('');};
  const save=async event=>{
    event.preventDefault();setBusy(true);setError('');
    try{
      let result;
      if(tab==='events'){
        result=await supabase.from('calendar_events').insert({
          firm_id:firm.id,case_id:form.case_id||null,title:form.title.trim(),
          description:form.description.trim()||null,event_type:form.event_type,
          starts_at:new Date(form.starts_at).toISOString(),
          ends_at:form.ends_at?new Date(form.ends_at).toISOString():null,
          location:form.location.trim()||null,created_by:user.id
        });
      }else{
        result=await supabase.from('deadlines').insert({
          firm_id:firm.id,case_id:form.case_id||null,title:form.title.trim(),
          description:form.description.trim()||null,due_at:new Date(form.due_at).toISOString(),
          status:'pending',created_by:user.id
        });
      }
      if(result.error)throw result.error;
      setModal(false);await load();
    }catch(err){setError(err.message||'No se pudo guardar el elemento de agenda.');}
    finally{setBusy(false);}
  };

  const setDeadlineStatus=async(item,status)=>{
    setBusy(true);setError('');
    try{
      const {error:updateError}=await supabase.from('deadlines').update({status}).eq('id',item.id).eq('firm_id',firm.id);
      if(updateError)throw updateError;
      await load();
    }catch(err){setError(err.message||'No se pudo actualizar el vencimiento.');}
    finally{setBusy(false);}
  };

  const canWriteCase=id=>!id||['owner','admin'].includes(role)||writableCaseIds.includes(id);
  const writableCases=cases.filter(item=>canWriteCase(item.id));
  const upcomingEvents=filteredEvents.filter(item=>new Date(item.starts_at)>=new Date());
  const upcomingDeadlines=filteredDeadlines.filter(item=>item.status==='pending'&&new Date(item.due_at)>=new Date());

  return <section className="content agenda-content">
    <div className="heading"><div><label>ORGANIZACIÓN DEL ESTUDIO</label><h1>Agenda y vencimientos</h1><p>Registrá audiencias, reuniones, tareas y fechas importantes.</p></div>
      {canCreate&&<button className="primary" onClick={openNew}><Plus/> {tab==='events'?'Nuevo evento':'Nuevo vencimiento'}</button>}
    </div>
    {error&&<div className="alert error page-alert">{error}<button onClick={()=>setError('')}><X size={15}/></button></div>}
    <div className="stats">
      <article><div className="stat-symbol blue"><CalendarDays/></div><span>Eventos próximos<strong>{upcomingEvents.length}</strong><small>Audiencias y reuniones</small></span></article>
      <article><div className="stat-symbol amber"><Clock3/></div><span>Vencimientos pendientes<strong>{filteredDeadlines.filter(item=>item.status==='pending').length}</strong><small>Requieren seguimiento</small></span></article>
      <article><div className="stat-symbol green"><CheckCircle2/></div><span>Completados<strong>{filteredDeadlines.filter(item=>item.status==='completed').length}</strong><small>Vencimientos resueltos</small></span></article>
    </div>
    <section className="panel">
      <div className="panel-title agenda-tabs"><div><h2>{tab==='events'?'Eventos y audiencias':'Vencimientos y tareas'}</h2><p>Los elementos vinculados a causas respetan los permisos del expediente.</p></div>
        <div className="tab-switch"><button className={tab==='events'?'selected':''} onClick={()=>setTab('events')}>Eventos</button><button className={tab==='deadlines'?'selected':''} onClick={()=>setTab('deadlines')}>Vencimientos</button></div>
      </div>
      <div className="tools"><div className="search"><Search/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Buscar evento, vencimiento o expediente…"/>{query&&<button onClick={()=>setQuery('')}><X/></button>}</div><small>{tab==='events'?filteredEvents.length:filteredDeadlines.length} resultados</small></div>
      <div className="agenda-list">
        {tab==='events'&&filteredEvents.map(item=><article className="agenda-item" key={item.id}>
          <div className="agenda-date"><strong>{new Date(item.starts_at).toLocaleDateString('es-AR',{day:'2-digit'})}</strong><small>{new Date(item.starts_at).toLocaleDateString('es-AR',{month:'short'})}</small></div>
          <div className="agenda-main"><strong>{item.title}</strong><small><Clock3 size={12}/> {dateValue(item.starts_at)}{item.ends_at?' – '+dateValue(item.ends_at):''}</small><small><FileText size={12}/> {caseName(item.case_id)}</small>{item.location&&<small><MapPin size={12}/> {item.location}</small>}{item.description&&<p>{item.description}</p>}</div>
          <span className="agenda-kind">{item.event_type==='hearing'?'Audiencia':item.event_type==='meeting'?'Reunión':'Otro'}</span>
        </article>)}
        {tab==='deadlines'&&filteredDeadlines.map(item=><article className="agenda-item" key={item.id}>
          <div className="agenda-date deadline"><strong>{new Date(item.due_at).toLocaleDateString('es-AR',{day:'2-digit'})}</strong><small>{new Date(item.due_at).toLocaleDateString('es-AR',{month:'short'})}</small></div>
          <div className="agenda-main"><strong>{item.title}</strong><small><Clock3 size={12}/> Vence: {dateValue(item.due_at)}</small><small><FileText size={12}/> {caseName(item.case_id)}</small>{item.description&&<p>{item.description}</p>}</div>
          <div className="deadline-actions"><em className={item.status==='completed'?'active':'inactive'}>{item.status==='completed'?'Completado':item.status==='cancelled'?'Cancelado':'Pendiente'}</em>{canCreate&&item.status==='pending'&&canWriteCase(item.case_id)&&<button className="secondary small-action" disabled={busy} onClick={()=>setDeadlineStatus(item,'completed')}><CheckCircle2 size={13}/> Completar</button>}</div>
        </article>)}
        {!loading&&((tab==='events'&&!filteredEvents.length)||(tab==='deadlines'&&!filteredDeadlines.length))&&<div className="empty">{tab==='events'?'Todavía no hay eventos registrados.':'No hay vencimientos para mostrar.'}</div>}
        {loading&&<div className="empty">Cargando agenda…</div>}
      </div>
    </section>
    <footer>JurisFlow Argentina <span>•</span> Agenda del estudio <span>•</span> Los vencimientos no sustituyen el control profesional de plazos</footer>
    {modal&&<div className="overlay" onMouseDown={event=>{if(event.target===event.currentTarget)setModal(false)}}>
      <form className="modal" onSubmit={save}><div className="modal-head"><div><label>AGENDA DEL ESTUDIO</label><h2>{tab==='events'?'Nuevo evento':'Nuevo vencimiento'}</h2><p>Vinculá el registro a una causa para aplicar sus permisos.</p></div><button type="button" className="close" onClick={()=>setModal(false)}><X/></button></div>
        <div className="form-grid">
          <label className="field full"><span>Expediente relacionado</span><select value={form.case_id} onChange={event=>setField('case_id',event.target.value)}><option value="">Agenda general del estudio</option>{writableCases.map(item=><option key={item.id} value={item.id}>{item.title} {item.case_number?'· '+item.case_number:''}</option>)}</select></label>
          <label className="field full"><span>Título</span><input required value={form.title} onChange={event=>setField('title',event.target.value)} placeholder={tab==='events'?'Ej. Audiencia preliminar':'Ej. Presentar contestación'}/></label>
          {tab==='events'?<>
            <label className="field"><span>Tipo de evento</span><select value={form.event_type} onChange={event=>setField('event_type',event.target.value)}><option value="hearing">Audiencia</option><option value="meeting">Reunión</option><option value="other">Otro</option></select></label>
            <label className="field"><span>Fecha y hora</span><input type="datetime-local" required value={form.starts_at} onChange={event=>setField('starts_at',event.target.value)}/></label>
            <label className="field"><span>Finalización</span><input type="datetime-local" value={form.ends_at} onChange={event=>setField('ends_at',event.target.value)}/></label>
            <label className="field"><span>Lugar / Enlace</span><input value={form.location} onChange={event=>setField('location',event.target.value)}/></label>
          </>:<label className="field"><span>Fecha y hora límite</span><input type="datetime-local" required value={form.due_at} onChange={event=>setField('due_at',event.target.value)}/></label>}
          <label className="field full"><span>Descripción</span><textarea rows="3" value={form.description} onChange={event=>setField('description',event.target.value)}/></label>
        </div>
        <div className="modal-actions"><button type="button" className="secondary" onClick={()=>setModal(false)}>Cancelar</button><button className="primary" disabled={busy}><Plus/>{busy?'Guardando…':'Guardar'}</button></div>
      </form>
    </div>}
  </section>;
}
