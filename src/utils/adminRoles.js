import { getAdminRole, getAdminRoles } from '../services/authService.js'

export function rolesStaffActuales(rolesFromContext) {
  if (Array.isArray(rolesFromContext) && rolesFromContext.length) {
    return rolesFromContext.map((r) => String(r).toLowerCase())
  }
  const stored = getAdminRoles()
  if (stored.length) return stored
  const rol = getAdminRole()
  return rol ? [String(rol).toLowerCase()] : []
}

export function tieneRolStaff(roles, rol) {
  return rolesStaffActuales(roles).includes(String(rol).toLowerCase())
}

export function esCreadorStaff(roles) {
  return tieneRolStaff(roles, 'creador')
}

export function esAdminColaborador(roles) {
  return tieneRolStaff(roles, 'admin')
}

export function esTrainerStaff(roles) {
  return tieneRolStaff(roles, 'trainer')
}
