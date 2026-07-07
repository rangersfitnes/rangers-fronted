import { API_BASE_URL } from '../variables/api.jsx'
import { requerirAdminToken } from './authService.js'

async function parseJsonResponse(response, fallbackError) {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || fallbackError)
  }
  return data
}

export async function obtenerColaboradores({ signal } = {}) {
  const token = await requerirAdminToken()

  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/nominas/colaboradores`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await parseJsonResponse(
    response,
    'No se pudieron cargar los colaboradores',
  )
  return data.colaboradores ?? []
}

export async function crearColaborador({
  nombre,
  identificacion,
  correo,
  fechaNacimiento,
  esquemaPago,
  sede,
  cronometrajeActivo,
  metodoPago,
  numeroCuenta,
}) {
  const token = await requerirAdminToken()

  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/nominas/colaboradores`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nombre,
        identificacion,
        correo,
        fechaNacimiento,
        esquemaPago,
        sede,
        cronometrajeActivo,
        metodoPago,
        numeroCuenta,
      }),
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await parseJsonResponse(
    response,
    'No se pudo crear el colaborador',
  )
  return data.colaborador
}

export async function actualizarColaborador({
  uid,
  nombre,
  identificacion,
  correo,
  fechaNacimiento,
  esquemaPago,
  sede,
  cronometrajeActivo,
  metodoPago,
  numeroCuenta,
}) {
  const token = await requerirAdminToken()

  let response
  try {
    response = await fetch(
      `${API_BASE_URL}/api/nominas/colaboradores/${encodeURIComponent(uid)}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre,
          identificacion,
          correo,
          fechaNacimiento,
          esquemaPago,
          sede,
          cronometrajeActivo,
          metodoPago,
          numeroCuenta,
        }),
      },
    )
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await parseJsonResponse(
    response,
    'No se pudo actualizar el colaborador',
  )
  return data.colaborador
}

export async function eliminarColaborador({ uid } = {}) {
  const token = await requerirAdminToken()

  let response
  try {
    response = await fetch(
      `${API_BASE_URL}/api/nominas/colaboradores/${encodeURIComponent(uid)}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      },
    )
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await parseJsonResponse(
    response,
    'No se pudo eliminar el colaborador',
  )
  return data.colaborador
}

export async function reestablecerDatosLaboralesColaborador({ uid } = {}) {
  const token = await requerirAdminToken()

  let response
  try {
    response = await fetch(
      `${API_BASE_URL}/api/nominas/colaboradores/${encodeURIComponent(uid)}/reestablecer-datos-laborales`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      },
    )
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }

  return parseJsonResponse(
    response,
    'No se pudieron reestablecer los datos del colaborador',
  )
}
