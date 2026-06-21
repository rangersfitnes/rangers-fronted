import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { onIdTokenChanged, signOut } from 'firebase/auth'
import { auth } from '../variables/firebase.jsx'
import { clearAdminSession, getAdminToken } from '../services/authService.js'
import {
  clearUserToken,
  esUserTokenPersistente,
  getUserToken,
  loginUsuario,
  obtenerDatosUsuario,
  saveUserToken,
} from '../services/userService.js'

const REFRESH_INTERVAL_MS = 50 * 60 * 1000

const UsuarioContext = createContext(null)

export function UsuarioProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [loading, setLoading] = useState(true)

  const cargarUsuario = useCallback(async ({ signal, silent = false } = {}) => {
    if (getAdminToken() || !getUserToken()) {
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
      clearUserToken()
      setUsuario(null)
      return null
    } finally {
      if (!signal?.aborted && !silent) setLoading(false)
    }
  }, [])

  const syncUserToken = useCallback(async (user) => {
    if (getAdminToken()) {
      clearUserToken()
      setUsuario(null)
      return
    }

    if (!user) {
      if (getUserToken()) {
        clearUserToken()
        setUsuario(null)
      }
      return
    }

    if (!getUserToken()) return

    try {
      const idToken = await user.getIdToken()
      saveUserToken(idToken, { persistente: esUserTokenPersistente() })
    } catch {
      clearUserToken()
      setUsuario(null)
    }
  }, [])

  useEffect(() => {
    let activo = true

    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      if (!activo) return

      if (getAdminToken()) {
        clearUserToken()
        setUsuario(null)
        setLoading(false)
        return
      }

      await syncUserToken(user)

      if (user && getUserToken()) {
        try {
          const datos = await obtenerDatosUsuario()
          if (activo) setUsuario(datos)
        } catch (err) {
          if (activo) {
            console.warn('[usuario] No se pudo cargar el usuario:', err.message)
            clearUserToken()
            setUsuario(null)
          }
        }
      } else if (!user) {
        setUsuario(null)
      }

      if (activo) setLoading(false)
    })

    return () => {
      activo = false
      unsubscribe()
    }
  }, [syncUserToken])

  useEffect(() => {
    if (!usuario || getAdminToken()) return undefined

    const intervalo = window.setInterval(async () => {
      const user = auth.currentUser
      if (!user || getAdminToken() || !getUserToken()) return

      try {
        const idToken = await user.getIdToken(true)
        saveUserToken(idToken, { persistente: esUserTokenPersistente() })
      } catch {
        // onIdTokenChanged gestionará la sesión inválida.
      }
    }, REFRESH_INTERVAL_MS)

    return () => window.clearInterval(intervalo)
  }, [usuario])

  const refresh = useCallback(() => cargarUsuario({ silent: true }), [cargarUsuario])

  const login = useCallback(
    async (idToken, { persistente = true, tipoDocumento, documento } = {}) => {
      clearAdminSession()
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

  const logout = useCallback(async () => {
    clearUserToken()
    setUsuario(null)
    await signOut(auth).catch(() => {})
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
