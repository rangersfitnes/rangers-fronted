import { API_BASE_URL } from '../variables/api.jsx'
import { getUserToken } from './userService.js'

export function ordenarMensajesPorLlegada(mensajes = []) {
  return [...(Array.isArray(mensajes) ? mensajes : [])].sort((a, b) => {
    const ta = Number(a?.creadoEn) || 0
    const tb = Number(b?.creadoEn) || 0
    if (ta !== tb) return ta - tb

    const sa =
      a?.secuencia != null && Number.isFinite(Number(a.secuencia))
        ? Number(a.secuencia)
        : a?.role === 'user'
          ? 0
          : 1
    const sb =
      b?.secuencia != null && Number.isFinite(Number(b.secuencia))
        ? Number(b.secuencia)
        : b?.role === 'user'
          ? 0
          : 1
    if (sa !== sb) return sa - sb

    if (a?.role !== b?.role) return a?.role === 'user' ? -1 : 1
    return String(a?.id || '').localeCompare(String(b?.id || ''))
  })
}

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

  return ordenarMensajesPorLlegada(
    Array.isArray(data.mensajes) ? data.mensajes : [],
  )
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
    mensajesGuardados: ordenarMensajesPorLlegada(
      Array.isArray(data.mensajesGuardados) ? data.mensajesGuardados : [],
    ),
    resumenContexto: data.resumenContexto || null,
  }
}

/** Chat público (sin sesión): misma lógica del Ranger Bot. */
export async function enviarMensajeChatPublico({
  mensaje,
  historial = [],
  signal,
} = {}) {
  const texto = String(mensaje || '').trim()
  if (!texto) throw new Error('Escribe un mensaje')

  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/chat/publico/mensaje`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mensaje: texto,
        historial: (Array.isArray(historial) ? historial : [])
          .filter(
            (m) =>
              m &&
              (m.role === 'user' || m.role === 'assistant') &&
              String(m.content || '').trim(),
          )
          .slice(-18)
          .map((m) => ({
            role: m.role,
            content: String(m.content).trim().slice(0, 1200),
          })),
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
    nombreBot: data.nombreBot || null,
  }
}
