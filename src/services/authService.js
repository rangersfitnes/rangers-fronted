import { API_BASE_URL } from '../variables/api.jsx'

export async function verifyAdminAccess(idToken) {
  let response

  try {
    response = await fetch(`${API_BASE_URL}/api/auth/verify-admin`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
    })
  } catch {
    throw new Error(
      'No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.',
    )
  }

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(data.error || 'No se pudo verificar el acceso de administrador')
  }

  return data
}

export const ADMIN_TOKEN_KEY = 'adminToken'
export const ADMIN_ROLE_KEY = 'adminRole'

export function saveAdminToken(token) {
  sessionStorage.setItem(ADMIN_TOKEN_KEY, token)
}

export function getAdminToken() {
  return sessionStorage.getItem(ADMIN_TOKEN_KEY)
}

export function saveAdminRole(role) {
  sessionStorage.setItem(ADMIN_ROLE_KEY, role)
}

export function getAdminRole() {
  return sessionStorage.getItem(ADMIN_ROLE_KEY)
}

export function clearAdminSession() {
  sessionStorage.removeItem(ADMIN_TOKEN_KEY)
  sessionStorage.removeItem(ADMIN_ROLE_KEY)
}
