import { API_BASE_URL } from '../variables/api.jsx'
import { getAdminToken } from './authService.js'

async function parseJsonResponse(response, fallbackError) {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || fallbackError)
  }
  return data
}

export async function obtenerMiPerfilLaboral({ signal } = {}) {
  const token = getAdminToken()
  if (!token) throw new Error('No hay sesión activa de administrador')

  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/nominas/mi-perfil`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new Error('No se pudo conectar con el servidor')
  }

  return parseJsonResponse(response, 'No se pudo cargar tu perfil laboral')
}
