import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  formatearDuracionMs,
  formatearFechaCuenta,
  formatearFechaTabla,
  formatearHoraCuenta,
  formatearPrecioCuenta,
} from '../pages/cuenta/cuentaUtils.js'
import { etiquetaMetodoPagoColaborador } from '../constants/metodosPagoColaborador.js'
import { NOTA_LIQUIDACION_HASTA_DIA_ANTERIOR } from '../constants/nominaLaboral.js'

function nombreArchivoDesprendible(desprendible) {
  const doc = desprendible.colaboradorDocumento || desprendible.colaboradorUid
  return `desprendible-nomina-${doc}-${desprendible.fechaInicio}-${desprendible.fechaFin}.pdf`
}

function filaTurno(linea) {
  return [
    formatearFechaTabla(linea.inicioEn),
    `${formatearHoraCuenta(linea.inicioEn)} – ${formatearHoraCuenta(linea.finEn)}`,
    formatearDuracionMs(linea.duracionMs),
    linea.esDomingo ? 'Sí' : 'No',
    linea.horasNocturnas > 0 ? `${linea.horasNocturnas} h` : '—',
    linea.horasExtra > 0 ? `${linea.horasExtra} h` : '—',
    formatearPrecioCuenta(linea.pagoOrdinario),
    linea.pagoExtra > 0 ? formatearPrecioCuenta(linea.pagoExtra) : '—',
    linea.pagoRecargoDominical > 0
      ? formatearPrecioCuenta(linea.pagoRecargoDominical)
      : '—',
    linea.pagoRecargoNocturno > 0
      ? formatearPrecioCuenta(linea.pagoRecargoNocturno)
      : '—',
    formatearPrecioCuenta(linea.pagoTotal),
  ]
}

export function exportarDesprendibleNominaPdf(desprendible) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const resumen = desprendible.resumen ?? {}
  const margen = 14
  let y = margen

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('Rangers Box', margen, y)
  y += 7

  doc.setFontSize(12)
  doc.text('Desprendible de nómina', margen, y)
  y += 8

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)

  const info = [
    `Colaborador: ${desprendible.colaboradorNombre}`,
    `Identificación: ${desprendible.colaboradorDocumento || '—'}`,
    `Esquema: ${desprendible.esquemaNombre || desprendible.esquemaPago || '—'}`,
    `Método de pago: ${desprendible.metodoPago ? etiquetaMetodoPagoColaborador(desprendible.metodoPago) : '—'}`,
    `Cuenta: ${desprendible.numeroCuenta || '—'}`,
    `Periodo: ${formatearFechaCuenta(new Date(`${desprendible.fechaInicio}T12:00:00`).getTime())} – ${formatearFechaCuenta(new Date(`${desprendible.fechaFin}T12:00:00`).getTime())}`,
    `Días laborados: ${resumen.diasLaborados ?? 0}`,
    `Liquidado: ${formatearFechaCuenta(desprendible.liquidadoEn)}`,
  ]

  info.forEach((linea) => {
    doc.text(linea, margen, y)
    y += 5
  })

  y += 2
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  const notaLineas = doc.splitTextToSize(
    NOTA_LIQUIDACION_HASTA_DIA_ANTERIOR,
    doc.internal.pageSize.getWidth() - margen * 2,
  )
  notaLineas.forEach((linea) => {
    doc.text(linea, margen, y)
    y += 4
  })
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(10)

  y += 3

  autoTable(doc, {
    startY: y,
    head: [
      [
        'Fecha',
        'Horario',
        'Tiempo',
        'Dom.',
        'H. noct.',
        'H. extra',
        'Ordinario',
        'Extra',
        'Rec. dom.',
        'Rec. noct.',
        'Total',
      ],
    ],
    body: (desprendible.turnos ?? []).map(filaTurno),
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: [249, 115, 22] },
    margin: { left: margen, right: margen },
  })

  y = doc.lastAutoTable.finalY + 8

  const totales = [
    ['Pago ordinario', formatearPrecioCuenta(resumen.pagoOrdinario)],
    ['Pago horas extra', formatearPrecioCuenta(resumen.pagoExtra)],
    [
      'Recargo dominical',
      formatearPrecioCuenta(resumen.pagoRecargoDominical),
    ],
    ['Recargo nocturno', formatearPrecioCuenta(resumen.pagoRecargoNocturno)],
    ['TOTAL A PAGAR', formatearPrecioCuenta(resumen.pagoTotal)],
  ]

  autoTable(doc, {
    startY: y,
    body: totales,
    styles: { fontSize: 9 },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'right' },
    },
    margin: { left: margen, right: margen },
  })

  doc.save(nombreArchivoDesprendible(desprendible))
}
