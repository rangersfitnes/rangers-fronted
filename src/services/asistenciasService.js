import { API_BASE_URL } from '../variables/api.jsx'
import { getAdminToken } from './authService.js'
import { SEDE_HORARIOS } from './horariosService.js'

export async function registrarAsistencia({ cedula, sede = SEDE_HORARIOS }) {
  const token = getAdminToken()
  if (!token) throw new Error('No hay sesión activa de administrador')

  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/asistencias`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cedula, sede }),
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const err = new Error(data.error || 'No se pudo validar el acceso')
    err.codigo = data.codigo ?? null
    err.accesoDenegado = data.accesoDenegado ?? null
    throw err
  }
  return data
}
