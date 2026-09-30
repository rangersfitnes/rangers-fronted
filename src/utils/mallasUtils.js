import { DIAS_SEMANA } from '../services/horariosService.js'

const TIPOS_BLOQUE_SIN_HORARIO = new Set(['libre', 'vacaciones', 'permiso'])

/** Turnos fijos de la sede (asignación semanal). */
export const TURNOS_ESTABLECIDOS = [
  {
    id: 'manana',
    etiqueta: 'Turno mañana',
    inicio: '05:00',
    fin: '12:00',
  },
  {
    id: 'tarde',
    etiqueta: 'Turno tarde',
    inicio: '14:00',
    fin: '21:00',
  },
]

export function resolverTurnoEstablecido(inicio, fin) {
  const inicioNorm = normalizarHoraInput(inicio)
  const finNorm = normalizarHoraInput(fin)
  return (
    TURNOS_ESTABLECIDOS.find(
      (turno) => turno.inicio === inicioNorm && turno.fin === finNorm,
    ) || null
  )
}

export function normalizarHoraInput(valor) {
  const limpio = String(valor || '').trim()
  if (!limpio) return ''

  const match = limpio.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/)
  if (!match) return ''

  const horas = Number(match[1])
  const minutos = Number(match[2])
  if (horas < 0 || horas > 23 || minutos < 0 || minutos > 59) return ''

  return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`
}

function esHoraValida(valor) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(normalizarHoraInput(valor))
}

function calcularMinutosBloque(inicio, fin) {
  const inicioNorm = normalizarHoraInput(inicio)
  const finNorm = normalizarHoraInput(fin)
  if (!esHoraValida(inicioNorm) || !esHoraValida(finNorm)) return 0
  const [hi, mi] = inicioNorm.split(':').map(Number)
  const [hf, mf] = finNorm.split(':').map(Number)
  const minutos = hf * 60 + mf - (hi * 60 + mi)
  return minutos > 0 ? minutos : 0
}

export function hoyColombia() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export function sumarDiasFecha(fechaStr, dias) {
  const [y, m, d] = String(fechaStr).split('-').map(Number)
  const utc = Date.UTC(y, m - 1, d)
  return new Date(utc + dias * 86400000).toISOString().slice(0, 10)
}

export function restarDiasFecha(fechaStr, dias) {
  return sumarDiasFecha(fechaStr, -dias)
}

export function obtenerLunesSemana(fechaStr) {
  const [y, m, d] = String(fechaStr).split('-').map(Number)
  const utc = Date.UTC(y, m - 1, d)
  const date = new Date(utc)
  const diaSemana = date.getUTCDay()
  const diff = diaSemana === 0 ? -6 : 1 - diaSemana
  date.setUTCDate(date.getUTCDate() + diff)
  return date.toISOString().slice(0, 10)
}

export function crearBloquesVacios() {
  return Object.fromEntries(DIAS_SEMANA.map((d) => [d.key, []]))
}

export function calcularTotalHorasPlanificadas(bloques = {}) {
  let minutos = 0
  for (const dia of DIAS_SEMANA) {
    const lista = Array.isArray(bloques[dia.key]) ? bloques[dia.key] : []
    for (const bloque of lista) {
      if (bloque?.tipo !== 'labora') continue
      minutos += calcularMinutosBloque(bloque.inicio, bloque.fin)
    }
  }
  return Math.round((minutos / 60) * 100) / 100
}

export function mallaTieneContenido(bloques) {
  return DIAS_SEMANA.some((d) => {
    const lista = bloques[d.key]
    return Array.isArray(lista) && lista.length > 0
  })
}

export function formatearEtiquetaSemana(semanaInicio) {
  const inicio = new Date(`${semanaInicio}T12:00:00`)
  const finStr = sumarDiasFecha(semanaInicio, 6)
  const fin = new Date(`${finStr}T12:00:00`)
  const formato = { day: 'numeric', month: 'short', year: 'numeric' }
  const inicioTxt = inicio.toLocaleDateString('es-CO', formato)
  const finTxt = fin.toLocaleDateString('es-CO', formato)
  return `${inicioTxt} – ${finTxt}`
}

export function formatearHorasTotal(horas) {
  const valor = Number(horas) || 0
  if (valor <= 0) return '—'
  return Number.isInteger(valor) ? `${valor} h` : `${valor.toFixed(1)} h`
}

export function claseBloqueCelda(bloque) {
  if (!bloque) return ''
  const tipo = bloque.tipo || 'labora'
  if (tipo === 'libre') return 'ag-mallas__bloque--libre'
  if (tipo === 'vacaciones') return 'ag-mallas__bloque--vacaciones'
  if (tipo === 'permiso') return 'ag-mallas__bloque--permiso'
  return ''
}

export function textoBloqueCelda(bloque) {
  if (!bloque) return null
  const tipo = bloque.tipo || 'labora'
  if (tipo === 'libre') return 'Libre'
  if (tipo === 'vacaciones') return 'Vacaciones'
  if (tipo === 'permiso') return 'Permiso'
  const turno = resolverTurnoEstablecido(bloque.inicio, bloque.fin)
  if (turno) return `${turno.etiqueta} ${turno.inicio}–${turno.fin}`
  if (bloque.inicio && bloque.fin) return `${bloque.inicio}–${bloque.fin}`
  return null
}

export const DIAS_LABORABLES_DEFAULT = [
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
]

export function obtenerTurnoEstablecidoPorId(turnoId) {
  return (
    TURNOS_ESTABLECIDOS.find((turno) => turno.id === String(turnoId || '').trim()) ||
    null
  )
}

export function turnoComplementarioId(turnoId) {
  return String(turnoId) === 'tarde' ? 'manana' : 'tarde'
}

/** Aplica un turno establecido solo en los días indicados; el resto queda vacío. */
export function crearBloquesConTurno({ turnoId, diasKeys = DIAS_LABORABLES_DEFAULT }) {
  const turno = obtenerTurnoEstablecidoPorId(turnoId)
  const bloques = crearBloquesVacios()
  if (!turno) return bloques

  const dias = new Set(
    (Array.isArray(diasKeys) ? diasKeys : []).map((d) => String(d).trim()),
  )

  for (const dia of DIAS_SEMANA) {
    if (!dias.has(dia.key)) continue
    bloques[dia.key] = [
      {
        tipo: 'labora',
        inicio: turno.inicio,
        fin: turno.fin,
      },
    ]
  }

  return bloques
}

/** Invierte mañana ↔ tarde en bloques labora; deja libre/vacaciones/permiso igual. */
export function invertirTurnosBloques(bloquesRaw = {}) {
  const bloques = normalizarBloquesEdicion(bloquesRaw)
  const resultado = crearBloquesVacios()

  for (const dia of DIAS_SEMANA) {
    const lista = Array.isArray(bloques[dia.key]) ? bloques[dia.key] : []
    resultado[dia.key] = lista.map((bloque) => {
      if (!bloque || bloque.tipo !== 'labora') {
        return { ...bloque }
      }

      const actual = resolverTurnoEstablecido(bloque.inicio, bloque.fin)
      const destinoId = actual
        ? turnoComplementarioId(actual.id)
        : null
      const destino = destinoId ? obtenerTurnoEstablecidoPorId(destinoId) : null

      if (!destino) return { ...bloque }

      return {
        tipo: 'labora',
        inicio: destino.inicio,
        fin: destino.fin,
      }
    })
  }

  return resultado
}

/**
 * Intercala mañana/tarde entre dos colaboradores.
 * El primero recibe `turnoAId`; el segundo recibe el complemento.
 */
export function construirIntercaladoPareja({
  colaboradorAUid,
  colaboradorBUid,
  turnoAId = 'manana',
  diasKeys = DIAS_LABORABLES_DEFAULT,
}) {
  const uidA = String(colaboradorAUid || '').trim()
  const uidB = String(colaboradorBUid || '').trim()
  if (!uidA || !uidB || uidA === uidB) {
    throw new Error('Selecciona dos colaboradores distintos')
  }

  const turnoA = obtenerTurnoEstablecidoPorId(turnoAId) ? turnoAId : 'manana'
  const turnoB = turnoComplementarioId(turnoA)

  return {
    [uidA]: crearBloquesConTurno({ turnoId: turnoA, diasKeys }),
    [uidB]: crearBloquesConTurno({ turnoId: turnoB, diasKeys }),
  }
}

export function bloquesDiaVacios(lista) {
  return !Array.isArray(lista) || lista.length === 0
}

export function normalizarBloquesEdicion(bloques) {
  const base = crearBloquesVacios()
  if (!bloques || typeof bloques !== 'object') return base

  for (const dia of DIAS_SEMANA) {
    const lista = bloques[dia.key]
    base[dia.key] = Array.isArray(lista) ? lista.map((b) => ({ ...b })) : []
  }

  return base
}

export function construirEstadoEdicionDesdeMallas(mallas = []) {
  const mapa = {}
  for (const malla of mallas) {
    if (!malla?.colaboradorUid) continue
    mapa[malla.colaboradorUid] = normalizarBloquesEdicion(malla.bloques)
  }
  return mapa
}

export function construirEstadoEdicionDesdePlantillas(plantillas = []) {
  return construirEstadoEdicionDesdeMallas(plantillas)
}

export function construirEstadoEdicionDesdePlantillaBase(
  slots = [],
  numeroColaboradores = 0,
) {
  const mapa = {}
  const count = Math.max(
    Number(numeroColaboradores) || 0,
    Array.isArray(slots) ? slots.length : 0,
  )

  for (let i = 0; i < count; i += 1) {
    const slot =
      slots.find((item) => Number(item?.slotIndex) === i) ?? slots[i]
    mapa[String(i)] = slot
      ? normalizarBloquesEdicion(slot.bloques)
      : crearBloquesVacios()
  }

  return mapa
}

export function construirSlotsPlantillaParaGuardar(
  numeroColaboradores,
  edicion = {},
  slotsExistentes = [],
) {
  const count = Math.max(0, Number(numeroColaboradores) || 0)

  return Array.from({ length: count }, (_, slotIndex) => {
    const existente =
      slotsExistentes.find((item) => Number(item?.slotIndex) === slotIndex) ??
      slotsExistentes[slotIndex]

    return {
      slotIndex,
      colaboradorUid: existente?.colaboradorUid ?? null,
      colaboradorNombre: existente?.colaboradorNombre ?? null,
      bloques: normalizarBloquesEdicion(
        edicion[String(slotIndex)] || crearBloquesVacios(),
      ),
    }
  })
}

export { TIPOS_BLOQUE_SIN_HORARIO, esHoraValida, calcularMinutosBloque }
