import { API_BASE_URL } from '../variables/api.jsx'
import { getAdminToken } from './authService.js'

export async function obtenerEstadisticasUsuarios({ signal } = {}) {
  const token = getAdminToken()

  if (!token) {
    throw new Error('No hay sesión activa de administrador')
  }

  let response

  try {
    response = await fetch(`${API_BASE_URL}/api/usuarios/estadisticas`, {
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
    throw new Error(data.error || 'No se pudieron obtener las estadísticas')
  }

  return data.estadisticas || {
    total: 0,
    activos: 0,
    vencidos: 0,
    sinPlan: 0,
  }
}

export async function obtenerUsuarios({
  page = 1,
  limit = 25,
  documento,
  nombre,
  celular,
  estadoPlan,
  signal,
} = {}) {
  const token = getAdminToken()

  if (!token) {
    throw new Error('No hay sesión activa de administrador')
  }

  const params = new URLSearchParams()
  const documentoLimpio = String(documento || '')
    .trim()
    .replace(/\s/g, '')
  const nombreLimpio = String(nombre || '').trim()
  const celularLimpio = String(celular || '').trim()

  if (documentoLimpio) {
    params.set('documento', documentoLimpio)
  } else if (nombreLimpio) {
    params.set('nombre', nombreLimpio)
  } else if (celularLimpio) {
    params.set('celular', celularLimpio)
  } else {
    params.set('page', String(page))
    params.set('limit', String(limit))
    const estadoLimpio = String(estadoPlan || '').trim().toLowerCase()
    if (['activo', 'vencido', 'sin_plan'].includes(estadoLimpio)) {
      params.set('estadoPlan', estadoLimpio)
    }
  }

  let response

  try {
    response = await fetch(`${API_BASE_URL}/api/usuarios?${params}`, {
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
    throw new Error(data.error || 'No se pudieron obtener los usuarios')
  }

  return {
    usuarios: data.usuarios || [],
    page: data.page || page,
    limit: data.limit || limit,
    hasMore: Boolean(data.hasMore),
    busqueda: data.busqueda || null,
    tipoBusqueda: data.tipoBusqueda || null,
    total: data.total ?? (data.usuarios || []).length,
    estadoPlan: data.estadoPlan ?? null,
  }
}

export async function obtenerReporteCompletoUsuarios({ signal } = {}) {
  const token = getAdminToken()

  if (!token) {
    throw new Error('No hay sesión activa de administrador')
  }

  let response

  try {
    response = await fetch(`${API_BASE_URL}/api/usuarios/reporte-completo`, {
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
    throw new Error(data.error || 'No se pudo generar el reporte de usuarios')
  }

  return {
    usuarios: data.usuarios || [],
    estadisticas: data.estadisticas || {
      total: 0,
      activos: 0,
      vencidos: 0,
      sinPlan: 0,
    },
    generadoEn: data.generadoEn ?? Date.now(),
  }
}

export async function actualizarUsuario(uid, datos) {
  const token = getAdminToken()

  if (!token) {
    throw new Error('No hay sesión activa de administrador')
  }

  let response

  try {
    response = await fetch(
      `${API_BASE_URL}/api/usuarios/${encodeURIComponent(uid)}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(datos),
      },
    )
  } catch {
    throw new Error(
      'No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.',
    )
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'No se pudo actualizar el usuario')
  }

  return data
}

export async function eliminarUsuario(uid) {
  const token = getAdminToken()

  if (!token) {
    throw new Error('No hay sesión activa de administrador')
  }

  let response

  try {
    response = await fetch(
      `${API_BASE_URL}/api/usuarios/${encodeURIComponent(uid)}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )
  } catch {
    throw new Error(
      'No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.',
    )
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'No se pudo eliminar el usuario')
  }

  return data
}

export async function eliminarPlanUsuario(uid) {
  const token = getAdminToken()

  if (!token) {
    throw new Error('No hay sesión activa de administrador')
  }

  let response

  try {
    response = await fetch(
      `${API_BASE_URL}/api/usuarios/${encodeURIComponent(uid)}/plan`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )
  } catch {
    throw new Error(
      'No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.',
    )
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'No se pudo eliminar el plan del usuario')
  }

  return data
}

export async function activarPlanUsuario(
  uid,
  planId,
  acompanantes = [],
  metodoPago,
) {
  const token = getAdminToken()

  if (!token) {
    throw new Error('No hay sesión activa de administrador')
  }

  let response

  try {
    response = await fetch(
      `${API_BASE_URL}/api/usuarios/${encodeURIComponent(uid)}/activar-plan`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planId, acompanantes, metodoPago }),
      },
    )
  } catch {
    throw new Error(
      'No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.',
    )
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'No se pudo activar el plan')
  }

  return data
}

export async function registrarUsuario(datos) {
  const token = getAdminToken()

  if (!token) {
    throw new Error('No hay sesión activa de administrador')
  }

  let response

  try {
    response = await fetch(`${API_BASE_URL}/api/usuarios/register-user`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(datos),
    })
  } catch {
    throw new Error(
      'No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.',
    )
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'No se pudo crear el usuario')
  }

  return data
}
