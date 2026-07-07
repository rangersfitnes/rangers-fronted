import { onIdTokenChanged } from 'firebase/auth'
import { auth } from '../variables/firebase.jsx'
import {
  esAdminTokenPersistente,
  getAdminToken,
  obtenerAdminToken,
  saveAdminToken,
} from '../services/authService.js'
import {
  esUserTokenPersistente,
  getUserToken,
  saveUserToken,
} from '../services/userService.js'
import { resolverPersistenciaSesion } from './recordarSesion.js'

const MARGEN_RENOVACION_MS = 5 * 60 * 1000

let detenerSincronizacion = null
let timeoutRenovacion = null

function obtenerExpiracionToken(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null
  } catch {
    return null
  }
}

function limpiarTimeoutRenovacion() {
  if (timeoutRenovacion !== null) {
    window.clearTimeout(timeoutRenovacion)
    timeoutRenovacion = null
  }
}

function guardarTokenActivo(idToken) {
  if (getAdminToken()) {
    saveAdminToken(idToken, {
      persistente: resolverPersistenciaSesion(
        'admin',
        esAdminTokenPersistente(),
      ),
    })
    return
  }

  if (getUserToken()) {
    saveUserToken(idToken, {
      persistente: resolverPersistenciaSesion('user', esUserTokenPersistente()),
    })
  }
}

async function renovarToken(user) {
  if (!user) return null

  try {
    const idToken = await user.getIdToken(true)
    if (getAdminToken() || getUserToken()) {
      if (getAdminToken()) {
        await obtenerAdminToken()
      } else {
        guardarTokenActivo(idToken)
      }
    }
    programarRenovacion(user, idToken)
    return idToken
  } catch (err) {
    console.warn('[auth] No se pudo renovar el token de Firebase:', err.message)
    return null
  }
}

function programarRenovacion(user, idToken) {
  limpiarTimeoutRenovacion()

  const expiraEn = obtenerExpiracionToken(idToken)
  if (!expiraEn) return

  const renovarEn = Math.max(expiraEn - MARGEN_RENOVACION_MS - Date.now(), 0)

  timeoutRenovacion = window.setTimeout(() => {
    void renovarToken(user)
  }, renovarEn)
}

async function sincronizarToken(user) {
  limpiarTimeoutRenovacion()

  if (!user) return

  try {
    if (getAdminToken()) {
      const idToken = await obtenerAdminToken()
      if (idToken) {
        programarRenovacion(user, idToken)
      }
      return
    }

    const idToken = await user.getIdToken()
    if (getUserToken()) {
      guardarTokenActivo(idToken)
    }
    programarRenovacion(user, idToken)
  } catch (err) {
    console.warn('[auth] No se pudo sincronizar el token de Firebase:', err.message)
  }
}

export function iniciarRenovacionAutomaticaToken() {
  if (detenerSincronizacion) return detenerSincronizacion

  const unsubscribe = onIdTokenChanged(auth, (user) => {
    void sincronizarToken(user)
  })

  detenerSincronizacion = () => {
    unsubscribe()
    limpiarTimeoutRenovacion()
    detenerSincronizacion = null
  }

  return detenerSincronizacion
}
