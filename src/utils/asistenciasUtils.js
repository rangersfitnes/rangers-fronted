export function etiquetaTipoAcceso(tipo) {
  if (tipo === 'membresia') return 'Membresía'
  if (tipo === 'clase-dia') return 'Clase del día'
  if (tipo === 'clase-cortesia') return 'Clase de cortesía'
  return tipo || '—'
}

export function claseFilaAsistencia(item) {
  if (item?.tipoAcceso === 'clase-dia') return 'asistencias-fila--clase-dia'
  if (item?.tipoAcceso === 'clase-cortesia') return 'asistencias-fila--clase-cortesia'
  return 'asistencias-fila--membresia'
}

export function keyRegistroAsistencia(item) {
  const prefijo = item?.origen === 'pago-clase' ? 'pago' : 'asistencia'
  return `${item.sedeId}-${prefijo}-${item.id}`
}

function normalizarCedulaClave(cedula) {
  return String(cedula ?? '')
    .trim()
    .replace(/\s/g, '')
    .replace(/\./g, '')
}

function claveIngresoDia(item) {
  const cedula = normalizarCedulaClave(item?.cedula)
  const fecha = String(item?.fecha ?? '').trim()
  if (!cedula || !fecha) return null
  return `${item.sedeId || ''}::${cedula}::${fecha}`
}

/**
 * Un mismo ingreso de clase/cortesía puede llegar como pago-clase y como
 * asistencia. En la tabla solo mostramos uno (preferimos la asistencia).
 * Si ya hay cualquier asistencia del día para esa cédula, ocultamos el pago.
 */
export function deduplicarRegistrosAsistencia(items = []) {
  const lista = Array.isArray(items) ? items : []
  const pagosCubiertos = new Set()
  const diasConAsistencia = new Set()

  for (const item of lista) {
    if (item?.origen === 'pago-clase') continue

    if (item?.pagoClaseId) {
      pagosCubiertos.add(`${item.sedeId || ''}::${item.pagoClaseId}`)
    }

    const clave = claveIngresoDia(item)
    if (clave) diasConAsistencia.add(clave)
  }

  return lista.filter((item) => {
    if (item?.origen !== 'pago-clase') return true

    if (pagosCubiertos.has(`${item.sedeId || ''}::${item.id}`)) return false

    const clave = claveIngresoDia(item)
    if (clave && diasConAsistencia.has(clave)) return false

    return true
  })
}

export function mensajeEliminarRegistro(item) {
  const nombre = item?.nombre || item?.cedula || 'este registro'
  const fecha = item?.fecha
    ? new Date(`${item.fecha}T12:00:00-05:00`).getTime()
    : null
  const fechaTexto = fecha
    ? new Intl.DateTimeFormat('es-CO', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        timeZone: 'America/Bogota',
      }).format(new Date(fecha))
    : 'la fecha seleccionada'

  if (
    item?.origen === 'pago-clase' ||
    item?.tipoAcceso === 'clase-dia' ||
    item?.tipoAcceso === 'clase-cortesia'
  ) {
    const tipo = etiquetaTipoAcceso(item.tipoAcceso)
    return `¿Eliminar el registro de ${tipo.toLowerCase()} de ${nombre} del ${fechaTexto}? Se borrará el pago, la asistencia vinculada y su movimiento de caja en Firestore.`
  }

  return `¿Eliminar la asistencia por membresía de ${nombre} del ${fechaTexto}? Se borrará permanentemente de Firestore.`
}

export function tituloEliminarRegistro(item) {
  if (item?.tipoAcceso === 'clase-cortesia') return 'Eliminar clase de cortesía'
  if (
    item?.tipoAcceso === 'clase-dia' ||
    item?.origen === 'pago-clase'
  ) {
    return 'Eliminar clase del día'
  }
  return 'Eliminar asistencia'
}

export function mensajeExitoEliminar(item) {
  if (item?.tipoAcceso === 'clase-cortesia') return 'Clase de cortesía eliminada'
  if (
    item?.tipoAcceso === 'clase-dia' ||
    item?.origen === 'pago-clase'
  ) {
    return 'Clase del día eliminada'
  }
  return 'Asistencia eliminada'
}
