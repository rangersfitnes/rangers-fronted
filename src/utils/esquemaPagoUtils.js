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
