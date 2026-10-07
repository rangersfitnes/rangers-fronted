import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { onIdTokenChanged, signOut } from 'firebase/auth'
import { auth } from '../variables/firebase.jsx'
import {
  clearAdminSession,
  esAdminTokenPersistente,
  getAdminPerfil,
  getAdminRoles,
  getAdminToken,
  saveAdminPerfil,
  saveAdminRole,
  saveAdminRoles,
  saveAdminToken,
  verifyAdminAccess,
  tokenAdminExpirado,
} from '../services/authService.js'
import {
  clearUserToken,
} from '../services/userService.js'

import {
  resolverPersistenciaSesion,
} from '../utils/recordarSesion.js'

const AdminAuthContext = createContext(null)

export function AdminAuthProvider({ children }) {
  const [initializing, setInitializing] = useState(true)
  const [autenticado, setAutenticado] = useState(false)
  const [roles, setRoles] = useState(() => getAdminRoles())
  const [perfil, setPerfil] = useState(() => getAdminPerfil())
  const ultimoTokenVerificadoRef = useRef(null)

  const aplicarResultadoAuth = useCallback((result, idToken, persistente) => {
    const token = result.token || idToken
    const rolesResultado = Array.isArray(result.roles)
      ? result.roles
      : result.rol
        ? [result.rol]
        : []
    saveAdminToken(token, { persistente })
    saveAdminRole(result.rol, { persistente })
    saveAdminRoles(rolesResultado, { persistente })
    saveAdminPerfil(result.perfil || null, { persistente })
    setRoles(rolesResultado.map((r) => String(r).toLowerCase()))
    setPerfil(result.perfil || null)
    clearUserToken()
    ultimoTokenVerificadoRef.current = token
    setAutenticado(true)
  }, [])

  const syncToken = useCallback(async (user) => {
    if (!user) {
      // Firebase a veces emite null de forma transitoria (refresh/red).
      // No tirar la sesión admin si el token guardado sigue vigente.
      const almacenado = getAdminToken()
      if (almacenado && !tokenAdminExpirado(almacenado)) {
        setAutenticado(true)
        return
      }

      if (almacenado) {
        clearAdminSession()
      }
      ultimoTokenVerificadoRef.current = null
      setAutenticado(false)
      return
    }

    try {
      const idToken = await user.getIdToken()

      // Si el login ya verificó este token, no vuelvas a pegarle al backend.
      if (ultimoTokenVerificadoRef.current === idToken) {
        setAutenticado(true)
        return
      }

      // Solo verificar contra el backend si ya hay sesión admin (p. ej. refresh).
      // El login de usuarios normales no debe pegarle a /verify-admin (403 en consola).
      const almacenado = getAdminToken()
      if (!almacenado) {
        setAutenticado(false)
        return
      }

      const result = await verifyAdminAccess(idToken)
      const persistente = resolverPersistenciaSesion(
        'admin',
        esAdminTokenPersistente(),
      )
      aplicarResultadoAuth(result, idToken, persistente)
    } catch (err) {
      const status = err?.status
      if (status === 401 || status === 403) {
        clearAdminSession()
        ultimoTokenVerificadoRef.current = null
        setRoles([])
        setPerfil(null)
        setAutenticado(false)
        return
      }

      // Fallo de red / backend: conservar sesión local si el token aún sirve.
      setAutenticado(
        Boolean(getAdminToken()) && !tokenAdminExpirado(getAdminToken()),
      )
    }
  }, [aplicarResultadoAuth])

  useEffect(() => {
    let activo = true

    const iniciar = async () => {
      try {
        await auth.authStateReady()
      } catch {
        // onIdTokenChanged intentará recuperar la sesión.
      }

      if (!activo) return

      const unsubscribe = onIdTokenChanged(auth, async (user) => {
        if (!activo) return

        await syncToken(user)
        setInitializing(false)
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
  }, [syncToken])

  const establecerSesion = useCallback(
    (token, rol, { persistente = true, roles: rolesIn = null, perfil: perfilIn = null } = {}) => {
      const rolesResultado = Array.isArray(rolesIn)
        ? rolesIn
        : rol
          ? [rol]
          : []
      clearUserToken()
      saveAdminToken(token, { persistente })
      saveAdminRole(rol, { persistente })
      saveAdminRoles(rolesResultado, { persistente })
      saveAdminPerfil(perfilIn, { persistente })
      ultimoTokenVerificadoRef.current = token
      setRoles(rolesResultado.map((r) => String(r).toLowerCase()))
      setPerfil(perfilIn)
      setAutenticado(true)
      setInitializing(false)
    },
    [],
  )

  const logout = useCallback(async () => {
    clearAdminSession()
    ultimoTokenVerificadoRef.current = null
    setRoles([])
    setPerfil(null)
    setAutenticado(false)
    await signOut(auth).catch(() => {})
  }, [])

  const value = useMemo(
    () => ({
      autenticado,
      initializing,
      roles,
      perfil,
      establecerSesion,
      logout,
    }),
    [autenticado, initializing, roles, perfil, establecerSesion, logout],
  )

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) {
    throw new Error('useAdminAuth debe usarse dentro de AdminAuthProvider')
  }
  return ctx
}
