import { API_BASE_URL } from '../variables/api.jsx'
import { requerirAdminToken } from './authService.js'

async function parseJsonResponse(response, fallbackError) {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || fallbackError)
  }
  return data
}

export async function obtenerConfigReferidos({ signal } = {}) {
  const token = await requerirAdminToken()

  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/referidos/config`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await parseJsonResponse(
    response,
    'No se pudo cargar la configuración de referidos',
  )
  return data.config ?? {
    descuentoMonto: 0,
    activo: false,
  }
}

export async function guardarConfigReferidos({ descuentoMonto, activo = true }) {
  const token = await requerirAdminToken()

  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/referidos/config`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ descuentoMonto, activo }),
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await parseJsonResponse(
    response,
    'No se pudo guardar la configuración de referidos',
  )
  return data.config
}

export async function obtenerRegistrosReferidos({ signal, limit = 100 } = {}) {
  const token = await requerirAdminToken()
  const params = new URLSearchParams({ limit: String(limit) })

  let response
  try {
    response = await fetch(
      `${API_BASE_URL}/api/referidos/registros?${params}`,
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

  const data = await parseJsonResponse(
    response,
    'No se pudo cargar el registro de referidos',
  )
  return {
    referidores: data.referidores ?? [],
    registros: data.registros ?? [],
  }
}
