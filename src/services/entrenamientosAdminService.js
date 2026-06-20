import { API_BASE_URL } from '../variables/api.jsx'
import { getAdminToken } from './authService.js'

export async function obtenerEntrenamientosUsuario(uid, { signal } = {}) {
  const token = getAdminToken()
  if (!token) throw new Error('No hay sesión activa de administrador')

  let response
  try {
    response = await fetch(
      `${API_BASE_URL}/api/usuarios/${encodeURIComponent(uid)}/entrenamientos`,
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

export async function guardarEntrenamientoUsuarioAdmin(uid, datos) {
  const token = getAdminToken()
  if (!token) throw new Error('No hay sesión activa de administrador')

  let response
  try {
    response = await fetch(
      `${API_BASE_URL}/api/usuarios/${encodeURIComponent(uid)}/entrenamientos`,
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

export async function eliminarEntrenamientoUsuarioAdmin(uid, dia) {
  const token = getAdminToken()
  if (!token) throw new Error('No hay sesión activa de administrador')

  let response
  try {
    response = await fetch(
      `${API_BASE_URL}/api/usuarios/${encodeURIComponent(uid)}/entrenamientos/${encodeURIComponent(dia)}`,
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
    throw new Error(data.error || 'No se pudo eliminar el entrenamiento')
  }
  return true
}
