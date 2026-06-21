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

export async function obtenerEstadoLiquidacionColaboradores({
  fechaInicio,
  fechaFin,
}) {
  const params = new URLSearchParams({ fechaInicio, fechaFin })
  let response
  try {
    response = await fetch(
      `${API_BASE_URL}/api/nominas/liquidaciones/colaboradores?${params}`,
      {
        method: 'GET',
        headers: authHeaders(),
      },
    )
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await parseJsonResponse(
    response,
    'No se pudo cargar el estado de liquidación',
  )
  return data.estado
}

export async function obtenerPreviewColaborador({
  colaboradorUid,
  fechaInicio,
  fechaFin,
}) {
  const params = new URLSearchParams({
    colaboradorUid,
    fechaInicio,
    fechaFin,
  })
  let response
  try {
    response = await fetch(
      `${API_BASE_URL}/api/nominas/liquidaciones/colaborador/preview?${params}`,
      {
        method: 'GET',
        headers: authHeaders(),
      },
    )
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await parseJsonResponse(
    response,
    'No se pudo obtener el detalle de liquidación',
  )
  return data.preview
}

export async function ejecutarLiquidacionColaborador({
  colaboradorUid,
  fechaInicio,
  fechaFin,
}) {
  let response
  try {
    response = await fetch(
      `${API_BASE_URL}/api/nominas/liquidaciones/colaborador`,
      {
        method: 'POST',
        headers: {
          ...authHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ colaboradorUid, fechaInicio, fechaFin }),
      },
    )
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await parseJsonResponse(
    response,
    'No se pudo ejecutar la liquidación',
  )
  return data
}

export async function obtenerLiquidacionesNomina() {
  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/nominas/liquidaciones`, {
      method: 'GET',
      headers: authHeaders(),
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await parseJsonResponse(
    response,
    'No se pudieron cargar las liquidaciones',
  )
  return data.liquidaciones ?? []
}

export async function obtenerHistorialLiquidacionesColaborador({ colaboradorUid }) {
  let response
  try {
    response = await fetch(
      `${API_BASE_URL}/api/nominas/liquidaciones/colaborador/${encodeURIComponent(colaboradorUid)}/historial`,
      {
        method: 'GET',
        headers: authHeaders(),
      },
    )
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await parseJsonResponse(
    response,
    'No se pudo cargar el historial de liquidaciones',
  )
  return data.historial ?? []
}

export async function obtenerDesprendibleNomina({
  liquidacionId,
  colaboradorUid,
}) {
  let response
  try {
    response = await fetch(
      `${API_BASE_URL}/api/nominas/liquidaciones/${encodeURIComponent(liquidacionId)}/desprendibles/${encodeURIComponent(colaboradorUid)}`,
      {
        method: 'GET',
        headers: authHeaders(),
      },
    )
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await parseJsonResponse(
    response,
    'No se pudo cargar el desprendible de nómina',
  )
  return data.desprendible
}
