import { useCallback,useEffect,useMemo,useState } from 'react';
import { Wallet, Plus, Search, Trash2, X, Receipt, CreditCard, CheckCircle2, Clock3 } from 'lucide-react';

const money=value=>new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:2}).format(Number(value||0));
const feeStatus={pending:'Pendiente',partial:'Parcial',paid:'Pagado',cancelled:'Cancelado'};
const methods=[['cash','Efectivo'],['transfer','Transferencia'],['debit_card','Tarjeta de débito'],['credit_card','Tarjeta de crédito'],['other','Otro']];
const emptyFee={description:'',amount:'',client_id:'',case_id:'',due_date:'',notes:''};
const emptyPayment={amount:'',payment_method:'transfer',paid_at:new Date().toISOString().slice(0,16),reference:'',notes:''};

export default function Fees({supabase,firm,user,role}) {
  const [fees,setFees]=useState([]);
  const [payments,setPayments]=useState([]);
  const [clients,setClients]=useState([]);
  const [cases,setCases]=useState([]);
  const [writableCaseIds,setWritableCaseIds]=useState([]);
  const [query,setQuery]=useState('');
  const [tab,setTab]=useState('fees');
  const [modal,setModal]=useState('');
  const [selected,setSelected]=useState(null);
  const [feeForm,setFeeForm]=useState(emptyFee);
  const [paymentForm,setPaymentForm]=useState(emptyPayment);
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const admin=['owner','admin'].includes(role);
  const lawyer=role==='lawyer';

  const load=useCallback(async()=>{
    if(!firm?.id)return;
    setLoading(true);setError('');
    try{
      const [feeResult,paymentResult,clientResult,caseResult,assignmentResult]=await Promise.all([
        supabase.from('fee_entries').select('id,client_id,case_id,description,amount,currency,due_date,status,notes,created_at').eq('firm_id',firm.id).order('created_at',{ascending:false}),
        supabase.from('payments').select('id,fee_entry_id,amount,paid_at,payment_method,reference,notes').eq('firm_id',firm.id).order('paid_at',{ascending:false}),
        supabase.from('clients').select('id,full_name').eq('firm_id',firm.id).order('full_name'),
        supabase.from('cases').select('id,title,case_number').eq('firm_id',firm.id).order('title'),
        supabase.from('case_members').select('case_id,access_level').eq('firm_id',firm.id).eq('user_id',user.id)
      ]);
      if(feeResult.error)throw feeResult.error;
      if(paymentResult.error)throw paymentResult.error;
      if(clientResult.error)throw clientResult.error;
      if(caseResult.error)throw caseResult.error;
      if(assignmentResult.error)throw assignmentResult.error;
      setFees(feeResult.data||[]);setPayments(paymentResult.data||[]);
      setClients(clientResult.data||[]);setCases(caseResult.data||[]);
      setWritableCaseIds((assignmentResult.data||[]).filter(row=>row.access_level==='write').map(row=>row.case_id));
    }catch(err){setError(err.message||'No se pudo cargar la cuenta corriente.');}
    finally{setLoading(false);}
  },[firm?.id,supabase,user.id]);

  useEffect(()=>{load();},[load]);
  const paidByFee=useMemo(()=>{
    const map={};for(const payment of payments)map[payment.fee_entry_id]=(map[payment.fee_entry_id]||0)+Number(payment.amount||0);return map;
  },[payments]);
  const filtered=useMemo(()=>fees.filter(item=>[item.description,clientName(item.client_id),caseName(item.case_id)].join(' ').toLowerCase().includes(query.toLowerCase())),[fees,query,clients,cases]);
  function clientName(id){return clients.find(item=>item.id===id)?.full_name||'Sin cliente';}
  function caseName(id){return cases.find(item=>item.id===id)?.title||'Sin expediente';}
  const outstanding=fee=>Math.max(0,Number(fee.amount)-Number(paidByFee[fee.id]||0));
  const canManage=fee=>admin||(lawyer&&fee.case_id&&writableCaseIds.includes(fee.case_id));
  const canCreateFee=admin||lawyer;
  const writableCases=cases.filter(item=>admin||writableCaseIds.includes(item.id));
  const total=fees.filter(fee=>fee.status!=='cancelled').reduce((sum,fee)=>sum+Number(fee.amount),0);
  const collected=payments.reduce((sum,payment)=>sum+Number(payment.amount),0);
  const setFee=(key,value)=>setFeeForm(current=>({...current,[key]:value}));
  const setPayment=(key,value)=>setPaymentForm(current=>({...current,[key]:value}));

  const saveFee=async event=>{
    event.preventDefault();setBusy(true);setError('');
    try{
      const {error:insertError}=await supabase.from('fee_entries').insert({
        firm_id:firm.id,client_id:feeForm.client_id||null,case_id:feeForm.case_id||null,
        description:feeForm.description.trim(),amount:Number(feeForm.amount),currency:'ARS',
        due_date:feeForm.due_date||null,notes:feeForm.notes.trim()||null,created_by:user.id
      });
      if(insertError)throw insertError;
      setModal('');await load();
    }catch(err){setError(err.message||'No se pudo registrar el honorario.');}
    finally{setBusy(false);}
  };

  const openPayment=fee=>{
    setSelected(fee);setPaymentForm({...emptyPayment,amount:String(outstanding(fee))});setModal('payment');setError('');
  };
  const savePayment=async event=>{
    event.preventDefault();if(!selected)return;
    setBusy(true);setError('');
    try{
      const {error:insertError}=await supabase.from('payments').insert({
        firm_id:firm.id,fee_entry_id:selected.id,amount:Number(paymentForm.amount),
        paid_at:new Date(paymentForm.paid_at).toISOString(),payment_method:paymentForm.payment_method,
        reference:paymentForm.reference.trim()||null,notes:paymentForm.notes.trim()||null,received_by:user.id
      });
      if(insertError)throw insertError;
      setModal('');setSelected(null);await load();
    }catch(err){setError(err.message||'No se pudo registrar el pago.');}
    finally{setBusy(false);}
  };

  const removeFee=async fee=>{
    if(!canManage(fee)||!window.confirm('¿Querés eliminar este honorario?'))return;
    setBusy(true);setError('');
    try{
      const {error:deleteError}=await supabase.from('fee_entries').delete().eq('id',fee.id).eq('firm_id',firm.id);
      if(deleteError)throw deleteError;
      await load();
    }catch(err){setError(err.message||'No se pudo eliminar el honorario.');}
    finally{setBusy(false);}
  };

  return <section className="content fees-content">
    <div className="heading"><div><label>ADMINISTRACIÓN DEL ESTUDIO</label><h1>Honorarios y pagos</h1><p>Controlá honorarios pactados, vencimientos y cobros en pesos argentinos.</p></div>
      {canCreateFee&&<button className="primary" onClick={()=>{setFeeForm(emptyFee);setModal('fee');setError('');}}><Plus/> Nuevo honorario</button>}
    </div>
    {error&&<div className="alert error page-alert">{error}<button onClick={()=>setError('')}><X size={15}/></button></div>}
    <div className="stats">
      <article><div className="stat-symbol blue"><Receipt/></div><span>Honorarios registrados<strong>{money(total)}</strong><small>Importe total no cancelado</small></span></article>
      <article><div className="stat-symbol green"><CheckCircle2/></div><span>Total cobrado<strong>{money(collected)}</strong><small>Pagos registrados</small></span></article>
      <article><div className="stat-symbol amber"><Clock3/></div><span>Saldo pendiente<strong>{money(Math.max(0,total-collected))}</strong><small>Importe por cobrar</small></span></article>
    </div>
    <section className="panel">
      <div className="panel-title agenda-tabs"><div><h2>{tab==='fees'?'Honorarios':'Historial de pagos'}</h2><p>La información financiera está restringida por rol y asignación a la causa.</p></div>
        <div className="tab-switch"><button className={tab==='fees'?'selected':''} onClick={()=>setTab('fees')}>Honorarios</button><button className={tab==='payments'?'selected':''} onClick={()=>setTab('payments')}>Pagos</button></div>
      </div>
      <div className="tools"><div className="search"><Search/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Buscar por descripción, cliente o expediente…"/>{query&&<button onClick={()=>setQuery('')}><X/></button>}</div><small>{tab==='fees'?filtered.length:payments.length} registros</small></div>
      <div className="table-scroll"><table><thead>{tab==='fees'?<tr><th>CONCEPTO</th><th>CLIENTE / EXPEDIENTE</th><th>IMPORTE</th><th>COBRADO</th><th>SALDO</th><th>ESTADO</th><th></th></tr>:<tr><th>FECHA</th><th>CONCEPTO</th><th>MEDIO</th><th>REFERENCIA</th><th>IMPORTE</th></tr>}</thead><tbody>
        {tab==='fees'&&filtered.map(fee=><tr key={fee.id}>
          <td><div className="client"><b><Wallet size={15}/></b><span><strong>{fee.description}</strong><small>{fee.due_date?'Vence '+new Date(fee.due_date+'T12:00:00').toLocaleDateString('es-AR'):'Sin vencimiento'}</small></span></div></td>
          <td><strong>{clientName(fee.client_id)}</strong><small className="province">{caseName(fee.case_id)}</small></td>
          <td>{money(fee.amount)}</td><td>{money(paidByFee[fee.id]||0)}</td><td><strong>{money(outstanding(fee))}</strong></td>
          <td><em className={fee.status==='paid'?'active':'inactive'}>{feeStatus[fee.status]||fee.status}</em></td>
          <td><div className="actions">{canManage(fee)&&outstanding(fee)>0&&<button title="Registrar pago" onClick={()=>openPayment(fee)}><CreditCard/></button>}{canManage(fee)&&<button title="Eliminar honorario" onClick={()=>removeFee(fee)}><Trash2/></button>}</div></td>
        </tr>)}
        {tab==='payments'&&payments.map(payment=>{
          const fee=fees.find(item=>item.id===payment.fee_entry_id);
          return <tr key={payment.id}><td>{new Date(payment.paid_at).toLocaleDateString('es-AR')}</td><td>{fee?.description||'Honorario'}</td><td>{methods.find(item=>item[0]===payment.payment_method)?.[1]||payment.payment_method}</td><td>{payment.reference||'—'}</td><td><strong>{money(payment.amount)}</strong></td></tr>;
        })}
        {!loading&&((tab==='fees'&&!filtered.length)||(tab==='payments'&&!payments.length))&&<tr><td colSpan={tab==='fees'?7:5} className="empty">No hay registros para mostrar.</td></tr>}
        {loading&&<tr><td colSpan={7} className="empty">Cargando información…</td></tr>}
      </tbody></table></div>
    </section>
    <footer>JurisFlow Argentina <span>•</span> Importes expresados en ARS <span>•</span> No procesa pagos electrónicos</footer>
    {modal==='fee'&&<div className="overlay" onMouseDown={event=>{if(event.target===event.currentTarget)setModal('');}}>
      <form className="modal" onSubmit={saveFee}><div className="modal-head"><div><label>CUENTA CORRIENTE</label><h2>Nuevo honorario</h2><p>Los importes se registran en pesos argentinos.</p></div><button type="button" className="close" onClick={()=>setModal('')}><X/></button></div>
        <div className="form-grid">
          <label className="field full"><span>Concepto</span><input required value={feeForm.description} onChange={event=>setFee('description',event.target.value)} placeholder="Ej. Honorarios por representación"/></label>
          <label className="field"><span>Importe (ARS)</span><input type="number" min="0.01" step="0.01" required value={feeForm.amount} onChange={event=>setFee('amount',event.target.value)}/></label>
          <label className="field"><span>Fecha de vencimiento</span><input type="date" value={feeForm.due_date} onChange={event=>setFee('due_date',event.target.value)}/></label>
          <label className="field"><span>Cliente</span><select value={feeForm.client_id} onChange={event=>setFee('client_id',event.target.value)}><option value="">Sin cliente</option>{clients.map(item=><option key={item.id} value={item.id}>{item.full_name}</option>)}</select></label>
          <label className="field"><span>Expediente {lawyer?'(obligatorio para abogados)':''}</span><select required={lawyer} value={feeForm.case_id} onChange={event=>setFee('case_id',event.target.value)}><option value="">Sin expediente</option>{writableCases.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          <label className="field full"><span>Observaciones</span><textarea rows="3" value={feeForm.notes} onChange={event=>setFee('notes',event.target.value)}/></label>
        </div>
        <div className="modal-actions"><button type="button" className="secondary" onClick={()=>setModal('')}>Cancelar</button><button className="primary" disabled={busy}><Plus/>{busy?'Guardando…':'Registrar honorario'}</button></div>
      </form>
    </div>}
    {modal==='payment'&&selected&&<div className="overlay" onMouseDown={event=>{if(event.target===event.currentTarget)setModal('');}}>
      <form className="modal" onSubmit={savePayment}><div className="modal-head"><div><label>REGISTRO DE COBRO</label><h2>Registrar pago</h2><p>{selected.description} · Saldo: {money(outstanding(selected))}</p></div><button type="button" className="close" onClick={()=>setModal('')}><X/></button></div>
        <div className="form-grid">
          <label className="field"><span>Importe recibido (ARS)</span><input type="number" min="0.01" max={outstanding(selected)} step="0.01" required value={paymentForm.amount} onChange={event=>setPayment('amount',event.target.value)}/></label>
          <label className="field"><span>Fecha y hora</span><input type="datetime-local" required value={paymentForm.paid_at} onChange={event=>setPayment('paid_at',event.target.value)}/></label>
          <label className="field"><span>Medio de pago</span><select value={paymentForm.payment_method} onChange={event=>setPayment('payment_method',event.target.value)}>{methods.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
          <label className="field"><span>Referencia</span><input value={paymentForm.reference} onChange={event=>setPayment('reference',event.target.value)}/></label>
          <label className="field full"><span>Observaciones</span><textarea rows="3" value={paymentForm.notes} onChange={event=>setPayment('notes',event.target.value)}/></label>
        </div>
        <div className="modal-actions"><button type="button" className="secondary" onClick={()=>setModal('')}>Cancelar</button><button className="primary" disabled={busy}><CreditCard/>{busy?'Guardando…':'Registrar pago'}</button></div>
      </form>
    </div>}
  </section>;
}
