import { API_BASE_URL } from '../variables/api.jsx'
import { requerirAdminToken } from './authService.js'

export function urlEmbedYoutube(videoId) {
  const id = String(videoId || '').trim()
  if (!id) return ''
  return `https://www.youtube.com/embed/${id}`
}

export async function obtenerContenidoWebPublico({ signal } = {}) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/contenido-web/publico`, {
      method: 'GET',
      signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'No se pudo cargar el contenido web')
  }

  return data.contenido ?? {}
}

export async function obtenerContenidoWebAdmin({ signal } = {}) {
  const token = await requerirAdminToken()

  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/contenido-web`, {
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
    throw new Error(data.error || 'No se pudo cargar el contenido web')
  }

  return data.contenido ?? {}
}

export async function actualizarContenidoWebAdmin({ inicio }) {
  const token = await requerirAdminToken()

  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/contenido-web`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inicio }),
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'No se pudo guardar el contenido web')
  }

  return data.contenido ?? {}
}
