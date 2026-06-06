import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { apiCreateActivo, apiUpdateActivo, apiDeleteActivo } from '../utils/api'
import { fmt, fmtDate, FRECUENCIAS } from '../utils/format'
import { Modal, ConfirmDel, Tag, Empty, SearchBar, Field } from '../components/UI'

const empty = {
  identificacion:'', nombre:'', sedeId:'', categoria:'',
  marca:'', serial:'', estado:'Activo', fechaAdq:'', valor:0, frecuencia:'Mensual'
}

export default function Activos() {
  const { data, reload } = useApp()
  const { activos, sedes, mantenimientos } = data
  const [modal, setModal] = useState(null)
  const [del,   setDel]   = useState(null)
  const [form,  setForm]  = useState(empty)
  const [msg,   setMsg]   = useState('')
  const [search,setSearch]= useState('')

  const f = v => setForm(p => ({ ...p, ...v }))

  // Mantenimientos de un activo — el backend devuelve activo_id en snake_case
  const getMants = id => mantenimientos.filter(m => m.activo_id === id)

  const filtered = activos.filter(a =>
    [a.identificacion, a.nombre, a.marca, a.serial]
      .some(x => x?.toLowerCase().includes(search.toLowerCase()))
  )

  // ── Guardar (crear o editar) ──────────────────────────────
  const save = async () => {
    if (!form.identificacion || !form.nombre) {
      setMsg('Identificación y nombre son obligatorios')
      return
    }
    setMsg('')
    try {
      const payload = {
        identificacion: form.identificacion,
        nombre:         form.nombre,
        sede_id:        form.sedeId   || null,
        categoria:      form.categoria|| null,
        marca:          form.marca    || null,
        serial:         form.serial   || null,
        estado:         form.estado   || 'Activo',
        fecha_adq:      form.fechaAdq || null,
        valor:          parseFloat(form.valor) || 0,
        frecuencia:     form.frecuencia || 'Mensual',
      }
      if (form.id) await apiUpdateActivo(form.id, payload)
      else         await apiCreateActivo(payload)
      await reload()
      setModal(null)
    } catch (e) {
      setMsg(e.message || 'Error al guardar')
    }
  }

  // ── Eliminar ──────────────────────────────────────────────
  const del2 = async (id) => {
    try {
      await apiDeleteActivo(id)
      await reload()
      setDel(null)
    } catch (e) {
      setMsg(e.message || 'Error al eliminar')
    }
  }

  // Al abrir edición: mapear snake_case del servidor → camelCase del form
  const openEdit = (a) => {
    setForm({
      id:             a.id,
      identificacion: a.identificacion,
      nombre:         a.nombre,
      sedeId:         a.sede_id        || '',
      categoria:      a.categoria      || '',
      marca:          a.marca          || '',
      serial:         a.serial         || '',
      estado:         a.estado         || 'Activo',
      fechaAdq:       a.fecha_adq ? a.fecha_adq.toString().split('T')[0] : '',
      valor:          a.valor          || 0,
      frecuencia:     a.frecuencia     || 'Mensual',
    })
    setMsg('')
    setModal('form')
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="section-title">Activos</h2>
          <p className="section-sub">Registro de maquinaria y equipos</p>
        </div>
        <button className="btn-primary" onClick={() => { setForm(empty); setMsg(''); setModal('form') }}>
          + Nuevo Activo
        </button>
      </div>

      <div className="mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar por identificación, nombre, marca o serial..."/>
      </div>

      <div className="bg-bg2 border border-gborder rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {['Identificación','Nombre / Equipo','Sede','Categoría','Marca / Serial','Frec. Mant.','Estado','Valor Adq.','Mant.',''].map(h =>
                  <th key={h} className="th">{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={10}><Empty icon="⚙" text="Sin activos registrados"/></td></tr>
                : filtered.map(a => {
                    const mants = getMants(a.id)
                    return (
                      <tr key={a.id} className="hover:bg-bg3/30 transition-colors">
                        <td className="td">
                          <span className="font-bold text-accent3">{a.identificacion || '–'}</span>
                        </td>
                        <td className="td">
                          <div className="font-medium">{a.nombre}</div>
                          {a.fecha_adq && <div className="text-xs text-gt3">Adq. {fmtDate(a.fecha_adq)}</div>}
                        </td>
                        {/* sede_nombre viene directo del JOIN en el backend */}
                        <td className="td text-xs text-gt2">{a.sede_nombre || '–'}</td>
                        <td className="td text-xs">{a.categoria || '–'}</td>
                        <td className="td">
                          <div className="text-xs">{a.marca || '–'}</div>
                          <div className="text-xs text-gt3 font-mono">{a.serial}</div>
                        </td>
                        <td className="td">
                          <span className="chip" style={{color:'#CBD568',borderColor:'rgba(152,183,82,.3)',background:'rgba(152,183,82,.08)'}}>
                            {a.frecuencia || '–'}
                          </span>
                        </td>
                        <td className="td">
                          <Tag type={a.estado==='Activo'?'done':a.estado==='En mantenimiento'?'prog':'corr'}>
                            {a.estado}
                          </Tag>
                        </td>
                        <td className="td text-xs font-medium">{a.valor > 0 ? fmt(a.valor) : '–'}</td>
                        <td className="td">
                          <div className="flex gap-1 flex-wrap">
                            <span className="chip">{mants.filter(m => m.tipo === 'Preventivo').length} Prev</span>
                            <span className="chip">{mants.filter(m => m.tipo === 'Correctivo').length} Corr</span>
                          </div>
                        </td>
                        <td className="td">
                          <div className="flex gap-1.5">
                            <button className="btn-secondary btn-sm" onClick={() => openEdit(a)}>✎</button>
                            <button className="btn-danger btn-sm"    onClick={() => setDel(a)}>✕</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
              }
            </tbody>
          </table>
        </div>
      </div>

      {modal === 'form' && (
        <Modal title={form.id ? 'Editar Activo' : 'Nuevo Activo'} onClose={() => setModal(null)} size="lg">
          {msg && <div className="alert-err">{msg}</div>}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Identificación *">
              <input className="input-field" value={form.identificacion}
                     onChange={e => f({ identificacion: e.target.value })} placeholder="MQ-001"/>
            </Field>
            <Field label="Estado">
              <select className="input-field" value={form.estado} onChange={e => f({ estado: e.target.value })}>
                <option>Activo</option>
                <option>Inactivo</option>
                <option>En mantenimiento</option>
                <option>Dado de baja</option>
              </select>
            </Field>
            <Field label="Nombre del Equipo *" full>
              <input className="input-field" value={form.nombre} onChange={e => f({ nombre: e.target.value })}/>
            </Field>
            <Field label="Sede">
              <select className="input-field" value={form.sedeId} onChange={e => f({ sedeId: e.target.value })}>
                <option value="">Sin asignar</option>
                {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </Field>
            <Field label="Categoría">
              <input className="input-field" value={form.categoria} onChange={e => f({ categoria: e.target.value })}/>
            </Field>
            <Field label="Marca">
              <input className="input-field" value={form.marca} onChange={e => f({ marca: e.target.value })}/>
            </Field>
            <Field label="Serial">
              <input className="input-field" value={form.serial} onChange={e => f({ serial: e.target.value })}/>
            </Field>
            <Field label="Frecuencia de Mantenimiento">
              <select className="input-field" value={form.frecuencia} onChange={e => f({ frecuencia: e.target.value })}>
                {FRECUENCIAS.map(fr => <option key={fr}>{fr}</option>)}
              </select>
            </Field>
            <Field label="Fecha Adquisición">
              <input className="input-field" type="date" value={form.fechaAdq || ''}
                     onChange={e => f({ fechaAdq: e.target.value })}/>
            </Field>
            <Field label="Valor de Adquisición (COP)">
              <input className="input-field" type="number" value={form.valor}
                     onChange={e => f({ valor: e.target.value })}/>
            </Field>
          </div>
          <div className="flex gap-3 mt-6 justify-end">
            <button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
            <button className="btn-primary"   onClick={save}>Guardar Activo</button>
          </div>
        </Modal>
      )}

      {del && (
        <ConfirmDel
          title="¿Eliminar activo?"
          desc={`${del.identificacion || ''} – ${del.nombre}`}
          onConfirm={() => del2(del.id)}
          onCancel={() => setDel(null)}
        />
      )}
    </div>
  )
}