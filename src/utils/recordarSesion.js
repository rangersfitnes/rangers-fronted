import {
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
} from 'firebase/auth'

const PREF_KEYS = {
  user: 'rb_recordar_sesion_user',
  admin: 'rb_recordar_sesion_admin',
}

const CREDENTIAL_KEYS = {
  user: 'rb_credenciales_user',
  admin: 'rb_credenciales_admin',
}

export function leerPreferenciaRecordarSesion(alcance = 'user') {
  if (typeof window === 'undefined') return true

  const key = PREF_KEYS[alcance] || PREF_KEYS.user
  const stored = localStorage.getItem(key)

  if (stored === null) return true

  return stored === '1'
}

export function guardarPreferenciaRecordarSesion(alcance, valor) {
  if (typeof window === 'undefined') return

  const key = PREF_KEYS[alcance] || PREF_KEYS.user
  localStorage.setItem(key, valor ? '1' : '0')

  if (!valor) {
    limpiarCredencialesRecordadas(alcance)
  }
}

export function guardarCredencialesRecordadas(alcance, datos) {
  if (typeof window === 'undefined') return

  const key = CREDENTIAL_KEYS[alcance] || CREDENTIAL_KEYS.user
  localStorage.setItem(key, JSON.stringify(datos))
}

export function leerCredencialesRecordadas(alcance = 'user') {
  if (typeof window === 'undefined') return null
  if (!leerPreferenciaRecordarSesion(alcance)) return null

  const key = CREDENTIAL_KEYS[alcance] || CREDENTIAL_KEYS.user
  const raw = localStorage.getItem(key)

  if (!raw) return null

  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function limpiarCredencialesRecordadas(alcance = 'user') {
  if (typeof window === 'undefined') return

  const key = CREDENTIAL_KEYS[alcance] || CREDENTIAL_KEYS.user
  localStorage.removeItem(key)
}

export function resolverPersistenciaSesion(alcance, esTokenPersistente) {
  if (typeof esTokenPersistente === 'boolean') {
    return esTokenPersistente
  }
  return leerPreferenciaRecordarSesion(alcance)
}

export async function aplicarPersistenciaFirebase(authInstance, persistente) {
  await setPersistence(
    authInstance,
    persistente ? browserLocalPersistence : browserSessionPersistence,
  )
}

export async function inicializarPersistenciaActiva() {
  const { auth } = await import('../variables/firebase.jsx')
  const { getAdminToken } = await import('../services/authService.js')
  const { getUserToken } = await import('../services/userService.js')

  const alcance = getAdminToken() ? 'admin' : getUserToken() ? 'user' : 'admin'
  await inicializarPersistenciaFirebase(auth, alcance)
}

export async function inicializarPersistenciaFirebase(
  authInstance,
  alcance = 'user',
) {
  await aplicarPersistenciaFirebase(
    authInstance,
    leerPreferenciaRecordarSesion(alcance),
  )
}
