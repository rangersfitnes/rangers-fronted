import { API_BASE_URL } from '../variables/api.jsx'
import { requerirAdminToken } from './authService.js'

async function request(path, { method = 'GET', body, signal } = {}) {
  const token = await requerirAdminToken()
  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/conocimiento-bot${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new Error(
      'No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.',
    )
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'No se pudo completar la operación')
  }
  return data
}

export async function obtenerConocimientoBot({ signal } = {}) {
  const data = await request('/', { signal })
  return Array.isArray(data.lista) ? data.lista : []
}

export async function crearConocimientoBot(payload) {
  const data = await request('/', { method: 'POST', body: payload })
  return data.item
}

export async function actualizarConocimientoBot(id, payload) {
  const data = await request(`/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: payload,
  })
  return data.item
}

export async function eliminarConocimientoBot(id) {
  await request(`/${encodeURIComponent(id)}`, { method: 'DELETE' })
  return true
}
