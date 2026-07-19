/**
 * Utilidades de vigencia de plan (días restantes / próximo a vencer).
 * Zona horaria de referencia: America/Bogota.
 */

export const DIAS_PROXIMO_A_VENCER = 4
export const ZONA_COLOMBIA = 'America/Bogota'
const MS_POR_DIA = 1000 * 60 * 60 * 24

export function fechaDiaColombia(ms = Date.now()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_COLOMBIA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ms))
}

export function calcularDiasRestantesVigencia(vigenciaMs, ahoraMs = Date.now()) {
  if (!vigenciaMs) return null
  const restante = Number(vigenciaMs) - Number(ahoraMs)
  if (restante <= 0) return 0
  return Math.ceil(restante / MS_POR_DIA)
}

/**
 * @returns {{
 *   dias: number | null,
 *   etiquetaDias: string,
 *   estado: 'sin_plan' | 'vencido' | 'proximo' | 'vigente',
 *   etiquetaEstado: string,
 * }}
 */
export function obtenerEstadoDiasVigencia(
  planEstado,
  vigenciaMs,
  ahoraMs = Date.now(),
) {
  if (planEstado === 'sin_plan' || !vigenciaMs) {
    return {
      dias: null,
      etiquetaDias: '—',
      estado: 'sin_plan',
      etiquetaEstado: '',
    }
  }

  const dias = calcularDiasRestantesVigencia(vigenciaMs, ahoraMs)

  if (planEstado === 'vencido' || dias === 0) {
    return {
      dias: 0,
      etiquetaDias: '0 días',
      estado: 'vencido',
      etiquetaEstado: 'Vencido',
    }
  }

  const proximo = dias <= DIAS_PROXIMO_A_VENCER
  const etiquetaDias = dias === 1 ? '1 día' : `${dias} días`

  return {
    dias,
    etiquetaDias,
    estado: proximo ? 'proximo' : 'vigente',
    etiquetaEstado: proximo ? 'Próximo a vencer' : 'Vigente',
  }
}

export function textoDiasRestantesReporte(planEstado, vigenciaMs, ahoraMs = Date.now()) {
  const info = obtenerEstadoDiasVigencia(planEstado, vigenciaMs, ahoraMs)
  if (info.estado === 'sin_plan') return '—'
  if (info.estado === 'vencido') return '0 · Vencido'
  if (info.estado === 'proximo') return `${info.dias} · Próximo a vencer`
  return `${info.dias} · Vigente`
}
