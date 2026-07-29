import {
  esDiaConRecargoDominicalColombia,
  esDomingoColombia,
  esFestivoColombia,
} from './calendarioColombia.js'

export const MINUTOS_MINIMOS_HORA_EXTRA = 50
const MS_POR_HORA = 3_600_000
const MS_POR_MINUTO = 60_000

export function calcularTiempoExtraMs(duracionMs, horasTurno) {
  const duracion = Number(duracionMs) || 0
  const horasJornada = Number(horasTurno) || 0
  if (duracion <= 0 || horasJornada <= 0) return 0

  const jornadaMs = horasJornada * MS_POR_HORA
  return Math.max(0, duracion - jornadaMs)
}

export function calcularHorasExtraLiquidadas(duracionMs, horasTurno) {
  const extraMs = calcularTiempoExtraMs(duracionMs, horasTurno)
  if (extraMs < MINUTOS_MINIMOS_HORA_EXTRA * MS_POR_MINUTO) return 0

  const horasCompletas = Math.floor(extraMs / MS_POR_HORA)
  const restoMinutos = Math.floor((extraMs % MS_POR_HORA) / MS_POR_MINUTO)

  return horasCompletas + (restoMinutos >= MINUTOS_MINIMOS_HORA_EXTRA ? 1 : 0)
}

export function obtenerEstadoHorasExtra(duracionMs, horasTurno) {
  const tiempoExtraMs = calcularTiempoExtraMs(duracionMs, horasTurno)
  const minutosExtra = Math.floor(tiempoExtraMs / MS_POR_MINUTO)
  const horasExtraLiquidadas = calcularHorasExtraLiquidadas(duracionMs, horasTurno)

  let minutosParaLiquidar = 0
  if (tiempoExtraMs > 0 && horasExtraLiquidadas === 0) {
    minutosParaLiquidar = MINUTOS_MINIMOS_HORA_EXTRA - minutosExtra
  }

  return {
    enJornada: tiempoExtraMs === 0,
    tiempoExtraMs,
    minutosExtra,
    horasExtraLiquidadas,
    minutosParaLiquidar: Math.max(0, minutosParaLiquidar),
  }
}

/**
 * Estado en vivo del recargo dominical/festivo durante el cronometraje.
 * Usa horas ordinarias (hasta horasTurno) que caen en domingo o festivo CO.
 */
export function obtenerEstadoRecargoDominical(inicioEnMs, duracionMs, horasTurno = 0) {
  const inicio = Number(inicioEnMs) || 0
  const duracion = Math.max(0, Number(duracionMs) || 0)
  const jornadaHoras = Number(horasTurno) || 0

  if (!inicio) {
    return {
      activoAhora: false,
      esDomingoAhora: false,
      esFestivoAhora: false,
      horasDominicales: 0,
      tocaDomingo: false,
      tocaFestivo: false,
      etiqueta: '',
    }
  }

  const ahora = duracion > 0 ? inicio + duracion : Date.now()
  const esDomingoAhora = esDomingoColombia(ahora)
  const esFestivoAhora = esFestivoColombia(ahora)
  const activoAhora = esDiaConRecargoDominicalColombia(ahora)

  const duracionOrdinariaMs =
    jornadaHoras > 0 ? Math.min(duracion, jornadaHoras * MS_POR_HORA) : duracion

  const fin = inicio + duracionOrdinariaMs
  const paso = 15 * MS_POR_MINUTO
  let msDominicales = 0
  let tocaDomingo = false
  let tocaFestivo = false

  for (let cursor = inicio; cursor < fin; cursor += paso) {
    const esDomingo = esDomingoColombia(cursor)
    const esFestivo = esFestivoColombia(cursor)
    if (esDomingo || esFestivo) {
      msDominicales += Math.min(paso, fin - cursor)
      if (esDomingo) tocaDomingo = true
      if (esFestivo) tocaFestivo = true
    }
  }

  const horasDominicales = Math.round((msDominicales / MS_POR_HORA) * 100) / 100

  let etiqueta = ''
  if (activoAhora) {
    etiqueta = esFestivoAhora
      ? 'Festivo oficial · aplica recargo dominical'
      : 'Domingo · aplica recargo dominical'
  } else if (horasDominicales > 0) {
    etiqueta = tocaFestivo && !tocaDomingo
      ? 'Incluye horas de festivo'
      : tocaFestivo
        ? 'Incluye horas dominicales / festivo'
        : 'Incluye horas dominicales'
  }

  return {
    activoAhora,
    esDomingoAhora,
    esFestivoAhora,
    horasDominicales,
    tocaDomingo,
    tocaFestivo,
    etiqueta,
  }
}

export const HORA_INICIO_NOCTURNA_DEFAULT = 19
export const HORA_FIN_NOCTURNA_DEFAULT = 6

export function normalizarFranjaNocturna(esquema = {}) {
  const inicioRaw = Number(esquema?.horaInicioNocturna)
  const finRaw = Number(esquema?.horaFinNocturna)
  const horaInicio =
    Number.isInteger(inicioRaw) && inicioRaw >= 0 && inicioRaw <= 23
      ? inicioRaw
      : HORA_INICIO_NOCTURNA_DEFAULT
  const horaFin =
    Number.isInteger(finRaw) && finRaw >= 0 && finRaw <= 23
      ? finRaw
      : HORA_FIN_NOCTURNA_DEFAULT

  return { horaInicio, horaFin }
}

function esHoraNocturna(
  hora24,
  { horaInicio = HORA_INICIO_NOCTURNA_DEFAULT, horaFin = HORA_FIN_NOCTURNA_DEFAULT } = {},
) {
  const h = Number(hora24)
  const inicio = Number(horaInicio)
  const fin = Number(horaFin)
  if (!Number.isFinite(h) || !Number.isFinite(inicio) || !Number.isFinite(fin)) {
    return false
  }
  if (inicio === fin) return false
  if (inicio < fin) return h >= inicio && h < fin
  return h >= inicio || h < fin
}

function horaColombia(ms) {
  const hora = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    hour12: false,
  }).format(new Date(ms))
  return Number(hora)
}

function formatearHoraFranja(hora) {
  return `${String(Number(hora) || 0).padStart(2, '0')}:00`
}

/**
 * Estado en vivo del recargo nocturno según la franja del esquema.
 */
export function obtenerEstadoRecargoNocturno(
  inicioEnMs,
  duracionMs,
  esquema = {},
) {
  const inicio = Number(inicioEnMs) || 0
  const duracion = Math.max(0, Number(duracionMs) || 0)
  const franja = normalizarFranjaNocturna(esquema)
  const pct = Number(esquema?.porcentajeRecargoNocturno) || 0

  if (!inicio) {
    return {
      activoAhora: false,
      horasNocturnas: 0,
      porcentaje: pct,
      horaInicio: franja.horaInicio,
      horaFin: franja.horaFin,
      etiqueta: '',
    }
  }

  const ahora = duracion > 0 ? inicio + duracion : Date.now()
  const activoAhora = esHoraNocturna(horaColombia(ahora), franja)

  const fin = inicio + (duracion > 0 ? duracion : Math.max(0, ahora - inicio))
  const paso = 15 * MS_POR_MINUTO
  let msNocturnos = 0

  for (let cursor = inicio; cursor < fin; cursor += paso) {
    if (esHoraNocturna(horaColombia(cursor), franja)) {
      msNocturnos += Math.min(paso, fin - cursor)
    }
  }

  const horasNocturnas = Math.round((msNocturnos / MS_POR_HORA) * 100) / 100

  let etiqueta = ''
  if (activoAhora && pct > 0) {
    etiqueta = `Nocturno · recargo ${pct}%`
  } else if (activoAhora) {
    etiqueta = 'Franja nocturna activa'
  } else if (horasNocturnas > 0 && pct > 0) {
    etiqueta = `Incluye horas nocturnas · ${pct}%`
  } else if (horasNocturnas > 0) {
    etiqueta = 'Incluye horas nocturnas'
  }

  return {
    activoAhora,
    horasNocturnas,
    porcentaje: pct,
    horaInicio: franja.horaInicio,
    horaFin: franja.horaFin,
    etiqueta,
    franjaLabel: `${formatearHoraFranja(franja.horaInicio)}–${formatearHoraFranja(franja.horaFin)}`,
  }
}
