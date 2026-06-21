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
  getAdminToken,
  saveAdminRole,
  saveAdminToken,
  verifyAdminAccess,
} from '../services/authService.js'
import {
  clearUserToken,
  getUserToken,
} from '../services/userService.js'

const REFRESH_INTERVAL_MS = 50 * 60 * 1000

const AdminAuthContext = createContext(null)

export function AdminAuthProvider({ children }) {
  const [initializing, setInitializing] = useState(true)
  const [autenticado, setAutenticado] = useState(Boolean(getAdminToken()))

  const syncToken = useCallback(async (user) => {
    if (!user) {
      if (getAdminToken()) {
        clearAdminSession()
        setAutenticado(false)
      }
      return
    }

    if (!getAdminToken()) {
      setAutenticado(false)
      return
    }

    try {
      const idToken = await user.getIdToken()
      const result = await verifyAdminAccess(idToken)
      saveAdminToken(result.token || idToken)
      saveAdminRole(result.rol)
      clearUserToken()
      setAutenticado(true)
    } catch {
      clearAdminSession()
      setAutenticado(false)
    }
  }, [])

  useEffect(() => {
    let activo = true

    const unsubscribe = onIdTokenChanged(auth, async (user) => {
      if (!activo) return

      await syncToken(user)
      setInitializing(false)
    })

    return () => {
      activo = false
      unsubscribe()
    }
  }, [syncToken])

  useEffect(() => {
    if (!autenticado) return undefined

    const intervalo = window.setInterval(async () => {
      const user = auth.currentUser
      if (!user || !getAdminToken()) return

      try {
        const idToken = await user.getIdToken(true)
        saveAdminToken(idToken)
      } catch {
        // onIdTokenChanged gestionará la sesión inválida.
      }
    }, REFRESH_INTERVAL_MS)

    return () => window.clearInterval(intervalo)
  }, [autenticado])

  const establecerSesion = useCallback((token, rol) => {
    clearUserToken()
    saveAdminToken(token)
    saveAdminRole(rol)
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
