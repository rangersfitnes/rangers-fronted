import { API_BASE_URL } from '../variables/api.jsx'
import { requerirAdminToken } from './authService.js'

async function request(path, { method = 'GET', body, signal } = {}) {
  const token = await requerirAdminToken()
  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/inventario${path}`, {
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

export async function obtenerInventario({ signal } = {}) {
  const data = await request('/', { signal })
  return {
    items: Array.isArray(data.items) ? data.items : [],
    resumen: data.resumen || {
      cantidadEquipos: 0,
      valorTotalInventario: 0,
      tiposEquipos: 0,
    },
  }
}

export async function crearItemInventario(payload) {
  const data = await request('/', { method: 'POST', body: payload })
  return data.item
}

export async function actualizarItemInventario(id, payload) {
  const data = await request(`/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: payload,
  })
  return data.item
}

export async function eliminarItemInventario(id) {
  await request(`/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
