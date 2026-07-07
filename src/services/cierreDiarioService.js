import { API_BASE_URL } from '../variables/api.jsx'
import { requerirAdminToken } from './authService.js'
import { SEDE_HORARIOS } from './horariosService.js'

export async function obtenerCierreDiario({
  fecha,
  sede = SEDE_HORARIOS,
  signal,
} = {}) {
  const token = await requerirAdminToken()

  const params = new URLSearchParams({ sede })
  if (fecha) params.set('fecha', fecha)

  let response
  try {
    response = await fetch(
      `${API_BASE_URL}/api/cierre-diario?${params.toString()}`,
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
    throw new Error(data.error || 'No se pudo cargar el cierre diario')
  }
  return data.cierre
}

export async function obtenerMovimientosRango({
  desde,
  hasta,
  sede = SEDE_HORARIOS,
  signal,
} = {}) {
  const token = await requerirAdminToken()

  const params = new URLSearchParams({ sede, desde, hasta })

  let response
  try {
    response = await fetch(
      `${API_BASE_URL}/api/cierre-diario/movimientos?${params.toString()}`,
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
    throw new Error(data.error || 'No se pudo cargar el registro de movimientos')
  }
  return data.registro
}

export async function eliminarMovimiento({
  fuente,
  documentoId,
  titularUid,
  sede = SEDE_HORARIOS,
}) {
  const token = await requerirAdminToken()

  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/cierre-diario/movimientos`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sede, fuente, documentoId, titularUid }),
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'No se pudo eliminar el movimiento')
  }
  return data
}
