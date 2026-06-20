import { API_BASE_URL } from '../variables/api.jsx'
import { getAdminToken } from './authService.js'
import { SEDE_HORARIOS } from './horariosService.js'

export { SEDE_HORARIOS }

export async function obtenerClasesGrupalesAdmin(
  sede = SEDE_HORARIOS,
  { signal } = {},
) {
  const token = getAdminToken()
  if (!token) throw new Error('No hay sesión activa de administrador')

  let response
  try {
    response = await fetch(
      `${API_BASE_URL}/api/sedes/${encodeURIComponent(sede)}/clases-grupales`,
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
    throw new Error(data.error || 'No se pudo cargar el cronograma')
  }

  return {
    sede: data.sede,
    dias: data.dias || {},
    orden: data.orden || [],
  }
}

export async function guardarClasesGrupalesAdmin(sede, dias) {
  const token = getAdminToken()
  if (!token) throw new Error('No hay sesión activa de administrador')

  let response
  try {
    response = await fetch(
      `${API_BASE_URL}/api/sedes/${encodeURIComponent(sede)}/clases-grupales`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dias }),
      },
    )
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'No se pudo guardar el cronograma')
  }

  return {
    sede: data.sede,
    dias: data.dias || {},
    orden: data.orden || [],
  }
}
