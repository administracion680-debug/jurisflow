import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Scale, Users, FolderOpen, CalendarDays, Settings, Search, Plus, Bell, CreditCard, BookOpen,
  Menu, X, Pencil, Trash2, Eye, MapPin, Phone, Mail, FileText, UserRound,
  Filter, Download, LogOut, LockKeyhole, Building2, ChevronDown, ShieldCheck
} from 'lucide-react';
import { supabase } from './lib/supabase';
import Cases from './components/Cases';
import Agenda from './components/Agenda';
import Members from './components/Members';
import Fees from './components/Fees';
import LegalLibrary from './components/LegalLibrary';
import LegalResearch from './components/LegalResearch';

const provinces = [
  'Buenos Aires','Catamarca','Chaco','Chubut','Ciudad Autónoma de Buenos Aires',
  'Córdoba','Corrientes','Entre Ríos','Formosa','Jujuy','La Pampa','La Rioja',
  'Mendoza','Misiones','Neuquén','Río Negro','Salta','San Juan','San Luis',
  'Santa Cruz','Santa Fe','Santiago del Estero',
  'Tierra del Fuego, Antártida e Islas del Atlántico Sur','Tucumán'
];

const blankClient = {
  firstName:'', lastName:'', type:'Persona física', document:'', phone:'',
  email:'', address:'', province:'', city:'', notes:'', status:'active'
};

function AuthScreen({inviteToken}) {
  const [mode,setMode] = useState('login');
  const [form,setForm] = useState({name:'',email:'',password:''});
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState('');
  const [error,setError] = useState('');

  const change = (key,value) => setForm(current=>({...current,[key]:value}));
  const submit = async event => {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      if (mode==='signup') {
        const {data,error:authError} = await supabase.auth.signUp({
          email:form.email.trim(),
          password:form.password,
          options:{data:{full_name:form.name.trim()},emailRedirectTo:inviteToken?window.location.origin+'/?invite='+encodeURIComponent(inviteToken):window.location.origin}
        });
        if (authError) throw authError;
        setMessage(data.session
          ? 'Cuenta creada. Ya podés ingresar a JurisFlow.'
          : 'Te enviamos un correo para confirmar tu cuenta. Después de confirmarlo, volvé e iniciá sesión.');
        if (data.session) setMode('login');
      } else if (mode==='reset') {
        const {error:authError} = await supabase.auth.resetPasswordForEmail(form.email.trim(),{
          redirectTo:window.location.origin
        });
        if (authError) throw authError;
        setMessage('Si el correo está registrado, recibirás instrucciones para recuperar el acceso.');
      } else {
        const {error:authError} = await supabase.auth.signInWithPassword({
          email:form.email.trim(),password:form.password
        });
        if (authError) throw authError;
      }
    } catch (err) {
      setError(err.message || 'No se pudo completar la operación.');
    } finally { setBusy(false); }
  };

  return <main className="auth-page">
    <section className="auth-card">
      <div className="auth-brand"><span className="brand-mark"><Scale size={25}/></span>
        <div><strong>JurisFlow</strong><small>ARGENTINA · GESTIÓN JURÍDICA</small></div>
      </div>
      <div className="auth-intro">
        <span className="eyebrow">PLATAFORMA PROFESIONAL</span>
        <h1>{mode==='signup'?'Creá tu cuenta':mode==='reset'?'Recuperar acceso':'Bienvenido a JurisFlow'}</h1>
        <p>{mode==='signup'?'Registrate para crear tu espacio de trabajo jurídico.':mode==='reset'?'Te enviaremos instrucciones para recuperar tu cuenta.':'Ingresá de forma segura a tu estudio jurídico.'}</p>
      </div>
      <form onSubmit={submit} className="auth-form">
        {mode==='signup'&&<label className="field"><span>Nombre completo</span><input required autoComplete="name" value={form.name} onChange={e=>change('name',e.target.value)} placeholder="Tu nombre y apellido"/></label>}
        <label className="field"><span>Correo electrónico</span><input required type="email" autoComplete="email" value={form.email} onChange={e=>change('email',e.target.value)} placeholder="nombre@estudio.com"/></label>
        {mode!=='reset'&&<label className="field"><span>Contraseña</span><input required type="password" minLength={8} autoComplete={mode==='signup'?'new-password':'current-password'} value={form.password} onChange={e=>change('password',e.target.value)} placeholder="Mínimo 8 caracteres"/></label>}
        {error&&<div className="alert error">{error}</div>}
        {message&&<div className="alert success">{message}</div>}
        <button className="primary auth-submit" disabled={busy}>{busy?'Procesando…':mode==='signup'?'Crear cuenta':mode==='reset'?'Enviar instrucciones':'Ingresar'}</button>
      </form>
      <div className="auth-links">
        {mode==='login'&&<><button onClick={()=>{setMode('reset');setMessage('');setError('')}}>Olvidé mi contraseña</button><span>·</span><button onClick={()=>{setMode('signup');setMessage('');setError('')}}>Crear cuenta</button></>}
        {mode!=='login'&&<button onClick={()=>{setMode('login');setMessage('');setError('')}}>Volver a ingresar</button>}
      </div>
      <div className="auth-security"><ShieldCheck size={16}/> Acceso protegido por autenticación y permisos del estudio.</div>
    </section>
    <footer className="auth-footer">JurisFlow Argentina · Información jurídica bajo control de cada estudio</footer>
  </main>;
}

function PasswordRecovery({onComplete,onSignOut}) {
  const [password,setPassword]=useState('');
  const [confirm,setConfirm]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [success,setSuccess]=useState('');
  const submit=async event=>{
    event.preventDefault();setError('');setSuccess('');
    if(password.length<8){setError('La contraseña debe tener al menos 8 caracteres.');return;}
    if(password!==confirm){setError('Las contraseñas no coinciden.');return;}
    setBusy(true);
    try{
      const {error:updateError}=await supabase.auth.updateUser({password});
      if(updateError)throw updateError;
      setSuccess('Contraseña actualizada. Ya podés continuar.');
    }catch(err){setError(err.message||'No se pudo actualizar la contraseña.');}
    finally{setBusy(false);}
  };
  return <main className="auth-page"><section className="auth-card">
    <div className="auth-brand"><span className="brand-mark"><LockKeyhole size={24}/></span><div><strong>JurisFlow</strong><small>RECUPERACIÓN DE ACCESO</small></div></div>
    <div className="auth-intro"><span className="eyebrow">SEGURIDAD DE LA CUENTA</span><h1>Nueva contraseña</h1><p>Elegí una contraseña nueva para proteger tu cuenta.</p></div>
    <form onSubmit={submit} className="auth-form">
      <label className="field"><span>Nueva contraseña</span><input type="password" minLength={8} required autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} /></label>
      <label className="field"><span>Repetir contraseña</span><input type="password" minLength={8} required autoComplete="new-password" value={confirm} onChange={e=>setConfirm(e.target.value)} /></label>
      {error&&<div className="alert error">{error}</div>}
      {success&&<div className="alert success">{success}</div>}
      {success?<button type="button" className="primary auth-submit" onClick={onComplete}>Continuar a JurisFlow</button>:<button className="primary auth-submit" disabled={busy}>{busy?'Actualizando…':'Guardar contraseña'}</button>}
    </form>
    <button className="text-button" onClick={onSignOut}>Cerrar sesión</button>
  </section></main>;
}

function FirmSetup({user,onCreated,onSignOut}) {
  const [name,setName]=useState('');
  const [province,setProvince]=useState('');
  const [city,setCity]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const createFirm=async event=>{
    event.preventDefault(); setBusy(true); setError('');
    try {
      const {data,error:insertError}=await supabase.from('law_firms')
        .insert({name:name.trim(),province:province||null,city:city.trim()||null,created_by:user.id})
        .select('id,name,province,city').single();
      if(insertError) throw insertError;
      onCreated(data);
    } catch(err) { setError(err.message||'No se pudo crear el estudio.'); }
    finally { setBusy(false); }
  };
  return <main className="setup-page"><section className="setup-card">
    <div className="setup-icon"><Building2 size={25}/></div>
    <span className="eyebrow">PRIMER PASO</span>
    <h1>Creá tu espacio de trabajo</h1>
    <p>El estudio será el espacio privado donde vas a organizar clientes, expedientes y colaboradores.</p>
    <form onSubmit={createFirm} className="auth-form">
      <label className="field"><span>Nombre del estudio jurídico</span><input required value={name} onChange={e=>setName(e.target.value)} placeholder="Ej. Estudio Jurídico Pérez"/></label>
      <label className="field"><span>Provincia</span><select value={province} onChange={e=>setProvince(e.target.value)}><option value="">Seleccionar provincia</option>{provinces.map(p=><option key={p}>{p}</option>)}</select></label>
      <label className="field"><span>Localidad</span><input value={city} onChange={e=>setCity(e.target.value)} placeholder="Localidad"/></label>
      {error&&<div className="alert error">{error}</div>}
      <button className="primary auth-submit" disabled={busy}>{busy?'Creando…':'Crear mi estudio'}</button>
    </form>
    <button className="text-button" onClick={onSignOut}>Cerrar sesión</button>
  </section></main>;
}

function Workspace({user,onSignOut}) {
  const [memberships,setMemberships]=useState([]);
  const [activeModule,setActiveModule]=useState('clients');
  const [firms,setFirms]=useState([]);
  const [firm,setFirm]=useState(null);
  const [clients,setClients]=useState([]);
  const [casesCount,setCasesCount]=useState(0);
  const [query,setQuery]=useState('');
  const [status,setStatus]=useState('all');
  const [modal,setModal]=useState(false);
  const [detail,setDetail]=useState(null);
  const [editing,setEditing]=useState(null);
  const [form,setForm]=useState(blankClient);
  const [menu,setMenu]=useState(false);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [notice,setNotice]=useState('');
  const [error,setError]=useState('');

  const role=memberships.find(m=>m.firm_id===firm?.id)?.role;
  const canEdit=['owner','admin','lawyer','assistant'].includes(role);
  const canDelete=['owner','admin'].includes(role);

  const loadFirms=useCallback(async()=>{
    setLoading(true); setError('');
    try {
      const {data:memberRows,error:memberError}=await supabase.from('firm_members')
        .select('firm_id,role').eq('user_id',user.id);
      if(memberError) throw memberError;
      const rows=memberRows||[];
      setMemberships(rows);
      if(!rows.length){setFirms([]);setFirm(null);setClients([]);return;}
      const ids=[...new Set(rows.map(row=>row.firm_id))];
      const {data:firmRows,error:firmError}=await supabase.from('law_firms')
        .select('id,name,province,city').in('id',ids).order('name');
      if(firmError) throw firmError;
      const list=firmRows||[];
      setFirms(list);
      setFirm(current=>list.find(item=>item.id===current?.id)||list[0]||null);
    } catch(err){setError(err.message||'No se pudieron cargar los estudios.');}
    finally{setLoading(false);}
  },[user.id]);

  useEffect(()=>{loadFirms();},[loadFirms]);

  const loadClients=useCallback(async()=>{
    if(!firm){setClients([]);return;}
    setLoading(true);setError('');
    try {
      const {data,error:queryError}=await supabase.from('clients')
        .select('id,first_name,last_name,full_name,client_type,document_number,email,phone,address,province,locality,notes,status,created_at')
        .eq('firm_id',firm.id).order('created_at',{ascending:false});
      if(queryError) throw queryError;
      setClients((data||[]).map(row=>({
        id:row.id,firstName:row.first_name||row.full_name||'',lastName:row.last_name||'',
        type:row.client_type||'Persona física',document:row.document_number||'',
        email:row.email||'',phone:row.phone||'',address:row.address||'',
        province:row.province||'',city:row.locality||'',notes:row.notes||'',
        status:row.status||'active'
      })));
    } catch(err){setError(err.message||'No se pudieron cargar los clientes.');}
    finally{setLoading(false);}
  },[firm]);

  useEffect(()=>{loadClients();},[loadClients]);

  const filtered=useMemo(()=>clients.filter(client=>{
    const matches=[client.firstName,client.lastName,client.document,client.email,client.phone].join(' ').toLowerCase().includes(query.toLowerCase());
    return matches&&(status==='all'||client.status===status);
  }),[clients,query,status]);

  const notify=message=>{setNotice(message);window.setTimeout(()=>setNotice(''),3200);};
  const newClient=()=>{setEditing(null);setForm(blankClient);setModal(true);setDetail(null);};
  const editClient=client=>{setEditing(client.id);setForm({...blankClient,...client});setModal(true);setDetail(null);};
  const saveClient=async event=>{
    event.preventDefault(); if(!firm)return;
    setBusy(true);setError('');
    const fullName=[form.firstName.trim(),form.lastName.trim()].filter(Boolean).join(' ');
    const payload={
      firm_id:firm.id,full_name:fullName,first_name:form.firstName.trim(),
      last_name:form.lastName.trim()||null,client_type:form.type,
      document_number:form.document.trim()||null,email:form.email.trim()||null,
      phone:form.phone.trim()||null,address:form.address.trim()||null,
      province:form.province||null,locality:form.city.trim()||null,
      notes:form.notes.trim()||null,status:form.status
    };
    try {
      const result=editing
        ? await supabase.from('clients').update(payload).eq('id',editing).eq('firm_id',firm.id)
        : await supabase.from('clients').insert({...payload,created_by:user.id});
      if(result.error) throw result.error;
      setModal(false);setEditing(null);await loadClients();
      notify(editing?'Cliente actualizado.':'Cliente registrado.');
    } catch(err) {
      if(err.code==='23505') setError('Ya existe un cliente con ese DNI/CUIT en este estudio.');
      else setError(err.message||'No se pudo guardar el cliente.');
    } finally{setBusy(false);}
  };

  const removeClient=async id=>{
    if(!canDelete||!window.confirm('¿Querés eliminar este cliente?'))return;
    setBusy(true);setError('');
    try{
      const {error:deleteError}=await supabase.from('clients').delete().eq('id',id).eq('firm_id',firm.id);
      if(deleteError)throw deleteError;
      setDetail(null);await loadClients();notify('Cliente eliminado.');
    }catch(err){setError(err.message||'No se pudo eliminar el cliente.');}
    finally{setBusy(false);}
  };

  const exportCsv=()=>{
    const columns=[['Nombre','firstName'],['Apellido / Razón social','lastName'],['Tipo','type'],['DNI / CUIT','document'],['Teléfono','phone'],['Correo','email'],['Domicilio','address'],['Provincia','province'],['Localidad','city'],['Observaciones','notes'],['Estado','status']];
    const quote=value=>'"'+String(value??'').replace(/"/g,'""')+'"';
    const rows=[columns.map(col=>quote(col[0])).join(';'),...filtered.map(client=>columns.map(col=>quote(client[col[1]])).join(';'))];
    const blob=new Blob(['\uFEFF'+rows.join('\r\n')],{type:'text/csv;charset=utf-8;'});
    const url=URL.createObjectURL(blob);const link=document.createElement('a');
    link.href=url;link.download='jurisflow-clientes.csv';link.click();URL.revokeObjectURL(url);
  };

  const input=(label,key,required=false,type='text')=><label className="field"><span>{label}{required?' *':''}</span><input type={type} required={required} value={form[key]||''} onChange={event=>setForm(current=>({...current,[key]:event.target.value}))}/></label>;

  if(loading&&!firm&&memberships.length===0)return <main className="loading-page"><div className="loader"/><p>Cargando tu espacio de trabajo…</p></main>;
  if(!loading&&firms.length===0&&error)return <main className="setup-page"><section className="setup-card"><span className="eyebrow">CONEXIÓN</span><h1>No pudimos cargar tu estudio</h1><p>{error}</p><button className="primary auth-submit" onClick={loadFirms}>Reintentar</button><button className="text-button" onClick={onSignOut}>Cerrar sesión</button></section></main>;
  if(!loading&&firms.length===0)return <FirmSetup user={user} onCreated={async()=>{await loadFirms();}} onSignOut={onSignOut}/>;

  return <div className="shell">
    <aside className={menu?'sidebar show':'sidebar'}>
      <div className="brand"><div className="brand-icon"><Scale/></div><div><b>JurisFlow</b><small>ARGENTINA · GESTIÓN JURÍDICA</small></div><button className="mobile-close" onClick={()=>setMenu(false)}><X/></button></div>
      <div className="workspace"><b>JF</b><span><strong>{firm?.name||'Mi estudio'}</strong><small>{firm?.city||firm?.province||'Espacio de trabajo'}</small></span></div>
      <label className="nav-label">MENÚ PRINCIPAL</label>
      <nav>
        <button className={'nav '+(activeModule==='clients'?'active':'')} onClick={()=>{setActiveModule('clients');setMenu(false);}}><Users/>Clientes <i>{clients.length}</i></button>
        <button className={'nav '+(activeModule==='cases'?'active':'')} onClick={()=>{setActiveModule('cases');setMenu(false);}}><FolderOpen/>Expedientes <i>{casesCount}</i></button>
        <button className={'nav '+(activeModule==='agenda'?'active':'')} onClick={()=>{setActiveModule('agenda');setMenu(false);}}><CalendarDays/>Agenda</button>
        <button className={'nav '+(activeModule==='members'?'active':'')} onClick={()=>{setActiveModule('members');setMenu(false);}}><Users/>Equipo</button>
        {['owner','admin','lawyer'].includes(role)&&<button className={'nav '+(activeModule==='fees'?'active':'')} onClick={()=>{setActiveModule('fees');setMenu(false);}}><CreditCard/>Honorarios</button>}
        <button className={'nav '+(activeModule==='library'?'active':'')} onClick={()=>{setActiveModule('library');setMenu(false);}}><BookOpen/>Biblioteca jurídica</button>
        <button className={'nav '+(activeModule==='research'?'active':'')} onClick={()=>{setActiveModule('research');setMenu(false);}}><Search/>Investigación</button>
      </nav>
      <div className="side-bottom"><label className="nav-label">CUENTA</label>
        <div className="account"><b>{(user.email||'U').slice(0,1).toUpperCase()}</b><span><strong>{user.email}</strong><small>{roleLabel(role)}</small></span></div>
        <button className="nav signout" onClick={onSignOut}><LogOut/>Cerrar sesión</button>
      </div>
    </aside>
    {menu&&<button className="scrim" onClick={()=>setMenu(false)} aria-label="Cerrar menú"/>}
    <main>
      <header><button className="hamb" onClick={()=>setMenu(true)}><Menu/></button>
        <div className="crumb">JurisFlow <span>/</span> <b>{activeModule==='clients' ? 'Clientes' : activeModule==='cases' ? 'Expedientes' : activeModule==='agenda' ? 'Agenda'  : activeModule==='members' ? 'Equipo' : activeModule==='fees' ? 'Honorarios' : activeModule==='library' ? 'Biblioteca jurídica' : 'Investigación'}</b></div>
        <div className="head-right">
          {firms.length>1?<label className="firm-switch"><Building2 size={15}/><select value={firm?.id||''} onChange={e=>setFirm(firms.find(item=>item.id===e.target.value)||null)}>{firms.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select><ChevronDown size={14}/></label>:<span>{firm?.name||'Mi estudio jurídico'}</span>}
          <button className="bell" title="Notificaciones"><Bell/></button><b className="avatar">{(user.email||'U').slice(0,1).toUpperCase()}</b>
        </div>
      </header>
      {activeModule==='clients' ? <section className="content">
        <div className="heading"><div><label>GESTIÓN DEL ESTUDIO</label><h1>Clientes</h1><p>Administrá la información y el seguimiento de tus clientes.</p></div>
          <div className="heading-actions"><button className="secondary export-button" onClick={exportCsv}><Download/> Exportar</button>{canEdit&&<button className="primary" onClick={newClient}><Plus/> Nuevo cliente</button>}</div>
        </div>
        {error&&<div className="alert error page-alert">{error}<button onClick={()=>setError('')}><X size={15}/></button></div>}
        <div className="stats">
          <article><div className="stat-symbol blue"><Users/></div><span>Total de clientes<strong>{clients.length}</strong><small>Registros del estudio</small></span></article>
          <article><div className="stat-symbol green"><UserRound/></div><span>Clientes activos<strong>{clients.filter(c=>c.status==='active').length}</strong><small>En seguimiento</small></span></article>
          <article><div className="stat-symbol amber"><FileText/></div><span>Personas físicas<strong>{clients.filter(c=>c.type==='Persona física').length}</strong><small>Clientes individuales</small></span></article>
        </div>
        <section className="panel"><div className="panel-title"><div><h2>Listado de clientes</h2><p>Consultá, buscá y administrá tus contactos.</p></div>
          <button className="secondary" onClick={()=>setStatus(current=>current==='all'?'active':'all')}><Filter/>{status==='all'?'Filtrar activos':'Ver todos'}</button>
        </div>
        <div className="tools"><div className="search"><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar por nombre, DNI, CUIT, teléfono o correo…"/>{query&&<button onClick={()=>setQuery('')}><X/></button>}</div><small>{filtered.length} resultados</small></div>
        <div className="table-scroll"><table><thead><tr><th>CLIENTE</th><th>IDENTIFICACIÓN</th><th>CONTACTO</th><th>UBICACIÓN</th><th>ESTADO</th><th></th></tr></thead>
          <tbody>{filtered.map(client=><tr key={client.id}>
            <td><div className="client"><b>{(client.firstName[0]||'C')}{client.lastName[0]||''}</b><span><strong>{client.firstName} {client.lastName}</strong><small>{client.type}</small></span></div></td>
            <td>{client.document||'—'}</td><td><div className="contact">{client.phone&&<span><Phone/>{client.phone}</span>}{client.email&&<span><Mail/>{client.email}</span>}</div></td>
            <td><span className="location"><MapPin/>{client.city||'Sin localidad'}</span><small className="province">{client.province}</small></td>
            <td><em className={client.status==='active'?'active':'inactive'}>{client.status==='active'?'Activo':'Inactivo'}</em></td>
            <td><div className="actions"><button title="Ver ficha" onClick={()=>setDetail(client)}><Eye/></button>{canEdit&&<button title="Editar" onClick={()=>editClient(client)}><Pencil/></button>}{canDelete&&<button title="Eliminar" onClick={()=>removeClient(client.id)}><Trash2/></button>}</div></td>
          </tr>)}{!filtered.length&&<tr><td colSpan="6" className="empty">{loading?'Cargando clientes…':'Todavía no hay clientes para mostrar. Registrá el primero para comenzar.'}</td></tr>}</tbody>
        </table></div></section>
        <footer>JurisFlow Argentina <span>•</span> Datos protegidos por permisos del estudio <span>•</span> Primera versión conectada</footer>
      </section> : activeModule==='cases' ? <Cases supabase={supabase} firm={firm} user={user} role={role} onCount={setCasesCount}/> : activeModule==='agenda' ? <Agenda supabase={supabase} firm={firm} user={user} role={role}/> : activeModule==='members' ? <Members supabase={supabase} firm={firm} user={user} role={role}/> : activeModule==='fees' ? <Fees supabase={supabase} firm={firm} user={user} role={role}/> : activeModule==='library' ? <LegalLibrary supabase={supabase} firm={firm} user={user} role={role}/> : <LegalResearch supabase={supabase} firm={firm}/>}
    </main>
    {notice&&<div className="toast">{notice}</div>}
    {modal&&<div className="overlay" onMouseDown={event=>{if(event.target===event.currentTarget)setModal(false)}}>
      <form className="modal" onSubmit={saveClient}><div className="modal-head"><div><label>GESTIÓN DE CONTACTOS</label><h2>{editing?'Editar cliente':'Nuevo cliente'}</h2><p>Los datos se guardarán en el espacio privado del estudio.</p></div><button type="button" className="close" onClick={()=>setModal(false)}><X/></button></div>
        <div className="form-grid">{input('Nombre','firstName',true)}{input('Apellido / Razón social','lastName')}
          <label className="field"><span>Tipo de cliente</span><select value={form.type} onChange={e=>setForm(current=>({...current,type:e.target.value}))}><option>Persona física</option><option>Empresa</option></select></label>
          {input('DNI / CUIT','document',false)}{input('Teléfono','phone',false,'tel')}{input('Correo electrónico','email',false,'email')}{input('Domicilio','address')}
          <label className="field"><span>Provincia</span><select value={form.province} onChange={e=>setForm(current=>({...current,province:e.target.value}))}><option value="">Seleccionar provincia</option>{provinces.map(p=><option key={p}>{p}</option>)}</select></label>
          {input('Localidad','city')}
          <label className="field"><span>Estado</span><select value={form.status} onChange={e=>setForm(current=>({...current,status:e.target.value}))}><option value="active">Activo</option><option value="inactive">Inactivo</option></select></label>
          <label className="field full"><span>Observaciones</span><textarea rows="3" value={form.notes} onChange={e=>setForm(current=>({...current,notes:e.target.value}))}/></label>
        </div>
        {error&&<div className="alert error">{error}</div>}
        <div className="modal-actions"><button type="button" className="secondary" onClick={()=>setModal(false)}>Cancelar</button><button className="primary" disabled={busy}><Plus/>{busy?'Guardando…':editing?'Guardar cambios':'Registrar cliente'}</button></div>
      </form>
    </div>}
    {detail&&<div className="overlay" onMouseDown={event=>{if(event.target===event.currentTarget)setDetail(null)}}>
      <section className="modal detail-modal"><div className="modal-head"><div><label>FICHA INDIVIDUAL</label><h2>Datos del cliente</h2></div><button className="close" onClick={()=>setDetail(null)}><X/></button></div>
        <div className="detail-name"><b>{(detail.firstName[0]||'C')}{detail.lastName[0]||''}</b><span><strong>{detail.firstName} {detail.lastName}</strong><em className={detail.status==='active'?'active':'inactive'}>{detail.status==='active'?'Activo':'Inactivo'}</em></span></div>
        <div className="detail-grid">{[['Tipo de cliente',detail.type],['DNI / CUIT',detail.document],['Teléfono',detail.phone],['Correo electrónico',detail.email],['Domicilio',detail.address],['Localidad',detail.city],['Provincia',detail.province]].map(([label,value])=><div key={label}><small>{label}</small><strong>{value||'—'}</strong></div>)}</div>
        <div className="notes"><small>OBSERVACIONES</small><p>{detail.notes||'Sin observaciones.'}</p></div>
        <div className="modal-actions">{canDelete&&<button className="secondary" onClick={()=>removeClient(detail.id)}><Trash2/> Eliminar</button>}{canEdit&&<button className="primary" onClick={()=>editClient(detail)}><Pencil/> Editar cliente</button>}</div>
      </section>
    </div>}
  </div>;
}

function roleLabel(role) {
  return ({owner:'Titular del estudio',admin:'Administrador',lawyer:'Abogado/a',assistant:'Asistente',read_only:'Solo lectura'})[role]||'Integrante';
}

export default function App() {
  const [session,setSession]=useState(null);
  const [checking,setChecking]=useState(true);
  const [recovery,setRecovery]=useState(false);
  const [inviteToken,setInviteToken]=useState(()=>new URLSearchParams(window.location.search).get('invite'));
  const [inviteResult,setInviteResult]=useState(null);
  useEffect(()=>{
    let mounted=true;
    supabase.auth.getSession().then(({data})=>{if(mounted){setSession(data.session);setChecking(false);}});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((event,nextSession)=>{
      setSession(nextSession);
      if(event==='PASSWORD_RECOVERY')setRecovery(true);
      setChecking(false);
    });
    return ()=>{mounted=false;subscription.unsubscribe();};
  },[]);
  useEffect(()=>{
    if(!session||!inviteToken)return;
    let active=true;
    setInviteResult({loading:true});
    supabase.rpc('accept_firm_invitation',{p_token:inviteToken}).then(({data,error})=>{
      if(!active)return;
      if(error)setInviteResult({error:error.message||'No se pudo aceptar la invitación.'});
      else{
        setInviteResult({success:true,firmId:data});
        window.history.replaceState({},document.title,window.location.pathname);
      }
    });
    return ()=>{active=false;};
  },[session?.user?.id,inviteToken]);
  const signOut=async()=>{await supabase.auth.signOut();setSession(null);};
  if(checking)return <main className="loading-page"><div className="loader"/><p>Iniciando JurisFlow…</p></main>;
  if(recovery&&session)return <PasswordRecovery onComplete={()=>setRecovery(false)} onSignOut={signOut}/>;
  if(inviteToken&&session&&inviteResult?.loading)return <main className="loading-page"><div className="loader"/><p>Validando invitación…</p></main>;
  if(inviteToken&&session&&inviteResult?.error)return <main className="setup-page"><section className="setup-card"><span className="eyebrow">INVITACIÓN</span><h1>No pudimos aceptar la invitación</h1><p>{inviteResult.error}</p><button className="primary auth-submit" onClick={()=>{setInviteToken(null);setInviteResult(null);}}>Continuar</button><button className="text-button" onClick={signOut}>Cerrar sesión</button></section></main>;
  if(inviteToken&&session&&inviteResult?.success)return <main className="setup-page"><section className="setup-card"><div className="setup-icon"><ShieldCheck/></div><span className="eyebrow">INVITACIÓN ACEPTADA</span><h1>Ya formás parte del estudio</h1><p>Tu acceso quedó vinculado a tu cuenta. Los expedientes estarán disponibles según las asignaciones que te otorguen.</p><button className="primary auth-submit" onClick={()=>{setInviteToken(null);setInviteResult(null);}}>Entrar a JurisFlow</button></section></main>;
  return session?<Workspace user={session.user} onSignOut={signOut}/>:<AuthScreen inviteToken={inviteToken}/>;
}
