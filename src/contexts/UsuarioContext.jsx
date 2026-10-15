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
  obtenerUserToken,
  saveUserToken,
  tokenUserExpirado,
} from '../services/userService.js'
import { resolverPersistenciaSesion } from '../utils/recordarSesion.js'
import { esUsuarioCliente } from '../utils/usuarioRol.js'

const UsuarioContext = createContext(null)

export function UsuarioProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [loading, setLoading] = useState(true)

  const invalidarSesionCliente = useCallback(async ({ cerrarFirebase = true } = {}) => {
    clearUserToken()
    setUsuario(null)
    if (cerrarFirebase && !getAdminToken()) {
      await signOut(auth).catch(() => {})
    }
  }, [])

  const aplicarUsuarioCliente = useCallback((datos) => {
    if (!datos || !esUsuarioCliente(datos)) {
      return false
    }
    setUsuario(datos)
    return true
  }, [])

  const cargarUsuario = useCallback(async ({ signal, silent = false } = {}) => {
    if (getAdminToken()) {
      setUsuario(null)
      if (!silent) setLoading(false)
      return null
    }

    const token = await obtenerUserToken()
    if (!token) {
      setUsuario(null)
      if (!silent) setLoading(false)
      return null
    }

    if (!silent) setLoading(true)
    try {
      const datos = await obtenerDatosUsuario({ signal, token })
      if (!aplicarUsuarioCliente(datos)) {
        // Admin/colaborador en Firebase: no cerrar la sesión de Firebase.
        clearUserToken()
        setUsuario(null)
        return null
      }
      return datos
    } catch (err) {
      if (err?.name === 'AbortError') return null

      // Solo invalidar ante rechazo definitivo de auth.
      if (err?.status === 401 || err?.status === 403) {
        console.warn('[usuario] Sesión inválida:', err.message)
        await invalidarSesionCliente({ cerrarFirebase: true })
        return null
      }

      // Red/backend: conservar sesión local si el token aún sirve.
      console.warn('[usuario] No se pudo cargar el usuario:', err.message)
      const almacenado = getUserToken()
      if (!almacenado || tokenUserExpirado(almacenado)) {
        setUsuario(null)
      }
      return null
    } finally {
      if (!signal?.aborted && !silent) setLoading(false)
    }
  }, [aplicarUsuarioCliente, invalidarSesionCliente])

  const cargarUsuarioDesdeSesion = useCallback(async (user) => {
    if (!user || getAdminToken()) return null

    try {
      const idToken = await user.getIdToken()
      const persistente = resolverPersistenciaSesion(
        'user',
        esUserTokenPersistente(),
      )
      saveUserToken(idToken, { persistente })

      const datos = await obtenerDatosUsuario({ token: idToken })

      if (!aplicarUsuarioCliente(datos)) {
        // Admin/colaborador: no cerrar Firebase; AdminAuthContext gestiona esa sesión.
        if (getUserToken()) {
          clearUserToken()
          setUsuario(null)
        }
        return null
      }

      return datos
    } catch (err) {
      if (err?.status === 401 || err?.status === 403) {
        console.warn('[usuario] No se pudo restaurar la sesión:', err.message)
        await invalidarSesionCliente({ cerrarFirebase: true })
        return null
      }

      console.warn('[usuario] Error restaurando sesión (se conserva token):', err.message)
      const almacenado = getUserToken()
      if (almacenado && !tokenUserExpirado(almacenado)) {
        // Mantener loading=false con intento silencioso posterior vía refresh.
        return null
      }
      setUsuario(null)
      return null
    }
  }, [aplicarUsuarioCliente, invalidarSesionCliente])

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

        if (!user) {
          // Firebase a veces emite null de forma transitoria (refresh/red).
          // No tirar la sesión si el token guardado sigue vigente.
          const almacenado = getUserToken()
          if (almacenado && !tokenUserExpirado(almacenado)) {
            await cargarUsuario({ silent: true })
            if (activo) setLoading(false)
            return
          }

          clearUserToken()
          setUsuario(null)
          if (activo) setLoading(false)
          return
        }

        // Hay usuario Firebase: renovar token y restaurar sesión cliente
        // aunque el storage se haya limpiado temporalmente.
        await cargarUsuarioDesdeSesion(user)
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
  }, [cargarUsuario, cargarUsuarioDesdeSesion])

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
    await invalidarSesionCliente({ cerrarFirebase: true })
  }, [invalidarSesionCliente])

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
