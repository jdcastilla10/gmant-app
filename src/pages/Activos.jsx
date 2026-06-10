import { useState, useRef } from 'react'
import QRCode from 'qrcode'
import { useApp } from '../context/AppContext'
import { apiCreateActivo, apiUpdateActivo, apiDeleteActivo, apiUploadDoc, apiGetReprogramaciones } from '../utils/api'
import { fmt, fmtDate, FRECUENCIAS, MESES } from '../utils/format'
import { Modal, ConfirmDel, Tag, Empty, SearchBar, Field } from '../components/UI'
import { BRAND } from '../theme'

const empty = {
  identificacion:'', nombre:'', sedeId:'', categoria:'',
  marca:'', serial:'', estado:'Activo', fechaAdq:'', valor:0, frecuencia:'Mensual',
  fotoUrl:'', fechaUltimoMant:'',
}

export default function Activos() {
  const { data, reload } = useApp()
  const { activos, sedes, mantenimientos } = data
  const [modal,       setModal]       = useState(null)
  const [del,         setDel]         = useState(null)
  const [form,        setForm]        = useState(empty)
  const [msg,         setMsg]         = useState('')
  const [search,      setSearch]      = useState('')
  const [uploadingImg,setUploadingImg]= useState(false)
  const [qrModal,     setQrModal]     = useState(null) // { activo, dataUrl }
  const imgInputRef = useRef(null)

  const f = v => setForm(p => ({ ...p, ...v }))
  const getMants = id => mantenimientos.filter(m => m.activo_id === id)

  const filtered = activos.filter(a =>
    [a.identificacion, a.nombre, a.marca, a.serial]
      .some(x => x?.toLowerCase().includes(search.toLowerCase()))
  )

  // ── Subir imagen ──────────────────────────────────────────
  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { alert('Máximo 10 MB'); return }
    e.target.value = ''
    setUploadingImg(true)
    try {
      const result = await apiUploadDoc(file)
      f({ fotoUrl: result.url })
    } catch (err) {
      alert('Error al subir imagen: ' + (err.message || 'Error desconocido'))
    } finally {
      setUploadingImg(false)
    }
  }

  // ── Guardar ───────────────────────────────────────────────
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
        sede_id:        form.sedeId    || null,
        categoria:      form.categoria || null,
        marca:          form.marca     || null,
        serial:         form.serial    || null,
        estado:         form.estado    || 'Activo',
        fecha_adq:      form.fechaAdq  || null,
        valor:          parseFloat(form.valor) || 0,
        frecuencia:     form.frecuencia || 'Mensual',
        foto_url:       form.fotoUrl   || null,
        fecha_ultimo_mant: form.fechaUltimoMant || null,
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

  // ── Abrir edición ─────────────────────────────────────────
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
      fotoUrl:        a.foto_url       || '',
      fechaUltimoMant: a.fecha_ultimo_mant ? a.fecha_ultimo_mant.toString().split('T')[0] : '',
    })
    setMsg('')
    setModal('form')
  }

  // ── Ver / descargar QR ───────────────────────────────────
  const verQR = async (activo) => {
    const qrUrl = `${window.location.origin}/?activo=${activo.id}`
    try {
      const dataUrl = await QRCode.toDataURL(qrUrl, { width: 300, margin: 2 })
      setQrModal({ activo, dataUrl, qrUrl })
    } catch (e) { alert('Error generando QR') }
  }

  // ── Generar ficha imprimible ───────────────────────────────
  const generarFicha = async (activo) => {
    const actMants  = mantenimientos.filter(m => m.activo_id === activo.id)
    const total     = actMants.length
    const completados = actMants.filter(m => m.estado === 'Completado').length
    const enCurso   = actMants.filter(m => m.estado !== 'Completado').length
    const gasto     = actMants.reduce((a, m) => a + (parseFloat(m.gasto) || 0), 0)

    let reprogramaciones = []
    try { reprogramaciones = await apiGetReprogramaciones(activo.id) } catch (e) { /* ignora si falla */ }

    const esc = v => String(v ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
    const fechaGen = new Date().toLocaleString('es-CO', { year:'numeric', month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' })

    const imgContent = activo.foto_url
      ? `<img src="${activo.foto_url}" alt="${esc(activo.nombre)}" style="width:100%;height:100%;object-fit:cover;">`
      : `<span style="font-size:42px;color:#ccc;">⚙</span>`

    const tagStyle = (type) => {
      const map = {
        Preventivo: `background:#e8ecf5;color:${BRAND.primary}`,
        Correctivo: 'background:#fde8e8;color:#c0392b',
        Completado: 'background:#edf7e8;color:#4a8c2a',
        Pendiente:  'background:#fef9e8;color:#b8820a',
        'En proceso':'background:#f0eef9;color:#6b5fa6',
      }
      return `${map[type]||'background:#f0f0f0;color:#666'};padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600;display:inline-block`
    }

    const infoFields = [
      ['Identificación', activo.identificacion],
      ['Nombre',         activo.nombre],
      ['Sede',           activo.sede_nombre || '–'],
      ['Categoría',      activo.categoria   || '–'],
      ['Marca',          activo.marca        || '–'],
      ['Serial',         activo.serial       || '–'],
      ['Estado',         activo.estado       || '–'],
      ['Frecuencia Mant.',activo.frecuencia  || '–'],
      ['Fecha Adquisición', activo.fecha_adq ? fmtDate(activo.fecha_adq) : '–'],
      ['Valor',          activo.valor > 0 ? fmt(activo.valor) : '–'],
      ['Último Mantenimiento', activo.fecha_ultimo_mant ? fmtDate(activo.fecha_ultimo_mant) : '–'],
    ]

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Ficha ${esc(activo.identificacion)} - ${esc(activo.nombre)}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#222;background:#fff;padding:24px 28px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:16px;border-bottom:2.5px solid ${BRAND.primary};margin-bottom:20px}
    .h-title{font-size:22px;font-weight:800;color:#111}
    .h-sub{color:#666;font-size:12px;margin-top:4px}
    .h-gen{color:#999;font-size:10px;margin-top:8px}
    .h-img{width:92px;height:92px;border-radius:10px;overflow:hidden;border:1px solid #e0e0e0;display:flex;align-items:center;justify-content:center;background:#f5f5f5;flex-shrink:0}
    .h-id{font-size:10px;color:#aaa;text-align:right;margin-top:4px}
    .section{margin-bottom:20px}
    .s-title{font-size:11px;font-weight:700;color:${BRAND.primary};border-left:3px solid ${BRAND.primary};padding-left:8px;margin-bottom:12px;text-transform:uppercase;letter-spacing:.8px}
    .info-grid{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid #e0e0e0;border-radius:6px;overflow:hidden}
    .info-item{padding:10px 14px;border-bottom:1px solid #ebebeb;border-right:1px solid #ebebeb}
    .info-item:nth-child(3n){border-right:none}
    .info-item:nth-last-child(-n+3){border-bottom:none}
    .info-label{font-size:9px;color:#aaa;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px}
    .info-value{font-size:13px;font-weight:600}
    .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
    .stat{border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px}
    .stat-v{font-size:24px;font-weight:800;color:#1a1a1a}
    .stat-l{font-size:9px;color:#aaa;text-transform:uppercase;letter-spacing:.5px;margin-top:2px}
    table{width:100%;border-collapse:collapse}
    th{background:#f5f5f5;color:#888;font-size:9px;text-transform:uppercase;letter-spacing:.5px;padding:8px 10px;text-align:left;border-bottom:1px solid #e0e0e0}
    td{padding:8px 10px;border-bottom:1px solid #f0f0f0;font-size:11px;vertical-align:top}
    .qr-section{margin-top:20px;padding-top:16px;border-top:2px dashed #ddd;display:flex;align-items:center;gap:16px}
    .reprog-item{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border:1px solid #e0e0e0;border-radius:6px;margin-bottom:8px}
    .reprog-arrow{font-size:16px;color:#a99dd4;font-weight:800;flex-shrink:0}
    .reprog-meta{font-size:9px;color:#aaa;text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px}
    .reprog-motivo{font-size:11px;color:#333}
    .footer{text-align:center;margin-top:20px;padding-top:12px;border-top:1px solid #eee;color:#bbb;font-size:10px}
    @media print{body{padding:16px 20px}}
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="h-title">${esc(activo.identificacion)} · ${esc(activo.nombre)}</div>
      <div class="h-sub">${esc(activo.sede_nombre||'')}${activo.sede_nombre&&activo.categoria?' · ':''}${esc(activo.categoria||'')}</div>
      <div class="h-gen">Generado: ${fechaGen}</div>
    </div>
    <div style="text-align:right">
      <div class="h-img">${imgContent}</div>
      <div class="h-id">ID: ${esc(activo.identificacion)}</div>
    </div>
  </div>

  <div class="section">
    <div class="s-title">Información del Activo</div>
    <div class="info-grid">
      ${infoFields.map(([l,v])=>`<div class="info-item"><div class="info-label">${l}</div><div class="info-value">${esc(String(v))}</div></div>`).join('')}
    </div>
  </div>

  <div class="section">
    <div class="s-title">Resumen de Mantenimientos</div>
    <div class="stats">
      <div class="stat"><div class="stat-v">${total}</div><div class="stat-l">Total</div></div>
      <div class="stat"><div class="stat-v">${completados}</div><div class="stat-l">Completados</div></div>
      <div class="stat"><div class="stat-v">${enCurso}</div><div class="stat-l">En Curso/Pend.</div></div>
      <div class="stat"><div class="stat-v" style="font-size:${fmt(gasto).length>8?'16':'24'}px">${fmt(gasto)}</div><div class="stat-l">Gasto Total</div></div>
    </div>
  </div>

  <div class="section">
    <div class="s-title">Historial de Mantenimientos</div>
    <table>
      <thead><tr>
        <th>F. Programada</th><th>F. Ejecución</th><th>Tipo</th><th>Estado</th>
        <th>Descripción</th><th>Técnico / Contratista</th><th style="text-align:right">Gasto</th>
      </tr></thead>
      <tbody>
        ${actMants.length === 0
          ? '<tr><td colspan="7" style="text-align:center;color:#bbb;padding:20px">Sin mantenimientos registrados</td></tr>'
          : actMants.map(m => `<tr>
              <td>${m.fecha_prog ? fmtDate(m.fecha_prog) : '–'}</td>
              <td>${m.fecha_ejec ? fmtDate(m.fecha_ejec) : '–'}</td>
              <td><span style="${tagStyle(m.tipo)}">${esc(m.tipo)}</span></td>
              <td><span style="${tagStyle(m.estado)}">${esc(m.estado)}</span></td>
              <td style="max-width:160px">${esc(m.descripcion ? m.descripcion.substring(0,80)+(m.descripcion.length>80?'…':'') : '–')}</td>
              <td>${esc(m.contratista_nombre || m.tecnico || '–')}</td>
              <td style="text-align:right;font-weight:600">${m.gasto>0?fmt(parseFloat(m.gasto)):'–'}</td>
            </tr>`).join('')
        }
      </tbody>
    </table>
  </div>

  ${reprogramaciones.length > 0 ? `
  <div class="section">
    <div class="s-title">Reprogramaciones</div>
    ${reprogramaciones.map(r => `
      <div class="reprog-item">
        <div class="reprog-arrow">→</div>
        <div style="flex:1">
          <div class="reprog-meta">${esc(MESES[r.mes-1] || r.mes)} ${r.anio}${r.fecha_nueva ? ` · Nueva fecha: ${fmtDate(r.fecha_nueva)}` : ''}</div>
          <div class="reprog-motivo">${esc(r.motivo || 'Sin motivo registrado')}</div>
        </div>
      </div>
    `).join('')}
  </div>` : ''}

  <div class="footer">Grupo Recordar · Sistema de Gestión de Mantenimiento · Documento generado automáticamente</div>
  <script>window.print();</script>
</body>
</html>`

    const win = window.open('', '_blank')
    if (!win) { alert('Habilita ventanas emergentes en el navegador para generar el reporte'); return }
    win.document.write(html)
    win.document.close()
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <div>
      <div className="flex flex-wrap justify-between items-start gap-3 mb-6">
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
                {['','Identificación','Nombre / Equipo','Sede','Categoría','Marca / Serial','Frec.','Estado','Valor','Mant.',''].map((h,i) =>
                  <th key={i} className="th">{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={11}><Empty icon="⚙" text="Sin activos registrados"/></td></tr>
                : filtered.map(a => {
                    const mants = getMants(a.id)
                    return (
                      <tr key={a.id} className="hover:bg-bg3/30 transition-colors">
                        <td className="td" style={{width:48,padding:'6px 8px'}}>
                          {a.foto_url
                            ? <img src={a.foto_url} alt={a.nombre} className="w-10 h-10 rounded-lg object-cover border border-gborder2"/>
                            : <div className="w-10 h-10 rounded-lg bg-bg3 border border-gborder2 flex items-center justify-center text-lg">⚙</div>
                          }
                        </td>
                        <td className="td">
                          <span className="font-bold text-accent3">{a.identificacion || '–'}</span>
                        </td>
                        <td className="td">
                          <div className="font-medium">{a.nombre}</div>
                          {a.fecha_adq && <div className="text-xs text-gt3">Adq. {fmtDate(a.fecha_adq)}</div>}
                        </td>
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
                            <span className="chip">{mants.filter(m=>m.tipo==='Preventivo').length} Prev</span>
                            <span className="chip">{mants.filter(m=>m.tipo==='Correctivo').length} Corr</span>
                          </div>
                        </td>
                        <td className="td">
                          <div className="flex gap-1.5">
                            <button className="btn-secondary btn-sm" title="Generar ficha" onClick={() => generarFicha(a)}>📄</button>
                            <button className="btn-secondary btn-sm" title="Ver QR"        onClick={() => verQR(a)}>⬛</button>
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

      {/* FORM MODAL */}
      {modal === 'form' && (
        <Modal title={form.id ? 'Editar Activo' : 'Nuevo Activo'} onClose={() => setModal(null)} size="lg">
          {msg && <div className="alert-err">{msg}</div>}

          {/* Foto del activo */}
          <div className="flex items-start gap-4 mb-5 p-3 bg-bg3 rounded-xl border border-gborder2">
            <div
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border-2 border-dashed border-gborder2 flex items-center justify-center cursor-pointer hover:border-accent2 transition-all flex-shrink-0 bg-bg4"
              onClick={() => !uploadingImg && imgInputRef.current?.click()}
            >
              {uploadingImg ? (
                <div className="text-xs text-gt3 text-center animate-pulse px-1">Subiendo...</div>
              ) : form.fotoUrl ? (
                <img src={form.fotoUrl} alt="activo" className="w-full h-full object-cover"/>
              ) : (
                <div className="text-center text-gt3 p-2">
                  <div className="text-2xl mb-1">📷</div>
                  <div className="text-xs leading-tight">Agregar foto</div>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gt1 mb-1">Foto del activo</div>
              <p className="text-xs text-gt2 mb-1">JPG, PNG o WebP · máx. 10 MB</p>
              <p className="text-xs text-gt3 mb-3">Desde móvil puedes tomar la foto o elegir de la galería.</p>
              <div className="flex gap-2 flex-wrap">
                <button type="button" className="btn-secondary btn-sm text-xs"
                        onClick={() => imgInputRef.current?.click()} disabled={uploadingImg}>
                  {form.fotoUrl ? '↺ Cambiar foto' : '📷 Subir foto'}
                </button>
                {form.fotoUrl && (
                  <button type="button" className="btn-secondary btn-sm text-xs text-gt3"
                          onClick={() => f({ fotoUrl: '' })}>✕ Quitar</button>
                )}
              </div>
            </div>
            <input ref={imgInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload}/>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <Field label="Fecha Último Mantenimiento" full>
              <input className="input-field" type="date" value={form.fechaUltimoMant || ''}
                     onChange={e => f({ fechaUltimoMant: e.target.value })}/>
            </Field>
          </div>
          {!form.id && form.fechaUltimoMant && (
            <div className="mt-3 p-3 bg-bg3 rounded-lg text-xs text-gt2 leading-relaxed">
              💡 Al guardar, se generará automáticamente el cronograma de mantenimiento del activo según la frecuencia seleccionada y esta fecha.
            </div>
          )}
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

      {/* MODAL QR */}
      {qrModal && (
        <Modal title={`QR — ${qrModal.activo.identificacion} · ${qrModal.activo.nombre}`}
               onClose={() => setQrModal(null)} size="sm">
          <div className="flex flex-col items-center gap-4">
            <div className="bg-white p-4 rounded-xl border border-gborder2">
              <img src={qrModal.dataUrl} alt="QR" className="w-56 h-56"/>
            </div>
            <p className="text-xs text-gt3 text-center leading-relaxed max-w-xs">
              Escanea con el móvil para abrir directamente el formulario de mantenimiento de este activo.
            </p>
            <div className="bg-bg3 rounded-lg px-3 py-2 text-xs text-gt3 font-mono break-all text-center w-full">
              {qrModal.qrUrl}
            </div>
            <a
              href={qrModal.dataUrl}
              download={`QR-${qrModal.activo.identificacion}.png`}
              className="btn-primary w-full text-center text-sm py-2.5"
            >
              ⬇ Descargar QR (PNG)
            </a>
          </div>
        </Modal>
      )}
    </div>
  )
}
