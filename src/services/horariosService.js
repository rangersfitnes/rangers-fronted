import { API_BASE_URL } from '../variables/api.jsx'
import { getAdminToken } from './authService.js'

export const SEDE_HORARIOS = 'alta-suiza'

export const SEDES = [{ id: 'alta-suiza', nombre: 'Alta Suiza' }]

export const DIAS_SEMANA = [
  { key: 'lunes', label: 'Lunes' },
  { key: 'martes', label: 'Martes' },
  { key: 'miercoles', label: 'Miércoles' },
  { key: 'jueves', label: 'Jueves' },
  { key: 'viernes', label: 'Viernes' },
  { key: 'sabado', label: 'Sábado' },
  { key: 'domingo', label: 'Domingo' },
]

export async function obtenerHorariosPublicos(sede = SEDE_HORARIOS, { signal } = {}) {
  const sedeId = encodeURIComponent(sede)
  let response

  try {
    response = await fetch(
      `${API_BASE_URL}/api/horarios?sede=${sedeId}`,
      { method: 'GET', signal },
    )
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new Error(
      'No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.',
    )
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'No se pudieron obtener los horarios')
  }

  return {
    sede: data.sede,
    horarios: data.horarios || {},
    anotacion: data.anotacion || '',
    items: data.items || [],
  }
}

export async function obtenerHorariosAdmin(sede = SEDE_HORARIOS, { signal } = {}) {
  const token = getAdminToken()
  if (!token) {
    throw new Error('No hay sesión activa de administrador')
  }

  let response

  try {
    response = await fetch(
      `${API_BASE_URL}/api/sedes/${encodeURIComponent(sede)}/horarios`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        signal,
      },
    )
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new Error(
      'No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.',
    )
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'No se pudieron obtener los horarios')
  }

  return {
    sede: data.sede,
    horarios: data.horarios || {},
    anotacion: data.anotacion || '',
    items: data.items || [],
  }
}

export async function guardarHorariosAdmin(sede, horarios, anotacion = '') {
  const token = getAdminToken()
  if (!token) {
    throw new Error('No hay sesión activa de administrador')
  }

  let response

  try {
    response = await fetch(
      `${API_BASE_URL}/api/sedes/${encodeURIComponent(sede)}/horarios`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ horarios, anotacion }),
      },
    )
  } catch {
    throw new Error(
      'No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.',
    )
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'No se pudieron guardar los horarios')
  }

  return {
    sede: data.sede,
    horarios: data.horarios || {},
    anotacion: data.anotacion || '',
    items: data.items || [],
  }
}
