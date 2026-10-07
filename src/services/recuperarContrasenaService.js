import { API_BASE_URL } from '../variables/api.jsx'

async function postJson(path, body) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'No se pudo completar la solicitud')
  }
  return data
}

export async function solicitarCodigoRecuperacion({ tipoDocumento, documento }) {
  return postJson('/api/auth/recuperar-contrasena/solicitar', {
    tipoDocumento,
    documento,
  })
}

export async function confirmarRecuperacionContrasena({
  tipoDocumento,
  documento,
  codigo,
  password,
}) {
  return postJson('/api/auth/recuperar-contrasena/confirmar', {
    tipoDocumento,
    documento,
    codigo,
    password,
  })
}
