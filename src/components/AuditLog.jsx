import { useCallback,useEffect,useState } from 'react';
import { ClipboardList, RefreshCw, ShieldCheck, AlertTriangle } from 'lucide-react';

const entityLabels={
  law_firms:'Estudio',firm_members:'Integrante',firm_invitations:'Invitación',
  clients:'Cliente',cases:'Expediente',case_members:'Acceso a expediente',
  documents:'Documento',calendar_events:'Evento de agenda',deadlines:'Vencimiento',
  fee_entries:'Honorario',payments:'Pago',legal_library:'Fuente jurídica'
};
const operationLabels={INSERT:'Creación',UPDATE:'Modificación',DELETE:'Eliminación'};
const fieldLabels={
  title:'título',name:'nombre',full_name:'nombre completo',phone:'teléfono',
  email:'correo',status:'estado',role:'rol',access_level:'nivel de acceso',
  file_name:'nombre de archivo',storage_path:'ruta de archivo',amount:'importe',
  paid_at:'fecha de pago',payment_method:'medio de pago',source_url:'enlace de fuente',
  verification_status:'estado de verificación',province:'provincia',locality:'localidad',
  court:'tribunal',process_stage:'etapa procesal',case_number:'número de expediente'
};
const dateLabel=value=>new Date(value).toLocaleString('es-AR',{dateStyle:'medium',timeStyle:'short'});

export default function AuditLog({supabase,firm,role}) {
  const [rows,setRows]=useState([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const allowed=['owner','admin'].includes(role);

  const load=useCallback(async()=>{
    if(!firm?.id||!allowed){setRows([]);setLoading(false);return;}
    setLoading(true);setError('');
    try{
      const {data,error:queryError}=await supabase.from('audit_logs')
        .select('id,actor_id,entity_table,entity_id,operation,changed_fields,occurred_at')
        .eq('firm_id',firm.id).order('occurred_at',{ascending:false}).limit(100);
      if(queryError)throw queryError;
      setRows(data||[]);
    }catch(err){setError(err.message||'No se pudo cargar el historial.');}
    finally{setLoading(false);}
  },[supabase,firm?.id,allowed]);

  useEffect(()=>{load();},[load]);

  if(!allowed)return <section className="content audit-content"><div className="legal-note"><ShieldCheck size={17}/><span>El historial de auditoría está disponible únicamente para el titular y administradores del estudio.</span></div></section>;

  return <section className="content audit-content">
    <div className="heading"><div><label>SEGURIDAD Y CONTROL</label><h1>Historial de auditoría</h1><p>Actividad reciente registrada en este estudio.</p></div>
      <button className="secondary" onClick={load} disabled={loading}><RefreshCw size={15}/> Actualizar</button>
    </div>
    <div className="legal-note"><ShieldCheck size={17}/><span><strong>Registro de metadatos.</strong> Se registra quién realizó una acción, cuándo y sobre qué elemento. No se copian datos personales, contenido de expedientes, documentos, mensajes ni importes al historial.</span></div>
    {error&&<div className="alert error page-alert"><AlertTriangle size={15}/>{error}</div>}
    <section className="panel">
      <div className="panel-title"><div><h2>Últimos movimientos</h2><p>Se muestran hasta 100 registros recientes.</p></div><small>{rows.length} registros</small></div>
      <div className="audit-list">
        {loading&&<div className="empty">Cargando historial…</div>}
        {!loading&&!rows.length&&<div className="empty">Todavía no hay movimientos registrados.</div>}
        {rows.map(item=><article className="audit-row" key={item.id}>
          <span className={'audit-operation '+item.operation.toLowerCase()}><ClipboardList size={16}/></span>
          <div className="audit-main">
            <strong>{operationLabels[item.operation]||item.operation} · {entityLabels[item.entity_table]||item.entity_table}</strong>
            <small>Elemento: {String(item.entity_id).slice(0,8)}… · Usuario: {item.actor_id?String(item.actor_id).slice(0,8)+'…':'Sistema'}</small>
            {item.operation==='UPDATE'&&item.changed_fields?.length>0&&<small>Campos: {item.changed_fields.map(field=>fieldLabels[field]||field).join(', ')}</small>}
          </div>
          <time>{dateLabel(item.occurred_at)}</time>
        </article>)}
      </div>
    </section>
    <footer>JurisFlow Argentina <span>•</span> Historial restringido al titular y administradores del estudio</footer>
  </section>;
}
