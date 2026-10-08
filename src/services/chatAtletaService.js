import { API_BASE_URL } from '../variables/api.jsx'
import { getUserToken } from './userService.js'

export async function enviarMensajeChatAtleta({
  mensaje,
  historial = [],
  signal,
} = {}) {
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
        historial: Array.isArray(historial) ? historial : [],
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
    resumenContexto: data.resumenContexto || null,
  }
}
