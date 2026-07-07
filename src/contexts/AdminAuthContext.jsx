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
import {
  clearAdminSession,
  esAdminTokenPersistente,
  getAdminToken,
  saveAdminRole,
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

  const syncToken = useCallback(async (user) => {
    if (!user) {
      if (getAdminToken()) {
        clearAdminSession()
      }
      setAutenticado(false)
      return
    }

    try {
      const idToken = await user.getIdToken()
      const result = await verifyAdminAccess(idToken)
      const persistente = resolverPersistenciaSesion(
        'admin',
        esAdminTokenPersistente(),
      )
      saveAdminToken(result.token || idToken, { persistente })
      saveAdminRole(result.rol, { persistente })
      clearUserToken()
      setAutenticado(true)
    } catch (err) {
      const status = err?.status
      if (status === 401 || status === 403) {
        clearAdminSession()
        setAutenticado(false)
        return
      }

      setAutenticado(Boolean(getAdminToken()) && !tokenAdminExpirado(getAdminToken()))
    }
  }, [])

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

  const establecerSesion = useCallback((token, rol, { persistente = true } = {}) => {
    clearUserToken()
    saveAdminToken(token, { persistente })
    saveAdminRole(rol, { persistente })
    setAutenticado(true)
    setInitializing(false)
  }, [])

  const logout = useCallback(async () => {
    clearAdminSession()
    setAutenticado(false)
    await signOut(auth).catch(() => {})
  }, [])

  const value = useMemo(
    () => ({
      autenticado,
      initializing,
      establecerSesion,
      logout,
    }),
    [autenticado, initializing, establecerSesion, logout],
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
