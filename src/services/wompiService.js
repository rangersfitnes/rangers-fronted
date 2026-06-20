import { API_BASE_URL } from '../variables/api.jsx'
import { getUserToken } from './userService.js'

const WIDGET_SRC = 'https://checkout.wompi.co/widget.js'

let widgetPromise = null

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

export async function crearTransaccionWompi({ planId, beneficiarios = [], sede }) {
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
      body: JSON.stringify({ planId, beneficiarios, sede }),
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
