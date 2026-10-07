export function calcularEdadDesdeFechaNacimiento(fechaNacimiento, ahora = new Date()) {
  const crudo = String(fechaNacimiento || '').trim()
  if (!crudo) return null

  let fecha
  if (/^\d{4}-\d{2}-\d{2}$/.test(crudo)) {
    fecha = new Date(`${crudo}T12:00:00`)
  } else {
    fecha = new Date(crudo)
  }

  if (Number.isNaN(fecha.getTime())) return null

  let edad = ahora.getFullYear() - fecha.getFullYear()
  const mes = ahora.getMonth() - fecha.getMonth()
  if (mes < 0 || (mes === 0 && ahora.getDate() < fecha.getDate())) {
    edad -= 1
  }

  if (edad < 5 || edad > 120) return null
  return edad
}

export function calcularImc(pesoKg, alturaCm) {
  const peso = Number(pesoKg)
  const altura = Number(alturaCm)
  if (!Number.isFinite(peso) || peso <= 0) return null
  if (!Number.isFinite(altura) || altura <= 0) return null
  const metros = altura / 100
  if (metros <= 0) return null
  return Math.round((peso / (metros * metros)) * 10) / 10
}

export function etiquetaImc(imc) {
  if (!Number.isFinite(imc)) return null
  if (imc < 18.5) return 'bajo peso'
  if (imc < 25) return 'peso saludable'
  if (imc < 30) return 'sobrepeso'
  return 'obesidad'
}

export function perfilCorporalCompleto(usuario) {
  const pesoKg = Number(usuario?.pesoKg)
  const alturaCm = Number(usuario?.alturaCm)
  const edad =
    calcularEdadDesdeFechaNacimiento(usuario?.fechaNacimiento) ??
    (Number.isFinite(Number(usuario?.edadManual))
      ? Number(usuario.edadManual)
      : null)

  return {
    pesoKg: Number.isFinite(pesoKg) && pesoKg > 0 ? pesoKg : null,
    alturaCm: Number.isFinite(alturaCm) && alturaCm > 0 ? alturaCm : null,
    edad: Number.isFinite(edad) && edad > 0 ? edad : null,
    tieneFechaNacimiento: Boolean(String(usuario?.fechaNacimiento || '').trim()),
  }
}

export function faltanDatosCorporales(usuario) {
  const perfil = perfilCorporalCompleto(usuario)
  return !perfil.pesoKg || !perfil.alturaCm || !perfil.edad
}
