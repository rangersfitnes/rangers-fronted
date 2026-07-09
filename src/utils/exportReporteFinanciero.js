import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import {
  formatearFechaCuenta,
  formatearFechaHoraCuenta,
  formatearPrecioCuenta,
} from '../pages/cuenta/cuentaUtils.js'

const CANAL_LABEL = {
  efectivo: 'Efectivo',
  wompi: 'Wompi',
  transferencia: 'Transferencia',
  otro: 'Otro',
}

function nombreArchivoReporte(desde, hasta, extension, prefijo = 'reporte-financiero') {
  return `${prefijo}-${desde}-${hasta}.${extension}`
}

export function combinarMovimientosReporte(reporte) {
  const ingresos = (reporte.movimientos ?? []).map((mov) => ({
    ...mov,
    naturalezaMov: 'ingreso',
  }))
  const egresos = (reporte.egresos ?? []).map((mov) => ({
    ...mov,
    naturalezaMov: 'egreso',
  }))
  return [...ingresos, ...egresos].sort(
    (a, b) => (b.creadoEn ?? 0) - (a.creadoEn ?? 0),
  )
}

function filasResumenIngresosEgresos(reporte) {
  const { resumen } = reporte
  return [
    ['Total ingresos', formatearPrecioCuenta(resumen.totalGeneral)],
    ['Ingresos en efectivo', formatearPrecioCuenta(resumen.totalEfectivo)],
    ['Ingresos por Wompi', formatearPrecioCuenta(resumen.totalWompi)],
    [
      'Ingresos por transferencia',
      formatearPrecioCuenta(resumen.totalTransferencia),
    ],
    ['Total egresos', formatearPrecioCuenta(resumen.totalEgresos ?? 0)],
    ['Balance neto', formatearPrecioCuenta(resumen.balanceNeto ?? 0)],
    ['Movimientos de ingreso', String(resumen.movimientosConIngreso ?? 0)],
    ['Movimientos de egreso', String(resumen.movimientosEgreso ?? 0)],
  ]
}

function filaDetalleMovimiento(mov) {
  const esEgreso = mov.naturalezaMov === 'egreso'
  const canal =
    CANAL_LABEL[mov.canalIngreso] ||
    CANAL_LABEL[mov.metodoPago] ||
    mov.canalIngreso ||
    mov.metodoPago ||
    '—'

  return [
    esEgreso ? 'Egreso' : 'Ingreso',
    formatearFechaHoraCuenta(mov.creadoEn),
    mov.fecha || '—',
    mov.descripcion || mov.concepto || '—',
    mov.categoriaLabel || mov.categoria || '—',
    canal,
    mov.cedula || '—',
    mov.nombre || '—',
    formatearPrecioCuenta(mov.monto),
  ]
}

function filasDetalleCompleto(reporte) {
  return combinarMovimientosReporte(reporte).map(filaDetalleMovimiento)
}

function canalLabelMovimiento(mov, esEgreso = false) {
  const key = esEgreso ? mov.metodoPago : mov.canalIngreso
  return CANAL_LABEL[key] || key || mov.metodoPago || '—'
}

function filaDetalleIngreso(mov) {
  return [
    formatearFechaHoraCuenta(mov.creadoEn),
    mov.fecha || '—',
    mov.descripcion || '—',
    mov.categoriaLabel || mov.categoria || '—',
    canalLabelMovimiento(mov, false),
    mov.cedula || '—',
    mov.nombre || '—',
    formatearPrecioCuenta(mov.monto),
  ]
}

function filaDetalleEgreso(mov) {
  return [
    formatearFechaHoraCuenta(mov.creadoEn),
    mov.fecha || '—',
    mov.descripcion || mov.concepto || '—',
    mov.categoriaLabel || mov.categoria || '—',
    canalLabelMovimiento(mov, true),
    formatearPrecioCuenta(mov.monto),
  ]
}

function filasResumenComparativoPdf(reporte) {
  const { resumen } = reporte
  const eg = resumen.egresosPorMetodo ?? {}

  return [
    [
      'Efectivo',
      formatearPrecioCuenta(resumen.totalEfectivo),
      'Efectivo',
      formatearPrecioCuenta(eg.efectivo ?? 0),
    ],
    [
      'Wompi',
      formatearPrecioCuenta(resumen.totalWompi),
      'Wompi',
      formatearPrecioCuenta(eg.wompi ?? 0),
    ],
    [
      'Transferencia',
      formatearPrecioCuenta(resumen.totalTransferencia),
      'Transferencia',
      formatearPrecioCuenta(eg.transferencia ?? 0),
    ],
    [
      'Otro',
      formatearPrecioCuenta(resumen.totalOtro ?? 0),
      'Otro',
      formatearPrecioCuenta(eg.otro ?? 0),
    ],
  ]
}

function pieResumenComparativoPdf(reporte) {
  const { resumen } = reporte
  return [
    [
      'Total ingresos',
      formatearPrecioCuenta(resumen.totalGeneral),
      'Total egresos',
      formatearPrecioCuenta(resumen.totalEgresos ?? 0),
    ],
  ]
}

const COLUMNAS_DETALLE_INGRESO = [
  'Fecha registro',
  'Día',
  'Descripción',
  'Categoría',
  'Canal',
  'Cédula',
  'Nombre',
  'Monto',
]

const COLUMNAS_DETALLE_EGRESO = [
  'Fecha registro',
  'Día',
  'Descripción',
  'Categoría',
  'Método pago',
  'Monto',
]

function filasResumen(reporte) {
  const { resumen } = reporte
  return [
    ['Total ingresos', formatearPrecioCuenta(resumen.totalGeneral)],
    ['Ingresos en efectivo', formatearPrecioCuenta(resumen.totalEfectivo)],
    ['Ingresos por Wompi', formatearPrecioCuenta(resumen.totalWompi)],
    [
      'Ingresos por transferencia',
      formatearPrecioCuenta(resumen.totalTransferencia),
    ],
    ['Movimientos con ingreso', String(resumen.movimientosConIngreso)],
  ]
}

function filasDetalle(movimientos) {
  return movimientos.map((mov) => [
    formatearFechaHoraCuenta(mov.creadoEn),
    mov.fecha || '—',
    mov.descripcion || '—',
    mov.categoriaLabel || mov.categoria || '—',
    CANAL_LABEL[mov.canalIngreso] || mov.canalIngreso || '—',
    mov.cedula || '—',
    mov.nombre || '—',
    formatearPrecioCuenta(mov.monto),
  ])
}

export function exportarReportePdf(reporte) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const desdeLabel = formatearFechaCuenta(
    new Date(`${reporte.desde}T12:00:00-05:00`).getTime(),
  )
  const hastaLabel = formatearFechaCuenta(
    new Date(`${reporte.hasta}T12:00:00-05:00`).getTime(),
  )

  doc.setFontSize(16)
  doc.text('Rangers Box — Reporte financiero', 14, 18)
  doc.setFontSize(10)
  doc.text(`Periodo: ${desdeLabel} – ${hastaLabel}`, 14, 26)
  doc.text(`Sede: ${reporte.sedeId}`, 14, 32)
  doc.text(`Generado: ${new Date().toLocaleString('es-CO')}`, 14, 38)

  autoTable(doc, {
    startY: 44,
    head: [['Concepto', 'Valor']],
    body: filasResumen(reporte),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [249, 115, 22] },
  })

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 8,
    head: [
      [
        'Fecha registro',
        'Día',
        'Descripción',
        'Categoría',
        'Canal',
        'Cédula',
        'Nombre',
        'Monto',
      ],
    ],
    body: filasDetalle(reporte.movimientos ?? []),
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [38, 38, 38] },
  })

  doc.save(nombreArchivoReporte(reporte.desde, reporte.hasta, 'pdf'))
}

export function exportarReporteIngresosEgresosPdf(reporte) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const desdeLabel = formatearFechaCuenta(
    new Date(`${reporte.desde}T12:00:00-05:00`).getTime(),
  )
  const hastaLabel = formatearFechaCuenta(
    new Date(`${reporte.hasta}T12:00:00-05:00`).getTime(),
  )
  const ingresos = reporte.movimientos ?? []
  const egresos = reporte.egresos ?? []

  doc.setFontSize(16)
  doc.text('Rangers Box — Ingresos y egresos', 14, 18)
  doc.setFontSize(10)
  doc.text(`Periodo: ${desdeLabel} – ${hastaLabel}`, 14, 26)
  doc.text(`Sede: ${reporte.sedeId}`, 14, 32)
  doc.text(`Generado: ${new Date().toLocaleString('es-CO')}`, 14, 38)

  doc.setFontSize(11)
  doc.text('Resumen del periodo', 14, 46)

  autoTable(doc, {
    startY: 50,
    head: [['Ingresos', 'Monto', 'Egresos', 'Monto']],
    body: filasResumenComparativoPdf(reporte),
    foot: pieResumenComparativoPdf(reporte),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [249, 115, 22], halign: 'center' },
    footStyles: {
      fillColor: [38, 38, 38],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 42 },
      1: { cellWidth: 38, halign: 'right' },
      2: { cellWidth: 42 },
      3: { cellWidth: 38, halign: 'right' },
    },
    theme: 'grid',
  })

  const balanceY = doc.lastAutoTable.finalY + 6
  doc.setFontSize(10)
  doc.setFont(undefined, 'bold')
  doc.text(
    `Balance neto: ${formatearPrecioCuenta(reporte.resumen?.balanceNeto ?? 0)}`,
    14,
    balanceY,
  )
  doc.setFont(undefined, 'normal')

  let cursorY = balanceY + 8

  doc.setFontSize(11)
  doc.text('Detalle de ingresos', 14, cursorY)
  cursorY += 4

  autoTable(doc, {
    startY: cursorY,
    head: [COLUMNAS_DETALLE_INGRESO],
    body: ingresos.map(filaDetalleIngreso),
    foot: ingresos.length
      ? [['', '', '', '', '', '', 'Total ingresos', formatearPrecioCuenta(reporte.resumen?.totalGeneral ?? 0)]]
      : undefined,
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [34, 197, 94] },
    footStyles: {
      fillColor: [240, 253, 244],
      textColor: [22, 101, 52],
      fontStyle: 'bold',
    },
    columnStyles: { 7: { halign: 'right' } },
  })

  cursorY = doc.lastAutoTable.finalY + 10
  doc.setFontSize(11)
  doc.text('Detalle de egresos', 14, cursorY)
  cursorY += 4

  autoTable(doc, {
    startY: cursorY,
    head: [COLUMNAS_DETALLE_EGRESO],
    body: egresos.map(filaDetalleEgreso),
    foot: egresos.length
      ? [['', '', '', '', 'Total egresos', formatearPrecioCuenta(reporte.resumen?.totalEgresos ?? 0)]]
      : undefined,
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [239, 68, 68] },
    footStyles: {
      fillColor: [254, 242, 242],
      textColor: [153, 27, 27],
      fontStyle: 'bold',
    },
    columnStyles: { 5: { halign: 'right' } },
  })

  doc.save(
    nombreArchivoReporte(
      reporte.desde,
      reporte.hasta,
      'pdf',
      'ingresos-egresos',
    ),
  )
}

function montoNumericoMovimiento(mov) {
  const monto = Number(mov.monto)
  return Number.isFinite(monto) ? monto : 0
}

function filaEstadoFinancieroDetalle(mov) {
  const esEgreso = mov.naturalezaMov === 'egreso'

  return [
    esEgreso ? 'Egreso' : 'Ingreso',
    mov.fecha || '—',
    formatearFechaHoraCuenta(mov.creadoEn),
    mov.descripcion || mov.concepto || '—',
    mov.categoriaLabel || mov.categoria || '—',
    canalLabelMovimiento(mov, esEgreso),
    mov.cedula || '—',
    mov.nombre || '—',
    montoNumericoMovimiento(mov),
  ]
}

function filasResumenEstadoFinanciero(liquidez, reporte) {
  const resumen = reporte?.resumen ?? {}
  const efectivo = liquidez?.efectivo ?? {}
  const transferencia = liquidez?.transferencia ?? {
    ingresos: liquidez?.banco?.ingresosTransferencia ?? 0,
    egresos: liquidez?.banco?.egresosTransferencia ?? 0,
    disponible:
      (liquidez?.banco?.ingresosTransferencia ?? 0) -
      (liquidez?.banco?.egresosTransferencia ?? 0),
  }
  const wompi = liquidez?.wompi ?? {
    ingresos: liquidez?.banco?.ingresosWompi ?? 0,
    egresos: liquidez?.banco?.egresosWompi ?? 0,
    disponible:
      (liquidez?.banco?.ingresosWompi ?? 0) -
      (liquidez?.banco?.egresosWompi ?? 0),
  }

  const totalIngresos = liquidez?.totalIngresos ?? resumen.totalGeneral ?? 0
  const totalEgresos = liquidez?.totalEgresos ?? resumen.totalEgresos ?? 0
  const liquidezTotal =
    liquidez?.liquidezTotal ?? resumen.balanceNeto ?? totalIngresos - totalEgresos

  return [
    ['Concepto', 'Monto'],
    ['Total ingresos históricos', totalIngresos],
    ['Total egresos históricos', totalEgresos],
    ['Liquidez total', liquidezTotal],
    [],
    ['Medio de pago', 'Ingresos', 'Egresos', 'Disponible'],
    [
      'Efectivo',
      efectivo.ingresos ?? resumen.totalEfectivo ?? 0,
      efectivo.egresos ?? resumen.egresosPorMetodo?.efectivo ?? 0,
      efectivo.disponible ?? 0,
    ],
    [
      'Transferencia',
      transferencia.ingresos ?? resumen.totalTransferencia ?? 0,
      transferencia.egresos ?? resumen.egresosPorMetodo?.transferencia ?? 0,
      transferencia.disponible ?? 0,
    ],
    [
      'Wompi',
      wompi.ingresos ?? resumen.totalWompi ?? 0,
      wompi.egresos ?? resumen.egresosPorMetodo?.wompi ?? 0,
      wompi.disponible ?? 0,
    ],
  ]
}

function etiquetaPeriodoReporte(reporte) {
  if (reporte?.historialCompleto) return 'Historial completo'
  if (reporte?.desde && reporte?.hasta) {
    const desdeLabel = formatearFechaCuenta(
      new Date(`${reporte.desde}T12:00:00-05:00`).getTime(),
    )
    const hastaLabel = formatearFechaCuenta(
      new Date(`${reporte.hasta}T12:00:00-05:00`).getTime(),
    )
    return `${desdeLabel} – ${hastaLabel}`
  }
  return '—'
}

export function exportarEstadoFinancieroExcel({ reporte, liquidez } = {}) {
  if (!reporte) {
    throw new Error('No hay datos para exportar el estado financiero')
  }

  const generadoEn = new Date()
  const fechaArchivo = generadoEn.toLocaleDateString('en-CA', {
    timeZone: 'America/Bogota',
  })

  const estadoSheet = XLSX.utils.aoa_to_sheet([
    ['Rangers Box — Estado financiero'],
    ['Periodo', etiquetaPeriodoReporte(reporte)],
    ['Sede', reporte.sedeId ?? '—'],
    ['Generado', generadoEn.toLocaleString('es-CO')],
    ['Movimientos en detalle', combinarMovimientosReporte(reporte).length],
    [],
    ...filasResumenEstadoFinanciero(liquidez, reporte),
  ])

  const movimientosSheet = XLSX.utils.aoa_to_sheet([
    [
      'Tipo',
      'Fecha',
      'Fecha y hora registro',
      'Concepto',
      'Categoría',
      'Método / canal',
      'Cédula',
      'Nombre',
      'Monto',
    ],
    ...combinarMovimientosReporte(reporte).map(filaEstadoFinancieroDetalle),
  ])

  const libro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(libro, estadoSheet, 'Estado financiero')
  XLSX.utils.book_append_sheet(libro, movimientosSheet, 'Movimientos')
  XLSX.writeFile(libro, `estado-financiero-${fechaArchivo}.xlsx`)
}

export function exportarReporteExcel(reporte) {
  const desdeLabel = formatearFechaCuenta(
    new Date(`${reporte.desde}T12:00:00-05:00`).getTime(),
  )
  const hastaLabel = formatearFechaCuenta(
    new Date(`${reporte.hasta}T12:00:00-05:00`).getTime(),
  )

  const resumenSheet = XLSX.utils.aoa_to_sheet([
    ['Rangers Box — Reporte financiero'],
    ['Periodo', `${desdeLabel} – ${hastaLabel}`],
    ['Sede', reporte.sedeId],
    ['Generado', new Date().toLocaleString('es-CO')],
    [],
    ['Concepto', 'Valor'],
    ...filasResumen(reporte),
  ])

  const detalleSheet = XLSX.utils.aoa_to_sheet([
    [
      'Fecha registro',
      'Día',
      'Descripción',
      'Categoría',
      'Canal',
      'Cédula',
      'Nombre',
      'Monto',
    ],
    ...filasDetalle(reporte.movimientos ?? []),
  ])

  const libro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(libro, resumenSheet, 'Resumen')
  XLSX.utils.book_append_sheet(libro, detalleSheet, 'Detalle')
  XLSX.writeFile(
    libro,
    nombreArchivoReporte(reporte.desde, reporte.hasta, 'xlsx'),
  )
}

export function exportarReporteIngresosEgresosExcel(reporte) {
  const desdeLabel = formatearFechaCuenta(
    new Date(`${reporte.desde}T12:00:00-05:00`).getTime(),
  )
  const hastaLabel = formatearFechaCuenta(
    new Date(`${reporte.hasta}T12:00:00-05:00`).getTime(),
  )

  const resumenSheet = XLSX.utils.aoa_to_sheet([
    ['Rangers Box — Ingresos y egresos'],
    ['Periodo', `${desdeLabel} – ${hastaLabel}`],
    ['Sede', reporte.sedeId],
    ['Generado', new Date().toLocaleString('es-CO')],
    [],
    ['Concepto', 'Valor'],
    ...filasResumenIngresosEgresos(reporte),
  ])

  const detalleSheet = XLSX.utils.aoa_to_sheet([
    [
      'Tipo',
      'Fecha registro',
      'Día',
      'Descripción',
      'Categoría',
      'Canal / método',
      'Cédula',
      'Nombre',
      'Monto',
    ],
    ...filasDetalleCompleto(reporte),
  ])

  const libro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(libro, resumenSheet, 'Resumen')
  XLSX.utils.book_append_sheet(libro, detalleSheet, 'Detalle')
  XLSX.writeFile(
    libro,
    nombreArchivoReporte(
      reporte.desde,
      reporte.hasta,
      'xlsx',
      'ingresos-egresos',
    ),
  )
}
