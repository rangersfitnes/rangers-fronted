/** Validación de correo electrónico para facturación / perfil de usuario. */
export const CORREO_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function esCorreoValido(correo) {
  return CORREO_REGEX.test(String(correo || '').trim())
}

export function normalizarCorreo(correo) {
  return String(correo || '').trim().toLowerCase()
}

export function normalizarDireccion(direccion) {
  return String(direccion || '').trim()
}

export function camposFacturacionFaltantes(usuario = {}) {
  return {
    fechaNacimiento: !String(usuario.fechaNacimiento ?? '').trim(),
    correo: !esCorreoValido(usuario.correo),
    direccion: !normalizarDireccion(usuario.direccion),
  }
}

export function requiereCompletarDatosFacturacion(usuario = {}) {
  const faltantes = camposFacturacionFaltantes(usuario)
  return faltantes.fechaNacimiento || faltantes.correo || faltantes.direccion
}
