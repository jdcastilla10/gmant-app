import { useState, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import {
  apiCreateContratista, apiCreateSede, apiDeleteContratista, apiDeleteSede,
  apiUpdateContratista, apiUpdateSede,
  apiGetUsuarios, apiCreateUsuario, apiUpdateUsuario, apiDeleteUsuario,
} from '../utils/api'
import { fmt } from '../utils/format'
import { Modal, ConfirmDel, Tag, Empty } from '../components/UI'

// ── SEDES ─────────────────────────────────────────────────
export function Sedes() {
  const { data, reload } = useApp()
  const { sedes, activos, mantenimientos } = data
  const [modal, setModal] = useState(null)
  const [del, setDel]     = useState(null)
  const [form, setForm]   = useState({nombre:'',ciudad:'',direccion:''})
  const f = v => setForm(p=>({...p,...v}))
  const save = async() => {
    try {
      if(!form.nombre) return
    if(form.id) await apiUpdateSede(form.id,form); else await apiCreateSede(form)
    reload(); setModal(null)
    } catch (error) {
      console.log(error)
    }
    
  }
  const del2 = async id => {
    try {
      await apiDeleteSede(id); reload(); setDel(null) 
    } catch (error) {
      console.log(error)
    } 
  }
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div><h2 className="section-title">Sedes</h2><p className="section-sub">Plantas y ubicaciones registradas</p></div>
        <button className="btn-primary" onClick={()=>{setForm({nombre:'',ciudad:'',direccion:''});setModal('form')}}>+ Nueva Sede</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sedes.map(s=>(
          <div key={s.id} className="card relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-xl" style={{background:'linear-gradient(90deg,#30508F,#98B752)'}}/>
            <div className="flex justify-between items-start mb-4 mt-2">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{background:'rgba(48,80,143,.15)',border:'1px solid rgba(48,80,143,.25)'}}>🏭</div>
              <div className="flex gap-2">
                <button className="btn-secondary btn-sm" onClick={()=>{setForm({...s});setModal('form')}}>✎</button>
                <button className="btn-danger btn-sm" onClick={()=>setDel(s)}>✕</button>
              </div>
            </div>
            <div className="font-bold text-base mb-1">{s.nombre}</div>
            {s.ciudad && <div className="text-xs text-gt2 mb-1">📍 {s.ciudad}</div>}
            {s.direccion && <div className="text-xs text-gt3">{s.direccion}</div>}
            <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-gborder">
              <div className="text-center bg-bg3 rounded-lg py-2.5">
                <div className="text-xl font-bold text-accent3">{activos.filter(a=>a.sede_id===s.id).length}</div>
                <div className="text-xs text-gt3 mt-0.5">Activos</div>
              </div>
              <div className="text-center bg-bg3 rounded-lg py-2.5">
                <div className="text-xl font-bold text-gamber">{mantenimientos.filter(m=>m.sede_id===s.id).length}</div>
                <div className="text-xs text-gt3 mt-0.5">Mantenimientos</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {modal==='form' && (
        <Modal title={form.id?'Editar Sede':'Nueva Sede'} onClose={()=>setModal(null)} size="sm">
          <div className="flex flex-col gap-4">
            <div><label className="form-label">Nombre *</label><input className="input-field" value={form.nombre} onChange={e=>f({nombre:e.target.value})}/></div>
            <div><label className="form-label">Ciudad</label><input className="input-field" value={form.ciudad} onChange={e=>f({ciudad:e.target.value})}/></div>
            <div><label className="form-label">Dirección</label><input className="input-field" value={form.direccion} onChange={e=>f({direccion:e.target.value})}/></div>
          </div>
          <div className="flex gap-3 mt-6 justify-end">
            <button className="btn-secondary" onClick={()=>setModal(null)}>Cancelar</button>
            <button className="btn-primary" onClick={save}>Guardar</button>
          </div>
        </Modal>
      )}
      {del && <ConfirmDel title="¿Eliminar sede?" desc={del.nombre} onConfirm={()=>del2(del.id)} onCancel={()=>setDel(null)}/>}
    </div>
  )
}

// ── CONTRATISTAS ──────────────────────────────────────────
export function Contratistas() {
  const { data, reload } = useApp()
  const { contratistas, mantenimientos } = data
  const [modal, setModal] = useState(null)
  const [del, setDel]     = useState(null)
  const [form, setForm]   = useState({nombre:'',nit:'',email:'',telefono:''})
  const f = v => setForm(p=>({...p,...v}))
  const save = async () => {
    try {
      if(!form.nombre) return
    if(form.id) await apiUpdateContratista(form.id,form); else await apiCreateContratista(form)
    reload(); setModal(null)
    } catch (error) {
      console.log(error)
    }
    
  }
  const del2 = async id => { 
    try {
      await apiDeleteContratista(id); reload(); setDel(null) 
    } catch (error) {
      console.log(error)
    }
  }
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div><h2 className="section-title">Contratistas</h2><p className="section-sub">Empresas y proveedores de mantenimiento</p></div>
        <button className="btn-primary" onClick={()=>{setForm({nombre:'',nit:'',email:'',telefono:''});setModal('form')}}>+ Nuevo Contratista</button>
      </div>
      <div className="bg-bg2 border border-gborder rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr>{['Empresa','NIT','Email','Teléfono','Trabajos','Gasto Total',''].map(h=><th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>
            {contratistas.length===0 ? <tr><td colSpan={7}><Empty text="Sin contratistas registrados"/></td></tr> :
            contratistas.map(c=>{
              const mants = mantenimientos.filter(m=>m.contratista_id===c.id)
              const gasto = mants.reduce((a,m)=>a+(parseFloat(m.gasto)||0),0)
              return(
                <tr key={c.id} className="hover:bg-bg3/30 transition-colors">
                  <td className="td font-semibold">{c.nombre}</td>
                  <td className="td text-xs font-mono text-gt2">{c.nit||'–'}</td>
                  <td className="td text-xs text-accent3">{c.email||'–'}</td>
                  <td className="td text-xs">{c.telefono||'–'}</td>
                  <td className="td"><span className="chip">{mants.length} mant.</span></td>
                  <td className="td text-xs font-semibold">{gasto>0?fmt(gasto):'–'}</td>
                  <td className="td"><div className="flex gap-1.5"><button className="btn-secondary btn-sm" onClick={()=>{setForm({...c});setModal('form')}}>✎</button><button className="btn-danger btn-sm" onClick={()=>setDel(c)}>✕</button></div></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {modal==='form' && (
        <Modal title={form.id?'Editar Contratista':'Nuevo Contratista'} onClose={()=>setModal(null)} size="sm">
          <div className="flex flex-col gap-4">
            <div><label className="form-label">Razón Social *</label><input className="input-field" value={form.nombre} onChange={e=>f({nombre:e.target.value})}/></div>
            <div><label className="form-label">NIT</label><input className="input-field" value={form.nit} onChange={e=>f({nit:e.target.value})} placeholder="900.123.456-1"/></div>
            <div><label className="form-label">Email de Contacto</label><input className="input-field" value={form.email} onChange={e=>f({email:e.target.value})}/></div>
            <div><label className="form-label">Teléfono</label><input className="input-field" value={form.telefono} onChange={e=>f({telefono:e.target.value})}/></div>
          </div>
          <div className="flex gap-3 mt-6 justify-end">
            <button className="btn-secondary" onClick={()=>setModal(null)}>Cancelar</button>
            <button className="btn-primary" onClick={save}>Guardar</button>
          </div>
        </Modal>
      )}
      {del && <ConfirmDel title="¿Eliminar contratista?" desc={del.nombre} onConfirm={()=>del2(del.id)} onCancel={()=>setDel(null)}/>}
    </div>
  )
}

// ── USUARIOS ──────────────────────────────────────────────
export function Usuarios() {
  const { session } = useApp()
  const [usuarios, setUsuarios] = useState([])
  const [modal, setModal] = useState(null)
  const [del, setDel]     = useState(null)
  const [form, setForm]   = useState({ username:'', password:'', nombre:'', rol:'tecnico', email:'', activo: true })
  const [msg, setMsg]     = useState('')
  const f = v => setForm(p => ({ ...p, ...v }))

  const loadUsuarios = async () => {
    try { setUsuarios(await apiGetUsuarios()) }
    catch (e) { console.error(e) }
  }

  useEffect(() => { loadUsuarios() }, [])

  if (session?.rol !== 'admin') return <div className="text-center py-16 text-gt3">Acceso restringido a administradores.</div>

  const save = async () => {
    if (!form.username || !form.nombre) { setMsg('Usuario y nombre son obligatorios'); return }
    if (!form.id && !form.password)     { setMsg('La contraseña es obligatoria para nuevos usuarios'); return }
    setMsg('')
    try {
      if (form.id) {
        const payload = { nombre: form.nombre, rol: form.rol, email: form.email, activo: form.activo }
        if (form.password) payload.password = form.password
        await apiUpdateUsuario(form.id, payload)
      } else {
        await apiCreateUsuario({ username: form.username, password: form.password, nombre: form.nombre, rol: form.rol, email: form.email })
      }
      await loadUsuarios()
      setModal(null)
    } catch (e) { setMsg(e.message || 'Error al guardar') }
  }

  const del2 = async id => {
    try { await apiDeleteUsuario(id); await loadUsuarios(); setDel(null) }
    catch (e) { setMsg(e.message || 'Error al eliminar') }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div><h2 className="section-title">Usuarios</h2><p className="section-sub">Gestión de accesos al sistema</p></div>
        <button className="btn-primary" onClick={() => { setForm({ username:'', password:'', nombre:'', rol:'tecnico', email:'', activo:true }); setMsg(''); setModal('form') }}>
          + Nuevo Usuario
        </button>
      </div>
      <div className="bg-bg2 border border-gborder rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr>{['Nombre','Usuario','Email','Rol','Estado',''].map(h=><th key={h} className="th">{h}</th>)}</tr></thead>
          <tbody>
            {usuarios.length === 0
              ? <tr><td colSpan={6}><Empty text="Sin usuarios registrados"/></td></tr>
              : usuarios.map(u => (
                <tr key={u.id} className="hover:bg-bg3/30 transition-colors">
                  <td className="td">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg,#30508F,#4a6db5)' }}>
                        {u.nombre.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium">{u.nombre}</span>
                    </div>
                  </td>
                  <td className="td text-xs font-mono text-gt2">{u.username}</td>
                  <td className="td text-xs text-accent3">{u.email || '–'}</td>
                  <td className="td"><Tag type={u.rol==='admin'?'prev':'done'}>{u.rol==='admin'?'Administrador':'Técnico'}</Tag></td>
                  <td className="td"><Tag type={u.activo?'done':'corr'}>{u.activo?'Activo':'Inactivo'}</Tag></td>
                  <td className="td">
                    <div className="flex gap-1.5">
                      <button className="btn-secondary btn-sm" onClick={() => { setForm({ ...u, password:'' }); setMsg(''); setModal('form') }}>✎</button>
                      {u.id !== session?.id && <button className="btn-danger btn-sm" onClick={() => setDel(u)}>✕</button>}
                    </div>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>
      {modal === 'form' && (
        <Modal title={form.id ? 'Editar Usuario' : 'Nuevo Usuario'} onClose={() => setModal(null)} size="sm">
          {msg && <div className="alert-err">{msg}</div>}
          <div className="flex flex-col gap-4">
            <div><label className="form-label">Nombre completo *</label><input className="input-field" value={form.nombre} onChange={e=>f({nombre:e.target.value})}/></div>
            <div><label className="form-label">Usuario (login) *</label><input className="input-field" value={form.username} onChange={e=>f({username:e.target.value})} disabled={!!form.id}/></div>
            <div><label className="form-label">{form.id ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña *'}</label><input className="input-field" type="password" value={form.password} onChange={e=>f({password:e.target.value})}/></div>
            <div><label className="form-label">Email</label><input className="input-field" value={form.email||''} onChange={e=>f({email:e.target.value})}/></div>
            <div><label className="form-label">Rol</label>
              <select className="input-field" value={form.rol} onChange={e=>f({rol:e.target.value})}>
                <option value="admin">Administrador</option><option value="tecnico">Técnico</option>
              </select>
            </div>
            {form.id && (
              <div><label className="form-label">Estado</label>
                <select className="input-field" value={String(form.activo)} onChange={e=>f({activo:e.target.value==='true'})}>
                  <option value="true">Activo</option><option value="false">Inactivo</option>
                </select>
              </div>
            )}
          </div>
          <div className="flex gap-3 mt-6 justify-end">
            <button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
            <button className="btn-primary" onClick={save}>Guardar</button>
          </div>
        </Modal>
      )}
      {del && <ConfirmDel title="¿Eliminar usuario?" desc={del.nombre} onConfirm={() => del2(del.id)} onCancel={() => setDel(null)}/>}
    </div>
  )
}
