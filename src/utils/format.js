export const fmt=(n)=>new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',minimumFractionDigits:0}).format(n||0)
export const fmtDate = (d) => {
  if (!d) return '–'
  const clean = d.toString().split('T')[0]   // quita la hora si viene ISO
  const [y, m, dd] = clean.split('-')
  return `${dd}/${m}/${y}`
}
export const today=()=>new Date().toISOString().split('T')[0]
export const MESES=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
export const FRECUENCIAS=['Mensual','Bimestral','Trimestral','Cuatrimestral','Semestral','Anual']
export const FREC_INTERVALO={Mensual:1,Bimestral:2,Trimestral:3,Cuatrimestral:4,Semestral:6,Anual:12}
