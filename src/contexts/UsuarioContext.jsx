import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  clearUserToken,
  getUserToken,
  loginUsuario,
  obtenerDatosUsuario,
} from '../services/userService.js'

const UsuarioContext = createContext(null)

export function UsuarioProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [loading, setLoading] = useState(true)

  const cargarUsuario = useCallback(async ({ signal, silent = false } = {}) => {
    if (!getUserToken()) {
      setUsuario(null)
      if (!silent) setLoading(false)
      return null
    }

    if (!silent) setLoading(true)
    try {
      const datos = await obtenerDatosUsuario({ signal })
      setUsuario(datos)
      return datos
    } catch (err) {
      if (err?.name === 'AbortError') return null
      console.warn('[usuario] No se pudo cargar el usuario:', err.message)
      setUsuario(null)
      return null
    } finally {
      if (!signal?.aborted && !silent) setLoading(false)
    }
  }, [])

  const refresh = useCallback(() => cargarUsuario({ silent: true }), [cargarUsuario])

  useEffect(() => {
    const controller = new AbortController()
    cargarUsuario({ signal: controller.signal })
    return () => controller.abort()
  }, [cargarUsuario])

  const login = useCallback(
    async (idToken, { persistente = true, tipoDocumento, documento } = {}) => {
      const datos = await loginUsuario(idToken, {
        persistente,
        tipoDocumento,
        documento,
      })
    setUsuario(datos)
      setLoading(false)
      return datos
    },
    [],
  )

  const logout = useCallback(() => {
    clearUserToken()
    setUsuario(null)
  }, [])

  const actualizarUsuario = useCallback((patch) => {
    setUsuario((prev) => (prev ? { ...prev, ...patch } : prev))
  }, [])

  const value = useMemo(
    () => ({
      usuario,
      loading,
      refresh,
      login,
      logout,
      actualizarUsuario,
    }),
    [usuario, loading, refresh, login, logout, actualizarUsuario],
  )

  return (
    <UsuarioContext.Provider value={value}>{children}</UsuarioContext.Provider>
  )
}

export function useUsuario() {
  const ctx = useContext(UsuarioContext)
  if (!ctx) {
    throw new Error('useUsuario debe usarse dentro de UsuarioProvider')
  }
  return ctx
}
