import { API_BASE_URL } from '../variables/api.jsx'
import { requerirAdminToken } from './authService.js'
import { getUserToken } from './userService.js'

export async function obtenerComidasAdmin({
  signal,
  fechaDesde,
  fechaHasta,
  limite = 200,
  q,
} = {}) {
  const token = await requerirAdminToken()
  const params = new URLSearchParams()
  if (fechaDesde) params.set('fechaDesde', fechaDesde)
  if (fechaHasta) params.set('fechaHasta', fechaHasta)
  if (limite) params.set('limite', String(limite))
  if (q) params.set('q', q)

  let response
  try {
    response = await fetch(
      `${API_BASE_URL}/api/nutricion/comidas/admin?${params.toString()}`,
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

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'No se pudo cargar el registro de comidas IA')
  }

  return data.comidas ?? []
}

export async function eliminarComidaAdmin({ comidaId, uid }) {
  const token = await requerirAdminToken()
  const id = String(comidaId || '').trim()
  if (!id) throw new Error('El id de la comida es obligatorio')

  const params = new URLSearchParams()
  if (uid) params.set('uid', String(uid))

  let response
  try {
    response = await fetch(
      `${API_BASE_URL}/api/nutricion/comidas/admin/${encodeURIComponent(id)}?${params.toString()}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      },
    )
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'No se pudo eliminar el registro')
  }
  return data
}

export async function obtenerCupoAnalisisDiario({ signal } = {}) {
  const token = getUserToken()
  if (!token) throw new Error('No hay sesión activa')

  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/nutricion/cupo-diario`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
      signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'No se pudo consultar el cupo diario')
  }
  return data.cupo ?? null
}

export async function obtenerMisComidas({ signal, limite = 20 } = {}) {
  const token = getUserToken()
  if (!token) throw new Error('No hay sesión activa')

  const params = new URLSearchParams()
  if (limite) params.set('limite', String(limite))

  let response
  try {
    response = await fetch(
      `${API_BASE_URL}/api/nutricion/comidas?${params.toString()}`,
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

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'No se pudo cargar el historial de comidas')
  }

  return data.comidas ?? []
}

function normalizarArchivoFoto(file) {
  const tipo = String(file.type || '').toLowerCase()
  if (tipo.startsWith('image/')) return file

  const nombre = String(file.name || 'alimento.jpg')
  const conExtension = /\.(jpe?g|png|webp|gif|heic|heif|avif)$/i.test(nombre)
    ? nombre
    : `${nombre.replace(/\.[^.]+$/, '') || 'alimento'}.jpg`

  return new File([file], conExtension, {
    type: 'image/jpeg',
    lastModified: file.lastModified || Date.now(),
  })
}

export async function decidirComidaAnalizada(comidaId, decision) {
  const token = getUserToken()
  if (!token) throw new Error('No hay sesión activa')
  const id = String(comidaId || '').trim()
  if (!id) throw new Error('El id de la comida es obligatorio')
  if (decision !== 'consumido' && decision !== 'rechazado') {
    throw new Error('La decisión debe ser consumido o rechazado')
  }

  let response
  try {
    response = await fetch(
      `${API_BASE_URL}/api/nutricion/comidas/${encodeURIComponent(id)}/decision`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ decision }),
      },
    )
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'No se pudo guardar la decisión')
  }
  return data.comida
}

export async function enviarFeedbackInterpretacion(
  comidaId,
  { correcta, comentario, platoCorregido } = {},
) {
  const token = getUserToken()
  if (!token) throw new Error('No hay sesión activa')
  const id = String(comidaId || '').trim()
  if (!id) throw new Error('El id de la comida es obligatorio')

  let response
  try {
    response = await fetch(
      `${API_BASE_URL}/api/nutricion/comidas/${encodeURIComponent(id)}/feedback`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          correcta,
          comentario,
          platoCorregido,
        }),
      },
    )
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'No se pudo guardar la corrección')
  }
  return data.comida
}

export async function calcularCaloriasDesdeFoto(
  file,
  { signal, pesoKg, alturaCm, edad } = {},
) {
  const token = getUserToken()
  if (!token) throw new Error('No hay sesión activa')
  if (!file) throw new Error('Selecciona o toma una foto del alimento')

  const archivo = normalizarArchivoFoto(file)
  const formData = new FormData()
  formData.append('foto', archivo, archivo.name)

  if (pesoKg != null && Number(pesoKg) > 0) {
    formData.append('pesoKg', String(pesoKg))
  }
  if (alturaCm != null && Number(alturaCm) > 0) {
    formData.append('alturaCm', String(alturaCm))
  }
  if (edad != null && Number(edad) > 0) {
    formData.append('edad', String(edad))
  }

  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/nutricion/calcular-calorias`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
      signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'No se pudieron estimar las calorías')
  }

  return data
}
