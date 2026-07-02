import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import {
  formatearFechaHoraCuenta,
  formatearFechaTabla,
} from '../pages/cuenta/cuentaUtils.js'

const PLAN_ESTADO_LABEL = {
  activo: 'Activo',
  vencido: 'Vencido',
  sin_plan: 'Sin plan',
}

function fechaArchivoReporte(generadoEn) {
  const fecha = new Date(generadoEn ?? Date.now())
  return fecha.toLocaleDateString('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function etiquetaPlan(usuario) {
  const estado = usuario.planEstado ?? 'sin_plan'

  if (estado === 'activo') {
    return usuario.planNombre || usuario.plan || 'Activo'
  }

  if (estado === 'vencido') {
    return usuario.planNombre || 'Plan vencido'
  }

  return 'Inactivo'
}

function resumenGrupoPlan(usuario) {
  const grupo = usuario.planGrupo
  if (!grupo?.miembros?.length) return '—'

  const rolEtiqueta =
    usuario.rolEnPlan === 'titular'
      ? 'Titular'
      : usuario.rolEnPlan === 'beneficiario'
        ? 'Beneficiario'
        : ''

  const miembros = grupo.miembros
    .map((m) => `${m.nombre || '—'} (${m.documento || '—'})`)
    .join('; ')

  return rolEtiqueta ? `${rolEtiqueta}: ${miembros}` : miembros
}

function filaUsuario(usuario) {
  const planEstado = usuario.planEstado ?? 'sin_plan'

  return [
    usuario.id ?? '—',
    usuario.nombre || '—',
    usuario.tipoDocumento || '—',
    usuario.documento || '—',
    usuario.celular || '—',
    etiquetaPlan(usuario),
    PLAN_ESTADO_LABEL[planEstado] || planEstado,
    usuario.metodoPagoActivacion || '—',
    usuario.registroPor || '—',
    usuario.activacionPor || '—',
    usuario.vigenciaModificada ? 'Sí' : '—',
    resumenGrupoPlan(usuario),
    planEstado === 'sin_plan' ? '—' : formatearFechaTabla(usuario.fechaInicio),
    planEstado === 'sin_plan' ? '—' : formatearFechaTabla(usuario.vigencia),
    formatearFechaTabla(usuario.fechaCreacion),
  ]
}

function filasResumen(estadisticas) {
  return [
    ['Total registrados', String(estadisticas?.total ?? 0)],
    ['Con plan activo', String(estadisticas?.activos ?? 0)],
    ['Plan vencido', String(estadisticas?.vencidos ?? 0)],
    ['Sin plan', String(estadisticas?.sinPlan ?? 0)],
  ]
}

export function exportarReporteUsuariosPdf(reporte) {
  const generadoEn = reporte?.generadoEn ?? Date.now()
  const usuarios = reporte?.usuarios ?? []
  const estadisticas = reporte?.estadisticas ?? {}

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const margen = 10

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('Rangers Box — Reporte de usuarios', margen, 16)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(
    `Generado: ${formatearFechaHoraCuenta(generadoEn)}`,
    margen,
    24,
  )
  doc.text(`Total en reporte: ${usuarios.length}`, margen, 30)

  autoTable(doc, {
    startY: 36,
    head: [['Concepto', 'Cantidad']],
    body: filasResumen(estadisticas),
    styles: { fontSize: 9, cellPadding: 2 },
    headStyles: { fillColor: [249, 115, 22] },
    tableWidth: 90,
    margin: { left: margen },
  })

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 8,
    head: [
      [
        'ID',
        'Nombre',
        'Tipo',
        'Documento',
        'Celular',
        'Plan',
        'Estado',
        'Método pago',
        'Registrado por',
        'Plan activado por',
        'Vig. modificada',
        'Grupo',
        'Inicio',
        'Vigencia',
        'Creado',
      ],
    ],
    body: usuarios.map(filaUsuario),
    styles: { fontSize: 6, cellPadding: 1.2, overflow: 'linebreak' },
    headStyles: { fillColor: [38, 38, 38], fontSize: 6 },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 24 },
      2: { cellWidth: 8 },
      3: { cellWidth: 16 },
      4: { cellWidth: 16 },
      5: { cellWidth: 18 },
      6: { cellWidth: 11 },
      7: { cellWidth: 14 },
      8: { cellWidth: 22 },
      9: { cellWidth: 22 },
      10: { cellWidth: 14 },
      11: { cellWidth: 24 },
      12: { cellWidth: 14 },
      13: { cellWidth: 14 },
      14: { cellWidth: 14 },
    },
    margin: { left: margen, right: margen },
  })

  doc.save(`reporte-usuarios-${fechaArchivoReporte(generadoEn)}.pdf`)
}
