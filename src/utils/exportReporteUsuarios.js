import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import {
  formatearFechaHoraCuenta,
  formatearFechaTabla,
  formatearPrecioCuenta,
} from '../pages/cuenta/cuentaUtils.js'
import { textoDiasRestantesReporte } from './planVigenciaUtils.js'

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

function etiquetaTipoPlan(usuario) {
  if (usuario.planTipo === 'tiquetera') return 'Tiquetera'
  if ((usuario.planEstado ?? 'sin_plan') !== 'sin_plan') return 'Membresía'
  return '—'
}

function formatearFechaNacimiento(valor) {
  if (!valor) return '—'
  if (typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const [y, m, d] = valor.split('-')
    return `${d}/${m}/${y}`
  }
  return formatearFechaTabla(valor)
}

function textoVigenciaModificada(usuario) {
  if (!usuario.vigenciaModificada) return 'No'
  const causal = usuario.ultimaModificacionVigencia?.causal
  return causal ? `Sí — ${causal}` : 'Sí'
}

function formatearValorPagado(usuario) {
  const monto = usuario.valorPagadoActivacion
  if (monto == null || !Number.isFinite(Number(monto))) return '—'
  return formatearPrecioCuenta(monto)
}

function valorPagadoNumerico(usuario) {
  const monto = usuario.valorPagadoActivacion
  if (monto == null || !Number.isFinite(Number(monto))) return '—'
  return Number(monto)
}

function valorMonetarioNumerico(valor) {
  if (valor == null || !Number.isFinite(Number(valor))) return '—'
  return Number(valor)
}

function usuarioCuentaEnResumenFinanciero(usuario) {
  return usuario.rolEnPlan !== 'beneficiario'
}

function calcularResumenFinancieroUsuarios(usuarios) {
  let totalPagado = 0
  let totalEfectivo = 0
  let totalTransferencia = 0
  let totalWompi = 0
  let activacionesConPago = 0

  for (const usuario of usuarios) {
    if (!usuarioCuentaEnResumenFinanciero(usuario)) continue

    const monto = Number(usuario.valorPagadoActivacion)
    if (!Number.isFinite(monto) || monto <= 0) continue

    activacionesConPago += 1
    totalPagado += monto

    const metodo = String(usuario.metodoPagoActivacion || '').toLowerCase()
    if (metodo === 'efectivo') totalEfectivo += monto
    else if (metodo === 'transferencia') totalTransferencia += monto
    else if (metodo === 'wompi') totalWompi += monto
  }

  return {
    totalPagado,
    totalEfectivo,
    totalTransferencia,
    totalWompi,
    activacionesConPago,
  }
}

function filasResumenFinanciero(usuarios) {
  const resumen = calcularResumenFinancieroUsuarios(usuarios)

  return [
    ['Activaciones con pago registrado', resumen.activacionesConPago],
    ['Total pagado (sin duplicar beneficiarios)', resumen.totalPagado],
    ['Total en efectivo', resumen.totalEfectivo],
    ['Total por transferencia', resumen.totalTransferencia],
    ['Total por Wompi', resumen.totalWompi],
  ]
}

const ENCABEZADOS_DETALLE = [
  'ID',
  'UID',
  'Nombre',
  'Tipo documento',
  'Documento',
  'Celular',
  'Fecha nacimiento',
  'Membresía / plan',
  'Estado del plan',
  'Tipo de plan',
  'Entradas restantes',
  'Entradas incluidas',
  'Método de pago',
  'Valor pagado',
  'Valor esperado plan',
  'Descuento cupón',
  'Código cupón',
  'Fecha pago activación',
  'Origen del pago',
  'Referencia transferencia',
  'Fecha inicio membresía',
  'Fecha vigencia',
  'Días restantes',
  'Vigencia modificada (admin)',
  'Rol en plan',
  'Grupo del plan',
  'Registrado por',
  'Plan activado por',
  'Fecha de registro',
]

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
    formatearValorPagado(usuario),
    usuario.registroPor || '—',
    usuario.activacionPor || '—',
    usuario.vigenciaModificada ? 'Sí' : '—',
    resumenGrupoPlan(usuario),
    planEstado === 'sin_plan' ? '—' : formatearFechaTabla(usuario.fechaInicio),
    planEstado === 'sin_plan' ? '—' : formatearFechaTabla(usuario.vigencia),
    textoDiasRestantesReporte(planEstado, usuario.vigencia),
    formatearFechaTabla(usuario.fechaCreacion),
  ]
}

function filaUsuarioDetallada(usuario) {
  const planEstado = usuario.planEstado ?? 'sin_plan'
  const sinPlan = planEstado === 'sin_plan'

  return [
    usuario.id ?? '—',
    usuario.uid ?? '—',
    usuario.nombre || '—',
    usuario.tipoDocumento || '—',
    usuario.documento || '—',
    usuario.celular || '—',
    formatearFechaNacimiento(usuario.fechaNacimiento),
    etiquetaPlan(usuario),
    PLAN_ESTADO_LABEL[planEstado] || planEstado,
    etiquetaTipoPlan(usuario),
    usuario.planTipo === 'tiquetera' ? (usuario.entradasRestantes ?? '—') : '—',
    usuario.planTipo === 'tiquetera' ? (usuario.entradasIncluidas ?? '—') : '—',
    usuario.metodoPagoActivacion || '—',
    valorPagadoNumerico(usuario),
    valorMonetarioNumerico(usuario.valorEsperadoActivacion),
    valorMonetarioNumerico(usuario.descuentoCupon),
    usuario.codigoCupon || '—',
    usuario.fechaPagoActivacion
      ? formatearFechaHoraCuenta(usuario.fechaPagoActivacion)
      : '—',
    usuario.origenPago || '—',
    usuario.referenciaPago || '—',
    sinPlan ? '—' : formatearFechaTabla(usuario.fechaInicio),
    sinPlan ? '—' : formatearFechaTabla(usuario.vigencia),
    textoDiasRestantesReporte(planEstado, usuario.vigencia),
    textoVigenciaModificada(usuario),
    usuario.rolEnPlan === 'titular'
      ? 'Titular'
      : usuario.rolEnPlan === 'beneficiario'
        ? 'Beneficiario'
        : '—',
    resumenGrupoPlan(usuario),
    usuario.registroPor || '—',
    usuario.activacionPor || '—',
    formatearFechaHoraCuenta(usuario.fechaCreacion),
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
        'Valor pagado',
        'Registrado por',
        'Plan activado por',
        'Vig. modificada',
        'Grupo',
        'Inicio',
        'Vigencia',
        'Días rest.',
        'Creado',
      ],
    ],
    body: usuarios.map(filaUsuario),
    styles: { fontSize: 5.5, cellPadding: 1.1, overflow: 'linebreak' },
    headStyles: { fillColor: [38, 38, 38], fontSize: 5.5 },
    columnStyles: {
      0: { cellWidth: 7 },
      1: { cellWidth: 20 },
      2: { cellWidth: 7 },
      3: { cellWidth: 13 },
      4: { cellWidth: 13 },
      5: { cellWidth: 15 },
      6: { cellWidth: 10 },
      7: { cellWidth: 11 },
      8: { cellWidth: 12 },
      9: { cellWidth: 16 },
      10: { cellWidth: 16 },
      11: { cellWidth: 10 },
      12: { cellWidth: 18 },
      13: { cellWidth: 11 },
      14: { cellWidth: 11 },
      15: { cellWidth: 16 },
      16: { cellWidth: 11 },
    },
    margin: { left: margen, right: margen },
  })

  doc.save(`reporte-usuarios-${fechaArchivoReporte(generadoEn)}.pdf`)
}

export function exportarReporteUsuariosExcel(reporte) {
  const generadoEn = reporte?.generadoEn ?? Date.now()
  const usuarios = reporte?.usuarios ?? []
  const estadisticas = reporte?.estadisticas ?? {}

  const resumenSheet = XLSX.utils.aoa_to_sheet([
    ['Rangers Box — Reporte de usuarios'],
    ['Generado', formatearFechaHoraCuenta(generadoEn)],
    ['Total en reporte', usuarios.length],
    [],
    ['Concepto', 'Cantidad'],
    ...filasResumen(estadisticas),
    [],
    ['Resumen financiero', 'Valor'],
    ...filasResumenFinanciero(usuarios),
  ])

  const detalleSheet = XLSX.utils.aoa_to_sheet([
    ENCABEZADOS_DETALLE,
    ...usuarios.map(filaUsuarioDetallada),
  ])

  const libro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(libro, resumenSheet, 'Resumen')
  XLSX.utils.book_append_sheet(libro, detalleSheet, 'Usuarios')
  XLSX.writeFile(libro, `reporte-usuarios-${fechaArchivoReporte(generadoEn)}.xlsx`)
}
