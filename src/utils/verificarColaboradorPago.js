import { esMetodoPagoPredefinido } from '../constants/metodosPagoColaborador.js'

function coincideMetodoPago(enviado, recibido) {
  const a = String(enviado || '').trim()
  const b = String(recibido || '').trim()
  if (!a) return !b
  if (esMetodoPagoPredefinido(a)) {
    return a.toLowerCase() === b.toLowerCase()
  }
  return a === b
}

export function verificarColaboradorPagoGuardado(payload, actualizado) {
  if (!actualizado) {
    throw new Error('El servidor no devolvió el colaborador actualizado')
  }

  if (!Object.prototype.hasOwnProperty.call(actualizado, 'metodoPago')) {
    throw new Error(
      'El backend está desactualizado y no guarda el método de pago. Detén el servidor, reinícialo desde rangers-backend con npm start y vuelve a intentar.',
    )
  }

  const metodoEnviado = String(payload.metodoPago || '').trim()
  if (
    metodoEnviado &&
    !coincideMetodoPago(metodoEnviado, actualizado.metodoPago)
  ) {
    throw new Error(
      'El método de pago no se guardó correctamente. Reinicia el backend desde rangers-backend.',
    )
  }

  const cuentaEnviada = String(payload.numeroCuenta || '').trim()
  const cuentaRecibida = String(actualizado.numeroCuenta || '').trim()
  if (cuentaEnviada && cuentaRecibida !== cuentaEnviada) {
    throw new Error(
      'El número de cuenta no se guardó correctamente. Reinicia el backend desde rangers-backend.',
    )
  }
}
