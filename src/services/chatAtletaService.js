import { API_BASE_URL } from '../variables/api.jsx'
import { getUserToken } from './userService.js'

export async function obtenerHistorialChatAtleta({
  signal,
  limite = 60,
} = {}) {
  const token = getUserToken()
  if (!token) throw new Error('No hay sesión activa')

  const params = new URLSearchParams()
  if (limite) params.set('limite', String(limite))

  let response
  try {
    response = await fetch(
      `${API_BASE_URL}/api/chat/historial?${params.toString()}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        signal,
      },
    )
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new Error('No se pudo conectar con el asistente')
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'No se pudo cargar el historial del chat')
  }

  return Array.isArray(data.mensajes) ? data.mensajes : []
}

export async function enviarMensajeChatAtleta({ mensaje, signal } = {}) {
  const token = getUserToken()
  if (!token) throw new Error('No hay sesión activa')

  const texto = String(mensaje || '').trim()
  if (!texto) throw new Error('Escribe un mensaje')

  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/chat/mensaje`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mensaje: texto,
      }),
      signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new Error('No se pudo conectar con el asistente')
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'No se pudo obtener respuesta del asistente')
  }

  return {
    respuesta: String(data.respuesta || '').trim(),
    mensajesGuardados: Array.isArray(data.mensajesGuardados)
      ? data.mensajesGuardados
      : [],
    resumenContexto: data.resumenContexto || null,
  }
}
