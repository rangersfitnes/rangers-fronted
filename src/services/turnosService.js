import { API_BASE_URL } from '../variables/api.jsx'
import { requerirAdminToken } from './authService.js'

async function parseJsonResponse(response, fallbackError) {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || fallbackError)
  }
  return data
}

export async function obtenerPerfilColaborador({ signal } = {}) {
  const token = await requerirAdminToken()

  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/nominas/colaboradores/perfil`, {
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
    'No se pudo obtener el perfil del colaborador',
  )
  return {
    colaborador: data.colaborador ?? null,
    esquema: data.esquema ?? null,
  }
}

export async function obtenerTurnoActivo({ signal } = {}) {
  const token = await requerirAdminToken()

  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/nominas/turnos/activo`, {
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
    'No se pudo consultar el turno activo',
  )
  return data.turno ?? null
}

export async function iniciarTurnoLaboral() {
  const token = await requerirAdminToken()

  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/nominas/turnos/iniciar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await parseJsonResponse(response, 'No se pudo iniciar la jornada')
  return data.turno
}

export async function finalizarTurnoLaboral({ turnoId }) {
  const token = await requerirAdminToken()

  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/nominas/turnos/finalizar`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ turnoId }),
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await parseJsonResponse(response, 'No se pudo finalizar la jornada')
  return data.turno
}

export async function obtenerTurnosActivos({ signal } = {}) {
  const token = await requerirAdminToken()

  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/nominas/turnos/activos`, {
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
    'No se pudieron cargar los turnos activos',
  )
  return data.turnos ?? []
}

export async function eliminarTurnoLaboral({ sede, turnoId }) {
  const token = await requerirAdminToken()

  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/nominas/turnos/eliminar`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sede, turnoId }),
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }

  return parseJsonResponse(response, 'No se pudo eliminar el turno')
}
