import { API_BASE_URL } from '../variables/api.jsx'

export const USER_TOKEN_KEY = 'rb_user_token'

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

export async function obtenerDatosUsuario({ signal } = {}) {
  const token = getUserToken()
  if (!token) return null

  let response

  try {
    response = await fetch(`${API_BASE_URL}/api/auth/user-data`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await response.json().catch(() => ({}))

  if (response.status === 401) {
    clearUserToken()
    return null
  }

  if (!response.ok) {
    throw new Error(data.error || 'No se pudo obtener la información del usuario')
  }

  return data.usuario || null
}
