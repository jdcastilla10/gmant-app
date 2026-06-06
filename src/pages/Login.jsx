/**
 * Login.jsx  —  Versión con backend real
 * Reemplaza:  gmant-app/src/pages/Login.jsx
 *
 * El único cambio es que login() ahora es async y puede lanzar Error.
 */
import { useState } from 'react'
import { useApp } from '../context/AppContext'

export default function Login() {
  const { login } = useApp()
  const [u, setU]         = useState('')
  const [p, setP]         = useState('')
  const [err, setErr]     = useState('')
  const [loading, setLoading] = useState(false)

  const handle = async () => {
    if (!u || !p) { setErr('Completa usuario y contraseña'); return }
    setLoading(true); setErr('')
    try {
      await login(u, p)
      // AppContext actualiza session → App renderiza el dashboard automáticamente
    } catch (e) {
      setErr(e.message || 'Usuario o contraseña incorrectos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg"
         style={{background:'radial-gradient(ellipse at 30% 40%,rgba(48,80,143,.1) 0%,transparent 60%),#1a1a1a'}}>
      <div className="w-96 p-10 bg-bg2 border border-gborder2 rounded-2xl shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl text-white shadow-lg"
               style={{background:'linear-gradient(135deg,#30508F,#4a6db5)',boxShadow:'0 8px 24px rgba(48,80,143,.4)'}}>⚙</div>
          <h1 className="text-2xl font-extrabold text-gt1 tracking-tight">GRUPO RECORDAR</h1>
          <p className="text-gt2 text-sm mt-1">Sistema de Gestión de Mantenimiento</p>
        </div>

        {err && <div className="alert-err">⚠ {err}</div>}

        <div className="flex flex-col gap-4">
          <div>
            <label className="form-label">Usuario</label>
            <input className="input-field" value={u}
                   onChange={e=>setU(e.target.value)}
                   onKeyDown={e=>e.key==='Enter'&&handle()}
                   placeholder="Ingrese su usuario" autoFocus/>
          </div>
          <div>
            <label className="form-label">Contraseña</label>
            <input className="input-field" type="password" value={p}
                   onChange={e=>setP(e.target.value)}
                   onKeyDown={e=>e.key==='Enter'&&handle()}
                   placeholder="••••••••"/>
          </div>
          <button className="btn-primary py-3 text-sm mt-2" onClick={handle} disabled={loading}>
            {loading ? 'Verificando...' : 'Iniciar Sesión'}
          </button>
        </div>
      </div>
    </div>
  )
}
