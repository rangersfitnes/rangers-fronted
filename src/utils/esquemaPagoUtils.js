export function calcularIncrementoRecargo(valorPorHora, porcentaje) {
  const hora = Number(valorPorHora) || 0
  const pct = Number(porcentaje) || 0
  return Math.round(hora * (pct / 100))
}

export function calcularValorHoraExtra(valorPorHora, porcentaje) {
  const incremento = calcularIncrementoRecargo(valorPorHora, porcentaje)
  return {
    incremento,
    total: (Number(valorPorHora) || 0) + incremento,
  }
}

const ZONA_COLOMBIA = 'America/Bogota'

export const DIAS_SEMANA_ESQUEMA = [
  { id: 'lunes', label: 'Lunes', weekdayEn: 'Mon' },
  { id: 'martes', label: 'Martes', weekdayEn: 'Tue' },
  { id: 'miercoles', label: 'Miércoles', weekdayEn: 'Wed' },
  { id: 'jueves', label: 'Jueves', weekdayEn: 'Thu' },
  { id: 'viernes', label: 'Viernes', weekdayEn: 'Fri' },
  { id: 'sabado', label: 'Sábado', weekdayEn: 'Sat' },
  { id: 'domingo', label: 'Domingo', weekdayEn: 'Sun' },
]

const DIA_POR_WEEKDAY_EN = Object.fromEntries(
  DIAS_SEMANA_ESQUEMA.map((dia) => [dia.weekdayEn, dia.id]),
)

export function claveDiaColombia(ms) {
  const valor = Number(ms) || 0
  if (!valor) return null

  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONA_COLOMBIA,
    weekday: 'short',
  }).format(new Date(valor))

  return DIA_POR_WEEKDAY_EN[weekday] || null
}

export function etiquetaDiaEsquema(diaClave) {
  return (
    DIAS_SEMANA_ESQUEMA.find((dia) => dia.id === diaClave)?.label ||
    String(diaClave || '')
  )
}

export function resolverJornadaEsquema(esquema, inicioEn = null) {
  const horasBase = Number(esquema?.horasTurno) || 0
  const valorBase = Number(esquema?.valorTurno) || 0
  const diaClave = claveDiaColombia(inicioEn)
  const excepciones =
    esquema?.jornadasPorDia && typeof esquema.jornadasPorDia === 'object'
      ? esquema.jornadasPorDia
      : {}

  const override = diaClave ? excepciones[diaClave] : null
  if (override && typeof override === 'object' && !Array.isArray(override)) {
    const horasOverride = Number(override.horasTurno)
    const valorOverride = Number(override.valorTurno)

    return {
      horasTurno:
        Number.isFinite(horasOverride) && horasOverride > 0
          ? horasOverride
          : horasBase,
      valorTurno:
        Number.isFinite(valorOverride) && valorOverride >= 0
          ? Math.round(valorOverride)
          : valorBase,
      diaClave,
      personalizada: true,
    }
  }

  return {
    horasTurno: horasBase,
    valorTurno: valorBase,
    diaClave,
    personalizada: false,
  }
}

export function enriquecerEsquemaPago(esquema) {
  const valorPorHora = Number(esquema.valorPorHora) || 0
  const porcentajeHoraExtra = Number(esquema.porcentajeHoraExtra) || 0
  const porcentajeRecargoDominical =
    Number(esquema.porcentajeRecargoDominical) || 0
  const porcentajeRecargoNocturno =
    Number(esquema.porcentajeRecargoNocturno) || 0

  const { incremento: incrementoHoraExtra, total: valorHoraExtra } =
    calcularValorHoraExtra(valorPorHora, porcentajeHoraExtra)
  const incrementoRecargoDominical = calcularIncrementoRecargo(
    valorPorHora,
    porcentajeRecargoDominical,
  )
  const incrementoRecargoNocturno = calcularIncrementoRecargo(
    valorPorHora,
    porcentajeRecargoNocturno,
  )

  return {
    ...esquema,
    jornadasPorDia: esquema.jornadasPorDia || {},
    porcentajeHoraExtra,
    incrementoHoraExtra,
    valorHoraExtra,
    porcentajeRecargoDominical,
    porcentajeRecargoNocturno,
    incrementoRecargoDominical,
    incrementoRecargoNocturno,
    valorHoraRecargoDominical: valorPorHora + incrementoRecargoDominical,
    valorHoraRecargoNocturno: valorPorHora + incrementoRecargoNocturno,
  }
}
