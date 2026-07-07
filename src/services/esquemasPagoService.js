import { API_BASE_URL } from '../variables/api.jsx'
import { requerirAdminToken } from './authService.js'

async function parseJsonResponse(response, fallbackError) {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || fallbackError)
  }
  return data
}

export async function obtenerEsquemasPago({ signal } = {}) {
  const token = await requerirAdminToken()

  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/nominas/esquemas-pagos`, {
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
    'No se pudieron cargar los esquemas de pago',
  )
  return data.esquemas ?? []
}

export async function crearEsquemaPago({
  nombre,
  valorPorHora,
  horasTurno,
  valorTurno,
  porcentajeHoraExtra,
  porcentajeRecargoDominical,
  porcentajeRecargoNocturno,
}) {
  const token = await requerirAdminToken()

  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/nominas/esquemas-pagos`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nombre,
        valorPorHora,
        horasTurno,
        valorTurno,
        porcentajeHoraExtra,
        porcentajeRecargoDominical,
        porcentajeRecargoNocturno,
      }),
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await parseJsonResponse(
    response,
    'No se pudo crear el esquema de pago',
  )
  return data.esquema
}

export async function actualizarEsquemaPago({
  id,
  nombre,
  valorPorHora,
  horasTurno,
  valorTurno,
  porcentajeHoraExtra,
  porcentajeRecargoDominical,
  porcentajeRecargoNocturno,
}) {
  const token = await requerirAdminToken()

  let response
  try {
    response = await fetch(
      `${API_BASE_URL}/api/nominas/esquemas-pagos/${encodeURIComponent(id)}`,
      {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nombre,
        valorPorHora,
        horasTurno,
        valorTurno,
        porcentajeHoraExtra,
        porcentajeRecargoDominical,
        porcentajeRecargoNocturno,
      }),
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await parseJsonResponse(
    response,
    'No se pudo actualizar el esquema de pago',
  )
  return data.esquema
}

export async function eliminarEsquemaPago({ id } = {}) {
  const token = await requerirAdminToken()

  let response
  try {
    response = await fetch(
      `${API_BASE_URL}/api/nominas/esquemas-pagos/${encodeURIComponent(id)}`,
      {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await parseJsonResponse(
    response,
    'No se pudo eliminar el esquema de pago',
  )
  return data.esquema
}
