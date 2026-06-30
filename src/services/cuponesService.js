import { API_BASE_URL } from '../variables/api.jsx'
import { getAdminToken } from './authService.js'
import { getUserToken } from './userService.js'

async function parseJsonResponse(response, fallbackError) {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || fallbackError)
  }
  return data
}

export async function obtenerCupones({ signal } = {}) {
  const token = getAdminToken()
  if (!token) throw new Error('No hay sesión activa de administrador')

  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/planes/cupones`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await parseJsonResponse(response, 'No se pudieron cargar los cupones')
  return data.cupones ?? []
}

export async function crearCupon(cupon) {
  const token = getAdminToken()
  if (!token) throw new Error('No hay sesión activa de administrador')

  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/planes/cupones`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cupon),
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await parseJsonResponse(response, 'No se pudo crear el cupón')
  return data.cupon
}

export async function validarCuponParaPlan({
  codigo,
  planId,
  precioOriginal,
  signal,
} = {}) {
  const token = getUserToken()
  if (!token) throw new Error('No hay sesión activa')

  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/planes/cupones/validar`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ codigo, planId, precioOriginal }),
      signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new Error('No se pudo conectar con el servidor')
  }

  return parseJsonResponse(response, 'No se pudo validar el cupón')
}
