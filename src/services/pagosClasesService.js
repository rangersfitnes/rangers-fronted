import { API_BASE_URL } from '../variables/api.jsx'
import { requerirAdminToken } from './authService.js'
import { SEDE_HORARIOS } from './horariosService.js'

export async function registrarPagoClaseDia({
  cedula,
  metodoPago,
  valorPagado,
  nombre,
  sede = SEDE_HORARIOS,
}) {
  const token = await requerirAdminToken()

  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/pagos-clases`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cedula, metodoPago, valorPagado, nombre, sede }),
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const err = new Error(data.error || 'No se pudo registrar el pago')
    err.codigo = data.codigo ?? null
    throw err
  }
  return data.pago
}
