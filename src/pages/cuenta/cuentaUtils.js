export function formatearFechaCuenta(ms) {
  if (!ms) return '—'
  try {
    return new Date(ms).toLocaleDateString('es-CO', {
      timeZone: 'America/Bogota',
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

export function formatearFechaNacimiento(valor) {
  if (!valor) return '—'
  const fecha = new Date(`${valor}T12:00:00`)
  if (Number.isNaN(fecha.getTime())) return valor
  return fecha.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

export function celularSinPrefijo(celular) {
  if (!celular) return ''
  return celular.replace(/^\+57/, '').replace(/\D/g, '').slice(0, 10)
}

export function inicialesNombre(nombre) {
  const texto = (nombre || '').trim()
  if (!texto) return '?'
  return texto.charAt(0).toUpperCase()
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

export function normalizarTimestampMs(valor) {
  if (valor == null || valor === '') return null

  if (typeof valor === 'number' && Number.isFinite(valor)) {
    if (valor > 0 && valor < 10_000_000_000) return valor * 1000
    return valor
  }

  if (typeof valor === 'string') {
    const numerico = Number(valor)
    if (Number.isFinite(numerico)) {
      if (numerico > 0 && numerico < 10_000_000_000) return numerico * 1000
      return numerico
    }
    const parsed = Date.parse(valor)
    return Number.isFinite(parsed) ? parsed : null
  }

  if (typeof valor === 'object') {
    if (typeof valor.toMillis === 'function') return valor.toMillis()

    const seconds = valor._seconds ?? valor.seconds
    if (seconds != null) {
      const nanos = valor._nanoseconds ?? valor.nanoseconds ?? 0
      return Number(seconds) * 1000 + Math.floor(Number(nanos) / 1e6)
    }
  }

  return null
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
      timeZone: 'America/Bogota',
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
