import { useCallback,useEffect,useState } from 'react';
import { Users, UserPlus, Copy, X, ShieldCheck, Trash2, Mail, RefreshCw } from 'lucide-react';

const roleLabels={owner:'Titular del estudio',admin:'Administrador',lawyer:'Abogado/a',assistant:'Asistente',read_only:'Solo lectura'};
const inviteRoles=[['admin','Administrador'],['lawyer','Abogado/a'],['assistant','Asistente'],['read_only','Solo lectura']];

export default function Members({supabase,firm,user,role}) {
  const [members,setMembers]=useState([]);
  const [profiles,setProfiles]=useState({});
  const [invitations,setInvitations]=useState([]);
  const [email,setEmail]=useState('');
  const [inviteRole,setInviteRole]=useState('lawyer');
  const [inviteLink,setInviteLink]=useState('');
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const isAdmin=['owner','admin'].includes(role);

  const load=useCallback(async()=>{
    if(!firm?.id)return;
    setLoading(true);setError('');
    try{
      const {data:memberRows,error:memberError}=await supabase.rpc('list_firm_directory',{p_firm_id:firm.id});
      if(memberError)throw memberError;
      setMembers(memberRows||[]);
      setProfiles(Object.fromEntries((memberRows||[]).map(row=>[row.user_id,{full_name:row.full_name}])));
      if(isAdmin){
        const {data:inviteRows,error:inviteError}=await supabase.from('firm_invitations')
          .select('id,email,role,status,expires_at,created_at').eq('firm_id',firm.id).order('created_at',{ascending:false});
        if(inviteError)throw inviteError;
        setInvitations(inviteRows||[]);
      }else setInvitations([]);
    }catch(err){setError(err.message||'No se pudo cargar el equipo.');}
    finally{setLoading(false);}
  },[firm?.id,isAdmin,supabase]);

  useEffect(()=>{load();},[load]);

  const invite=async event=>{
    event.preventDefault();setBusy(true);setError('');setNotice('');setInviteLink('');
    try{
      const {data,error:rpcError}=await supabase.rpc('create_firm_invitation',{
        p_firm_id:firm.id,p_email:email.trim(),p_role:inviteRole
      });
      if(rpcError)throw rpcError;
      const link=window.location.origin+'/?invite='+encodeURIComponent(data);
      setInviteLink(link);
      setEmail('');
      setNotice('Invitación creada. Copiá el enlace y compartilo con la persona invitada.');
      await load();
    }catch(err){setError(err.message||'No se pudo crear la invitación.');}
    finally{setBusy(false);}
  };

  const copyLink=async()=>{
    try{await navigator.clipboard.writeText(inviteLink);setNotice('Enlace copiado.');}
    catch{setError('No se pudo copiar automáticamente. Mantené presionado el enlace para copiarlo.');}
  };

  const changeRole=async(member,nextRole)=>{
    if(!isAdmin||member.role==='owner'||member.user_id===user.id)return;
    setBusy(true);setError('');
    try{
      const {error:updateError}=await supabase.from('firm_members').update({role:nextRole})
        .eq('firm_id',firm.id).eq('user_id',member.user_id);
      if(updateError)throw updateError;
      await load();
    }catch(err){setError(err.message||'No se pudo cambiar el rol.');}
    finally{setBusy(false);}
  };

  const removeMember=async member=>{
    if(!isAdmin||member.role==='owner'||member.user_id===user.id||!window.confirm('¿Querés quitar a esta persona del estudio?'))return;
    setBusy(true);setError('');
    try{
      const {error:deleteError}=await supabase.from('firm_members').delete()
        .eq('firm_id',firm.id).eq('user_id',member.user_id);
      if(deleteError)throw deleteError;
      await load();
    }catch(err){setError(err.message||'No se pudo quitar al integrante.');}
    finally{setBusy(false);}
  };

  const revoke=async invitation=>{
    if(!isAdmin||!window.confirm('¿Querés revocar esta invitación?'))return;
    setBusy(true);setError('');
    try{
      const {error:updateError}=await supabase.from('firm_invitations').update({status:'revoked'})
        .eq('id',invitation.id).eq('firm_id',firm.id);
      if(updateError)throw updateError;
      await load();
    }catch(err){setError(err.message||'No se pudo revocar la invitación.');}
    finally{setBusy(false);}
  };

  const nameFor=id=>profiles[id]?.full_name||'Integrante '+id.slice(0,8);

  return <section className="content members-content">
    <div className="heading"><div><label>ADMINISTRACIÓN DEL ESTUDIO</label><h1>Equipo y permisos</h1><p>Administrá integrantes, roles e invitaciones del estudio.</p></div>
      <button className="secondary" onClick={load}><RefreshCw size={15}/> Actualizar</button>
    </div>
    {error&&<div className="alert error page-alert">{error}<button onClick={()=>setError('')}><X size={15}/></button></div>}
    {notice&&<div className="alert success page-alert">{notice}</div>}
    <div className="stats">
      <article><div className="stat-symbol blue"><Users/></div><span>Integrantes<strong>{members.length}</strong><small>Con acceso al estudio</small></span></article>
      <article><div className="stat-symbol green"><ShieldCheck/></div><span>Administradores<strong>{members.filter(item=>item.role==='owner'||item.role==='admin').length}</strong><small>Gestión del equipo</small></span></article>
      <article><div className="stat-symbol amber"><Mail/></div><span>Invitaciones pendientes<strong>{invitations.filter(item=>item.status==='pending'&&new Date(item.expires_at)>new Date()).length}</strong><small>Esperando aceptación</small></span></article>
    </div>
    <section className="panel">
      <div className="panel-title"><div><h2>Integrantes del estudio</h2><p>Los permisos se aplican también en la base de datos, no solo en la interfaz.</p></div></div>
      <div className="member-list">
        {members.map(member=><div className="member-row" key={member.user_id}>
          <span className="member-avatar">{(nameFor(member.user_id)[0]||'U').toUpperCase()}</span>
          <span className="member-details"><strong>{nameFor(member.user_id)}{member.user_id===user.id?' (vos)':''}</strong><small>{roleLabels[member.role]||member.role}</small></span>
          {isAdmin&&member.role!=='owner'&&member.user_id!==user.id?<><select className="role-select" value={member.role} disabled={busy} onChange={event=>changeRole(member,event.target.value)}>{inviteRoles.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><button className="icon-button remove-member" title="Quitar integrante" disabled={busy} onClick={()=>removeMember(member)}><Trash2 size={15}/></button></>:<span className="member-role">{roleLabels[member.role]||member.role}</span>}
        </div>)}
        {!loading&&!members.length&&<div className="empty">Todavía no hay integrantes en este estudio.</div>}
        {loading&&<div className="empty">Cargando equipo…</div>}
      </div>
    </section>
    {isAdmin&&<section className="panel invite-panel">
      <div className="panel-title"><div><h2>Invitar a un integrante</h2><p>La invitación queda vinculada al correo indicado y vence según la configuración del sistema.</p></div></div>
      <form className="invite-form" onSubmit={invite}>
        <label className="field"><span>Correo electrónico</span><input type="email" required value={email} onChange={event=>setEmail(event.target.value)} placeholder="abogado@estudio.com"/></label>
        <label className="field"><span>Rol</span><select value={inviteRole} onChange={event=>setInviteRole(event.target.value)}>{inviteRoles.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
        <button className="primary" disabled={busy}><UserPlus size={15}/> Crear invitación</button>
      </form>
      {inviteLink&&<div className="invite-link"><span><small>ENLACE DE INVITACIÓN · COMPARTILO SOLO CON LA PERSONA INVITADA</small><strong>{inviteLink}</strong></span><button className="secondary" onClick={copyLink}><Copy size={14}/> Copiar</button></div>}
      <div className="invitation-list">
        <h3>Invitaciones recientes</h3>
        {invitations.map(item=><div className="invitation-row" key={item.id}>
          <span><strong>{item.email}</strong><small>{roleLabels[item.role]||item.role} · Vence {new Date(item.expires_at).toLocaleDateString('es-AR')}</small></span>
          <em className={item.status==='pending'&&new Date(item.expires_at)>new Date()?'active':'inactive'}>{item.status==='pending'&&new Date(item.expires_at)>new Date()?'Pendiente':item.status==='accepted'?'Aceptada':item.status==='revoked'?'Revocada':'Vencida'}</em>
          {item.status==='pending'&&<button className="icon-button" title="Revocar" onClick={()=>revoke(item)}><X size={15}/></button>}
        </div>)}
        {!invitations.length&&<p className="empty-inline">Todavía no se enviaron invitaciones.</p>}
      </div>
    </section>}
    <footer>JurisFlow Argentina <span>•</span> El acceso a expedientes se asigna por separado en cada causa</footer>
  </section>;
}
