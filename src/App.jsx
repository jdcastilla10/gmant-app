import { useState } from 'react'
import { useApp } from './context/AppContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Activos from './pages/Activos'
import Mantenimientos from './pages/Mantenimientos'
import Historial from './pages/Historial'
import Cronograma from './pages/Cronograma'
import { Sedes, Contratistas, Usuarios } from './pages/Otros'

const NAV = [
  { id:'dashboard',     label:'Dashboard',        icon:'📊' },
  { id:'activos',       label:'Activos',           icon:'⚙️' },
  { id:'mantenimientos',label:'Mantenimientos',    icon:'🔧' },
  { id:'historial',     label:'Historial',         icon:'📋' },
  { id:'cronograma',    label:'Cronograma Anual',  icon:'📅' },
  { id:'sedes',         label:'Sedes',             icon:'🏭' },
  { id:'contratistas',  label:'Contratistas',      icon:'🤝' },
  { id:'usuarios',      label:'Usuarios',          icon:'👥', adminOnly:true },
]

const PAGES = {
  dashboard:      () => <Dashboard/>,
  activos:        () => <Activos/>,
  mantenimientos: () => <Mantenimientos/>,
  historial:      () => <Historial/>,
  cronograma:     () => <Cronograma/>,
  sedes:          () => <Sedes/>,
  contratistas:   () => <Contratistas/>,
  usuarios:       () => <Usuarios/>,
}

export default function App() {
  const { session, logout, loading, data } = useApp()
  const [page, setPage]           = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-bg"><div className="w-8 h-8 border-2 border-gborder2 border-t-accent2 rounded-full animate-spin"/></div>
  if (!session) return <Login/>

  const pendientes = data.mantenimientos.filter(m=>m.estado==='Pendiente').length
  const navItems   = NAV.filter(n=>!n.adminOnly||session.rol==='admin')

  const navigate = (id) => { setPage(id); setSidebarOpen(false) }

  return (
    <div className="min-h-screen bg-bg">
      {/* Hamburger button */}
      <button
        onClick={()=>setSidebarOpen(o=>!o)}
        aria-label="Menú"
        className="fixed top-3 left-3 z-[500] w-10 h-10 rounded-lg flex flex-col items-center justify-center gap-1.5 border-none cursor-pointer shadow-lg transition-all hover:brightness-110"
        style={{background:'#30508F',boxShadow:'0 2px 10px rgba(48,80,143,.4)'}}>
        <span className="block w-5 h-0.5 bg-white rounded"/>
        <span className="block w-5 h-0.5 bg-white rounded"/>
        <span className="block w-5 h-0.5 bg-white rounded"/>
      </button>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-[399]" onClick={()=>setSidebarOpen(false)}/>
      )}

      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full w-[235px] bg-bg2 border-r border-gborder z-[400] flex flex-col transition-transform duration-300 ${sidebarOpen?'translate-x-0':'-translate-x-full'}`}>
        {/* Logo */}
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg text-white flex-shrink-0" style={{background:'linear-gradient(135deg,#30508F,#4a6db5)',boxShadow:'0 3px 10px rgba(48,80,143,.4)'}}>⚙</div>
            <div>
              <div className="text-sm font-extrabold text-gt1 leading-tight tracking-tight">GRUPO RECORDAR</div>
              <div className="text-xs text-gt3 mt-0.5">Gestión de Mantenimiento</div>
            </div>
          </div>
        </div>
        <div className="h-px bg-gborder mx-3 mb-2"/>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-1">
          {navItems.map(n=>(
            <button key={n.id}
              onClick={()=>navigate(n.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all mb-0.5 border text-left ${page===n.id?'bg-accent/20 text-accent3 border-accent/30':'text-gt2 border-transparent hover:bg-bg3 hover:text-gt1'}`}>
              <span className="text-base w-5 text-center">{n.icon}</span>
              <span className="flex-1">{n.label}</span>
              {n.id==='mantenimientos'&&pendientes>0&&(
                <span className="w-4 h-4 rounded-full bg-gred text-white text-xs flex items-center justify-center font-bold">{pendientes}</span>
              )}
            </button>
          ))}
        </nav>

        {/* User */}
        <div className="px-4 py-3 border-t border-gborder">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{background:'linear-gradient(135deg,#30508F,#98B752)'}}>
              {session.nombre?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-gt1 truncate">{session.nombre}</div>
              <div className="text-xs text-gt3">{session.rol==='admin'?'Administrador':'Técnico'}</div>
            </div>
          </div>
          <button className="btn-secondary w-full text-xs py-2" onClick={logout}>🚪 Cerrar Sesión</button>
        </div>
      </div>

      {/* Main content */}
      <main className="pt-16 px-7 pb-7 min-h-screen">
        {(PAGES[page] ?? PAGES.dashboard)()}
      </main>

      {/* Version tag */}
      <div className="fixed bottom-1 right-2 text-xs text-gt3 opacity-40 pointer-events-none">v1.0</div>
    </div>
  )
}