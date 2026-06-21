import { API_BASE_URL } from '../variables/api.jsx'
import { getAdminToken } from './authService.js'

async function parseJsonResponse(response, fallbackError) {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || fallbackError)
  }
  return data
}

function authHeaders() {
  const token = getAdminToken()
  if (!token) throw new Error('No hay sesión activa de administrador')
  return { Authorization: `Bearer ${token}` }
}

export async function contarHorasExtraPendientes({ signal } = {}) {
  let response
  try {
    response = await fetch(
      `${API_BASE_URL}/api/nominas/horas-extra/pendientes/contador`,
      {
        method: 'GET',
        headers: authHeaders(),
        signal,
      },
    )
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await parseJsonResponse(
    response,
    'No se pudo consultar las horas extra pendientes',
  )
  return Number(data.total) || 0
}

export async function obtenerHorasExtraPendientes({ signal } = {}) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/nominas/horas-extra/pendientes`, {
      method: 'GET',
      headers: authHeaders(),
      signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await parseJsonResponse(
    response,
    'No se pudieron cargar las horas extra pendientes',
  )
  return data.registros ?? []
}

export async function obtenerHorasExtraAprobadas({ signal } = {}) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/nominas/horas-extra/aprobadas`, {
      method: 'GET',
      headers: authHeaders(),
      signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await parseJsonResponse(
    response,
    'No se pudieron cargar las horas extra aprobadas',
  )
  return data.registros ?? []
}

export async function sincronizarHorasExtraPendientes() {
  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/nominas/horas-extra/sincronizar`, {
      method: 'POST',
      headers: authHeaders(),
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await parseJsonResponse(
    response,
    'No se pudieron sincronizar las horas extra',
  )
  return data
}

export async function aprobarHorasExtra({ id }) {
  let response
  try {
    response = await fetch(
      `${API_BASE_URL}/api/nominas/horas-extra/${encodeURIComponent(id)}/aprobar`,
      {
        method: 'POST',
        headers: authHeaders(),
      },
    )
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await parseJsonResponse(
    response,
    'No se pudieron aprobar las horas extra',
  )
  return data.registro
}

export async function rechazarHorasExtra({ id, causal }) {
  let response
  try {
    response = await fetch(
      `${API_BASE_URL}/api/nominas/horas-extra/${encodeURIComponent(id)}/rechazar`,
      {
        method: 'POST',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ causal }),
      },
    )
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await parseJsonResponse(
    response,
    'No se pudieron rechazar las horas extra',
  )
  return data.registro
}
