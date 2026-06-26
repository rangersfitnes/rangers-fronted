export const KIOSCO_ACCESO_PATH = '/admin/punto-fisico/kiosco'
const KIOSCO_WINDOW_NAME = 'rangers-kiosco-acceso'

async function obtenerPantallaExterna() {
  if (!('getScreenDetails' in window)) return null

  const screenDetails = await window.getScreenDetails()
  const actual = screenDetails.currentScreen

  return (
    screenDetails.screens.find(
      (pantalla) =>
        pantalla.left !== actual.left || pantalla.top !== actual.top,
    ) ??
    screenDetails.screens.find((pantalla) => pantalla !== actual) ??
    null
  )
}

/**
 * Abre la pantalla de control de acceso en una ventana independiente,
 * preferentemente en el monitor HDMI / secundario.
 */
export async function abrirKioscoAcceso() {
  const url = `${window.location.origin}${KIOSCO_ACCESO_PATH}`

  let left = window.screen.availLeft ?? 0
  let top = window.screen.availTop ?? 0
  let width = window.screen.availWidth
  let height = window.screen.availHeight

  try {
    const externa = await obtenerPantallaExterna()
    if (externa) {
      left = externa.availLeft ?? externa.left
      top = externa.availTop ?? externa.top
      width = externa.availWidth ?? externa.width
      height = externa.availHeight ?? externa.height
    }
  } catch {
    // Sin permiso o navegador sin Window Management API: ventana en pantalla actual.
  }

  const features = [
    `left=${left}`,
    `top=${top}`,
    `width=${width}`,
    `height=${height}`,
    'menubar=no',
    'toolbar=no',
    'location=no',
    'status=no',
    'scrollbars=no',
    'resizable=yes',
  ].join(',')

  const ventana = window.open(url, KIOSCO_WINDOW_NAME, features)

  if (!ventana) {
    return { ok: false, reason: 'blocked' }
  }

  ventana.focus()
  return { ok: true, ventana }
}
