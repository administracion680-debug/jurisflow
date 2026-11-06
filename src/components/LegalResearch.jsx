import { useCallback,useEffect,useState } from 'react';
import { Search, BookOpen, FileText, ExternalLink, ShieldCheck, X } from 'lucide-react';

export default function LegalResearch({supabase,firm}) {
  const [cases,setCases]=useState([]);
  const [caseId,setCaseId]=useState('');
  const [query,setQuery]=useState('');
  const [results,setResults]=useState([]);
  const [loading,setLoading]=useState(true);
  const [searching,setSearching]=useState(false);
  const [error,setError]=useState('');
  const [searched,setSearched]=useState(false);

  const loadCases=useCallback(async()=>{
    if(!firm?.id)return;
    setLoading(true);setError('');
    try{
      const {data,error:queryError}=await supabase.from('cases').select('id,title,case_number').eq('firm_id',firm.id).order('title');
      if(queryError)throw queryError;
      setCases(data||[]);
      setCaseId(current=>(data||[]).some(item=>item.id===current)?current:(data?.[0]?.id||''));
    }catch(err){setError(err.message||'No se pudieron cargar los expedientes.');}
    finally{setLoading(false);}
  },[firm?.id,supabase]);
  useEffect(()=>{loadCases();},[loadCases]);

  const search=async event=>{
    event.preventDefault();
    if(!caseId||!query.trim())return;
    setSearching(true);setError('');setSearched(true);
    try{
      const {data,error:searchError}=await supabase.rpc('search_case_materials',{
        p_firm_id:firm.id,p_case_id:caseId,p_query:query.trim(),p_limit:20
      });
      if(searchError)throw searchError;
      setResults(data||[]);
    }catch(err){setError(err.message||'No se pudo completar la búsqueda.');setResults([]);}
    finally{setSearching(false);}
  };

  return <section className="content research-content">
    <div className="heading"><div><label>INVESTIGACIÓN JURÍDICA</label><h1>Búsqueda por expediente</h1><p>Buscá en fuentes oficiales, fuentes del estudio verificadas y fragmentos documentales autorizados.</p></div></div>
    {error&&<div className="alert error page-alert">{error}<button onClick={()=>setError('')}><X size={15}/></button></div>}
    <div className="legal-note"><ShieldCheck size={17}/><span><strong>Búsqueda privada y trazable.</strong> Consulta fuentes del estudio verificadas manualmente, metadatos oficiales cuya vigencia debe revisarse y documentos indexados del expediente elegido. No genera opiniones jurídicas ni reemplaza la revisión profesional.</span></div>
    <section className="panel research-panel">
      <div className="panel-title"><div><h2>Consultar fuentes</h2><p>Elegí una causa a la que tengas acceso.</p></div></div>
      <form className="research-form" onSubmit={search}>
        <label className="field"><span>Expediente</span><select required value={caseId} onChange={event=>setCaseId(event.target.value)} disabled={loading||!cases.length}><option value="">Seleccionar expediente</option>{cases.map(item=><option key={item.id} value={item.id}>{item.title}{item.case_number?' · '+item.case_number:''}</option>)}</select></label>
        <label className="field research-query"><span>¿Qué necesitás encontrar?</span><input required maxLength={500} value={query} onChange={event=>setQuery(event.target.value)} placeholder="Ej. responsabilidad civil, art. 1757 Código Civil y Comercial…"/></label>
        <button className="primary" disabled={searching||loading||!caseId}><Search size={15}/>{searching?'Buscando…':'Buscar'}</button>
      </form>
      <div className="research-results">
        <div className="research-results-head"><h3>Resultados</h3><small>{results.length} coincidencias</small></div>
        {loading&&<div className="empty">Cargando expedientes…</div>}
        {!loading&&!cases.length&&<div className="empty">No hay expedientes visibles para esta cuenta.</div>}
        {searched&&!searching&&!results.length&&<div className="empty">No se encontraron coincidencias en las fuentes disponibles o documentos indexados.</div>}
        {results.map((item,index)=><article className="research-result" key={item.source_id||item.document_id||index}>
          <span className="research-result-icon">{item.source_type==='legal_source'||item.source_type==='legal_norm'?<BookOpen size={17}/>:<FileText size={17}/>}</span>
          <div className="research-result-main"><div className="research-result-title"><strong>{item.title}</strong>{item.verified&&<em className="active">Fuente verificada manualmente</em>}{item.source_type==='legal_norm'&&<em className="pending">Metadatos oficiales · vigencia por revisar</em>}</div>
            <small className="research-citation">{item.citation||'Fragmento documental'}</small>
            {item.excerpt&&<p>{item.excerpt}</p>}
            {item.source_url&&<a href={item.source_url} target="_blank" rel="noreferrer"><ExternalLink size={13}/> Abrir fuente original</a>}
          </div>
        </article>)}
      </div>
    </section>
    <footer>JurisFlow Argentina <span>•</span> La búsqueda no garantiza que una norma esté vigente ni que un fallo sea aplicable al caso</footer>
  </section>;
}
