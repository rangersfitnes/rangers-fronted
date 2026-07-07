import { API_BASE_URL } from '../variables/api.jsx'
import { requerirAdminToken } from './authService.js'
import { getUserToken } from './userService.js'
import { SEDE_HORARIOS } from './horariosService.js'

export async function obtenerMisAsistencias({ signal } = {}) {
  const token = getUserToken()
  if (!token) throw new Error('No hay sesión activa')

  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/asistencias/mias`, {
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
    throw new Error(data.error || 'No se pudieron cargar las asistencias')
  }

  return data.asistencias ?? []
}

export async function registrarAsistencia({ cedula, sede = SEDE_HORARIOS }) {
  const token = await requerirAdminToken()

  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/asistencias`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cedula, sede }),
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const err = new Error(data.error || 'No se pudo validar el acceso')
    err.codigo = data.codigo ?? null
    err.accesoDenegado = data.accesoDenegado ?? null
    throw err
  }
  return data
}

export async function obtenerAsistenciasAdmin({
  sede,
  fechaDesde,
  fechaHasta,
  limite,
  signal,
} = {}) {
  const token = await requerirAdminToken()

  const params = new URLSearchParams()
  if (sede) params.set('sede', sede)
  if (fechaDesde) params.set('fechaDesde', fechaDesde)
  if (fechaHasta) params.set('fechaHasta', fechaHasta)
  if (limite) params.set('limite', String(limite))

  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/asistencias/admin?${params}`, {
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
    throw new Error(data.error || 'No se pudieron cargar las asistencias')
  }

  return data.asistencias ?? []
}

export async function eliminarAsistenciaAdmin({ sedeId, asistenciaId, origen = 'asistencia' }) {
  const token = await requerirAdminToken()

  const params = new URLSearchParams()
  if (origen) params.set('origen', origen)

  let response
  try {
    const query = params.toString()
    response = await fetch(
      `${API_BASE_URL}/api/asistencias/${encodeURIComponent(sedeId)}/${encodeURIComponent(asistenciaId)}${query ? `?${query}` : ''}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      },
    )
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'No se pudo eliminar el registro')
  }

  return data
}
