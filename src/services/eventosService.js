import { API_BASE_URL } from '../variables/api.jsx'
import { requerirAdminToken } from './authService.js'

function errorSubidaImagen(err) {
  if (err?.name === 'AbortError') throw err

  const mensaje = String(err?.message || '')

  if (
    err instanceof TypeError ||
    mensaje.includes('Failed to fetch') ||
    mensaje.includes('NetworkError') ||
    mensaje.includes('Load failed')
  ) {
    return new Error(
      'No se pudo completar la subida. Si cambiaste la imagen, prueba con un JPG o PNG más liviano (máx. 8 MB).',
    )
  }

  return err instanceof Error ? err : new Error(mensaje || 'Error de red')
}

export async function obtenerEventosPublicos({ signal } = {}) {
  let response

  try {
    response = await fetch(`${API_BASE_URL}/api/eventos`, {
      method: 'GET',
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
    throw new Error(data.error || 'No se pudieron obtener los eventos')
  }

  return data.eventos || []
}

export async function obtenerEventos({ signal } = {}) {
  const token = await requerirAdminToken()

  let response

  try {
    response = await fetch(`${API_BASE_URL}/api/eventos/obtener-eventos`, {
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
    throw new Error(data.error || 'No se pudieron obtener los eventos')
  }

  return data.eventos || []
}

export async function crearEvento({ nombre, descripcion, pos, accionUrl, imagen }) {
  const token = await requerirAdminToken()

  if (!imagen) {
    throw new Error('Selecciona una imagen para el banner')
  }

  const formData = new FormData()
  formData.append('nombre', nombre.trim())
  formData.append('descripcion', descripcion.trim())
  formData.append('pos', String(pos))
  formData.append('accion_url', accionUrl.trim())
  formData.append('imagen', imagen)

  let response

  try {
    response = await fetch(`${API_BASE_URL}/api/eventos`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })
  } catch (err) {
    throw errorSubidaImagen(err)
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'No se pudo crear el evento')
  }

  return data.evento
}

export async function actualizarEvento(
  id,
  { descripcion, pos, accionUrl, imagen },
) {
  const token = await requerirAdminToken()

  const formData = new FormData()
  formData.append('descripcion', descripcion.trim())
  formData.append('pos', String(pos))
  formData.append('accion_url', accionUrl.trim())
  if (imagen) formData.append('imagen', imagen)

  let response

  try {
    response = await fetch(
      `${API_BASE_URL}/api/eventos/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      },
    )
  } catch (err) {
    throw errorSubidaImagen(err)
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'No se pudo actualizar el evento')
  }

  return data.evento
}

export async function eliminarEvento(id) {
  const token = await requerirAdminToken()

  let response

  try {
    response = await fetch(
      `${API_BASE_URL}/api/eventos/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      },
    )
  } catch {
    throw new Error(
      'No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.',
    )
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'No se pudo eliminar el evento')
  }

  return data
}
