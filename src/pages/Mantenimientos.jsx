import { useState, useMemo, useEffect } from 'react'
import { useApp } from '../context/AppContext'
import { apiCreateMantenimiento, apiUpdateMantenimiento, apiDeleteMantenimiento, apiUploadDoc } from '../utils/api'
import { fmt, fmtDate, today } from '../utils/format'
import { Modal, ConfirmDel, Tag, Empty, SearchBar, Field, FileUpload } from '../components/UI'

const emptyForm = {
  activoId:'', sedeId:'', tipo:'Preventivo', estado:'Pendiente',
  fechaProg:today(), fechaEjec:'', descripcion:'', gasto:0,
  contraId:'', tecnico:'', responsable:'', tecnicoAsignadoId:'', docSoporte:'',
  docUrl:'', docNombre:'', ordenCompra:'', observaciones:''
}

const emptyComplete = {
  id:'', fechaEjec:'', descripcion:'', tecnico:'', observaciones:'',
  docSoporte:'', docUrl:'', docNombre:'',
}

export default function Mantenimientos({ pendingActivoId, onClearPending }) {
  const { data, reload, session } = useApp()
  const { activos, sedes, mantenimientos, contratistas, usuarios } = data
  const isTecnico = session.rol === 'tecnico'
  const tecnicos  = usuarios.filter(u => u.rol === 'tecnico' && u.activo)

  const [modal,        setModal]        = useState(null) // 'form' | 'complete'
  const [detail,       setDetail]       = useState(null)
  const [del,          setDel]          = useState(null)
  const [form,         setForm]         = useState(emptyForm)
  const [completeForm, setCompleteForm] = useState(emptyComplete)
  const [scannedActivo, setScannedActivo] = useState(null)
  const [msg,        setMsg]        = useState('')
  const [search,     setSearch]     = useState('')
  const [filtroTipo, setFiltroTipo] = useState('Todos')
  const [filtroEst,  setFiltroEst]  = useState('Todos')
  const [filtroSede, setFiltroSede] = useState('Todas')

  const f  = v => setForm(p => ({ ...p, ...v }))
  const fc = v => setCompleteForm(p => ({ ...p, ...v }))

  // Helpers — el backend devuelve activo_id y sede_id en snake_case
  const getActivo = id => activos.find(a => a.id === id)
  const getSede   = id => sedes.find(s => s.id === id)

  const camposRequeridos = [
    ['Descripción',     m => m.descripcion],
    ['F. Programada',   m => m.fecha_prog],
    ['F. Ejecutada',    m => m.fecha_ejec],
    ['Gasto',           m => m.gasto > 0],
    ['Contratista',     m => m.contratista_id],
    ['Técnico Ejecutor',m => m.tecnico],
    ['Responsable',     m => m.responsable],
    ['Doc. Soporte',    m => m.doc_url || m.doc_soporte],
    ['Orden de Compra', m => m.orden_compra],
  ]
  const getFaltantes = (m) => camposRequeridos.filter(([, check]) => !check(m)).map(([label]) => label)

  // Abrir modal de "completar" (técnico) con los datos del mantenimiento
  const openComplete = (m) => {
    const act = getActivo(m.activo_id)
    if (act) setScannedActivo(act)
    setCompleteForm({
      id:            m.id,
      fechaEjec:     m.fecha_ejec ? m.fecha_ejec.toString().split('T')[0] : today(),
      descripcion:   m.descripcion   || '',
      tecnico:       m.tecnico       || '',
      observaciones: m.observaciones || '',
      docSoporte:    m.doc_soporte   || '',
      docUrl:        m.doc_url       || '',
      docNombre:     m.doc_nombre    || '',
    })
    setMsg('')
    setModal('complete')
  }

  // Abrir formulario automáticamente al escanear QR
  useEffect(() => {
    if (pendingActivoId && activos.length > 0) {
      const act = activos.find(a => a.id === pendingActivoId)
      if (!act) return
      setScannedActivo(act)
      if (isTecnico) {
        const m = mantenimientos.find(x => x.activo_id === act.id && x.estado !== 'Completado')
        if (m) openComplete(m)
        else setMsg('No tienes mantenimientos pendientes asignados para este activo.')
      } else {
        setForm({ ...emptyForm, activoId: act.id, sedeId: act.sede_id || '' })
        setMsg('')
        setModal('form')
      }
      onClearPending?.()
    }
  }, [pendingActivoId, activos])

  const filtered = useMemo(() => mantenimientos.filter(m => {
    // usar snake_case que viene del backend
    const act = getActivo(m.activo_id)
    const matchS = !search || (
      act?.identificacion?.toLowerCase().includes(search.toLowerCase()) ||
      act?.nombre?.toLowerCase().includes(search.toLowerCase()) ||
      m.contratista_nombre?.toLowerCase().includes(search.toLowerCase()) ||
      m.responsable?.toLowerCase().includes(search.toLowerCase())
    )
    return (
      matchS &&
      (filtroTipo === 'Todos' || m.tipo === filtroTipo) &&
      (filtroEst  === 'Todos' || m.estado === filtroEst) &&
      (filtroSede === 'Todas' || m.sede_id === filtroSede) &&
      (!isTecnico || m.estado !== 'Completado')
    )
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
  [mantenimientos, search, filtroTipo, filtroEst, filtroSede, isTecnico])

  // Al seleccionar activo, auto-rellenar sede
  const onActivo = id => {
    const act = activos.find(a => a.id === id)
    f({ activoId: id, sedeId: act?.sede_id || form.sedeId })
  }

  // Mapear snake_case del servidor → camelCase del form al abrir edición
  const openEdit = (m) => {
    setForm({
      id:           m.id,
      activoId:     m.activo_id     || '',
      sedeId:       m.sede_id       || '',
      tipo:         m.tipo          || 'Preventivo',
      estado:       m.estado        || 'Pendiente',
      fechaProg:    m.fecha_prog ? m.fecha_prog.toString().split('T')[0] : '',
      fechaEjec:    m.fecha_ejec ? m.fecha_ejec.toString().split('T')[0] : '',
      descripcion:  m.descripcion   || '',
      gasto:        m.gasto         || 0,
      contraId:     m.contratista_id|| '',
      tecnico:      m.tecnico       || '',
      responsable:  m.responsable   || '',
      tecnicoAsignadoId: m.tecnico_asignado_id || '',
      docSoporte:   m.doc_soporte   || '',
      docUrl:       m.doc_url       || '',
      docNombre:    m.doc_nombre    || '',
      ordenCompra:  m.orden_compra  || '',
      observaciones:m.observaciones || '',
    })
    setMsg('')
    setModal('form')
  }

  // ── Guardar (admin) ────────────────────────────────────────
  const save = async () => {
    if (!form.activoId || !form.tecnicoAsignadoId) {
      setMsg('Activo y técnico asignado son obligatorios')
      return
    }
    setMsg('')
    try {
      const payload = {
        activo_id:     form.activoId    || null,
        sede_id:       form.sedeId      || null,
        tipo:          form.tipo,
        estado:        form.estado,
        fecha_prog:    form.fechaProg   || null,
        fecha_ejec:    form.fechaEjec   || null,
        descripcion:   form.descripcion,
        gasto:         parseFloat(form.gasto) || 0,
        contratista_id:form.contraId    || null,
        tecnico:       form.tecnico     || null,
        responsable:   form.responsable || null,
        tecnico_asignado_id: form.tecnicoAsignadoId,
        orden_compra:  form.ordenCompra || null,
        observaciones: form.observaciones|| null,
        doc_soporte:   form.docSoporte  || null,
        doc_url:       form.docUrl      || null,
        doc_nombre:    form.docNombre   || null,
      }
      if (form.id) await apiUpdateMantenimiento(form.id, payload)
      else         await apiCreateMantenimiento(payload)
      await reload()
      closeModal()
    } catch (e) {
      setMsg(e.message || 'Error al guardar')
    }
  }

  // ── Guardar (técnico → completar) ──────────────────────────
  const saveComplete = async () => {
    const { fechaEjec, descripcion, tecnico, docUrl } = completeForm
    if (!fechaEjec || !descripcion || !tecnico || !docUrl) {
      setMsg(!docUrl ? 'Debes adjuntar el documento de soporte (archivo)' : 'Todos los campos son obligatorios, excepto observaciones')
      return
    }
    setMsg('')
    try {
      await apiUpdateMantenimiento(completeForm.id, {
        fecha_ejec:    completeForm.fechaEjec,
        descripcion:   completeForm.descripcion,
        tecnico:       completeForm.tecnico,
        observaciones: completeForm.observaciones || null,
        doc_soporte:   completeForm.docSoporte || null,
        doc_url:       completeForm.docUrl     || null,
        doc_nombre:    completeForm.docNombre  || null,
      })
      await reload()
      closeModal()
    } catch (e) {
      setMsg(e.message || 'Error al guardar')
    }
  }

  // ── Eliminar ──────────────────────────────────────────────
  const del2 = async (id) => {
    try {
      await apiDeleteMantenimiento(id)
      await reload()
      setDel(null)
    } catch (e) {
      setMsg(e.message || 'Error al eliminar')
    }
  }

  const closeModal = () => { setModal(null); setScannedActivo(null) }

  const ActivoCard = () => {
    if (!scannedActivo) return null
    const sede = getSede(scannedActivo.sede_id)
    return (
      <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 mb-4 bg-bg3 border border-gborder2 rounded-xl">
        {scannedActivo.foto_url
          ? <img src={scannedActivo.foto_url} alt={scannedActivo.nombre}
                 className="w-14 h-14 sm:w-20 sm:h-20 rounded-lg object-cover border border-gborder2 flex-shrink-0"/>
          : <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-lg bg-bg4 border border-gborder2 flex items-center justify-center text-2xl sm:text-3xl text-gt3 flex-shrink-0">⚙️</div>
        }
        <div className="flex-1 min-w-0">
          <div className="text-sm sm:text-base font-bold text-gt1 truncate">{scannedActivo.nombre}</div>
          <div className="text-xs sm:text-sm text-accent3 font-semibold mt-0.5">{scannedActivo.identificacion}</div>
          <div className="text-xs text-gt3 mt-1">{sede?.nombre || '–'}</div>
        </div>
      </div>
    )
  }

  const openDoc = (m) => {
    if (!m.doc_url) return
    const a = document.createElement('a')
    a.href = m.doc_url
    a.target = '_blank'
    a.rel = 'noreferrer'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div>
      <div className="flex flex-wrap justify-between items-start gap-3 mb-6">
        <div>
          <h2 className="section-title">{isTecnico ? 'Mis Mantenimientos Asignados' : 'Registro de Mantenimiento'}</h2>
          <p className="section-sub">
            {isTecnico
              ? `${filtered.length} pendientes por completar`
              : (() => {
                  const incompletos = mantenimientos.filter(m => getFaltantes(m).length > 0).length
                  return incompletos > 0
                    ? <>{mantenimientos.length} registros · <span className="text-amber-400">{incompletos} incompleto{incompletos > 1 ? 's' : ''}</span></>
                    : `${mantenimientos.length} registros · Todos completos`
                })()}
          </p>
        </div>
        {!isTecnico && (
          <button className="btn-primary" onClick={() => { setForm(emptyForm); setMsg(''); setModal('form') }}>
            + Nuevo Registro
          </button>
        )}
      </div>

      {msg && !modal && <div className="alert-err mb-4">⚠ {msg}</div>}

      {/* Filtros */}
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <div className="w-full sm:flex-1 sm:w-auto sm:min-w-[200px]">
          <SearchBar value={search} onChange={setSearch} placeholder="Buscar activo, contratista, responsable..."/>
        </div>
        <select className="input-field flex-1 sm:flex-none sm:w-36" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
          <option>Todos</option><option>Preventivo</option><option>Correctivo</option>
        </select>
        {!isTecnico && (
          <select className="input-field flex-1 sm:flex-none sm:w-36" value={filtroEst} onChange={e => setFiltroEst(e.target.value)}>
            <option>Todos</option><option>Pendiente</option><option>En proceso</option><option>Completado</option>
          </select>
        )}
        <select className="input-field w-full sm:w-40" value={filtroSede} onChange={e => setFiltroSede(e.target.value)}>
          <option value="Todas">Todas las sedes</option>
          {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div className="bg-bg2 border border-gborder rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 900 }}>
            <thead>
              <tr>
                {(isTecnico
                  ? ['Activo','Sede','Tipo','F. Prog.','Estado','']
                  : ['','Activo','Sede','Tipo','F. Prog.','F. Ejec.','Estado','Gasto','Responsable','Técnico Asignado','OC / Soporte','']
                ).map((h,i) => <th key={h||i} className="th">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={isTecnico ? 6 : 12}><Empty text={isTecnico ? 'No tienes mantenimientos pendientes' : 'Sin registros'}/></td></tr>
                : filtered.map(m => {
                    const act  = getActivo(m.activo_id)
                    const faltantes = !isTecnico ? getFaltantes(m) : []
                    // sede_nombre ya viene del JOIN, no hace falta buscar
                    if (isTecnico) return (
                      <tr key={m.id} className="hover:bg-bg3/30 transition-colors">
                        <td className="td">
                          <span className="font-bold text-accent3 text-xs">{act?.identificacion || m.activo_identificacion || '–'}</span><br/>
                          <span className="text-xs text-gt3">{(act?.nombre || m.activo_nombre)?.substring(0, 24)}</span>
                        </td>
                        <td className="td text-xs text-gt2">{m.sede_nombre || '–'}</td>
                        <td className="td"><Tag type={m.tipo === 'Preventivo' ? 'prev' : 'corr'}>{m.tipo}</Tag></td>
                        <td className="td text-xs">{fmtDate(m.fecha_prog)}</td>
                        <td className="td"><Tag type={m.estado === 'Pendiente' ? 'pend' : 'prog'}>{m.estado}</Tag></td>
                        <td className="td">
                          <div className="flex gap-1">
                            <button className="btn-secondary btn-sm" onClick={() => setDetail(m)}>👁</button>
                            <button className="btn-primary btn-sm" onClick={() => openComplete(m)}>✅ Completar</button>
                          </div>
                        </td>
                      </tr>
                    )
                    return (
                      <tr key={m.id} className="hover:bg-bg3/30 transition-colors">
                        <td className="td" style={{ width: 32, padding: '6px 4px' }}>
                          {faltantes.length === 0
                            ? <div className="w-6 h-6 rounded-full bg-green-900/30 border border-green-700/40 flex items-center justify-center text-xs text-ggreen" title="Registro completo">✓</div>
                            : <div className="w-6 h-6 rounded-full bg-amber-900/30 border border-amber-700/40 flex items-center justify-center text-[10px] font-bold text-amber-400 cursor-help"
                                   title={`Faltan: ${faltantes.join(', ')}`}>{faltantes.length}</div>
                          }
                        </td>
                        <td className="td">
                          <span className="font-bold text-accent3 text-xs">{act?.identificacion || m.activo_identificacion || '–'}</span><br/>
                          <span className="text-xs text-gt3">{(act?.nombre || m.activo_nombre)?.substring(0, 24)}</span>
                        </td>
                        <td className="td text-xs text-gt2">{m.sede_nombre || '–'}</td>
                        <td className="td"><Tag type={m.tipo === 'Preventivo' ? 'prev' : 'corr'}>{m.tipo}</Tag></td>
                        <td className="td text-xs">{fmtDate(m.fecha_prog)}</td>
                        <td className="td text-xs">{m.fecha_ejec ? fmtDate(m.fecha_ejec) : <span className="text-gt3">–</span>}</td>
                        <td className="td"><Tag type={m.estado === 'Completado' ? 'done' : m.estado === 'Pendiente' ? 'pend' : 'prog'}>{m.estado}</Tag></td>
                        <td className="td text-xs font-semibold">{m.gasto > 0 ? fmt(m.gasto) : '–'}</td>
                        <td className="td text-xs text-gt2">{m.responsable || '–'}</td>
                        <td className="td text-xs text-gt2">{m.tecnico_asignado_nombre || '–'}</td>
                        <td className="td text-xs text-gt3 font-mono">
                          {m.orden_compra && <div>OC: {m.orden_compra}</div>}
                          {m.doc_url &&
                            <button onClick={() => openDoc(m)} className="text-accent3 hover:underline text-xs">
                              📄 {(m.doc_nombre || 'documento').substring(0, 14)}
                            </button>
                          }
                          {!m.doc_url && m.doc_soporte && <div>{m.doc_soporte}</div>}
                        </td>
                        <td className="td">
                          <div className="flex gap-1">
                            <button className="btn-secondary btn-sm" onClick={() => setDetail(m)}>👁</button>
                            <button className="btn-secondary btn-sm" onClick={() => openEdit(m)}>✎</button>
                            <button className="btn-danger btn-sm"    onClick={() => setDel(m)}>✕</button>
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

      {/* FORM MODAL (admin) */}
      {modal === 'form' && (
        <Modal title={form.id ? 'Editar Registro' : 'Nuevo Registro de Mantenimiento'}
               onClose={closeModal} size="xl">
          <ActivoCard/>
          {msg && <div className="alert-err">{msg}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Activo *">
              <select className="input-field" value={form.activoId} onChange={e => onActivo(e.target.value)}>
                <option value="">Seleccionar...</option>
                {activos.map(a => <option key={a.id} value={a.id}>{a.identificacion} – {a.nombre}</option>)}
              </select>
            </Field>
            <Field label="Sede">
              <select className="input-field" value={form.sedeId} onChange={e => f({ sedeId: e.target.value })}>
                <option value="">Sin asignar</option>
                {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
              </select>
            </Field>
            <Field label="Tipo">
              <select className="input-field" value={form.tipo} onChange={e => f({ tipo: e.target.value })}>
                <option>Preventivo</option><option>Correctivo</option>
              </select>
            </Field>
            <Field label="Estado">
              <select className="input-field" value={form.estado} onChange={e => f({ estado: e.target.value })}>
                <option>Pendiente</option><option>En proceso</option><option>Completado</option>
              </select>
            </Field>
            <Field label="Fecha Programada">
              <input className="input-field" type="date" value={form.fechaProg} onChange={e => f({ fechaProg: e.target.value })}/>
            </Field>
            <Field label="Fecha Ejecutada">
              <input className="input-field" type="date" value={form.fechaEjec} onChange={e => f({ fechaEjec: e.target.value })}/>
            </Field>
            <Field label="Descripción" full>
              <textarea className="input-field" rows={3} value={form.descripcion}
                        onChange={e => f({ descripcion: e.target.value })}
                        placeholder="Actividades realizadas..."/>
            </Field>
            <Field label="Gasto (COP)">
              <input className="input-field" type="number" value={form.gasto} onChange={e => f({ gasto: e.target.value })}/>
            </Field>
            <Field label="Contratista">
              <select className="input-field" value={form.contraId} onChange={e => f({ contraId: e.target.value })}>
                <option value="">Seleccionar...</option>
                {contratistas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </Field>
            <Field label="Técnico Asignado *">
              <select className="input-field" value={form.tecnicoAsignadoId} onChange={e => f({ tecnicoAsignadoId: e.target.value })}>
                <option value="">Seleccionar...</option>
                {tecnicos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
              </select>
            </Field>
            <Field label="Técnico Ejecutor">
              <input className="input-field" value={form.tecnico} onChange={e => f({ tecnico: e.target.value })}/>
            </Field>
            <Field label="Responsable quien recibe">
              <input className="input-field" value={form.responsable} onChange={e => f({ responsable: e.target.value })}/>
            </Field>
            <Field label="Orden de Compra">
              <input className="input-field" value={form.ordenCompra} onChange={e => f({ ordenCompra: e.target.value })} placeholder="OC-1045"/>
            </Field>
            <Field label="Doc. Soporte / OT" full>
              <div className="flex gap-2 items-center flex-wrap mb-2">
                <input className="input-field flex-1" value={form.docSoporte}
                       onChange={e => f({ docSoporte: e.target.value })}
                       placeholder="OT-2024-0341" style={{ minWidth: 140 }}/>
                <FileUpload
                  inputId="file-mant"
                  uploadFn={apiUploadDoc}
                  docUrl={form.docUrl}
                  docNombre={form.docNombre}
                  onUploaded={({ url, nombre }) => f({ docUrl: url, docNombre: nombre })}
                  onClear={() => f({ docUrl: '', docNombre: '' })}
                />
              </div>
            </Field>
            <Field label="Observaciones" full>
              <textarea className="input-field" rows={2} value={form.observaciones}
                        onChange={e => f({ observaciones: e.target.value })}/>
            </Field>
          </div>
          <div className="flex gap-3 mt-6 justify-end">
            <button className="btn-secondary" onClick={closeModal}>Cancelar</button>
            <button className="btn-primary" onClick={save}>Guardar Registro</button>
          </div>
        </Modal>
      )}

      {/* COMPLETE MODAL (técnico) */}
      {modal === 'complete' && (
        <Modal title="Completar Mantenimiento" onClose={closeModal} size="lg">
          <ActivoCard/>
          {msg && <div className="alert-err">{msg}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Fecha Ejecutada *">
              <input className="input-field" type="date" value={completeForm.fechaEjec} onChange={e => fc({ fechaEjec: e.target.value })}/>
            </Field>
            <Field label="Estado">
              <select className="input-field" value="Completado" disabled>
                <option>Completado</option>
              </select>
            </Field>
            <Field label="Descripción *" full>
              <textarea className="input-field" rows={3} value={completeForm.descripcion}
                        onChange={e => fc({ descripcion: e.target.value })}
                        placeholder="Actividades realizadas..."/>
            </Field>
            <Field label="Técnico Ejecutor *" full>
              <input className="input-field" value={completeForm.tecnico} onChange={e => fc({ tecnico: e.target.value })}/>
            </Field>
            <Field label="Documento de Soporte *" full>
              <div className="flex gap-2 items-center flex-wrap mb-2">
                <input className="input-field flex-1" value={completeForm.docSoporte}
                       onChange={e => fc({ docSoporte: e.target.value })}
                       placeholder="OT-2024-0341" style={{ minWidth: 140 }}/>
                <FileUpload
                  inputId="file-mant-complete"
                  uploadFn={apiUploadDoc}
                  docUrl={completeForm.docUrl}
                  docNombre={completeForm.docNombre}
                  onUploaded={({ url, nombre }) => fc({ docUrl: url, docNombre: nombre })}
                  onClear={() => fc({ docUrl: '', docNombre: '' })}
                />
              </div>
            </Field>
            <Field label="Observaciones" full>
              <textarea className="input-field" rows={2} value={completeForm.observaciones}
                        onChange={e => fc({ observaciones: e.target.value })}/>
            </Field>
          </div>
          <div className="flex gap-3 mt-6 justify-end">
            <button className="btn-secondary" onClick={closeModal}>Cancelar</button>
            <button className="btn-primary" onClick={saveComplete}>Guardar y Completar</button>
          </div>
        </Modal>
      )}

      {/* DETAIL MODAL */}
      {detail && (
        <Modal title="Detalle de Mantenimiento" onClose={() => setDetail(null)} size="lg">
          {(() => {
            const act  = getActivo(detail.activo_id)
            const sede = getSede(detail.sede_id)
            return (
              <div>
                <div className="flex gap-2 mb-5 flex-wrap">
                  <Tag type={detail.tipo === 'Preventivo' ? 'prev' : 'corr'}>{detail.tipo}</Tag>
                  <Tag type={detail.estado === 'Completado' ? 'done' : detail.estado === 'Pendiente' ? 'pend' : 'prog'}>{detail.estado}</Tag>
                  {detail.gasto > 0 && <span className="chip">{fmt(detail.gasto)}</span>}
                </div>

                {detail.doc_url && (
                  <div className="mb-4 p-3 bg-bg3 border border-gborder2 rounded-xl flex items-center gap-3">
                    <span className="text-xl">📄</span>
                    <div className="flex-1">
                      <div className="text-xs text-gt3 uppercase tracking-wider mb-1">Documento Adjunto</div>
                      <div className="text-sm text-accent3">{detail.doc_nombre || 'documento'}</div>
                    </div>
                    <a href={detail.doc_url} target="_blank" rel="noreferrer" className="btn-primary btn-sm">↗ Abrir</a>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                  {[
                    ['Activo',          `${act?.identificacion || detail.activo_identificacion || '–'} – ${act?.nombre || detail.activo_nombre || ''}`],
                    ['Sede',            sede?.nombre || detail.sede_nombre || '–'],
                    ['F. Programada',   fmtDate(detail.fecha_prog)],
                    ['F. Ejecutada',    fmtDate(detail.fecha_ejec)],
                    ['Contratista',     detail.contratista_nombre || '–'],
                    ['Técnico Asignado',detail.tecnico_asignado_nombre || '–'],
                    ['Técnico Ejecutor',detail.tecnico     || '–'],
                    ['Responsable',     detail.responsable || '–'],
                    ['Doc. Soporte',    detail.doc_soporte || '–'],
                    ['Orden de Compra', detail.orden_compra|| '–'],
                    ['Gasto',           detail.gasto > 0 ? fmt(detail.gasto) : '–'],
                    ['Registrado por',  detail.creado_por  || '–'],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-bg3 rounded-lg p-3">
                      <div className="text-xs text-gt3 uppercase tracking-wider mb-1 font-semibold">{k}</div>
                      <div className="text-sm font-medium text-gt1">{v}</div>
                    </div>
                  ))}
                </div>

                {detail.descripcion && (
                  <div className="mb-3">
                    <div className="text-xs text-gt3 uppercase tracking-wider mb-2 font-semibold">Descripción</div>
                    <div className="bg-bg3 rounded-lg p-3 text-sm leading-relaxed">{detail.descripcion}</div>
                  </div>
                )}
                {detail.observaciones && (
                  <div>
                    <div className="text-xs text-gt3 uppercase tracking-wider mb-2 font-semibold">Observaciones</div>
                    <div className="bg-bg3 rounded-lg p-3 text-sm text-gt2 leading-relaxed">{detail.observaciones}</div>
                  </div>
                )}
              </div>
            )
          })()}
        </Modal>
      )}

      {del && (
        <ConfirmDel
          title="¿Eliminar registro?"
          desc="Esta acción no se puede deshacer."
          onConfirm={() => del2(del.id)}
          onCancel={() => setDel(null)}
        />
      )}
    </div>
  )
}
