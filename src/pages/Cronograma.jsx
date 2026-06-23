import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { apiUpsertCronograma, apiDeleteCronograma, apiCrearReprogramacion } from '../utils/api'
import { MESES, FRECUENCIAS, FREC_INTERVALO } from '../utils/format'
import { Modal, ConfirmDel, Empty, SearchBar } from '../components/UI'
import { BRAND } from '../theme'

const COLS  = {
  E: { bg: 'rgba(152,183,82,.2)',  text: '#b5d46a', bc: 'rgba(152,183,82,.4)' },
  P: { bg: 'rgba(212,160,23,.2)',  text: '#e5b84a', bc: 'rgba(212,160,23,.4)' },
  R: { bg: 'rgba(107,95,166,.2)',  text: '#a99dd4', bc: 'rgba(107,95,166,.4)' },
  '·':{ bg: 'var(--bg3,#2a2a2a)', text: '#4D4D4D', bc: '#383838' },
}

const OPCIONES = [
  { v: '',  label: 'Sin asignar' },
  { v: 'P', label: 'Pendiente' },
  { v: 'E', label: 'Ejecutado' },
  { v: 'R', label: 'Reprogramado' },
]

// Backend stores 'N' for unset months; frontend displays as ''
const fromBack = v => (v === 'N' || !v) ? '' : v
const toBack   = v => v === '' ? 'N' : v

function MesCell({ valor, onOpen, futuro }) {
  const v   = fromBack(valor)
  const key = v || '·'
  const col = COLS[key] || COLS['·']
  const locked = v === 'E' || v === 'R' || futuro
  return (
    <div
      onClick={locked ? undefined : (e) => onOpen(e.currentTarget.getBoundingClientRect())}
      title={locked
        ? v === 'E' ? 'Ejecutado — no modificable'
        : v === 'R' ? 'Reprogramado — no modificable'
        : 'Mes futuro — no disponible aún'
        : { P: 'Pendiente', '': 'Sin asignar — clic para elegir' }[v]}
      className={`w-9 h-8 rounded-md flex items-center justify-center text-xs font-bold border select-none mx-auto transition-transform ${locked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:scale-110'}`}
      style={{ background: col.bg, color: col.text, borderColor: col.bc }}
    >
      {v || '·'}
    </div>
  )
}

function ReprogramModal({ crono, mesNum, activo, onClose, onSubmit }) {
  const [motivo, setMotivo]         = useState('')
  const [fechaNueva, setFechaNueva] = useState('')
  const [ajustar, setAjustar]       = useState(true)
  const [loading, setLoading]       = useState(false)
  const [err, setErr]               = useState('')

  const intervalo = FREC_INTERVALO[crono.frecuencia] || 1

  const submit = async () => {
    if (!motivo.trim()) { setErr('El motivo es obligatorio'); return }
    setErr('')
    setLoading(true)
    try {
      await onSubmit({
        motivo: motivo.trim(),
        fecha_nueva: fechaNueva || null,
        ajustar_cronograma: !!(ajustar && fechaNueva),
      })
      onClose()
    } catch (e) {
      setErr(e.message || 'Error al reprogramar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title={`Reprogramar — ${MESES[mesNum - 1]} ${crono.anio}`} onClose={onClose} size="sm">
      {err && <div className="alert-err">{err}</div>}
      <div className="flex flex-col gap-4">
        <div>
          <label className="form-label">Activo</label>
          <div className="text-sm text-gt1 font-medium">
            {activo?.identificacion || crono.identificacion} – {activo?.nombre || crono.activo_nombre}
          </div>
        </div>
        <div>
          <label className="form-label">Motivo de la reprogramación *</label>
          <textarea
            className="input-field"
            rows={3}
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            placeholder="Describe el motivo del cambio..."
          />
          <p className="text-xs text-gt3 mt-1">Este motivo quedará registrado en la hoja de vida del activo.</p>
        </div>
        <div>
          <label className="form-label">Nueva fecha de mantenimiento</label>
          <input
            className="input-field"
            type="date"
            value={fechaNueva}
            onChange={e => setFechaNueva(e.target.value)}
          />
        </div>
        {fechaNueva && (
          <div className="bg-bg3 rounded-lg p-3">
            <label className="form-label mb-2">¿Ajustar el cronograma a partir de esta fecha?</label>
            <div className="flex flex-col gap-2">
              <label className="flex items-start gap-2 cursor-pointer text-sm text-gt1">
                <input type="radio" name="ajustar" className="mt-1 accent-accent2"
                       checked={ajustar} onChange={() => setAjustar(true)}/>
                <span>
                  Sí, recalcular el calendario desde esta fecha
                  <span className="block text-xs text-gt3 mt-0.5">
                    Cada {intervalo} {intervalo === 1 ? 'mes' : 'meses'} ({crono.frecuencia}). Los meses anteriores no se modifican.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2 cursor-pointer text-sm text-gt1">
                <input type="radio" name="ajustar" className="mt-1 accent-accent2"
                       checked={!ajustar} onChange={() => setAjustar(false)}/>
                <span>No, mantener el cronograma actual sin cambios adicionales</span>
              </label>
            </div>
          </div>
        )}
      </div>
      <div className="bg-amber-900/10 border border-amber-700/30 rounded-lg p-3 mt-4 text-xs text-amber-400">
        ⚠ Esta acción no tiene reversa. Una vez reprogramado, el mes no podrá volver a su estado anterior.
      </div>
      <div className="flex gap-3 mt-4 justify-end">
        <button className="btn-secondary" onClick={onClose}>Cancelar</button>
        <button className="btn-primary" onClick={submit} disabled={loading}>
          {loading ? 'Guardando...' : 'Confirmar reprogramación'}
        </button>
      </div>
    </Modal>
  )
}

export default function Cronograma() {
  const { data, reload } = useApp()
  const { activos, cronograma } = data
  const [anio, setAnio]     = useState(new Date().getFullYear())
  const [modal, setModal]   = useState(null)
  const [del,   setDel]     = useState(null)
  const [filtro, setFiltro] = useState('')
  const [msg,   setMsg]     = useState('')
  const [form,  setForm]    = useState({ activoId: '', frecuencia: 'Mensual' })
  const [openCell, setOpenCell]       = useState(null) // { crono, mesNum, rect }
  const [reprogModal, setReprogModal] = useState(null) // { crono, mesNum }
  const [confirmEjec, setConfirmEjec] = useState(null) // { crono, mesNum }
  const anioActual = new Date().getFullYear()
  const mesActual  = new Date().getMonth()

  const cronos       = cronograma.filter(c => Number(c.anio) === anio)
  const activosEnCrono = cronos.map(c => c.activo_id)
  const activosDisp    = activos.filter(a => !activosEnCrono.includes(a.id))

  const getActivo = id => activos.find(a => a.id === id)

  const agregar = async () => {
    if (!form.activoId) { setMsg('Selecciona un activo'); return }
    setMsg('')
    try {
      const payload = { activo_id: form.activoId, anio, frecuencia: form.frecuencia }
      for (let i = 1; i <= 12; i++) payload[`mes${i}`] = 'N'
      await apiUpsertCronograma(payload)
      await reload()
      setModal(null)
      setForm({ activoId: '', frecuencia: 'Mensual' })
    } catch (e) { setMsg(e.message || 'Error al agregar') }
  }

  const onChangeSimple = async (crono, mesNum, nuevoValor) => {
    const actual    = fromBack(crono[`mes${mesNum}`])
    const intervalo = FREC_INTERVALO[crono.frecuencia] || 1
    const esInicio  = actual === '' && nuevoValor === 'P'

    const payload = { activo_id: crono.activo_id, anio: crono.anio, frecuencia: crono.frecuencia }
    for (let i = 1; i <= 12; i++) payload[`mes${i}`] = toBack(fromBack(crono[`mes${i}`]))
    payload[`mes${mesNum}`] = toBack(nuevoValor)

    if (esInicio && intervalo > 1) {
      for (let m = mesNum + intervalo; m <= 12; m += intervalo) {
        payload[`mes${m}`] = 'P'
      }
    }

    try { await apiUpsertCronograma(payload); await reload() }
    catch (e) { console.error(e) }
  }

  const handleSelect = (valor) => {
    const { crono, mesNum } = openCell
    setOpenCell(null)
    if (valor === 'R') {
      setReprogModal({ crono, mesNum })
    } else if (valor === 'E') {
      setConfirmEjec({ crono, mesNum })
    } else {
      onChangeSimple(crono, mesNum, valor)
    }
  }

  const submitReprogramacion = async ({ motivo, fecha_nueva, ajustar_cronograma }) => {
    const { crono, mesNum } = reprogModal
    await apiCrearReprogramacion({
      activo_id: crono.activo_id,
      anio: crono.anio,
      mes: mesNum,
      motivo,
      fecha_nueva,
      ajustar_cronograma,
    })
    await reload()
  }

  const updateFrec = async (crono, val) => {
    const payload = { activo_id: crono.activo_id, anio: crono.anio, frecuencia: val }
    for (let i = 1; i <= 12; i++) payload[`mes${i}`] = toBack(fromBack(crono[`mes${i}`]))
    try { await apiUpsertCronograma(payload); await reload() }
    catch (e) { console.error(e) }
  }

  const eliminar = async id => {
    try { await apiDeleteCronograma(id); await reload(); setDel(null) }
    catch (e) { console.error(e) }
  }

  const prog = crono => {
    const e = Array.from({ length: 12 }, (_, i) => fromBack(crono[`mes${i + 1}`])).filter(m => m === 'E').length
    return { ejec: e, total: 12, pct: Math.round(e / 12 * 100) }
  }

  const filtrados = cronos.filter(c => {
    const act = getActivo(c.activo_id)
    return !filtro || (
      act?.identificacion?.toLowerCase().includes(filtro.toLowerCase()) ||
      act?.nombre?.toLowerCase().includes(filtro.toLowerCase())
    )
  })

  return (
    <div>
      <div className="flex justify-between items-start mb-6 gap-3 flex-wrap">
        <div className="min-w-0">
          <h2 className="section-title">Cronograma Anual</h2>
          <p className="section-sub hidden sm:block">Haz clic en un mes para elegir su estado: Pendiente, Ejecutado, Reprogramado o Sin asignar</p>
          <p className="section-sub sm:hidden">Toca un mes para cambiar su estado</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-bg2 border border-gborder2 rounded-lg px-3 py-1.5">
            <button onClick={() => setAnio(a => a - 1)} className="text-gt2 hover:text-gt1 text-lg leading-none">‹</button>
            <span className="text-sm font-bold min-w-[44px] text-center">{anio}</span>
            <button onClick={() => setAnio(a => a + 1)} className="text-gt2 hover:text-gt1 text-lg leading-none">›</button>
          </div>
          <button className="btn-primary" onClick={() => setModal('form')} disabled={activosDisp.length === 0}>
            + Agregar Activo
          </button>
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2 sm:gap-3">
        <div className="flex gap-2 sm:gap-4 flex-wrap">
          {[{ v: 'E', l: 'Ejecutado' }, { v: 'P', l: 'Pendiente' }, { v: 'R', l: 'Reprogramado' }, { v: '·', l: 'Sin asignar' }].map(x => {
            const col = COLS[x.v] || COLS['·']
            return (
              <div key={x.v} className="flex items-center gap-1.5 text-[10px] sm:text-xs text-gt2">
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded flex items-center justify-center text-[10px] sm:text-xs font-bold border"
                  style={{ background: col.bg, color: col.text, borderColor: col.bc }}>{x.v}</div>
                {x.l}
              </div>
            )
          })}
        </div>
        <div className="w-full sm:w-52">
          <SearchBar value={filtro} onChange={setFiltro} placeholder="Buscar activo..."/>
        </div>
      </div>

      {filtrados.length === 0 ? (
        <div className="text-center py-20 text-gt3">
          <div className="text-5xl mb-3 opacity-30">📅</div>
          <div className="text-sm font-medium text-gt2 mb-2">Sin activos en el cronograma {anio}</div>
          <div className="text-xs">Haz clic en "+ Agregar Activo" para iniciar</div>
        </div>
      ) : (
        <>
          <div className="bg-bg2 border border-gborder rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ minWidth: 1000 }}>
                <thead>
                  <tr>
                    <th className="th text-left" style={{ minWidth: 190 }}>Activo</th>
                    <th className="th text-left" style={{ minWidth: 100 }}>Sede</th>
                    <th className="th" style={{ minWidth: 120 }}>Frecuencia</th>
                    {MESES.map((m, i) => (
                      <th key={i} className="th text-center"
                        style={{
                          background: anio === anioActual && i === mesActual ? 'rgba(108,179,60,.1)' : '',
                          color:      anio === anioActual && i === mesActual ? BRAND.primaryLight : '',
                        }}>{m}</th>
                    ))}
                    <th className="th text-center" style={{ minWidth: 70 }}>Avance</th>
                    <th className="th"/>
                  </tr>
                </thead>
                <tbody>
                  {filtrados.map(crono => {
                    const act  = getActivo(crono.activo_id)
                    const { ejec, total, pct } = prog(crono)
                    return (
                      <tr key={crono.id} className="hover:bg-bg3/20 transition-colors">
                        <td className="td">
                          <div className="font-bold text-xs text-accent3">{act?.identificacion || crono.identificacion || '–'}</div>
                          <div className="text-xs text-gt2 truncate max-w-[175px]">{act?.nombre || crono.activo_nombre}</div>
                        </td>
                        <td className="td">
                          <span className="chip text-xs whitespace-nowrap">{crono.sede_nombre || '–'}</span>
                        </td>
                        <td className="td text-center">
                          <select
                            value={crono.frecuencia || 'Mensual'}
                            onChange={e => updateFrec(crono, e.target.value)}
                            className="bg-bg3 border border-gborder2 rounded text-xs text-gt1 px-2 py-1 outline-none focus:border-accent2"
                            style={{ minWidth: 110 }}>
                            {FRECUENCIAS.map(fr => <option key={fr}>{fr}</option>)}
                          </select>
                        </td>
                        {Array.from({ length: 12 }, (_, i) => {
                          const esFuturo = anio > anioActual || (anio === anioActual && i > mesActual)
                          return (
                            <td key={i} className="td text-center"
                              style={{
                                background: anio === anioActual && i === mesActual ? 'rgba(108,179,60,.05)' : '',
                                padding: '6px 4px',
                              }}>
                              <MesCell
                                valor={crono[`mes${i + 1}`]}
                                futuro={esFuturo}
                                onOpen={(rect) => setOpenCell({ crono, mesNum: i + 1, rect })}
                              />
                            </td>
                          )
                        })}
                        <td className="td text-center">
                          <div className="text-xs font-bold mb-1"
                            style={{ color: pct === 100 ? '#98B752' : pct > 0 ? '#d4a017' : '#4D4D4D' }}>
                            {ejec}/{total}
                          </div>
                          <div className="h-1 rounded-full bg-bg4 overflow-hidden w-12 mx-auto">
                            <div className="h-full rounded-full transition-all"
                              style={{ width: pct + '%', background: pct === 100 ? '#98B752' : pct > 50 ? '#d4a017' : BRAND.primaryHover }}/>
                          </div>
                        </td>
                        <td className="td">
                          <button className="btn-danger btn-sm" onClick={() => setDel(crono)}>✕</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totales */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-4">
            {[
              { l: 'En cronograma', v: filtrados.length, c: BRAND.primaryLight },
              { l: 'Ejecutados',   v: filtrados.reduce((a, c) => a + Array.from({ length: 12 }, (_, i) => fromBack(c[`mes${i + 1}`])).filter(m => m === 'E').length, 0), c: '#98B752' },
              { l: 'Pendientes',   v: filtrados.reduce((a, c) => a + Array.from({ length: 12 }, (_, i) => fromBack(c[`mes${i + 1}`])).filter(m => m === 'P').length, 0), c: '#d4a017' },
              { l: 'Reprogramados',v: filtrados.reduce((a, c) => a + Array.from({ length: 12 }, (_, i) => fromBack(c[`mes${i + 1}`])).filter(m => m === 'R').length, 0), c: '#a99dd4' },
            ].map((s, i) => (
              <div key={i} className="bg-bg2 border border-gborder rounded-lg px-3 py-2 sm:px-4 sm:py-2.5 flex gap-2 sm:gap-3 items-center">
                <span className="text-base sm:text-lg font-bold" style={{ color: s.c }}>{s.v}</span>
                <span className="text-[10px] sm:text-xs text-gt2">{s.l}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Dropdown flotante de selección de estado */}
      {openCell && (
        <>
          <div className="fixed inset-0 z-[1999]" onClick={() => setOpenCell(null)}/>
          <div
            className="fixed z-[2000] bg-bg2 border border-gborder2 rounded-lg shadow-2xl overflow-hidden py-1"
            style={{
              top: Math.min(openCell.rect.bottom + 4, window.innerHeight - 200),
              left: Math.max(8, Math.min(openCell.rect.left, window.innerWidth - 160)),
              minWidth: 150,
            }}
          >
            {OPCIONES.map(op => {
              const col = COLS[op.v || '·']
              return (
                <button
                  key={op.v || '_'}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-bg3 transition-colors text-left text-gt1"
                  onClick={() => handleSelect(op.v)}
                >
                  <span className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold border flex-shrink-0"
                        style={{ background: col.bg, color: col.text, borderColor: col.bc }}>
                    {op.v || '·'}
                  </span>
                  {op.label}
                </button>
              )
            })}
          </div>
        </>
      )}

      {/* Modal de reprogramación */}
      {reprogModal && (
        <ReprogramModal
          crono={reprogModal.crono}
          mesNum={reprogModal.mesNum}
          activo={getActivo(reprogModal.crono.activo_id)}
          onClose={() => setReprogModal(null)}
          onSubmit={submitReprogramacion}
        />
      )}

      {/* Confirmación de marcar como Ejecutado */}
      {confirmEjec && (
        <Modal title={`Marcar como Ejecutado — ${MESES[confirmEjec.mesNum - 1]} ${confirmEjec.crono.anio}`} onClose={() => setConfirmEjec(null)} size="sm">
          <div className="text-center py-2">
            <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4"
                 style={{ background: 'rgba(152,183,82,.2)', color: '#b5d46a', border: '2px solid rgba(152,183,82,.4)' }}>
              E
            </div>
            <p className="text-sm text-gt1 mb-2">
              ¿Confirmas que deseas marcar este mes como <strong>Ejecutado</strong>?
            </p>
            <div className="bg-amber-900/10 border border-amber-700/30 rounded-lg p-3 mt-3 text-xs text-amber-400">
              ⚠ Esta acción no tiene reversa. Una vez marcado como ejecutado, no se podrá modificar.
            </div>
          </div>
          <div className="flex gap-3 mt-5 justify-end">
            <button className="btn-secondary" onClick={() => setConfirmEjec(null)}>Cancelar</button>
            <button className="btn-primary" onClick={() => {
              onChangeSimple(confirmEjec.crono, confirmEjec.mesNum, 'E')
              setConfirmEjec(null)
            }}>Confirmar</button>
          </div>
        </Modal>
      )}

      {modal === 'form' && (
        <Modal title={`Agregar Activo al Cronograma ${anio}`} onClose={() => setModal(null)} size="sm">
          {msg && <div className="alert-err">{msg}</div>}
          <div className="flex flex-col gap-4">
            <div>
              <label className="form-label">Activo *</label>
              <select className="input-field" value={form.activoId} onChange={e => setForm({ ...form, activoId: e.target.value })}>
                <option value="">Seleccionar activo...</option>
                {activosDisp.map(a => <option key={a.id} value={a.id}>{a.identificacion} – {a.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Frecuencia</label>
              <select className="input-field" value={form.frecuencia} onChange={e => setForm({ ...form, frecuencia: e.target.value })}>
                {FRECUENCIAS.map(fr => <option key={fr}>{fr}</option>)}
              </select>
            </div>
          </div>
          <div className="mt-4 p-3 bg-bg3 rounded-lg text-xs text-gt2 leading-relaxed">
            💡 Luego haz clic en un mes para elegir su estado. Si eliges "Pendiente" en el primer mes, los siguientes se marcan automáticamente según la frecuencia.
          </div>
          <div className="flex gap-3 mt-5 justify-end">
            <button className="btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
            <button className="btn-primary" onClick={agregar}>Agregar</button>
          </div>
        </Modal>
      )}

      {del && (
        <ConfirmDel
          title="¿Quitar del cronograma?"
          desc={`Se eliminarán todos los estados de ${getActivo(del.activo_id)?.identificacion || del.identificacion} para ${anio}.`}
          onConfirm={() => eliminar(del.id)}
          onCancel={() => setDel(null)}
        />
      )}
    </div>
  )
}
