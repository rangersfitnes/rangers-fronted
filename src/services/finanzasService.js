import { API_BASE_URL } from '../variables/api.jsx'
import { requerirAdminToken } from './authService.js'
import { SEDE_HORARIOS } from './horariosService.js'

export async function registrarSalida({
  fecha,
  concepto,
  monto,
  metodoPago,
  cuentaOrigen,
  sede = SEDE_HORARIOS,
}) {
  const token = await requerirAdminToken()

  let response
  try {
    response = await fetch(`${API_BASE_URL}/api/cierre-diario/salidas`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sede, fecha, concepto, monto, metodoPago, cuentaOrigen }),
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'No se pudo registrar la salida')
  }
  return data.salida
}
