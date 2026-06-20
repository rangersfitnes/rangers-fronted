import { API_BASE_URL } from '../variables/api.jsx'
import { SEDE_HORARIOS } from './horariosService.js'

async function fetchClases(params, { signal } = {}) {
  let response

  try {
    response = await fetch(`${API_BASE_URL}/api/clases?${params.toString()}`, {
      method: 'GET',
      signal,
    })
  } catch (err) {
    if (err?.name === 'AbortError') throw err
    throw new Error('No se pudo conectar con el servidor')
  }

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data.error || 'No se pudieron cargar las clases')
  }

  return data
}

export async function obtenerClasesHoy(sede = SEDE_HORARIOS, { signal } = {}) {
  const params = new URLSearchParams({ sede, scope: 'hoy' })
  const data = await fetchClases(params, { signal })

  return {
    sede: data.sede,
    dia: data.dia,
    diaLabel: data.diaLabel,
    fecha: data.fecha,
    clases: data.clases || [],
    tieneCronograma: Boolean(data.tieneCronograma),
  }
}

export async function obtenerClasesSemana(sede = SEDE_HORARIOS, { signal } = {}) {
  const params = new URLSearchParams({ sede })
  const data = await fetchClases(params, { signal })

  return {
    sede: data.sede,
    fecha: data.fecha,
    diaHoy: data.diaHoy,
    diaHoyLabel: data.diaHoyLabel,
    orden: data.orden || [],
    semana: Array.isArray(data.semana) ? data.semana : [],
    tieneCronograma: Boolean(data.tieneCronograma),
  }
}
