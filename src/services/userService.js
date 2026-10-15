import { API_BASE_URL } from '../variables/api.jsx'
import { auth } from '../variables/firebase.jsx'
import { resolverPersistenciaSesion } from '../utils/recordarSesion.js'

export const USER_TOKEN_KEY = 'rb_user_token'
const MARGEN_TOKEN_MS = 60 * 1000

function obtenerExpiracionToken(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

export function tokenUserExpirado(token, ahora = Date.now()) {
  if (!token) return true
  const expiraEn = obtenerExpiracionToken(token)
  if (!expiraEn) return false
  return expiraEn <= ahora + MARGEN_TOKEN_MS
}

export function getUserToken() {
  if (typeof window === 'undefined') return null
  return (
    localStorage.getItem(USER_TOKEN_KEY) ||
    sessionStorage.getItem(USER_TOKEN_KEY)
  )
}

export function saveUserToken(token, { persistente = true } = {}) {
  if (persistente) {
    localStorage.setItem(USER_TOKEN_KEY, token)
    sessionStorage.removeItem(USER_TOKEN_KEY)
  } else {
    sessionStorage.setItem(USER_TOKEN_KEY, token)
    localStorage.removeItem(USER_TOKEN_KEY)
  }
}

export function clearUserToken() {
  localStorage.removeItem(USER_TOKEN_KEY)
  sessionStorage.removeItem(USER_TOKEN_KEY)
}

export function esUserTokenPersistente() {
  if (typeof window === 'undefined') return true
  return Boolean(localStorage.getItem(USER_TOKEN_KEY))
}

function guardarTokenUsuarioDesdeFirebase(idToken) {
  saveUserToken(idToken, {
    persistente: resolverPersistenciaSesion(
      'user',
      esUserTokenPersistente(),
    ),
  })
}

/** Token fresco de Firebase o almacenado si aún es válido. */
export async function obtenerUserToken({ forzar = false } = {}) {
  const user = auth.currentUser

  if (user) {
    try {
      const idToken = await user.getIdToken(forzar)
      guardarTokenUsuarioDesdeFirebase(idToken)
      return idToken
    } catch {
      // Continúa con token almacenado si Firebase falla momentáneamente.
    }
  }

  const almacenado = getUserToken()
  if (almacenado && !tokenUserExpirado(almacenado)) {
    return almacenado
  }

  return null
}

export async function registrarUsuarioPublico(datos) {
  let response

  try {
    response = await fetch(
      `${API_BASE_URL}/api/usuarios/register-user-public`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      },
    )
  } catch {
    throw new Error(
      'No se pudo conectar con el servidor. Inténtalo más tarde.',
    )
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'No se pudo crear la cuenta')
  }

  return data.usuario
}

export async function loginUsuario(
  idToken,
  { persistente = true, tipoDocumento, documento } = {},
) {
  let response

  try {
    response = await fetch(`${API_BASE_URL}/api/auth/login-user`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tipoDocumento,
        documento,
      }),
    })
  } catch {
    throw new Error(
      'No se pudo conectar con el servidor. Inténtalo más tarde.',
    )
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'No se pudo iniciar sesión')
  }

  if (!data.usuario) {
    throw new Error('Respuesta inválida del servidor')
  }

  saveUserToken(idToken, { persistente })

  return data.usuario
}

export async function consultarBeneficiarios(documentos, { signal } = {}) {
  const token = getUserToken()
  if (!token) {
    throw new Error('No hay sesión activa')
  }

  let response

  try {
    response = await fetch(`${API_BASE_URL}/api/usuarios/beneficiarios`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ documentos }),
      signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'No se pudieron consultar los beneficiarios')
  }

  return data.beneficiarios || []
}

export async function actualizarFotoPerfil(file) {
  const token = getUserToken()
  if (!token) {
    throw new Error('No hay sesión activa')
  }

  if (!file) {
    throw new Error('Selecciona una imagen')
  }

  const formData = new FormData()
  formData.append('foto', file)

  let response
  try {
    response = await fetch(
      `${API_BASE_URL}/api/usuarios/me/profile-image`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      },
    )
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'No se pudo actualizar la foto de perfil')
  }

  return data.profileImage
}

export async function eliminarFotoPerfil() {
  const token = getUserToken()
  if (!token) {
    throw new Error('No hay sesión activa')
  }

  let response
  try {
    response = await fetch(
      `${API_BASE_URL}/api/usuarios/me/profile-image`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      },
    )
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'No se pudo eliminar la foto de perfil')
  }

  return true
}

export async function obtenerMisPagos({ signal } = {}) {
  const token = getUserToken()
  if (!token) {
    throw new Error('No hay sesión activa')
  }

  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/usuarios/me/pagos`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'No se pudieron cargar los pagos')
  }

  return data.pagos || []
}

export async function obtenerMisEntrenamientos({ signal } = {}) {
  const token = getUserToken()
  if (!token) {
    throw new Error('No hay sesión activa')
  }

  let response
  try {
    response = await fetch(
      `${API_BASE_URL}/api/usuarios/me/mis-entrenamientos`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        signal,
      },
    )
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'No se pudieron cargar los entrenamientos')
  }

  return data.entrenamientos || []
}

export async function guardarEntrenamiento(datos) {
  const token = getUserToken()
  if (!token) {
    throw new Error('No hay sesión activa')
  }

  let response
  try {
    response = await fetch(
      `${API_BASE_URL}/api/usuarios/me/mis-entrenamientos`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(datos),
      },
    )
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'No se pudo guardar el entrenamiento')
  }

  return data.entrenamiento
}

export async function obtenerDatosUsuario({ signal, token: tokenOverride } = {}) {
  let token = tokenOverride || (await obtenerUserToken())
  if (!token) return null

  const pedir = async (authToken) => {
    const response = await fetch(`${API_BASE_URL}/api/auth/user-data`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      signal,
    })
    const data = await response.json().catch(() => ({}))
    return { response, data }
  }

  let response
  let data

  try {
    ;({ response, data } = await pedir(token))
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new Error('No se pudo conectar con el servidor')
  }

  // Token vencido: renovar con Firebase y reintentar una vez.
  if (
    (response.status === 401 || response.status === 403) &&
    !tokenOverride &&
    auth.currentUser
  ) {
    const fresco = await obtenerUserToken({ forzar: true })
    if (fresco && fresco !== token) {
      try {
        ;({ response, data } = await pedir(fresco))
        token = fresco
      } catch (err) {
        if (err?.name === 'AbortError') throw err
        throw new Error('No se pudo conectar con el servidor')
      }
    }
  }

  if (response.status === 401 || response.status === 403) {
    const error = new Error(data.error || 'Sesión expirada')
    error.status = response.status
    throw error
  }

  if (!response.ok) {
    throw new Error(data.error || 'No se pudo obtener la información del usuario')
  }

  return data.usuario || null
}

export async function completarPerfilUsuario(datos, { signal } = {}) {
  return actualizarMiPerfil(datos, { signal })
}

export async function registrarPesoMensual(pesoKg, { origen = 'mensual', signal } = {}) {
  const token = getUserToken()
  if (!token) throw new Error('No hay sesión activa')

  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/usuarios/me/perfil/peso`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ pesoKg, origen }),
      signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'No se pudo registrar el peso')
  }
  return data.usuario
}

export async function obtenerHistorialPeso({ limite = 12, signal } = {}) {
  const token = getUserToken()
  if (!token) throw new Error('No hay sesión activa')

  const params = new URLSearchParams()
  if (limite) params.set('limite', String(limite))

  let response
  try {
    response = await fetch(
      `${API_BASE_URL}/api/usuarios/me/perfil/peso/historial?${params}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        signal,
      },
    )
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'No se pudo cargar el historial de peso')
  }
  return data.historial ?? []
}

export async function actualizarMiPerfil(datos, { signal } = {}) {
  const token = getUserToken()
  if (!token) {
    throw new Error('No hay sesión activa')
  }

  let response

  try {
    response = await fetch(`${API_BASE_URL}/api/usuarios/me/perfil`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(datos),
      signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'No se pudo actualizar el perfil')
  }

  return data.usuario
}

export async function interpretarRecordatorio(peticion, { signal } = {}) {
  const token = getUserToken()
  if (!token) {
    throw new Error('No hay sesión activa')
  }

  let response
  try {
    response = await fetch(
      `${API_BASE_URL}/api/usuarios/me/recordatorios/interpretar`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ peticion }),
        signal,
      },
    )
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'Rex no pudo interpretar la petición')
  }
  return data.interpretado
}

export async function obtenerMisRecordatorios({ signal } = {}) {
  const token = getUserToken()
  if (!token) {
    throw new Error('No hay sesión activa')
  }

  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/usuarios/me/recordatorios`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'No se pudieron cargar los recordatorios')
  }
  return data.recordatorios || []
}

export async function crearRecordatorio(datos, { signal } = {}) {
  const token = getUserToken()
  if (!token) {
    throw new Error('No hay sesión activa')
  }

  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/usuarios/me/recordatorios`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(datos),
      signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'No se pudo crear el recordatorio')
  }
  return data.recordatorio
}

export async function actualizarRecordatorio(id, datos, { signal } = {}) {
  const token = getUserToken()
  if (!token) {
    throw new Error('No hay sesión activa')
  }

  let response
  try {
    response = await fetch(
      `${API_BASE_URL}/api/usuarios/me/recordatorios/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(datos),
        signal,
      },
    )
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'No se pudo actualizar el recordatorio')
  }
  return data.recordatorio
}

export async function eliminarRecordatorio(id, { signal } = {}) {
  const token = getUserToken()
  if (!token) {
    throw new Error('No hay sesión activa')
  }

  let response
  try {
    response = await fetch(
      `${API_BASE_URL}/api/usuarios/me/recordatorios/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
        signal,
      },
    )
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'No se pudo eliminar el recordatorio')
  }
  return data
}
