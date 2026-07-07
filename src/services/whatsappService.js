import { API_BASE_URL } from '../variables/api.jsx'
import { requerirAdminToken } from './authService.js'

export const WHATSAPP_SESSION_CLOSED_CODE = 'WHATSAPP_SESSION_CLOSED'

export const MENSAJE_WHATSAPP_SIN_SESION =
  'Error, la sesión de WhatsApp está cerrada en el servidor. Inicia sesión nuevamente'

export async function obtenerEstadoWhatsApp({ signal } = {}) {
  const token = await requerirAdminToken()

  let response

  try {
    response = await fetch(`${API_BASE_URL}/api/whatsapp/estado`, {
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
    throw new Error(data.error || 'No se pudo obtener el estado de WhatsApp')
  }

  return {
    conectado: Boolean(data.conectado),
    haySesionGuardada: Boolean(data.haySesionGuardada),
    qrImagen: data.qrImagen || null,
  }
}

export async function enviarMensajeWhatsApp({ telefono, mensaje }) {
  const token = await requerirAdminToken()

  let response

  try {
    response = await fetch(`${API_BASE_URL}/api/whatsapp/enviar-mensaje`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        telefono: telefono.trim(),
        mensaje: mensaje.trim(),
      }),
    })
  } catch {
    throw new Error(
      'No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.',
    )
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    if (data.code === WHATSAPP_SESSION_CLOSED_CODE) {
      const err = new Error(MENSAJE_WHATSAPP_SIN_SESION)
      err.code = WHATSAPP_SESSION_CLOSED_CODE
      throw err
    }

    throw new Error(data.error || 'No se pudo enviar el mensaje')
  }

  return data
}

async function whatsappFetch(path, { method = 'GET', body, signal } = {}) {
  const token = await requerirAdminToken()

  let response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
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
    if (data.code === WHATSAPP_SESSION_CLOSED_CODE) {
      const err = new Error(MENSAJE_WHATSAPP_SIN_SESION)
      err.code = WHATSAPP_SESSION_CLOSED_CODE
      throw err
    }

    throw new Error(data.error || 'La solicitud de WhatsApp falló')
  }

  return data
}

export async function previewDestinatariosWhatsApp({ filtros, signal } = {}) {
  const data = await whatsappFetch('/api/whatsapp/preview-destinatarios', {
    method: 'POST',
    body: { filtros },
    signal,
  })

  return {
    total: data.total ?? 0,
    muestra: data.muestra ?? [],
    filtros: data.filtros ?? filtros,
  }
}

export async function previewPlantillaWhatsApp({
  plantillaId,
  filtros,
  signal,
} = {}) {
  const data = await whatsappFetch('/api/whatsapp/preview-plantilla', {
    method: 'POST',
    body: { plantillaId, filtros },
    signal,
  })

  return {
    total: data.total ?? 0,
    plantilla: data.plantilla,
    ejemploUsuario: data.ejemploUsuario,
    mensajeEjemplo: data.mensajeEjemplo ?? '',
  }
}

export async function iniciarEnvioMasivoWhatsApp({ plantillaId, filtros } = {}) {
  const data = await whatsappFetch('/api/whatsapp/enviar-masivo', {
    method: 'POST',
    body: { plantillaId, filtros },
  })

  return {
    jobId: data.jobId,
    total: data.total,
    plantilla: data.plantilla,
    intervaloSegundos: data.intervaloSegundos ?? 3,
  }
}

export async function obtenerEstadoEnvioMasivoWhatsApp(jobId, { signal } = {}) {
  const data = await whatsappFetch(
    `/api/whatsapp/envio-masivo/${encodeURIComponent(jobId)}`,
    { signal },
  )

  return data.job
}
