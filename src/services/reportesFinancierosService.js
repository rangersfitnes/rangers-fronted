import { API_BASE_URL } from '../variables/api.jsx'
import { getAdminToken } from './authService.js'
import { SEDE_HORARIOS } from './horariosService.js'

export async function obtenerReporteFinanciero({
  desde,
  hasta,
  todoHistorial = false,
  sede = SEDE_HORARIOS,
  signal,
} = {}) {
  const token = getAdminToken()
  if (!token) throw new Error('No hay sesión activa de administrador')

  const params = new URLSearchParams({ sede })
  if (todoHistorial) {
    params.set('todo', 'true')
  } else {
    params.set('desde', desde)
    params.set('hasta', hasta)
  }

  let response
  try {
    response = await fetch(
      `${API_BASE_URL}/api/reportes/financieros?${params.toString()}`,
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
    throw new Error(data.error || 'No se pudo cargar el reporte financiero')
  }
  return data.reporte
}

export async function obtenerLiquidezHistorica({ sede = SEDE_HORARIOS, signal } = {}) {
  const token = getAdminToken()
  if (!token) throw new Error('No hay sesión activa de administrador')

  const params = new URLSearchParams({ sede })

  let response
  try {
    response = await fetch(
      `${API_BASE_URL}/api/reportes/liquidez-historica?${params.toString()}`,
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
    throw new Error(data.error || 'No se pudo cargar la liquidez histórica')
  }
  return data.liquidez
}
