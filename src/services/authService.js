import { API_BASE_URL } from '../variables/api.jsx'
import { auth } from '../variables/firebase.jsx'
import { resolverPersistenciaSesion } from '../utils/recordarSesion.js'
const MARGEN_TOKEN_MS = 60 * 1000

function obtenerExpiracionToken(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

export function tokenAdminExpirado(token, ahora = Date.now()) {
  if (!token) return true
  const expiraEn = obtenerExpiracionToken(token)
  if (!expiraEn) return false
  return expiraEn <= ahora + MARGEN_TOKEN_MS
}

let verifyAdminEnVuelo = null

export async function verifyAdminAccess(idToken) {
  if (!idToken) {
    const error = new Error('Token de autenticación requerido')
    error.status = 401
    throw error
  }

  // Evita llamadas duplicadas (login + onIdTokenChanged) con el mismo token.
  if (verifyAdminEnVuelo?.token === idToken) {
    return verifyAdminEnVuelo.promise
  }

  const promise = (async () => {
    let response

    try {
      response = await fetch(`${API_BASE_URL}/api/auth/verify-admin`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      })
    } catch {
      const error = new Error(
        'No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.',
      )
      error.status = 0
      throw error
    }

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      const error = new Error(
        data.error || 'No se pudo verificar el acceso de administrador',
      )
      error.status = response.status
      throw error
    }

    return data
  })()

  verifyAdminEnVuelo = { token: idToken, promise }

  try {
    return await promise
  } finally {
    if (verifyAdminEnVuelo?.token === idToken) {
      verifyAdminEnVuelo = null
    }
  }
}

export const ADMIN_TOKEN_KEY = 'adminToken'
export const ADMIN_ROLE_KEY = 'adminRole'

export function saveAdminToken(token, { persistente = true } = {}) {
  if (persistente) {
    localStorage.setItem(ADMIN_TOKEN_KEY, token)
    sessionStorage.removeItem(ADMIN_TOKEN_KEY)
  } else {
    sessionStorage.setItem(ADMIN_TOKEN_KEY, token)
    localStorage.removeItem(ADMIN_TOKEN_KEY)
  }
}

export function saveAdminRole(role, { persistente = true } = {}) {
  if (persistente) {
    localStorage.setItem(ADMIN_ROLE_KEY, role)
    sessionStorage.removeItem(ADMIN_ROLE_KEY)
  } else {
    sessionStorage.setItem(ADMIN_ROLE_KEY, role)
    localStorage.removeItem(ADMIN_ROLE_KEY)
  }
}

export function getAdminToken() {
  return (
    localStorage.getItem(ADMIN_TOKEN_KEY) ||
    sessionStorage.getItem(ADMIN_TOKEN_KEY)
  )
}

export function getAdminRole() {
  return (
    localStorage.getItem(ADMIN_ROLE_KEY) ||
    sessionStorage.getItem(ADMIN_ROLE_KEY)
  )
}

export function esAdminTokenPersistente() {
  if (typeof window === 'undefined') return true
  return Boolean(localStorage.getItem(ADMIN_TOKEN_KEY))
}

export function clearAdminSession() {
  localStorage.removeItem(ADMIN_TOKEN_KEY)
  localStorage.removeItem(ADMIN_ROLE_KEY)
  sessionStorage.removeItem(ADMIN_TOKEN_KEY)
  sessionStorage.removeItem(ADMIN_ROLE_KEY)
}

function guardarTokenAdminDesdeFirebase(idToken) {
  saveAdminToken(idToken, {
    persistente: resolverPersistenciaSesion(
      'admin',
      esAdminTokenPersistente(),
    ),
  })
}

/** Token fresco de Firebase o almacenado si aún es válido. */
export async function obtenerAdminToken() {
  const user = auth.currentUser

  if (user) {
    try {
      const idToken = await user.getIdToken()
      guardarTokenAdminDesdeFirebase(idToken)
      return idToken
    } catch {
      // Continúa con token almacenado si Firebase falla momentáneamente.
    }
  }

  const almacenado = getAdminToken()
  if (almacenado && !tokenAdminExpirado(almacenado)) {
    return almacenado
  }

  return null
}

export async function requerirAdminToken() {
  const token = await obtenerAdminToken()
  if (!token) {
    throw new Error('No hay sesión activa de administrador')
  }
  return token
}
