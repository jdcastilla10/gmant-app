import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { apiUpsertCronograma, apiDeleteCronograma } from '../utils/api'
import { MESES, FRECUENCIAS, FREC_INTERVALO } from '../utils/format'
import { Modal, ConfirmDel, Empty, SearchBar } from '../components/UI'

const CICLO = { '': 'P', P: 'E', E: 'R', R: '' }
const COLS  = {
  E: { bg: 'rgba(152,183,82,.2)',  text: '#b5d46a', bc: 'rgba(152,183,82,.4)' },
  P: { bg: 'rgba(212,160,23,.2)',  text: '#e5b84a', bc: 'rgba(212,160,23,.4)' },
  R: { bg: 'rgba(107,95,166,.2)',  text: '#a99dd4', bc: 'rgba(107,95,166,.4)' },
  '·':{ bg: 'var(--bg3,#2a2a2a)', text: '#4D4D4D', bc: '#383838' },
}

// Backend stores 'N' for unset months; frontend displays as ''
const fromBack = v => (v === 'N' || !v) ? '' : v
const toBack   = v => v === '' ? 'N' : v

function MesCell({ valor, onChange }) {
  const v   = fromBack(valor)
  const key = v || '·'
  const col = COLS[key] || COLS['·']
  return (
    <div
      onClick={onChange}
      title={{ E: 'Ejecutado', P: 'Pendiente', R: 'Reprogramado', '': 'Sin asignar — clic para iniciar' }[v]}
      className="w-9 h-8 rounded-md flex items-center justify-center text-xs font-bold cursor-pointer transition-transform hover:scale-110 border select-none"
      style={{ background: col.bg, color: col.text, borderColor: col.bc }}
    >
      {v || '·'}
    </div>
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

  const updateMes = async (crono, mesNum) => {
    const key      = `mes${mesNum}`
    const actual   = fromBack(crono[key])
    const siguiente  = CICLO[actual]
    const esInicio   = actual === '' && siguiente === 'P'
    const intervalo  = FREC_INTERVALO[crono.frecuencia] || 1

    const payload = { activo_id: crono.activo_id, anio: crono.anio, frecuencia: crono.frecuencia }
    for (let i = 1; i <= 12; i++) payload[`mes${i}`] = toBack(fromBack(crono[`mes${i}`]))
    payload[key] = toBack(siguiente)

    if (esInicio && intervalo > 1) {
      for (let m = mesNum + intervalo; m <= 12; m += intervalo) {
        payload[`mes${m}`] = 'P'
      }
    }

    try { await apiUpsertCronograma(payload); await reload() }
    catch (e) { console.error(e) }
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
      <div className="flex justify-between items-start mb-6 gap-4 flex-wrap">
        <div>
          <h2 className="section-title">Cronograma Anual</h2>
          <p className="section-sub">Selecciona la frecuencia → haz clic en el primer mes de inicio → los siguientes se marcan automáticamente</p>
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
      <div className="flex justify-between items-center mb-4 flex-wrap gap-3">
        <div className="flex gap-4 flex-wrap">
          {[{ v: 'E', l: 'Ejecutado' }, { v: 'P', l: 'Pendiente' }, { v: 'R', l: 'Reprogramado' }, { v: '·', l: 'Sin asignar' }].map(x => {
            const col = COLS[x.v] || COLS['·']
            return (
              <div key={x.v} className="flex items-center gap-2 text-xs text-gt2">
                <div className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold border"
                  style={{ background: col.bg, color: col.text, borderColor: col.bc }}>{x.v}</div>
                {x.l}
              </div>
            )
          })}
        </div>
        <div className="w-52">
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
                          background: anio === anioActual && i === mesActual ? 'rgba(48,80,143,.1)' : '',
                          color:      anio === anioActual && i === mesActual ? '#7a9dd4' : '',
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
                        {Array.from({ length: 12 }, (_, i) => (
                          <td key={i} className="td text-center"
                            style={{
                              background: anio === anioActual && i === mesActual ? 'rgba(48,80,143,.04)' : '',
                              padding: '6px 4px',
                            }}>
                            <MesCell
                              valor={crono[`mes${i + 1}`]}
                              onChange={() => updateMes(crono, i + 1)}
                            />
                          </td>
                        ))}
                        <td className="td text-center">
                          <div className="text-xs font-bold mb-1"
                            style={{ color: pct === 100 ? '#98B752' : pct > 0 ? '#d4a017' : '#4D4D4D' }}>
                            {ejec}/{total}
                          </div>
                          <div className="h-1 rounded-full bg-bg4 overflow-hidden w-12 mx-auto">
                            <div className="h-full rounded-full transition-all"
                              style={{ width: pct + '%', background: pct === 100 ? '#98B752' : pct > 50 ? '#d4a017' : '#4a6db5' }}/>
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
          <div className="flex gap-3 mt-4 flex-wrap">
            {[
              { l: 'Activos en cronograma', v: filtrados.length, c: '#7a9dd4' },
              { l: 'Ejecutados',   v: filtrados.reduce((a, c) => a + Array.from({ length: 12 }, (_, i) => fromBack(c[`mes${i + 1}`])).filter(m => m === 'E').length, 0), c: '#98B752' },
              { l: 'Pendientes',   v: filtrados.reduce((a, c) => a + Array.from({ length: 12 }, (_, i) => fromBack(c[`mes${i + 1}`])).filter(m => m === 'P').length, 0), c: '#d4a017' },
              { l: 'Reprogramados',v: filtrados.reduce((a, c) => a + Array.from({ length: 12 }, (_, i) => fromBack(c[`mes${i + 1}`])).filter(m => m === 'R').length, 0), c: '#a99dd4' },
            ].map((s, i) => (
              <div key={i} className="bg-bg2 border border-gborder rounded-lg px-4 py-2.5 flex gap-3 items-center">
                <span className="text-lg font-bold" style={{ color: s.c }}>{s.v}</span>
                <span className="text-xs text-gt2">{s.l}</span>
              </div>
            ))}
          </div>
        </>
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
            💡 Luego haz clic en el primer mes de inicio → los siguientes se marcan automáticamente según la frecuencia
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
