import { useState } from 'react'

// ── Modal ────────────────────────────────────────────────
export function Modal({ title, onClose, children, size = 'md' }) {
  const sizes = { sm:'max-w-md', md:'max-w-2xl', lg:'max-w-4xl', xl:'max-w-6xl' }
  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[1000] p-4" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className={`bg-bg2 border border-gborder2 rounded-2xl p-4 sm:p-7 w-full ${sizes[size]} max-h-[90vh] overflow-y-auto shadow-2xl`}>
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <h3 className="text-lg font-bold text-gt1">{title}</h3>
          <button onClick={onClose} className="text-gt3 hover:text-gt1 text-xl leading-none transition-colors">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ── Confirm Delete ───────────────────────────────────────
export function ConfirmDel({ title, desc, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-[1001] p-4">
      <div className="bg-bg2 border border-gborder2 rounded-2xl p-7 w-full max-w-md shadow-2xl">
        <h3 className="text-base font-bold text-gt1 mb-2">{title}</h3>
        <p className="text-gt2 text-sm mb-6 leading-relaxed">{desc}</p>
        <div className="flex gap-3 justify-end">
          <button className="btn-secondary" onClick={onCancel}>Cancelar</button>
          <button className="btn-danger" onClick={onConfirm}>Eliminar</button>
        </div>
      </div>
    </div>
  )
}

// ── Tag ─────────────────────────────────────────────────
export function Tag({ type, children }) {
  const classes = { prev:'tag-prev', corr:'tag-corr', pend:'tag-pend', done:'tag-done', prog:'tag-prog' }
  return <span className={classes[type]||'chip'}>{children}</span>
}

// ── Form field ───────────────────────────────────────────
export function Field({ label, children, full }) {
  return (
    <div className={full ? 'col-span-1 sm:col-span-2' : ''}>
      <label className="form-label">{label}</label>
      {children}
    </div>
  )
}

// ── Empty state ──────────────────────────────────────────
export function Empty({ icon='📋', text='Sin registros' }) {
  return (
    <div className="text-center py-16 text-gt3">
      <div className="text-5xl mb-3 opacity-30">{icon}</div>
      <div className="text-sm">{text}</div>
    </div>
  )
}

// ── Search bar ───────────────────────────────────────────
export function SearchBar({ value, onChange, placeholder }) {
  return (
    <div className="flex items-center gap-2 bg-bg3 border border-gborder2 rounded-lg px-3 py-2">
      <span className="text-gt3 text-sm">🔍</span>
      <input className="bg-transparent border-none outline-none text-sm text-gt1 flex-1 placeholder-gt3" value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/>
    </div>
  )
}

// ── Stat card ────────────────────────────────────────────
export function StatCard({ icon, value, label, color }) {
  const colors = { blue:'border-t-accent', green:'border-t-ggreen', amber:'border-t-gamber', purple:'border-t-gpurple' }
  return (
    <div className={`card border-t-2 ${colors[color]||'border-t-accent'}`}>
      <div className="text-2xl opacity-60">{icon}</div>
      <div className="text-lg sm:text-2xl font-bold text-gt1 mt-2 mb-1 break-all leading-tight">{value}</div>
      <div className="text-xs text-gt2">{label}</div>
    </div>
  )
}

// ── File upload button ───────────────────────────────────
// uploadFn: async (File) => { url, nombre } — función para subir al servidor
// docUrl: URL del archivo ya guardado
// docNombre: nombre del archivo ya guardado
// onUploaded: ({ url, nombre }) => void
// onClear: () => void
export function FileUpload({ uploadFn, docUrl, docNombre, onUploaded, onClear, inputId='file-input' }) {
  const [uploading, setUploading] = useState(false)

  const openFile = (e) => {
    e.preventDefault()
    document.getElementById(inputId)?.click()
  }

  const handleChange = async (e) => {
    const fi = e.target.files[0]
    if (!fi) return
    if (fi.size > 10 * 1024 * 1024) { alert('El archivo no puede superar 10 MB'); return }
    e.target.value = ''
    setUploading(true)
    try {
      const result = await uploadFn(fi)
      onUploaded(result)
    } catch (err) {
      alert('Error al subir archivo: ' + (err.message || 'Error desconocido'))
    } finally {
      setUploading(false)
    }
  }

  if (uploading) return (
    <div className="flex items-center gap-2 bg-bg3 border border-gborder2 rounded-lg px-3 py-2 text-xs text-gt2">
      <span className="inline-block animate-spin">⏳</span> Subiendo archivo...
    </div>
  )

  return (
    <div>
      <input id={inputId} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={handleChange}/>
      {!docUrl ? (
        <button type="button" onClick={openFile} className="btn-secondary flex items-center gap-2 text-xs">
          <span>📎</span> Adjuntar archivo
        </button>
      ) : (
        <div className="flex items-center gap-2 bg-bg3 border border-gborder2 rounded-lg px-3 py-2 text-xs text-gt2">
          <span>📄</span>
          <a href={docUrl} target="_blank" rel="noreferrer"
             className="flex-1 truncate text-accent3 hover:underline">
            {docNombre || 'Ver documento'}
          </a>
          <button type="button" onClick={openFile} className="btn-secondary btn-sm text-xs px-2">Cambiar</button>
          <button type="button" onClick={onClear} className="text-gt3 hover:text-gt1 ml-1">✕</button>
        </div>
      )}
    </div>
  )
}
