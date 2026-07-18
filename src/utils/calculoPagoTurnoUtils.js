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
