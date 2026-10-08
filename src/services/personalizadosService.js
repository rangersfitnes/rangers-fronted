import { API_BASE_URL } from '../variables/api.jsx'
import { requerirAdminToken } from './authService.js'
import { getUserToken } from './userService.js'

async function parseJson(response) {
  return response.json().catch(() => ({}))
}

export async function buscarAtletasPersonalizados({ q, tipo, signal } = {}) {
  const token = await requerirAdminToken()
  const params = new URLSearchParams()
  if (q) params.set('q', String(q).trim())
  if (tipo) params.set('tipo', String(tipo))

  let response
  try {
    response = await fetch(
      `${API_BASE_URL}/api/entrenadores/personalizados/atletas/buscar?${params}`,
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

  const data = await parseJson(response)
  if (!response.ok) {
    throw new Error(data.error || 'No se pudo buscar atletas')
  }
  return data.atletas ?? []
}

export async function listarMisAtletasPersonalizados({ signal } = {}) {
  const token = await requerirAdminToken()
  let response
  try {
    response = await fetch(
      `${API_BASE_URL}/api/entrenadores/personalizados/atletas`,
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

  const data = await parseJson(response)
  if (!response.ok) {
    throw new Error(data.error || 'No se pudieron cargar los atletas')
  }
  return data.atletas ?? []
}

export async function enviarSolicitudPersonalizado(atletaUid) {
  const token = await requerirAdminToken()
  let response
  try {
    response = await fetch(
      `${API_BASE_URL}/api/entrenadores/personalizados/solicitudes`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ atletaUid }),
      },
    )
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await parseJson(response)
  if (!response.ok) {
    throw new Error(data.error || 'No se pudo enviar la solicitud')
  }
  return data
}

export async function responderSolicitudEntrenador(solicitudId, decision) {
  const token = getUserToken()
  if (!token) throw new Error('No hay sesión activa')
  const id = String(solicitudId || '').trim()
  if (!id) throw new Error('La solicitud es obligatoria')

  let response
  try {
    response = await fetch(
      `${API_BASE_URL}/api/entrenadores/personalizados/solicitudes/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ decision }),
      },
    )
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await parseJson(response)
  if (!response.ok) {
    throw new Error(data.error || 'No se pudo responder la solicitud')
  }
  return data
}
