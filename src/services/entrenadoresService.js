import { API_BASE_URL } from '../variables/api.jsx'

export async function registrarEntrenador(datos) {
  let response

  try {
    response = await fetch(`${API_BASE_URL}/api/entrenadores/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datos),
    })
  } catch {
    throw new Error(
      'No se pudo conectar con el servidor. Inténtalo más tarde.',
    )
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'No se pudo registrar el entrenador')
  }

  return data
}
