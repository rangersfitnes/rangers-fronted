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

  if (item?.origen === 'pago-clase') {
    const tipo = etiquetaTipoAcceso(item.tipoAcceso)
    return `¿Eliminar el registro de ${tipo.toLowerCase()} de ${nombre} del ${fechaTexto}? Se borrará el pago y su movimiento de caja en Firestore.`
  }

  return `¿Eliminar la asistencia por membresía de ${nombre} del ${fechaTexto}? Se borrará permanentemente de Firestore.`
}

export function tituloEliminarRegistro(item) {
  if (item?.origen === 'pago-clase') {
    return item.tipoAcceso === 'clase-cortesia'
      ? 'Eliminar clase de cortesía'
      : 'Eliminar clase del día'
  }
  return 'Eliminar asistencia'
}

export function mensajeExitoEliminar(item) {
  if (item?.origen === 'pago-clase') {
    return item.tipoAcceso === 'clase-cortesia'
      ? 'Clase de cortesía eliminada'
      : 'Clase del día eliminada'
  }
  return 'Asistencia eliminada'
}
