import { useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { fmt, fmtDate, MESES } from '../utils/format'
import { StatCard, Tag } from '../components/UI'
import { BRAND } from '../theme'

export default function Dashboard() {
  const { data } = useApp()
  const { activos, sedes, mantenimientos, contratistas, cronograma } = data

  const completados = mantenimientos.filter(m=>m.estado==='Completado').length
  const pendientes  = mantenimientos.filter(m=>m.estado==='Pendiente').length
  const gastoTotal  = mantenimientos.reduce((a,m)=>a+(parseFloat(m.gasto)||0),0)
  const gastoCorr   = mantenimientos.filter(m=>m.tipo==='Correctivo').reduce((a,m)=>a+(parseFloat(m.gasto)||0),0)
  const gastoPrev   = mantenimientos.filter(m=>m.tipo==='Preventivo').reduce((a,m)=>a+(parseFloat(m.gasto)||0),0)
  const pctCorr     = gastoTotal ? Math.round(gastoCorr/gastoTotal*100) : 0
  const pctPrev     = gastoTotal ? Math.round(gastoPrev/gastoTotal*100) : 0

  const recientes = useMemo(()=>[...mantenimientos].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,6),[mantenimientos])

  const anioActual = new Date().getFullYear()
  const mesActual  = new Date().getMonth()

  const proximosCrono = useMemo(()=>{
    const lista = []
    cronograma.filter(c=>Number(c.anio)===anioActual).forEach(c=>{
      const act  = activos.find(a=>a.id===c.activo_id)
      const sede = sedes.find(s=>s.id===act?.sede_id)
      for(let i=mesActual;i<12;i++){
        if(c[`mes${i+1}`]==='P'){
          const days = Math.ceil((new Date(`${anioActual}-${String(i+1).padStart(2,'0')}-01`)-new Date())/864e5)
          lista.push({activo:act, mes:MESES[i], mesIdx:i, days, frecuencia:c.frecuencia, sede:sede?.nombre||''})
          break
        }
      }
    })
    return lista.sort((a,b)=>a.mesIdx-b.mesIdx).slice(0,5)
  },[cronograma,activos,sedes,anioActual,mesActual])

  const getActivo = id => activos.find(a=>a.id===id)
  const getSede   = id => sedes.find(s=>s.id===id)

  return (
    <div>
      <div className="mb-7">
        <h2 className="section-title">Dashboard</h2>
        <p className="section-sub hidden sm:block">Resumen ejecutivo — {new Date().toLocaleDateString('es-CO',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p>
        <p className="section-sub sm:hidden">{new Date().toLocaleDateString('es-CO',{month:'long',day:'numeric',year:'numeric'})}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard icon="⚙" value={activos.length}   label="Total Activos"   color="blue"/>
        <StatCard icon="✅" value={completados}       label="Completados"    color="green"/>
        <StatCard icon="⏳" value={pendientes}        label="Pendientes"     color="amber"/>
        <StatCard icon="💰" value={fmt(gastoTotal)}   label="Gasto Total"    color="purple"/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Distribución de gastos */}
        <div className="card">
          <h3 className="text-xs font-bold text-gt2 uppercase tracking-widest mb-5">Distribución de Gastos</h3>
          {[{l:'Preventivo',v:gastoPrev,c:BRAND.primaryHover,p:pctPrev,cnt:mantenimientos.filter(m=>m.tipo==='Preventivo').length},
            {l:'Correctivo',v:gastoCorr,c:'#c0392b',p:pctCorr,cnt:mantenimientos.filter(m=>m.tipo==='Correctivo').length}].map((g,i)=>(
            <div key={i} className="mb-4">
              <div className="flex justify-between mb-1.5">
                <span className="text-sm text-gt1 font-medium">{g.l} <span className="text-gt3 text-xs">({g.cnt})</span></span>
                <span className="text-sm font-bold" style={{color:g.c}}>{fmt(g.v)}</span>
              </div>
              <div className="h-1.5 rounded-full bg-bg4 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{width:g.p+'%',background:g.c}}/>
              </div>
              <div className="text-xs text-gt3 mt-1">{g.p}% del gasto total</div>
            </div>
          ))}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mt-5 pt-4 border-t border-gborder">
            {[{l:'Sedes',v:sedes.length},{l:'Contratistas',v:contratistas.length},{l:'Total Mant.',v:mantenimientos.length}].map((x,i)=>(
              <div key={i} className="text-center bg-bg3 rounded-lg py-2 sm:py-3 px-1">
                <div className="text-lg sm:text-xl font-bold text-gt1">{x.v}</div>
                <div className="text-[10px] sm:text-xs text-gt3 mt-1 truncate">{x.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Próximos mantenimientos */}
        <div className="card">
          <h3 className="text-xs font-bold text-gt2 uppercase tracking-widest mb-4">Próximos Mantenimientos — Cronograma {anioActual}</h3>
          {proximosCrono.length===0 ? (
            <div className="text-center py-8 text-gt3">
              <div className="text-4xl mb-3 opacity-30">📅</div>
              <div className="text-sm">Sin pendientes en cronograma</div>
            </div>
          ) : proximosCrono.map((x,i)=>{
            const urg = x.days<=14
            return (
              <div key={i} className="flex gap-3 py-2.5 border-b border-gborder last:border-0">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${urg?'bg-red-500':'bg-gamber'}`}/>
                <div className="flex-1">
                  <div className="text-xs font-semibold text-gt1">{x.activo?.identificacion||'–'} <span className="text-gt2 font-normal">— {x.activo?.nombre?.substring(0,24)}</span></div>
                  <div className="text-xs text-gt3 mt-0.5 flex gap-2 flex-wrap items-center">
                    <span>{x.frecuencia} · {x.mes} {anioActual}</span>
                    {x.sede && <span className="chip text-xs">🏭 {x.sede}</span>}
                  </div>
                </div>
                <div className={`text-xs font-bold min-w-[40px] text-right ${urg?'text-red-400':'text-amber-400'}`}>
                  {x.days<=0?'Este mes':`${x.days}d`}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Últimos registros */}
      <div className="card">
        <h3 className="text-xs font-bold text-gt2 uppercase tracking-widest mb-4">Últimos Registros</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr>
              {['Activo','Sede','Tipo','F. Ejecutada','Estado','Gasto','Contratista'].map(h=><th key={h} className="th">{h}</th>)}
            </tr></thead>
            <tbody>
              {recientes.map(m=>{
                const act=getActivo(m.activo_id); const sede=getSede(m.sede_id)
                return(
                  <tr key={m.id} className="hover:bg-bg3/50 transition-colors">
                    <td className="td"><span className="font-bold text-accent3">{act?.identificacion||'–'}</span><br/><span className="text-xs text-gt3">{act?.nombre?.substring(0,26)}</span></td>
                    <td className="td text-xs text-gt2">{sede?.nombre||'–'}</td>
                    <td className="td"><Tag type={m.tipo==='Preventivo'?'prev':'corr'}>{m.tipo}</Tag></td>
                    <td className="td text-xs">{fmtDate(m.fecha_ejec)}</td>
                    <td className="td"><Tag type={m.estado==='Completado'?'done':m.estado==='Pendiente'?'pend':'prog'}>{m.estado}</Tag></td>
                    <td className="td text-xs font-semibold">{m.gasto>0?fmt(m.gasto):'–'}</td>
                    <td className="td text-xs text-gt2">{m.contratista_nombre||'–'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
