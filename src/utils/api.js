/**
 * api.js  —  Reemplaza storage.js
 * Coloca este archivo en:  gmant-app/src/utils/api.js
 *
 * Todas las funciones devuelven los datos directamente o lanzan un Error.
 */

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

// ── Token helpers ─────────────────────────────────────────────
const TOKEN_KEY = 'gmant_token'
export const getToken    = ()        => localStorage.getItem(TOKEN_KEY)
export const saveToken   = (t)       => localStorage.setItem(TOKEN_KEY, t)
export const removeToken = ()        => localStorage.removeItem(TOKEN_KEY)

// ── Fetch base ────────────────────────────────────────────────
async function req(method, path, body) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  // Si el token expiró (fuera del login), limpiar sesión y recargar
  if (res.status === 401 && path !== '/auth/login') {
    removeToken()
    window.location.reload()
    return
  }

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`)
  return data
}

const get    = (path)        => req('GET',    path)
const post   = (path, body)  => req('POST',   path, body)
const put    = (path, body)  => req('PUT',    path, body)
const del    = (path)        => req('DELETE', path)

// ── AUTH ──────────────────────────────────────────────────────
export const apiLogin  = (username, password) => post('/auth/login', { username, password })
export const apiMe     = ()                   => get('/auth/me')

// ── USUARIOS ─────────────────────────────────────────────────
export const apiGetUsuarios    = ()           => get('/usuarios')
export const apiCreateUsuario  = (data)       => post('/usuarios', data)
export const apiUpdateUsuario  = (id, data)   => put(`/usuarios/${id}`, data)
export const apiDeleteUsuario  = (id)         => del(`/usuarios/${id}`)

// ── SEDES ─────────────────────────────────────────────────────
export const apiGetSedes    = ()              => get('/sedes')
export const apiCreateSede  = (data)          => post('/sedes', data)
export const apiUpdateSede  = (id, data)      => put(`/sedes/${id}`, data)
export const apiDeleteSede  = (id)            => del(`/sedes/${id}`)

// ── CONTRATISTAS ─────────────────────────────────────────────
export const apiGetContratistas    = ()       => get('/contratistas')
export const apiCreateContratista  = (data)   => post('/contratistas', data)
export const apiUpdateContratista  = (id, d)  => put(`/contratistas/${id}`, d)
export const apiDeleteContratista  = (id)     => del(`/contratistas/${id}`)

// ── ACTIVOS ───────────────────────────────────────────────────
export const apiGetActivos    = ()            => get('/activos')
export const apiGetActivo     = (id)          => get(`/activos/${id}`)
export const apiCreateActivo  = (data)        => post('/activos', data)
export const apiUpdateActivo  = (id, data)    => put(`/activos/${id}`, data)
export const apiDeleteActivo  = (id)          => del(`/activos/${id}`)

// ── MANTENIMIENTOS ────────────────────────────────────────────
export const apiGetMantenimientos    = ()     => get('/mantenimientos')
export const apiGetMantenimiento     = (id)   => get(`/mantenimientos/${id}`)
export const apiGetMantenimientoDoc  = (id)   => get(`/mantenimientos/${id}/doc`)
export const apiCreateMantenimiento  = (data) => post('/mantenimientos', data)
export const apiUpdateMantenimiento  = (id,d) => put(`/mantenimientos/${id}`, d)
export const apiDeleteMantenimiento  = (id)   => del(`/mantenimientos/${id}`)
export const apiStatsMantenimientos  = ()     => get('/mantenimientos/stats')

// ── CRONOGRAMA ────────────────────────────────────────────────
export const apiGetCronograma    = (anio)     => get(`/cronograma${anio ? `?anio=${anio}` : ''}`)
export const apiUpsertCronograma = (data)     => post('/cronograma', data)
export const apiDeleteCronograma = (id)       => del(`/cronograma/${id}`)

// ── REPROGRAMACIONES ──────────────────────────────────────────
export const apiGetReprogramaciones = (activoId) => get(`/reprogramaciones/${activoId}`)
export const apiCrearReprogramacion = (data)     => post('/reprogramaciones', data)

// ── UPLOAD ────────────────────────────────────────────────────
export const apiUploadDoc = async (file) => {
  const token = getToken()
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${BASE}/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  })
  if (res.status === 401) { removeToken(); window.location.reload(); return }
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`)
  return data
}
