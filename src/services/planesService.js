import { API_BASE_URL } from '../variables/api.jsx'
import { getAdminToken } from './authService.js'

const PLANES_CACHE_MS = 10_000

let planesCache = {
  data: null,
  timestamp: 0,
}

let planesPublicosCache = {
  data: null,
  timestamp: 0,
}

function invalidarCachePlanes() {
  planesCache = { data: null, timestamp: 0 }
  planesPublicosCache = { data: null, timestamp: 0 }
}

export async function obtenerPlanesPublicos({ force = false, signal } = {}) {
  const ahora = Date.now()

  if (
    !force &&
    planesPublicosCache.data &&
    ahora - planesPublicosCache.timestamp < PLANES_CACHE_MS
  ) {
    return planesPublicosCache.data
  }

  let response

  try {
    response = await fetch(`${API_BASE_URL}/api/planes/publicos`, {
      method: 'GET',
      signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new Error(
      'No se pudo conectar con el servidor. Inténtalo más tarde.',
    )
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'No se pudieron obtener los planes')
  }

  const planes = data.planes || []

  planesPublicosCache = {
    data: planes,
    timestamp: ahora,
  }

  return planes
}

export async function obtenerPlanes({ force = false, signal } = {}) {
  const ahora = Date.now()

  if (
    !force &&
    planesCache.data &&
    ahora - planesCache.timestamp < PLANES_CACHE_MS
  ) {
    return planesCache.data
  }

  const token = getAdminToken()

  if (!token) {
    throw new Error('No hay sesión activa de administrador')
  }

  let response

  try {
    response = await fetch(`${API_BASE_URL}/api/planes/obtener-planes`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
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
    throw new Error(data.error || 'No se pudieron obtener los planes')
  }

  const planes = data.planes || []

  planesCache = {
    data: planes,
    timestamp: ahora,
  }

  return planes
}

export async function crearPlan(plan) {
  const token = getAdminToken()

  if (!token) {
    throw new Error('No hay sesión activa de administrador')
  }

  let response

  try {
    response = await fetch(`${API_BASE_URL}/api/planes`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(plan),
    })
  } catch {
    throw new Error(
      'No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.',
    )
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'No se pudo crear el plan')
  }

  invalidarCachePlanes()
  return data
}

export async function actualizarPlan(id, cambios) {
  const token = getAdminToken()

  if (!token) {
    throw new Error('No hay sesión activa de administrador')
  }

  let response

  try {
    response = await fetch(`${API_BASE_URL}/api/planes/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cambios),
    })
  } catch {
    throw new Error(
      'No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.',
    )
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'No se pudo actualizar el plan')
  }

  invalidarCachePlanes()
  return data
}

export async function eliminarPlan(id) {
  const token = getAdminToken()

  if (!token) {
    throw new Error('No hay sesión activa de administrador')
  }

  let response

  try {
    response = await fetch(`${API_BASE_URL}/api/planes/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
  } catch {
    throw new Error(
      'No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.',
    )
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'No se pudo eliminar el plan')
  }

  invalidarCachePlanes()
  return data
}
