import { ArrowUpRight, BookOpen, CalendarDays, FolderOpen, Search, ShieldCheck, Users } from 'lucide-react';

const shortcuts = [
  { id: 'cases', title: 'Expedientes', description: 'Consultá causas, actuaciones y documentación.', icon: FolderOpen },
  { id: 'clients', title: 'Clientes', description: 'Administrá fichas y datos de contacto.', icon: Users },
  { id: 'agenda', title: 'Agenda y vencimientos', description: 'Revisá audiencias, reuniones y fechas clave.', icon: CalendarDays },
  { id: 'library', title: 'Biblioteca jurídica', description: 'Accedé a normativa y fuentes oficiales.', icon: BookOpen },
  { id: 'research', title: 'Investigación jurídica', description: 'Buscá material por expediente y fuentes.', icon: Search },
];

export default function HomeDashboard({ firm, user, clientsCount, casesCount, role, onNavigate }) {
  const firstName = (user?.user_metadata?.full_name || user?.email || 'profesional').split(/[\s@]/)[0];
  const location = [firm?.city, firm?.province].filter(Boolean).join(', ');
  const roleNames = { owner: 'Titular del estudio', admin: 'Administrador', lawyer: 'Abogado/a', assistant: 'Asistente', read_only: 'Solo lectura' };

  return <section className="content dashboard-content">
    <div className="dashboard-heading">
      <div><span className="eyebrow">PANEL DE CONTROL</span><h1>Buen día, {firstName}</h1>
        <p>Este es el resumen de trabajo de tu espacio jurídico.</p></div>
      <div className="dashboard-date"><ShieldCheck size={16}/><span>Espacio privado del estudio</span></div>
    </div>
    <section className="dashboard-welcome">
      <div className="dashboard-welcome-copy">
        <span className="dashboard-kicker">JURISFLOW ARGENTINA</span>
        <h2>Tu práctica jurídica,<br/>organizada en un solo lugar.</h2>
        <p>Gestioná causas, clientes, agenda y fuentes jurídicas desde una plataforma integrada.</p>
        <button className="dashboard-cta" onClick={() => onNavigate('cases')}>Ir a expedientes <ArrowUpRight size={16}/></button>
      </div>
      <div className="dashboard-welcome-mark" aria-hidden="true"><div><ShieldCheck size={58}/></div><span>GESTIÓN JURÍDICA</span></div>
    </section>
    <div className="dashboard-stat-grid">
      <article className="dashboard-stat"><span className="dashboard-stat-icon green"><Users size={19}/></span><div><small>CLIENTES</small><strong>{clientsCount}</strong><span>Registros de tu estudio</span></div><button onClick={() => onNavigate('clients')} aria-label="Abrir clientes"><ArrowUpRight size={17}/></button></article>
      <article className="dashboard-stat"><span className="dashboard-stat-icon blue"><FolderOpen size={19}/></span><div><small>EXPEDIENTES</small><strong>{casesCount}</strong><span>Causas registradas</span></div><button onClick={() => onNavigate('cases')} aria-label="Abrir expedientes"><ArrowUpRight size={17}/></button></article>
      <article className="dashboard-stat"><span className="dashboard-stat-icon amber"><CalendarDays size={19}/></span><div><small>ORGANIZACIÓN</small><strong>Agenda</strong><span>Audiencias y vencimientos</span></div><button onClick={() => onNavigate('agenda')} aria-label="Abrir agenda"><ArrowUpRight size={17}/></button></article>
    </div>
    <div className="dashboard-section-head"><div><span className="eyebrow">HERRAMIENTAS</span><h2>Accesos rápidos</h2><p>Entrá directamente al módulo que necesitás.</p></div></div>
    <div className="dashboard-shortcuts">
      {shortcuts.map(item => { const Icon = item.icon; return <button className="dashboard-shortcut" key={item.id} onClick={() => onNavigate(item.id)}>
        <span className="dashboard-shortcut-icon"><Icon size={19}/></span><span className="dashboard-shortcut-copy"><strong>{item.title}</strong><small>{item.description}</small></span><ArrowUpRight className="dashboard-shortcut-arrow" size={17}/>
      </button>; })}
    </div>
    <div className="dashboard-footnote"><ShieldCheck size={17}/><div><strong>Privacidad y control de acceso</strong><p>Los datos y documentos se muestran según los permisos de tu estudio y las asignaciones de cada expediente.</p></div></div>
    <footer>JurisFlow Argentina <span>•</span> {firm?.name || 'Mi estudio'} <span>•</span> {location || roleNames[role] || 'Espacio de trabajo'}</footer>
  </section>;
}
