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
import {
  resolverPersistenciaSesion,
} from '../utils/recordarSesion.js'
import { esUsuarioCliente } from '../utils/usuarioRol.js'

const UsuarioContext = createContext(null)

export function UsuarioProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [loading, setLoading] = useState(true)

  const invalidarSesionNoCliente = useCallback(async () => {
    clearUserToken()
    setUsuario(null)
    await signOut(auth).catch(() => {})
  }, [])

  const cargarUsuario = useCallback(async ({ signal, silent = false } = {}) => {
    if (getAdminToken() || !getUserToken()) {
      setUsuario(null)
      if (!silent) setLoading(false)
      return null
    }

    if (!silent) setLoading(true)
    try {
      const datos = await obtenerDatosUsuario({ signal })
      if (!datos || !esUsuarioCliente(datos)) {
        if (auth.currentUser) {
          await invalidarSesionNoCliente()
        } else {
          clearUserToken()
          setUsuario(null)
        }
        return null
      }
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
  }, [invalidarSesionNoCliente])

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
    }
  }, [])

  const cargarUsuarioDesdeSesion = useCallback(async (user) => {
    if (!user || getAdminToken()) return null

    try {
      const idToken = await user.getIdToken()
      const datos = await obtenerDatosUsuario({ token: idToken })

      if (!datos || !esUsuarioCliente(datos)) {
        // Admin/colaborador: no cerrar Firebase; AdminAuthContext gestiona esa sesión.
        if (getUserToken()) {
          clearUserToken()
          setUsuario(null)
        }
        return null
      }

      const persistente = resolverPersistenciaSesion('user', esUserTokenPersistente())
      saveUserToken(idToken, { persistente })
      setUsuario(datos)
      return datos
    } catch (err) {
      console.warn('[usuario] No se pudo restaurar la sesión:', err.message)
      if (getUserToken()) {
        clearUserToken()
        setUsuario(null)
      }
      return null
    }
  }, [])

  useEffect(() => {
    let activo = true

    const iniciar = async () => {
      try {
        await auth.authStateReady()
      } catch {
        // Si falla la persistencia, onIdTokenChanged intentará recuperar la sesión.
      }

      if (!activo) return

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
          await cargarUsuarioDesdeSesion(user)
        } else {
          setUsuario(null)
        }

        if (activo) setLoading(false)
      })

      return unsubscribe
    }

    let unsubscribe = () => {}

    iniciar().then((unsub) => {
      if (typeof unsub === 'function') {
        unsubscribe = unsub
      }
    })

    return () => {
      activo = false
      unsubscribe()
    }
  }, [syncUserToken, cargarUsuarioDesdeSesion])

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
