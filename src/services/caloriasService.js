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
