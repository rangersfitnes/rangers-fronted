/**
 * Detecta deploys nuevos y recarga la app para evitar JS/CSS cacheados.
 * Compara __APP_BUILD_ID__ (inyectado en el build) con /version.json del servidor.
 */

const STORAGE_RELOAD = 'rb_app_reload_build'
const CHECK_INTERVAL_MS = 60_000

function buildIdLocal() {
  try {
    return String(__APP_BUILD_ID__ || '')
  } catch {
    return ''
  }
}

async function leerVersionRemota() {
  const url = `/version.json?t=${Date.now()}`
  const response = await fetch(url, {
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
    },
  })
  if (!response.ok) return null
  const data = await response.json().catch(() => null)
  const remoto = String(data?.buildId || '').trim()
  return remoto || null
}

async function limpiarCachesNavegador() {
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations()
      await Promise.all(regs.map((reg) => reg.unregister()))
    }
  } catch {
    /* ignore */
  }
  try {
    if (typeof caches !== 'undefined') {
      const keys = await caches.keys()
      await Promise.all(keys.map((key) => caches.delete(key)))
    }
  } catch {
    /* ignore */
  }
}

async function recargarPorNuevaVersion(buildRemoto) {
  const yaRecargo = sessionStorage.getItem(STORAGE_RELOAD)
  if (yaRecargo === buildRemoto) return

  sessionStorage.setItem(STORAGE_RELOAD, buildRemoto)
  await limpiarCachesNavegador()

  const url = new URL(window.location.href)
  url.searchParams.set('_rbv', buildRemoto)
  window.location.replace(url.toString())
}

export async function verificarActualizacionApp() {
  const local = buildIdLocal()
  if (!local || local === 'dev') return false

  try {
    const remoto = await leerVersionRemota()
    if (!remoto || remoto === local) {
      // Versión al día: limpia marca de reload previo
      if (sessionStorage.getItem(STORAGE_RELOAD) === local) {
        sessionStorage.removeItem(STORAGE_RELOAD)
      }
      // Quita query de busteo si ya estamos en la versión correcta
      if (window.location.search.includes('_rbv=')) {
        const url = new URL(window.location.href)
        url.searchParams.delete('_rbv')
        window.history.replaceState({}, '', url.toString())
      }
      return false
    }

    await recargarPorNuevaVersion(remoto)
    return true
  } catch (error) {
    console.warn('[app-update] No se pudo verificar versión:', error.message)
    return false
  }
}

/**
 * Arranca chequeo al entrar, al volver a la pestaña y en intervalos.
 */
export function iniciarRefreshAutomaticoActualizaciones() {
  if (typeof window === 'undefined') return () => {}

  let timer = null
  let checking = false

  const run = async () => {
    if (checking) return
    if (document.visibilityState === 'hidden') return
    checking = true
    try {
      await verificarActualizacionApp()
    } finally {
      checking = false
    }
  }

  // Primera verificación al montar la app
  run()

  const onVisible = () => {
    if (document.visibilityState === 'visible') run()
  }

  const onPageShow = (event) => {
    // bfcache / volver atrás
    if (event.persisted) run()
  }

  const onFocus = () => run()

  document.addEventListener('visibilitychange', onVisible)
  window.addEventListener('pageshow', onPageShow)
  window.addEventListener('focus', onFocus)

  timer = window.setInterval(run, CHECK_INTERVAL_MS)

  return () => {
    document.removeEventListener('visibilitychange', onVisible)
    window.removeEventListener('pageshow', onPageShow)
    window.removeEventListener('focus', onFocus)
    if (timer) window.clearInterval(timer)
  }
}
