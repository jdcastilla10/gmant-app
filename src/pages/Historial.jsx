import { useState, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { fmt, fmtDate } from '../utils/format'
import { Tag, Empty, SearchBar } from '../components/UI'

export default function Historial() {
  const { data } = useApp()
  const { activos, sedes, mantenimientos } = data
  const [search, setSearch]       = useState('')
  const [filtroTipo, setFiltroTipo]   = useState('Todos')
  const [filtroEst, setFiltroEst]     = useState('Todos')
  const [filtroSede, setFiltroSede]   = useState('Todas')
  const [filtroContr, setFiltroContr] = useState('Todos')
  const [filtroFD, setFiltroFD]       = useState('')
  const [filtroFH, setFiltroFH]       = useState('')
  const [exportando, setExportando]   = useState(false)

  const getActivo = id => activos.find(a => a.id === id)
  const getSede   = id => sedes.find(s => s.id === id)

  // Contratistas únicos según el JOIN del backend (campo contratista_nombre)
  const contUnicos = [...new Set(mantenimientos.map(m => m.contratista_nombre).filter(Boolean))]

  const filtered = useMemo(() => mantenimientos.filter(m => {
    const act = getActivo(m.activo_id)
    const matchS = !search || (
      act?.identificacion?.toLowerCase().includes(search.toLowerCase()) ||
      act?.nombre?.toLowerCase().includes(search.toLowerCase()) ||
      m.contratista_nombre?.toLowerCase().includes(search.toLowerCase()) ||
      m.tecnico?.toLowerCase().includes(search.toLowerCase()) ||
      m.responsable?.toLowerCase().includes(search.toLowerCase()) ||
      m.orden_compra?.toLowerCase().includes(search.toLowerCase())
    )
    const matchTipo  = filtroTipo  === 'Todos' || m.tipo === filtroTipo
    const matchEst   = filtroEst   === 'Todos' || m.estado === filtroEst
    const matchSede  = filtroSede  === 'Todas' || m.sede_id == filtroSede
    const matchContr = filtroContr === 'Todos' || m.contratista_nombre === filtroContr
    const matchFD    = !filtroFD   || (m.fecha_ejec && m.fecha_ejec >= filtroFD)
    const matchFH    = !filtroFH   || (m.fecha_ejec && m.fecha_ejec <= filtroFH)
    return matchS && matchTipo && matchEst && matchSede && matchContr && matchFD && matchFH
  }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
  [mantenimientos, search, filtroTipo, filtroEst, filtroSede, filtroContr, filtroFD, filtroFH])

  const gastoFiltrado = filtered.reduce((a, m) => a + (parseFloat(m.gasto) || 0), 0)
  const limpiar = () => {
    setSearch(''); setFiltroTipo('Todos'); setFiltroEst('Todos')
    setFiltroSede('Todas'); setFiltroContr('Todos'); setFiltroFD(''); setFiltroFH('')
  }

  const exportar = () => {
    setExportando(true)
    try {
      const esc = v => String(v === null || v === undefined ? '' : v)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      const cols = ['Identificación','Nombre del Activo','Sede','Tipo','Estado',
        'Fecha Programada','Fecha Ejecutada','Descripción','Gasto COP','Contratista',
        'Técnico','Responsable','Doc. Soporte / OT','Orden de Compra','Observaciones','Registrado por']
      const filas = filtered.map(m => {
        const act  = getActivo(m.activo_id)
        const sede = getSede(m.sede_id)
        return [
          act?.identificacion || '',
          act?.nombre || '',
          sede?.nombre || m.sede_nombre || '',
          m.tipo || '',
          m.estado || '',
          m.fecha_prog  ? fmtDate(m.fecha_prog)  : '',
          m.fecha_ejec  ? fmtDate(m.fecha_ejec)  : '',
          m.descripcion || '',
          parseFloat(m.gasto) || 0,
          m.contratista_nombre || '',
          m.tecnico || '',
          m.responsable || '',
          m.doc_soporte || '',
          m.orden_compra || '',
          m.observaciones || '',
          m.creado_por || '',
        ]
      })
      const th   = 'border:1px solid #aaa;padding:7px 10px;background:#30508F;color:#fff;font-weight:bold;white-space:nowrap;'
      const td   = 'border:1px solid #ddd;padding:6px 10px;white-space:nowrap;'
      const tn   = 'border:1px solid #ddd;padding:6px 10px;white-space:nowrap;text-align:right;'
      const ts   = 'border-collapse:collapse;font-family:Segoe UI,Arial,sans-serif;font-size:12px;'
      const rth  = 'border:1px solid #aaa;padding:7px 10px;background:#98B752;color:#fff;font-weight:bold;'
      const hrow = '<tr>' + cols.map(h => `<th style="${th}">${h}</th>`).join('') + '</tr>'
      const drows = filas.map(fila =>
        '<tr>' + fila.map((v, i) =>
          `<td style="${i === 8 ? tn : td}">${i === 8 ? Number(v).toLocaleString('es-CO') : esc(v)}</td>`
        ).join('') + '</tr>'
      ).join('')
      const rdata = [
        ['Total registros',  filtered.length],
        ['Preventivos',      filtered.filter(m => m.tipo === 'Preventivo').length],
        ['Correctivos',      filtered.filter(m => m.tipo === 'Correctivo').length],
        ['Completados',      filtered.filter(m => m.estado === 'Completado').length],
        ['Pendientes',       filtered.filter(m => m.estado === 'Pendiente').length],
        ['Gasto Total COP',  Number(gastoFiltrado).toLocaleString('es-CO')],
      ]
      const rrows = '<tr><th style="' + rth + '">Descripción</th><th style="' + rth + '">Valor</th></tr>' +
        rdata.map(r => '<tr><td style="' + td + '">' + esc(String(r[0])) + '</td><td style="' + tn + '">' + r[1] + '</td></tr>').join('')
      const html = `<html><head><meta charset="UTF-8"></head><body>
        <h3 style="color:#30508F;font-family:Segoe UI,Arial,sans-serif;margin-bottom:10px;">Grupo Recordar – Historial de Mantenimientos</h3>
        <table style="${ts}">${hrow}${drows}</table><br><br>
        <h3 style="color:#98B752;font-family:Segoe UI,Arial,sans-serif;margin-bottom:10px;">Resumen</h3>
        <table style="${ts}">${rrows}</table></body></html>`
      const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url
      a.download = 'GrupoRecordar_Historial_' + new Date().toISOString().split('T')[0] + '.xls'
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
    } catch (e) { alert('Error al exportar: ' + e.message) }
    setExportando(false)
  }

  return (
    <div>
      <div className="flex justify-between items-start mb-6 gap-4 flex-wrap">
        <div>
          <h2 className="section-title">Historial de Mantenimientos</h2>
          <p className="section-sub">Base de datos completa con filtros avanzados y exportación</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary" onClick={limpiar}>↺ Limpiar filtros</button>
          <button className="btn-green flex items-center gap-2" onClick={exportar} disabled={exportando || filtered.length === 0}>
            <span>📥</span> {exportando ? 'Exportando...' : 'Exportar a Excel (.xls)'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { l: 'Registros encontrados', v: filtered.length,                                            c: 'text-accent3'  },
          { l: 'Preventivos',           v: filtered.filter(m => m.tipo === 'Preventivo').length,       c: 'text-accent2'  },
          { l: 'Correctivos',           v: filtered.filter(m => m.tipo === 'Correctivo').length,       c: 'text-red-400'  },
          { l: 'Gasto filtrado',        v: fmt(gastoFiltrado),                                         c: 'text-ggreen2'  },
        ].map((s, i) => (
          <div key={i} className="bg-bg2 border border-gborder rounded-xl p-4">
            <div className={`text-xl font-bold ${s.c}`}>{s.v}</div>
            <div className="text-xs text-gt2 mt-1">{s.l}</div>
          </div>
        ))}
      </div>

      <div className="bg-bg2 border border-gborder rounded-xl p-4 mb-4 flex gap-3 flex-wrap items-center">
        <div className="flex-1 min-w-[200px]">
          <SearchBar value={search} onChange={setSearch} placeholder="Buscar activo, técnico, OC, contratista..."/>
        </div>
        <select className="input-field w-36" value={filtroTipo}  onChange={e => setFiltroTipo(e.target.value)}>
          <option>Todos</option><option>Preventivo</option><option>Correctivo</option>
        </select>
        <select className="input-field w-36" value={filtroEst}   onChange={e => setFiltroEst(e.target.value)}>
          <option>Todos</option><option>Pendiente</option><option>En proceso</option><option>Completado</option>
        </select>
        <select className="input-field w-40" value={filtroSede}  onChange={e => setFiltroSede(e.target.value)}>
          <option value="Todas">Todas las sedes</option>
          {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
        </select>
        <select className="input-field w-44" value={filtroContr} onChange={e => setFiltroContr(e.target.value)}>
          <option value="Todos">Todos los contratistas</option>
          {contUnicos.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="flex items-center gap-2 text-xs text-gt2 whitespace-nowrap">
          F. desde
          <input className="input-field w-36" type="date" value={filtroFD} onChange={e => setFiltroFD(e.target.value)}/>
        </div>
        <div className="flex items-center gap-2 text-xs text-gt2 whitespace-nowrap">
          hasta
          <input className="input-field w-36" type="date" value={filtroFH} onChange={e => setFiltroFH(e.target.value)}/>
        </div>
      </div>

      <div className="bg-bg2 border border-gborder rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 1200 }}>
            <thead><tr>
              {['Identificación','Activo','Sede','Tipo','F. Programada','F. Ejecutada','Estado','Gasto',
                'Contratista','Técnico','Responsable','OC','Soporte'].map(h =>
                <th key={h} className="th">{h}</th>
              )}
            </tr></thead>
            <tbody>
              {filtered.length === 0
                ? <tr><td colSpan={13}><Empty icon="🔍" text="Sin registros con los filtros aplicados"/></td></tr>
                : filtered.map(m => {
                    const act  = getActivo(m.activo_id)
                    const sede = getSede(m.sede_id)
                    return (
                      <tr key={m.id} className="hover:bg-bg3/30 transition-colors">
                        <td className="td"><span className="font-bold text-accent3 text-xs">{act?.identificacion || '–'}</span></td>
                        <td className="td text-xs font-medium max-w-[140px] truncate">{act?.nombre || '–'}</td>
                        <td className="td text-xs text-gt2 whitespace-nowrap">{sede?.nombre || m.sede_nombre || '–'}</td>
                        <td className="td"><Tag type={m.tipo === 'Preventivo' ? 'prev' : 'corr'}>{m.tipo}</Tag></td>
                        <td className="td text-xs whitespace-nowrap">{fmtDate(m.fecha_prog)}</td>
                        <td className="td text-xs whitespace-nowrap">{m.fecha_ejec ? fmtDate(m.fecha_ejec) : <span className="text-gt3">–</span>}</td>
                        <td className="td"><Tag type={m.estado === 'Completado' ? 'done' : m.estado === 'Pendiente' ? 'pend' : 'prog'}>{m.estado}</Tag></td>
                        <td className="td text-xs font-semibold whitespace-nowrap" style={{ color: m.gasto > 0 ? '#CBD568' : '#4D4D4D' }}>
                          {m.gasto > 0 ? fmt(m.gasto) : '–'}
                        </td>
                        <td className="td text-xs text-gt2 max-w-[120px] truncate">{m.contratista_nombre || '–'}</td>
                        <td className="td text-xs text-gt2">{m.tecnico || '–'}</td>
                        <td className="td text-xs text-gt2">{m.responsable || '–'}</td>
                        <td className="td text-xs text-gt3 font-mono">{m.orden_compra || '–'}</td>
                        <td className="td text-xs text-gt3 font-mono">{m.doc_soporte || '–'}</td>
                      </tr>
                    )
                  })
              }
            </tbody>
          </table>
        </div>
      </div>
      {filtered.length > 0 && (
        <div className="text-xs text-gt3 mt-3 text-right">
          Mostrando {filtered.length} de {mantenimientos.length} registros totales
        </div>
      )}
    </div>
  )
}
