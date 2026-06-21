import { API_BASE_URL } from '../variables/api.jsx'
import { getAdminToken } from './authService.js'

async function parseJsonResponse(response, fallbackError) {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || fallbackError)
  }
  return data
}

function errorRutaMallasNoDisponible(response) {
  if (response.status !== 404) return null
  return new Error(
    'Las rutas de mallas no están disponibles. Reinicia el backend (Ctrl+C y npm start en rangers-backend).',
  )
}

export async function obtenerMallasSemana({ sede, semanaInicio, signal } = {}) {
  const token = getAdminToken()
  if (!token) throw new Error('No hay sesión activa de administrador')

  const params = new URLSearchParams({
    sede: sede || '',
    semanaInicio: semanaInicio || '',
  })

  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/nominas/mallas?${params}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new Error('No se pudo conectar con el servidor')
  }

  const rutaError = errorRutaMallasNoDisponible(response)
  if (rutaError) throw rutaError

  const data = await parseJsonResponse(response, 'No se pudieron cargar las mallas')
  return {
    sede: data.sede,
    semanaInicio: data.semanaInicio,
    mallas: data.mallas ?? [],
  }
}

export async function guardarMallasSemana({ sede, semanaInicio, items }) {
  const token = getAdminToken()
  if (!token) throw new Error('No hay sesión activa de administrador')

  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/nominas/mallas`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sede, semanaInicio, items }),
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await parseJsonResponse(response, 'No se pudieron guardar las mallas')
  return {
    sede: data.sede,
    semanaInicio: data.semanaInicio,
    mallas: data.mallas ?? [],
  }
}

export async function obtenerPlantillasSede({ sede, signal } = {}) {
  const token = getAdminToken()
  if (!token) throw new Error('No hay sesión activa de administrador')

  const params = new URLSearchParams({ sede: sede || '' })

  let response
  try {
    response = await fetch(
      `${API_BASE_URL}/api/nominas/mallas/plantillas?${params}`,
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
        signal,
      },
    )
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new Error('No se pudo conectar con el servidor')
  }

  const rutaError = errorRutaMallasNoDisponible(response)
  if (rutaError) throw rutaError

  const data = await parseJsonResponse(
    response,
    'No se pudieron cargar las plantillas',
  )
  return {
    sede: data.sede,
    plantillas: data.plantillas ?? [],
  }
}

export async function guardarPlantillasSede({ sede, items }) {
  const token = getAdminToken()
  if (!token) throw new Error('No hay sesión activa de administrador')

  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/nominas/mallas/plantillas`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sede, items }),
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await parseJsonResponse(
    response,
    'No se pudieron guardar las plantillas',
  )
  return {
    sede: data.sede,
    plantillas: data.plantillas ?? [],
  }
}

export async function aplicarPlantillasSemana({
  sede,
  semanaInicio,
  sobrescribir = false,
}) {
  const token = getAdminToken()
  if (!token) throw new Error('No hay sesión activa de administrador')

  let response
  try {
    response = await fetch(
      `${API_BASE_URL}/api/nominas/mallas/aplicar-plantillas`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sede, semanaInicio, sobrescribir }),
      },
    )
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await parseJsonResponse(
    response,
    'No se pudieron aplicar las plantillas',
  )
  return {
    sede: data.sede,
    semanaInicio: data.semanaInicio,
    mallas: data.mallas ?? [],
    aplicadas: data.aplicadas ?? 0,
  }
}

export async function copiarSemanaAnteriorMallas({ sede, semanaInicio }) {
  const token = getAdminToken()
  if (!token) throw new Error('No hay sesión activa de administrador')

  let response
  try {
    response = await fetch(
      `${API_BASE_URL}/api/nominas/mallas/copiar-semana-anterior`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sede, semanaInicio }),
      },
    )
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await parseJsonResponse(
    response,
    'No se pudo copiar la semana anterior',
  )
  return {
    sede: data.sede,
    semanaInicio: data.semanaInicio,
    mallas: data.mallas ?? [],
  }
}
