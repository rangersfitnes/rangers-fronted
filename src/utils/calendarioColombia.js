/**
 * Calendario laboral de Colombia (Ley 51 de 1983 · Ley Emiliani).
 * Genera festivos nacionales oficiales: fijos, Semana Santa y trasladados al lunes.
 */

const ZONA_COLOMBIA = 'America/Bogota'

/** Pascua (algoritmo gregoriano anónimo · calendario occidental). */
export function calcularDomingoPascua(anio) {
  const year = Number(anio)
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const mes = Math.floor((h + l - 7 * m + 114) / 31)
  const dia = ((h + l - 7 * m + 114) % 31) + 1
  return new Date(Date.UTC(year, mes - 1, dia))
}

function aIsoUtc(date) {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function fechaUtc(anio, mes, dia) {
  return new Date(Date.UTC(anio, mes - 1, dia))
}

function sumarDiasUtc(date, dias) {
  const copia = new Date(date.getTime())
  copia.setUTCDate(copia.getUTCDate() + dias)
  return copia
}

/** Traslada al lunes siguiente si no cae en lunes (Ley Emiliani). */
function siguienteLunesSiAplica(date) {
  const diaSemana = date.getUTCDay() // 0=domingo … 1=lunes
  if (diaSemana === 1) return date
  const diasHastaLunes = (8 - diaSemana) % 7
  return sumarDiasUtc(date, diasHastaLunes === 0 ? 7 : diasHastaLunes)
}

/**
 * Lista de festivos nacionales de un año.
 * @returns {{ fecha: string, nombre: string, tipo: string }[]}
 */
export function obtenerFestivosColombia(anio) {
  const year = Number(anio)
  if (!Number.isFinite(year) || year < 2000 || year > 2100) return []

  const pascua = calcularDomingoPascua(year)
  const festivos = []

  const agregar = (date, nombre, tipo) => {
    festivos.push({ fecha: aIsoUtc(date), nombre, tipo })
  }

  // Fijos (no se trasladan)
  agregar(fechaUtc(year, 1, 1), 'Año Nuevo', 'fijo')
  agregar(fechaUtc(year, 5, 1), 'Día del Trabajo', 'fijo')
  agregar(fechaUtc(year, 7, 20), 'Día de la Independencia', 'fijo')
  agregar(fechaUtc(year, 8, 7), 'Batalla de Boyacá', 'fijo')
  agregar(fechaUtc(year, 12, 8), 'Inmaculada Concepción', 'fijo')
  agregar(fechaUtc(year, 12, 25), 'Navidad', 'fijo')

  // Semana Santa (no se trasladan)
  agregar(sumarDiasUtc(pascua, -3), 'Jueves Santo', 'semana-santa')
  agregar(sumarDiasUtc(pascua, -2), 'Viernes Santo', 'semana-santa')

  // Emiliani (traslado al lunes)
  const emiliani = [
    [fechaUtc(year, 1, 6), 'Día de los Reyes Magos'],
    [fechaUtc(year, 3, 19), 'San José'],
    [sumarDiasUtc(pascua, 39), 'Ascensión del Señor'],
    [sumarDiasUtc(pascua, 60), 'Corpus Christi'],
    [sumarDiasUtc(pascua, 68), 'Sagrado Corazón de Jesús'],
    [fechaUtc(year, 6, 29), 'San Pedro y San Pablo'],
    [fechaUtc(year, 8, 15), 'Asunción de la Virgen'],
    [fechaUtc(year, 10, 12), 'Día de la Raza'],
    [fechaUtc(year, 11, 1), 'Todos los Santos'],
    [fechaUtc(year, 11, 11), 'Independencia de Cartagena'],
  ]

  for (const [fechaBase, nombre] of emiliani) {
    agregar(siguienteLunesSiAplica(fechaBase), nombre, 'emiliani')
  }

  festivos.sort((a, b) => a.fecha.localeCompare(b.fecha))
  return festivos
}

const cacheFestivosPorAnio = new Map()

function setFestivosAnio(anio) {
  if (!cacheFestivosPorAnio.has(anio)) {
    cacheFestivosPorAnio.set(
      anio,
      new Set(obtenerFestivosColombia(anio).map((f) => f.fecha)),
    )
  }
  return cacheFestivosPorAnio.get(anio)
}

export function fechaIsoEnColombia(ms) {
  const valor = Number(ms) || 0
  if (!valor) return null
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_COLOMBIA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(valor))
}

export function esFestivoColombia(ms) {
  const iso = fechaIsoEnColombia(ms)
  if (!iso) return false
  const anio = Number(iso.slice(0, 4))
  return setFestivosAnio(anio).has(iso)
}

export function esDomingoColombia(ms) {
  const valor = Number(ms) || 0
  if (!valor) return false
  const dia = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONA_COLOMBIA,
    weekday: 'short',
  }).format(new Date(valor))
  return dia === 'Sun'
}

/** Domingo o festivo oficial: aplica el recargo dominical del esquema. */
export function esDiaConRecargoDominicalColombia(ms) {
  return esDomingoColombia(ms) || esFestivoColombia(ms)
}

export function obtenerInfoDiaRecargoColombia(ms) {
  const valor = Number(ms) || 0
  if (!valor) {
    return { esDomingo: false, esFestivo: false, aplicaRecargo: false, fecha: null }
  }
  const fecha = fechaIsoEnColombia(valor)
  const esDomingo = esDomingoColombia(valor)
  const esFestivo = esFestivoColombia(valor)
  return {
    esDomingo,
    esFestivo,
    aplicaRecargo: esDomingo || esFestivo,
    fecha,
  }
}
