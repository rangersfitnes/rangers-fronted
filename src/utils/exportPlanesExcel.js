import * as XLSX from 'xlsx'

function fechaArchivo() {
  return new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function etiquetaTipo(plan) {
  return plan?.tipo === 'tiquetera' ? 'Tiquetera' : 'Plan'
}

function etiquetaActivo(plan) {
  const estado = String(plan?.estado || 'activo').toLowerCase()
  return estado === 'activo' ? 'Sí' : 'No'
}

/**
 * Genera un .xlsx básico con los planes actuales.
 * Columnas: Nombre, Descripción, Precio, Activo, Tipo.
 */
export function exportarPlanesExcel(planes = []) {
  const filas = [
    ['Nombre', 'Descripción', 'Precio', 'Activo', 'Tipo'],
    ...planes.map((plan) => [
      plan.nombre || '',
      plan.descripcion || '',
      Number(plan.precio) || 0,
      etiquetaActivo(plan),
      etiquetaTipo(plan),
    ]),
  ]

  const hoja = XLSX.utils.aoa_to_sheet(filas)
  hoja['!cols'] = [
    { wch: 28 },
    { wch: 48 },
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
  ]

  const libro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(libro, hoja, 'Planes')
  XLSX.writeFile(libro, `planes-rangers-box-${fechaArchivo()}.xlsx`)
}
