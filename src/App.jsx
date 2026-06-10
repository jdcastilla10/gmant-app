import { useState, useEffect } from 'react'
import { useApp } from './context/AppContext'
import { BRAND } from './theme'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Activos from './pages/Activos'
import Mantenimientos from './pages/Mantenimientos'
import Historial from './pages/Historial'
import Cronograma from './pages/Cronograma'
import { Sedes, Contratistas, Usuarios } from './pages/Otros'

const TECNICO_PAGES = ['mantenimientos', 'historial']

const NAV = [
  { id:'dashboard',     label:'Dashboard',        icon:'📊', roles:['admin'] },
  { id:'activos',       label:'Activos',           icon:'⚙️', roles:['admin'] },
  { id:'mantenimientos',label:'Mantenimientos',    icon:'🔧', roles:['admin','tecnico'] },
  { id:'historial',     label:'Historial',         icon:'📋', roles:['admin','tecnico'] },
  { id:'cronograma',    label:'Cronograma Anual',  icon:'📅', roles:['admin'] },
  { id:'sedes',         label:'Sedes',             icon:'🏭', roles:['admin'] },
  { id:'contratistas',  label:'Contratistas',      icon:'🤝', roles:['admin'] },
  { id:'usuarios',      label:'Usuarios',          icon:'👥', roles:['admin'] },
]

export default function App() {
  const { session, logout, loading, data } = useApp()
  const [rawPage, setPage]        = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Detectar QR: ?activo=UUID en la URL
  const [pendingActivoId, setPendingActivoId] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('activo') || null
  })

  const clearPending = () => {
    setPendingActivoId(null)
    window.history.replaceState({}, '', window.location.pathname)
  }

  // Cuando hay sesión y viene de QR → ir a mantenimientos
  useEffect(() => {
    if (session && pendingActivoId) {
      setPage('mantenimientos')
    }
  }, [session, pendingActivoId])

  // Los técnicos solo pueden ver Mantenimientos e Historial
  useEffect(() => {
    if (session?.rol === 'tecnico' && !TECNICO_PAGES.includes(rawPage)) {
      setPage('mantenimientos')
    }
  }, [session, rawPage])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="w-8 h-8 border-2 border-gborder2 border-t-accent2 rounded-full animate-spin"/>
    </div>
  )
  if (!session) return <Login/>

  const pendientes = data.mantenimientos.filter(m=>m.estado==='Pendiente').length
  const navItems   = NAV.filter(n=>n.roles.includes(session.rol))
  const isTecnico  = session.rol === 'tecnico'
  const page       = isTecnico && !TECNICO_PAGES.includes(rawPage) ? 'mantenimientos' : rawPage

  const navigate = (id) => { setPage(id); setSidebarOpen(false) }

  const renderPage = () => {
    if (page === 'mantenimientos')
      return <Mantenimientos pendingActivoId={pendingActivoId} onClearPending={clearPending}/>
    const map = {
      dashboard:    <Dashboard/>,
      activos:      <Activos/>,
      historial:    <Historial/>,
      cronograma:   <Cronograma/>,
      sedes:        <Sedes/>,
      contratistas: <Contratistas/>,
      usuarios:     <Usuarios/>,
    }
    return map[page] ?? <Dashboard/>
  }

  return (
    <div className="min-h-screen bg-bg">
      {/* Hamburger button */}
      <button
        onClick={()=>setSidebarOpen(o=>!o)}
        aria-label="Menú"
        className="fixed top-3 left-3 z-[500] w-10 h-10 rounded-lg flex flex-col items-center justify-center gap-1.5 border-none cursor-pointer shadow-lg transition-all hover:brightness-110"
        style={{background:BRAND.primary,boxShadow:`0 2px 10px ${BRAND.primary}66`}}>
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
            <div className="w-9 h-9 rounded-lg overflow-hidden bg-white flex items-center justify-center flex-shrink-0" style={{boxShadow:`0 3px 10px ${BRAND.primary}66`}}>
              <img src="/logo.jpg" alt="Logo" className="w-full h-full object-cover"/>
            </div>
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
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{background:`linear-gradient(135deg,${BRAND.primary},${BRAND.primaryDark})`}}>
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
      <main className="pt-16 px-3 sm:px-5 md:px-7 pb-6 md:pb-7 min-h-screen">
        {renderPage()}
      </main>

      {/* Version tag */}
      <div className="fixed bottom-1 right-2 text-xs text-gt3 opacity-40 pointer-events-none">v1.0</div>
    </div>
  )
}
