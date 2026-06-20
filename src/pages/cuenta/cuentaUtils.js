export function formatearFechaCuenta(ms) {
  if (!ms) return '—'
  try {
    return new Date(ms).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

export function formatearFechaHoraCuenta(ms) {
  if (!ms) return '—'
  try {
    return new Date(ms).toLocaleString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

export function formatearPrecioCuenta(valor) {
  const numero = Number(valor) || 0
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numero)
}

export function formatearDuracionMs(ms) {
  const totalSeg = Math.max(0, Math.floor(Number(ms) / 1000))
  const horas = Math.floor(totalSeg / 3600)
  const minutos = Math.floor((totalSeg % 3600) / 60)
  const segundos = totalSeg % 60
  return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`
}

export function formatearHoraCuenta(ms) {
  if (!ms) return '—'
  try {
    return new Date(ms).toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return '—'
  }
}

export function formatearFechaTabla(ms) {
  if (!ms) return '—'
  try {
    return new Date(ms).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

export function parseMonedaCOP(valor) {
  const limpio = String(valor ?? '').replace(/\D/g, '')
  if (!limpio) return NaN
  const numero = Number(limpio)
  return Number.isFinite(numero) ? numero : NaN
}

export function formatearMonedaCOPInput(valor) {
  const numero = parseMonedaCOP(valor)
  if (!Number.isFinite(numero)) return ''
  return formatearPrecioCuenta(numero)
}

const METODO_PAGO_LABEL = {
  transferencia: 'Transferencia',
  efectivo: 'Efectivo',
}

const ORIGEN_LABEL = {
  'pago-online': 'Pago en línea',
  'admin-punto-fisico': 'Punto físico',
}

export function etiquetaMetodoPago(metodo) {
  return METODO_PAGO_LABEL[metodo] || metodo || '—'
}

export function etiquetaOrigenPago(origen) {
  return ORIGEN_LABEL[origen] || origen || '—'
}
