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
