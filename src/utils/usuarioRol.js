export function normalizarRolUsuario(rol) {
  return String(rol ?? 'user').trim().toLowerCase()
}

export function esUsuarioCliente(usuario) {
  if (!usuario) return false
  return normalizarRolUsuario(usuario.rol) === 'user'
}
