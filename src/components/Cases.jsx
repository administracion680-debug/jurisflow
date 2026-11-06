import { useCallback, useEffect, useMemo, useState } from 'react';
import { FolderOpen, Plus, Search, Eye, Pencil, Trash2, X, MapPin, Users, CalendarDays, ShieldCheck, UserPlus, UserMinus, ChevronLeft } from 'lucide-react';
import CaseDocuments from './CaseDocuments';

const provinces = [
  'Buenos Aires','Catamarca','Chaco','Chubut','Ciudad Autónoma de Buenos Aires','Córdoba',
  'Corrientes','Entre Ríos','Formosa','Jujuy','La Pampa','La Rioja','Mendoza','Misiones',
  'Neuquén','Río Negro','Salta','San Juan','San Luis','Santa Cruz','Santa Fe',
  'Santiago del Estero','Tierra del Fuego, Antártida e Islas del Atlántico Sur','Tucumán'
];
const branches = [
  ['penal','Penal'],['civil','Civil'],['commercial','Comercial'],['family','Familia'],
  ['labor','Laboral'],['administrative','Contencioso administrativo'],['tax','Tributario'],
  ['social_security','Previsional'],['execution','Ejecución'],['juvenile','Penal juvenil'],['other','Otro']
];
const initialForm = {
  title:'',case_number:'',client_id:'',jurisdiction_level:'provincial',province:'',locality:'',
  branch:'civil',court_name:'',court_department:'',matter_type:'',process_stage:'',
  plaintiff:'',defendant:'',start_date:'',description:'',status:'active'
};
const jurisdictionLabels={provincial:'Provincial',national:'Nacional',federal:'Federal',caba:'Justicia de CABA'};
const statusLabels={active:'Activo',pending:'En trámite',closed:'Cerrado',archived:'Archivado'};
const roleLabels={owner:'Titular',admin:'Administrador',lawyer:'Abogado/a',assistant:'Asistente',read_only:'Solo lectura'};

export default function Cases({supabase,firm,user,role,onCount}) {
  const [cases,setCases]=useState([]);
  const [clients,setClients]=useState([]);
  const [assignments,setAssignments]=useState([]);
  const [members,setMembers]=useState([]);
  const [profiles,setProfiles]=useState({});
  const [query,setQuery]=useState('');
  const [filter,setFilter]=useState('all');
  const [selected,setSelected]=useState(null);
  const [modal,setModal]=useState(false);
  const [editing,setEditing]=useState(null);
  const [form,setForm]=useState(initialForm);
  const [assignmentUser,setAssignmentUser]=useState('');
  const [assignmentLevel,setAssignmentLevel]=useState('write');
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const canCreate=['owner','admin','lawyer'].includes(role);
  const canManageAssignments=['owner','admin'].includes(role);
  const canDelete=['owner','admin'].includes(role);

  const load=useCallback(async()=>{
    if(!firm?.id)return;
    setLoading(true);setError('');
    try{
      const [caseResult,assignmentResult,memberResult,clientResult]=await Promise.all([
        supabase.from('cases').select('id,firm_id,client_id,title,case_number,court,jurisdiction,status,description,plaintiff,defendant,start_date,jurisdiction_level,province,locality,branch,court_name,court_department,matter_type,process_stage,created_at,created_by').eq('firm_id',firm.id).order('updated_at',{ascending:false}),
        supabase.from('case_members').select('id,case_id,user_id,access_level,assigned_by').eq('firm_id',firm.id),
        supabase.from('firm_members').select('user_id,role').eq('firm_id',firm.id),
        supabase.from('clients').select('id,full_name,first_name,last_name').eq('firm_id',firm.id).order('full_name')
      ]);
      if(caseResult.error)throw caseResult.error;
      if(assignmentResult.error)throw assignmentResult.error;
      if(memberResult.error)throw memberResult.error;
      if(clientResult.error)throw clientResult.error;
      setCases(caseResult.data||[]);
      setClients(clientResult.data||[]);
      onCount?.((caseResult.data||[]).length);
      setAssignments(assignmentResult.data||[]);
      setMembers(memberResult.data||[]);
      const ids=[...new Set((memberResult.data||[]).map(row=>row.user_id))];
      if(ids.length){
        const {data:profileRows,error:profileError}=await supabase.from('profiles').select('id,full_name,phone').in('id',ids);
        if(profileError)throw profileError;
        setProfiles(Object.fromEntries((profileRows||[]).map(row=>[row.id,row])));
      }else setProfiles({});
    }catch(err){setError(err.message||'No se pudieron cargar los expedientes.');}
    finally{setLoading(false);}
  },[firm?.id,supabase,onCount]);

  useEffect(()=>{load();},[load]);

  const filtered=useMemo(()=>cases.filter(item=>{
    const haystack=[item.title,item.case_number,item.court_name,item.court,item.province,item.locality,item.plaintiff,item.defendant].join(' ').toLowerCase();
    return haystack.includes(query.toLowerCase())&&(filter==='all'||item.status===filter);
  }),[cases,query,filter]);

  const permissionFor=caseId=>assignments.find(item=>item.case_id===caseId&&item.user_id===user.id)?.access_level;
  const mayEdit=caseItem=>['owner','admin'].includes(role)||(role!=='read_only'&&permissionFor(caseItem.id)==='write');
  const setField=(key,value)=>setForm(current=>({...current,[key]:value}));
  const startNew=()=>{setEditing(null);setForm(initialForm);setModal(true);setSelected(null);};
  const startEdit=item=>{
    setEditing(item.id);
    setForm({...initialForm,...item,jurisdiction_level:item.jurisdiction_level||'provincial',branch:item.branch||'other'});
    setModal(true);setSelected(null);
  };

  const save=async event=>{
    event.preventDefault();setBusy(true);setError('');
    const payload={
      firm_id:firm.id,title:form.title.trim(),case_number:form.case_number.trim()||null,client_id:form.client_id||null,
      jurisdiction_level:form.jurisdiction_level,province:form.province||null,
      locality:form.locality.trim()||null,branch:form.branch,
      court_name:form.court_name.trim()||null,court_department:form.court_department.trim()||null,
      court:form.court_name.trim()||null,jurisdiction:form.jurisdiction_level,
      matter_type:form.matter_type.trim()||null,process_stage:form.process_stage.trim()||null,
      plaintiff:form.plaintiff.trim()||null,defendant:form.defendant.trim()||null,
      start_date:form.start_date||null,description:form.description.trim()||null,status:form.status
    };
    try{
      const result=editing
        ? await supabase.from('cases').update(payload).eq('id',editing).eq('firm_id',firm.id)
        : await supabase.from('cases').insert({...payload,created_by:user.id});
      if(result.error)throw result.error;
      setModal(false);setEditing(null);await load();
    }catch(err){setError(err.message||'No se pudo guardar el expediente.');}
    finally{setBusy(false);}
  };

  const remove=async item=>{
    if(!canDelete||!window.confirm('¿Querés eliminar este expediente?'))return;
    setBusy(true);setError('');
    try{
      const {error:deleteError}=await supabase.from('cases').delete().eq('id',item.id).eq('firm_id',firm.id);
      if(deleteError)throw deleteError;
      setSelected(null);await load();
    }catch(err){setError(err.message||'No se pudo eliminar el expediente.');}
    finally{setBusy(false);}
  };

  const assign=async event=>{
    event.preventDefault();if(!selected||!assignmentUser)return;
    setBusy(true);setError('');
    try{
      const {error:saveError}=await supabase.from('case_members').upsert({
        firm_id:firm.id,case_id:selected.id,user_id:assignmentUser,
        access_level:assignmentLevel,assigned_by:user.id
      },{onConflict:'firm_id,case_id,user_id'});
      if(saveError)throw saveError;
      await load();
    }catch(err){setError(err.message||'No se pudo asignar el integrante.');}
    finally{setBusy(false);}
  };

  const unassign=async userId=>{
    if(!selected||!canManageAssignments)return;
    setBusy(true);setError('');
    try{
      const {error:removeError}=await supabase.from('case_members').delete()
        .eq('firm_id',firm.id).eq('case_id',selected.id).eq('user_id',userId);
      if(removeError)throw removeError;
      await load();
    }catch(err){setError(err.message||'No se pudo quitar la asignación.');}
    finally{setBusy(false);}
  };

  const currentAssignments=selected?assignments.filter(item=>item.case_id===selected.id):[];
  const availableMembers=members.filter(item=>item.role!=='owner'&&item.role!=='admin');
  const displayName=id=>profiles[id]?.full_name||profiles[id]?.phone||'Integrante '+id.slice(0,8);

  const input=(label,key,required=false,type='text')=><label className="field"><span>{label}{required?' *':''}</span><input type={type} required={required} value={form[key]||''} onChange={event=>setField(key,event.target.value)}/></label>;

  return <section className="content cases-content">
    <div className="heading"><div><label>GESTIÓN DEL ESTUDIO</label><h1>Expedientes</h1><p>Organizá causas por jurisdicción, fuero, tribunal y etapa procesal.</p></div>
      {canCreate&&<button className="primary" onClick={startNew}><Plus/> Nuevo expediente</button>}
    </div>
    {error&&<div className="alert error page-alert">{error}<button onClick={()=>setError('')}><X size={15}/></button></div>}
    <div className="stats">
      <article><div className="stat-symbol blue"><FolderOpen/></div><span>Total de expedientes<strong>{cases.length}</strong><small>En este estudio</small></span></article>
      <article><div className="stat-symbol green"><ShieldCheck/></div><span>Activos<strong>{cases.filter(item=>item.status==='active'||item.status==='pending').length}</strong><small>En seguimiento</small></span></article>
      <article><div className="stat-symbol amber"><Users/></div><span>Mis causas<strong>{cases.filter(item=>permissionFor(item.id)||['owner','admin'].includes(role)).length}</strong><small>Con acceso autorizado</small></span></article>
    </div>
    <section className="panel">
      <div className="panel-title"><div><h2>Listado de expedientes</h2><p>Solo se muestran las causas a las que tu cuenta tiene acceso.</p></div>
        <select className="case-filter" value={filter} onChange={event=>setFilter(event.target.value)}><option value="all">Todos los estados</option><option value="active">Activo</option><option value="pending">En trámite</option><option value="closed">Cerrado</option><option value="archived">Archivado</option></select>
      </div>
      <div className="tools"><div className="search"><Search/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Buscar por carátula, número, tribunal, localidad o partes…"/>{query&&<button onClick={()=>setQuery('')}><X/></button>}</div><small>{filtered.length} resultados</small></div>
      <div className="table-scroll"><table><thead><tr><th>EXPEDIENTE</th><th>JURISDICCIÓN / FUERO</th><th>TRIBUNAL</th><th>LOCALIDAD</th><th>ESTADO</th><th></th></tr></thead><tbody>
        {filtered.map(item=><tr key={item.id}>
          <td><div className="client"><b><FolderOpen size={15}/></b><span><strong>{item.title}</strong><small>{item.case_number||'Sin número cargado'}</small></span></div></td>
          <td>{jurisdictionLabels[item.jurisdiction_level]||'Sin definir'}<small className="province">{branches.find(entry=>entry[0]===item.branch)?.[1]||'Fuero pendiente'}</small></td>
          <td>{item.court_name||item.court||'—'}<small className="province">{item.court_department||''}</small></td>
          <td><span className="location"><MapPin/>{item.locality||'—'}</span><small className="province">{item.province||''}</small></td>
          <td><em className={item.status==='active'||item.status==='pending'?'active':'inactive'}>{statusLabels[item.status]||item.status}</em></td>
          <td><div className="actions"><button title="Ver expediente" onClick={()=>setSelected(item)}><Eye/></button>{mayEdit(item)&&<button title="Editar" onClick={()=>startEdit(item)}><Pencil/></button>}{canDelete&&<button title="Eliminar" onClick={()=>remove(item)}><Trash2/></button>}</div></td>
        </tr>)}
        {!filtered.length&&<tr><td colSpan="6" className="empty">{loading?'Cargando expedientes…':'No hay expedientes para mostrar con estos filtros.'}</td></tr>}
      </tbody></table></div>
    </section>

    {modal&&<div className="overlay" onMouseDown={event=>{if(event.target===event.currentTarget)setModal(false)}}>
      <form className="modal case-modal" onSubmit={save}>
        <div className="modal-head"><div><label>GESTIÓN DE CAUSAS</label><h2>{editing?'Editar expediente':'Nuevo expediente'}</h2><p>Separá el ámbito judicial del fuero y del tribunal.</p></div><button type="button" className="close" onClick={()=>setModal(false)}><X/></button></div>
        <div className="form-grid">
          {input('Carátula / Título','title',true)}{input('Número de expediente','case_number')}
          <label className="field full"><span>Cliente vinculado</span><select value={form.client_id||''} onChange={event=>setField('client_id',event.target.value)}><option value="">Sin cliente asociado</option>{clients.map(client=><option key={client.id} value={client.id}>{client.full_name||[client.first_name,client.last_name].filter(Boolean).join(' ')}</option>)}</select></label>
          <label className="field"><span>Ámbito judicial</span><select value={form.jurisdiction_level} onChange={event=>setField('jurisdiction_level',event.target.value)}><option value="provincial">Justicia provincial</option><option value="national">Justicia nacional</option><option value="federal">Justicia federal</option><option value="caba">Justicia de CABA</option></select></label>
          <label className="field"><span>Fuero / Materia</span><select value={form.branch} onChange={event=>setField('branch',event.target.value)}>{branches.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
          <label className="field"><span>Provincia</span><select value={form.province} onChange={event=>setField('province',event.target.value)}><option value="">Seleccionar provincia</option>{provinces.map(item=><option key={item}>{item}</option>)}</select></label>
          {input('Localidad','locality')}
          {input('Tribunal / Juzgado','court_name')}{input('Secretaría / Sala','court_department')}
          {input('Tipo de proceso','matter_type')}{input('Etapa procesal','process_stage')}
          {input('Parte actora / Demandante','plaintiff')}{input('Parte demandada / Contraparte','defendant')}
          {input('Fecha de inicio','start_date',false,'date')}
          <label className="field"><span>Estado</span><select value={form.status} onChange={event=>setField('status',event.target.value)}><option value="active">Activo</option><option value="pending">En trámite</option><option value="closed">Cerrado</option><option value="archived">Archivado</option></select></label>
          <label className="field full"><span>Descripción / Observaciones</span><textarea rows="3" value={form.description||''} onChange={event=>setField('description',event.target.value)}/></label>
        </div>
        <div className="modal-actions"><button type="button" className="secondary" onClick={()=>setModal(false)}>Cancelar</button><button className="primary" disabled={busy}><Plus/>{busy?'Guardando…':editing?'Guardar cambios':'Crear expediente'}</button></div>
      </form>
    </div>}

    {selected&&<div className="overlay" onMouseDown={event=>{if(event.target===event.currentTarget)setSelected(null)}}>
      <section className="modal case-detail">
        <div className="modal-head"><div><label>FICHA DEL EXPEDIENTE</label><h2>{selected.title}</h2><p>{selected.case_number||'Número no informado'} · {jurisdictionLabels[selected.jurisdiction_level]||'Jurisdicción sin definir'}</p></div><button className="close" onClick={()=>setSelected(null)}><X/></button></div>
        <div className="case-detail-grid">
          {[
            ['Fuero',branches.find(entry=>entry[0]===selected.branch)?.[1]],
            ['Provincia',selected.province],['Localidad',selected.locality],
            ['Tribunal',selected.court_name||selected.court],['Secretaría / Sala',selected.court_department],
            ['Tipo de proceso',selected.matter_type],['Etapa procesal',selected.process_stage],
            ['Parte actora',selected.plaintiff],['Parte demandada',selected.defendant],
            ['Fecha de inicio',selected.start_date],['Estado',statusLabels[selected.status]]
          ].map(([label,value])=><div key={label}><small>{label}</small><strong>{value||'—'}</strong></div>)}
        </div>
        <div className="notes"><small>DESCRIPCIÓN</small><p>{selected.description||'Sin descripción cargada.'}</p></div>
        <CaseDocuments supabase={supabase} firm={firm} caseItem={selected} user={user} canWrite={mayEdit(selected)}/>
        <div className="assignment-section">
          <div className="assignment-heading"><h3>Integrantes asignados</h3>{canManageAssignments&&<span>Solo titular y administrador pueden modificar accesos</span>}</div>
          {currentAssignments.length?currentAssignments.map(item=><div className="assignment-row" key={item.user_id}>
            <span><strong>{displayName(item.user_id)}</strong><small>{roleLabels[members.find(member=>member.user_id===item.user_id)?.role]||'Integrante'} · {item.access_level==='write'?'Lectura y escritura':'Solo lectura'}</small></span>
            {canManageAssignments&&<button className="icon-button" title="Quitar acceso" onClick={()=>unassign(item.user_id)}><UserMinus size={15}/></button>}
          </div>):<p className="empty-inline">No hay asignaciones adicionales visibles.</p>}
          {canManageAssignments&&<form className="assign-form" onSubmit={assign}>
            <select required value={assignmentUser} onChange={event=>setAssignmentUser(event.target.value)}><option value="">Elegir integrante del estudio</option>{availableMembers.map(member=><option key={member.user_id} value={member.user_id}>{displayName(member.user_id)} · {roleLabels[member.role]||member.role}</option>)}</select>
            <select value={assignmentLevel} onChange={event=>setAssignmentLevel(event.target.value)}><option value="write">Lectura y escritura</option><option value="read">Solo lectura</option></select>
            <button className="secondary" disabled={busy}><UserPlus size={15}/> Asignar</button>
          </form>}
        </div>
        <div className="modal-actions"><button className="secondary" onClick={()=>setSelected(null)}><ChevronLeft size={15}/> Volver</button>{mayEdit(selected)&&<button className="primary" onClick={()=>startEdit(selected)}><Pencil/> Editar expediente</button>}</div>
      </section>
    </div>}
  </section>;
}
