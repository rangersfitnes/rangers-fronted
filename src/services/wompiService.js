import { API_BASE_URL } from '../variables/api.jsx'
import { getUserToken } from './userService.js'

const WIDGET_SRC = 'https://checkout.wompi.co/widget.js'

let widgetPromise = null
let configPublicaCache = null

export function cargarWidgetWompi() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Widget no disponible'))
  }

  if (window.WidgetCheckout) return Promise.resolve()

  if (widgetPromise) return widgetPromise

  widgetPromise = new Promise((resolve, reject) => {
    const existente = document.querySelector(`script[src="${WIDGET_SRC}"]`)
    if (existente) {
      existente.addEventListener('load', () => resolve())
      existente.addEventListener('error', () =>
        reject(new Error('No se pudo cargar el widget de Wompi')),
      )
      return
    }

    const script = document.createElement('script')
    script.src = WIDGET_SRC
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => {
      widgetPromise = null
      reject(new Error('No se pudo cargar el widget de Wompi'))
    }
    document.head.appendChild(script)
  })

  return widgetPromise
}

export async function obtenerConfigWompiPublica() {
  if (configPublicaCache) return configPublicaCache

  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/wompi/config-publico`)
  } catch {
    throw new Error('No se pudo conectar con el servidor. Inténtalo más tarde.')
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'No se pudo cargar la configuración de pago')
  }

  configPublicaCache = data
  return data
}

/**
 * Tokeniza la tarjeta en Wompi (PCI: los datos no pasan por nuestro backend).
 */
export async function tokenizarTarjetaWompi({
  number,
  cvc,
  expMonth,
  expYear,
  cardHolder,
}) {
  const config = await obtenerConfigWompiPublica()
  if (!config.publicKey || !config.apiUrl) {
    throw new Error('Configuración de Wompi incompleta')
  }

  const response = await fetch(`${config.apiUrl}/tokens/cards`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.publicKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      number: String(number || '').replace(/\s+/g, ''),
      cvc: String(cvc || '').trim(),
      exp_month: String(expMonth || '').padStart(2, '0'),
      exp_year: String(expYear || '').slice(-2),
      card_holder: String(cardHolder || '').trim(),
    }),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const motivo =
      payload?.error?.reason ||
      payload?.error?.messages?.[0] ||
      payload?.error?.message ||
      'No se pudo tokenizar la tarjeta'
    throw new Error(String(motivo))
  }

  const token = payload?.data?.id
  if (!token) {
    throw new Error('Wompi no devolvió un token de tarjeta')
  }

  return { token, publicData: payload?.data || {} }
}

export async function crearTransaccionWompi({
  planId,
  beneficiarios = [],
  sede,
  codigoCupon,
}) {
  const token = getUserToken()
  if (!token) {
    throw new Error('No hay sesión activa')
  }

  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/wompi/crear-transaccion`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ planId, beneficiarios, sede, codigoCupon }),
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor. Inténtalo más tarde.')
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'No se pudo iniciar el pago')
  }

  return data
}

export async function crearTransaccionDebitoWompi({
  planId,
  beneficiarios = [],
  sede,
  codigoCupon,
  cardToken,
  customerEmail,
  cuotas = 1,
}) {
  const token = getUserToken()
  if (!token) {
    throw new Error('No hay sesión activa')
  }

  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/wompi/crear-transaccion-debito`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        planId,
        beneficiarios,
        sede,
        codigoCupon,
        cardToken,
        customerEmail,
        cuotas,
      }),
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor. Inténtalo más tarde.')
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'No se pudo procesar el pago con débito automático')
  }

  return data
}

export async function obtenerDebitoAutomatico() {
  const token = getUserToken()
  if (!token) throw new Error('No hay sesión activa')

  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/wompi/debito-automatico`, {
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'No se pudo consultar el débito automático')
  }
  return data.debitoAutomatico
}

export async function cancelarDebitoAutomatico() {
  const token = getUserToken()
  if (!token) throw new Error('No hay sesión activa')

  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/wompi/debito-automatico`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'No se pudo cancelar el débito automático')
  }
  return data.debitoAutomatico
}
