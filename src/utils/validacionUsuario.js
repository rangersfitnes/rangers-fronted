/** Validación de correo electrónico (opcional; p. ej. reportes / legado). */
export const CORREO_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function esCorreoValido(correo) {
  return CORREO_REGEX.test(String(correo || '').trim())
}

export function normalizarCorreo(correo) {
  return String(correo || '').trim().toLowerCase()
}

export function camposFacturacionFaltantes(usuario = {}) {
  return {
    fechaNacimiento: !String(usuario.fechaNacimiento ?? '').trim(),
  }
}

export function requiereCompletarDatosFacturacion(usuario = {}) {
  const faltantes = camposFacturacionFaltantes(usuario)
  return faltantes.fechaNacimiento
}
