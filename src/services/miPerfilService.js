import { API_BASE_URL } from '../variables/api.jsx'
import { getAdminToken } from './authService.js'

async function parseJsonResponse(response, fallbackError) {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || fallbackError)
  }
  return data
}

export async function obtenerMiPerfilLaboral({ signal } = {}) {
  const token = getAdminToken()
  if (!token) throw new Error('No hay sesión activa de administrador')

  const url = `${API_BASE_URL}/api/nominas/mi-perfil?_=${Date.now()}`

  let response
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
      },
      cache: 'no-store',
      signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await parseJsonResponse(response, 'No se pudo cargar tu perfil laboral')

  return {
    colaborador: data.colaborador ?? null,
    esquema: data.esquema ?? null,
    esquemaClave: data.esquemaClave ?? data.colaborador?.esquemaPago ?? '',
    turnos: data.turnos ?? [],
    resumen: data.resumen ?? null,
    desprendibles: data.desprendibles ?? [],
  }
}
