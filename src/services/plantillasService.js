import { API_BASE_URL } from '../variables/api.jsx'
import { requerirAdminToken } from './authService.js'

export async function obtenerPlantillas({ signal } = {}) {
  const token = await requerirAdminToken()

  let response

  try {
    response = await fetch(`${API_BASE_URL}/api/plantillas`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new Error(
      'No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.',
    )
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'No se pudieron obtener las plantillas')
  }

  return data.lista || []
}

export async function crearPlantilla({ nombre, contenido }) {
  const token = await requerirAdminToken()

  let response

  try {
    response = await fetch(`${API_BASE_URL}/api/plantillas`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nombre: nombre.trim(),
        contenido: contenido.trim(),
      }),
    })
  } catch {
    throw new Error(
      'No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.',
    )
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'No se pudo guardar la plantilla')
  }

  return data.plantilla
}

export async function obtenerPlantillasAutomaticas({ signal } = {}) {
  const token = await requerirAdminToken()

  let response

  try {
    response = await fetch(`${API_BASE_URL}/api/plantillas/automaticas`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new Error(
      'No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.',
    )
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'No se pudieron obtener las plantillas automáticas')
  }

  return data.lista || []
}

export async function guardarPlantillaAutomatica({ id, contenido }) {
  const token = await requerirAdminToken()

  let response

  try {
    response = await fetch(
      `${API_BASE_URL}/api/plantillas/automaticas/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contenido: contenido.trim(),
        }),
      },
    )
  } catch {
    throw new Error(
      'No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.',
    )
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'No se pudo guardar la plantilla automática')
  }

  return data.plantilla
}
