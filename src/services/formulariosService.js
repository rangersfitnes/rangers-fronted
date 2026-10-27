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

function appendFormularioFields(formData, payload) {
  formData.append('titulo', String(payload.titulo || '').trim())
  formData.append('descripcion', String(payload.descripcion || '').trim())
  formData.append(
    'mensajeAgradecimiento',
    String(payload.mensajeAgradecimiento || '').trim(),
  )
  formData.append('activo', payload.activo === false ? 'false' : 'true')
  formData.append('preguntas', JSON.stringify(payload.preguntas || []))
  if (payload.portada) {
    formData.append('portada', payload.portada)
  }
}

export async function obtenerFormularios({ signal } = {}) {
  const token = await requerirAdminToken()

  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/formularios`, {
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
    throw new Error(data.error || 'No se pudieron obtener los formularios')
  }
  return data.formularios || []
}

export async function obtenerFormulario(id, { signal } = {}) {
  const token = await requerirAdminToken()

  let response
  try {
    response = await fetch(
      `${API_BASE_URL}/api/formularios/${encodeURIComponent(id)}`,
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
    throw new Error(data.error || 'No se pudo obtener el formulario')
  }
  return data.formulario
}

export async function crearFormulario(payload) {
  const token = await requerirAdminToken()
  const formData = new FormData()
  appendFormularioFields(formData, payload)

  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/formularios`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    })
  } catch (err) {
    throw errorSubidaImagen(err)
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'No se pudo crear el formulario')
  }
  return data.formulario
}

export async function actualizarFormulario(id, payload) {
  const token = await requerirAdminToken()
  const formData = new FormData()
  appendFormularioFields(formData, payload)

  let response
  try {
    response = await fetch(
      `${API_BASE_URL}/api/formularios/${encodeURIComponent(id)}`,
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
    throw new Error(data.error || 'No se pudo actualizar el formulario')
  }
  return data.formulario
}

export async function eliminarFormulario(id) {
  const token = await requerirAdminToken()

  let response
  try {
    response = await fetch(
      `${API_BASE_URL}/api/formularios/${encodeURIComponent(id)}`,
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
    throw new Error(data.error || 'No se pudo eliminar el formulario')
  }
  return data
}

export async function obtenerRespuestasFormulario(id, { signal } = {}) {
  const token = await requerirAdminToken()

  let response
  try {
    response = await fetch(
      `${API_BASE_URL}/api/formularios/${encodeURIComponent(id)}/respuestas`,
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
    throw new Error(data.error || 'No se pudieron cargar las respuestas')
  }
  return data.respuestas || []
}

export async function obtenerFormularioPublico(id, { signal } = {}) {
  let response
  try {
    response = await fetch(
      `${API_BASE_URL}/api/formularios/publico/${encodeURIComponent(id)}`,
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
    throw new Error(data.error || 'No se pudo cargar el formulario')
  }
  return data.formulario
}

export async function enviarRespuestaFormularioPublico(id, respuestas) {
  let response
  try {
    response = await fetch(
      `${API_BASE_URL}/api/formularios/publico/${encodeURIComponent(id)}/responder`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ respuestas }),
      },
    )
  } catch {
    throw new Error(
      'No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.',
    )
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'No se pudo enviar el formulario')
  }
  return data
}

export function linkPublicoFormulario(id) {
  if (typeof window === 'undefined') return `/f/${id}`
  return `${window.location.origin}/f/${id}`
}
