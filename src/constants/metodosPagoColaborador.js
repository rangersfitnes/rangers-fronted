export const METODO_PAGO_OTRO = 'otro'

export const METODOS_PAGO_COLABORADOR = [
  { id: 'transferencia', label: 'Transferencia bancaria' },
  { id: 'nequi', label: 'Nequi' },
  { id: 'daviplata', label: 'Daviplata' },
  { id: 'bancolombia', label: 'Bancolombia' },
  { id: 'nubank', label: 'Nubank' },
  { id: 'efectivo', label: 'Efectivo' },
  { id: METODO_PAGO_OTRO, label: 'Otro' },
]

const IDS_PREDEFINIDOS = new Set(
  METODOS_PAGO_COLABORADOR.filter((m) => m.id !== METODO_PAGO_OTRO).map(
    (m) => m.id,
  ),
)

export function esMetodoPagoPredefinido(id) {
  return IDS_PREDEFINIDOS.has(id)
}

export function etiquetaMetodoPagoColaborador(id) {
  if (!id) return '—'
  const conocido = METODOS_PAGO_COLABORADOR.find(
    (m) => m.id === id && m.id !== METODO_PAGO_OTRO,
  )
  return conocido?.label ?? id
}

export function metodoPagoParaFormulario(valorGuardado) {
  if (!valorGuardado) {
    return { metodoPago: '', metodoPagoOtro: '' }
  }
  if (esMetodoPagoPredefinido(valorGuardado)) {
    return { metodoPago: valorGuardado, metodoPagoOtro: '' }
  }
  return { metodoPago: METODO_PAGO_OTRO, metodoPagoOtro: valorGuardado }
}

export function resolverMetodoPagoParaGuardar(metodoPago, metodoPagoOtro) {
  if (metodoPago === METODO_PAGO_OTRO) {
    return String(metodoPagoOtro || '').trim()
  }
  return metodoPago
}

export function requiereNumeroCuenta(metodoPago) {
  return metodoPago && metodoPago !== 'efectivo'
}
