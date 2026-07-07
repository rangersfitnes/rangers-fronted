import { useCallback, useRef, useState } from 'react'
import { useUsuario } from '../contexts/UsuarioContext.jsx'
import { cargarWidgetWompi, crearTransaccionWompi } from '../services/wompiService.js'

const MAX_INTENTOS_CONFIRMACION = 12
const INTERVALO_CONFIRMACION_MS = 3000

export function useWompiCheckout({ sede } = {}) {
  const { usuario, refresh } = useUsuario()
  const [procesando, setProcesando] = useState(false)
  const [confirmando, setConfirmando] = useState(false)
  const [pagoExito, setPagoExito] = useState(false)
  const [error, setError] = useState('')
  const confirmacionRef = useRef(false)
  const renovacionTiqueteraRef = useRef(false)

  const esperarActivacion = useCallback(async () => {
    setConfirmando(true)
    for (let intento = 0; intento < MAX_INTENTOS_CONFIRMACION; intento += 1) {
      // eslint-disable-next-line no-await-in-loop
      const datos = await refresh().catch(() => null)
      const activo = datos?.planesActivos?.[0] ?? null

      if (renovacionTiqueteraRef.current) {
        if (
          activo &&
          activo.tipo === 'tiquetera' &&
          Number(activo.entradasRestantes) > 0
        ) {
          setConfirmando(false)
          setPagoExito(true)
          renovacionTiqueteraRef.current = false
          return
        }
      } else if (activo || datos?.planesActivos?.length) {
        setConfirmando(false)
        setPagoExito(true)
        return
      }

      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) =>
        setTimeout(resolve, INTERVALO_CONFIRMACION_MS),
      )
    }
    setConfirmando(false)
    renovacionTiqueteraRef.current = false
    setError(
      'Tu pago se está procesando. Si ya pagaste, tu plan se activará en unos minutos.',
    )
  }, [refresh])

  const pagar = useCallback(
    async ({ planId, beneficiarios = [], codigoCupon = '' }) => {
      if (procesando || confirmando) return

      if (!planId) {
        setError('No se encontró el plan para procesar el pago.')
        return
      }

      setProcesando(true)
      try {
        const planPrevio = usuario?.planesActivos?.[0] ?? null
        renovacionTiqueteraRef.current = Boolean(
          planPrevio?.puedeRenovar ||
            (planPrevio?.tipo === 'tiquetera' &&
              Number(planPrevio.entradasRestantes) === 0),
        )

        await cargarWidgetWompi()

        if (!window.WidgetCheckout) {
          throw new Error('La pasarela de pagos no está disponible')
        }

        const datos = await crearTransaccionWompi({
          planId,
          beneficiarios,
          sede,
          codigoCupon: codigoCupon || undefined,
        })

        const checkout = new window.WidgetCheckout({
          currency: datos.currency,
          amountInCents: datos.amountInCents,
          reference: datos.reference,
          publicKey: datos.publicKey,
          signature: { integrity: datos.signature },
          customerData: usuario
            ? {
                email: `${usuario.documento}@gmail.com`,
                fullName: usuario.nombre || '',
                phoneNumber: (usuario.celular || '')
                  .replace(/\D/g, '')
                  .slice(-10),
                phoneNumberPrefix: '+57',
                legalId: String(usuario.documento || ''),
                legalIdType: usuario.tipoDocumento || 'CC',
              }
            : undefined,
        })

        checkout.open((result) => {
          const transaction = result?.transaction
          if (transaction?.status === 'APPROVED') {
            if (!confirmacionRef.current) {
              confirmacionRef.current = true
              esperarActivacion()
            }
          } else if (transaction?.status === 'DECLINED') {
            setError('El pago fue rechazado. Intenta con otro medio de pago.')
          }
        })
      } catch (err) {
        setError(err.message || 'No se pudo iniciar el pago')
      } finally {
        setProcesando(false)
      }
    },
    [procesando, confirmando, sede, usuario, esperarActivacion],
  )

  return {
    pagar,
    procesando,
    confirmando,
    pagoExito,
    error,
    limpiarError: () => setError(''),
  }
}
