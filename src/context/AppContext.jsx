/**
 * AppContext.jsx  —  Versión con backend real
 * Reemplaza:  gmant-app/src/context/AppContext.jsx
 */
import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import {
  apiLogin, apiMe, getToken, saveToken, removeToken,
  apiGetActivos, apiGetSedes, apiGetMantenimientos,
  apiGetContratistas, apiGetCronograma, apiGetUsuarios,
} from '../utils/api'

const Ctx = createContext(null)
export const useApp = () => useContext(Ctx)

export function AppProvider({ children }) {
  const [session, setSession] = useState(null)
  const [data, setData]       = useState({ activos:[], sedes:[], mantenimientos:[], contratistas:[], cronograma:[], usuarios:[] })
  const [loading, setLoading] = useState(true)

  // Carga todos los datos del servidor
  const reload = useCallback(async () => {
    try {
      const [activos, sedes, mantenimientos, contratistas, cronograma, usuarios] = await Promise.all([
        apiGetActivos(),
        apiGetSedes(),
        apiGetMantenimientos(),
        apiGetContratistas(),
        apiGetCronograma(),
        apiGetUsuarios().catch(() => []), // sólo accesible para admin
      ])
      setData({ activos, sedes, mantenimientos, contratistas, cronograma, usuarios })
    } catch (e) {
      console.error('Error recargando datos:', e)
    }
  }, [])

  // Al montar: verificar token existente
  useEffect(() => {
    const init = async () => {
      if (getToken()) {
        try {
          const user = await apiMe()
          setSession(user)
          await reload()
        } catch {
          removeToken()
        }
      }
      setLoading(false)
    }
    init()
  }, [reload])

  const login = async (username, password) => {
    const res = await apiLogin(username, password)   // lanza Error si falla
    saveToken(res.token)
    setSession(res.user)
    await reload()
    return res.user
  }

  const logout = () => {
    removeToken()
    setSession(null)
    setData({ activos:[], sedes:[], mantenimientos:[], contratistas:[], cronograma:[], usuarios:[] })
  }

  return (
    <Ctx.Provider value={{ session, data, reload, login, logout, loading }}>
      {children}
    </Ctx.Provider>
  )
}
