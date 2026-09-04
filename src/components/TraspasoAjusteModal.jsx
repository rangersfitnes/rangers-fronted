import { useEffect, useMemo, useState } from 'react'
import CampoFechaCalendario from './CampoFechaCalendario.jsx'
import ConfirmModal from './ConfirmModal.jsx'
import Modal from './Modal.jsx'
import { useToast } from './Toast.jsx'
import {
  registrarAjusteCuenta,
  registrarTraspaso,
} from '../services/finanzasService.js'
import { obtenerLiquidezHistorica } from '../services/reportesFinancierosService.js'
import {
  CUENTAS_TRASPASO_AJUSTE,
  MOTIVO_AJUSTE_AUTOMATICO,
  planificarTraspasoYAjuste,
} from '../utils/planificarTraspasoYAjuste.js'
import { formatearPrecioCuenta } from '../pages/cuenta/cuentaUtils.js'
import './ActivarPlanModal.css'
import './TraspasoAjusteModal.css'

const CUENTA_LABEL = Object.fromEntries(
  CUENTAS_TRASPASO_AJUSTE.map((c) => [c.id, c.label]),
)

function fechaHoyColombiaInput() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function parseMonto(valor) {
  const texto = String(valor ?? '').trim()
  if (texto === '') return NaN
  const limpio = texto.replace(/\./g, '').replace(/,/g, '.')
  const numero = Number(limpio)
  return Number.isFinite(numero) ? numero : NaN
}

function saldosDesdeLiquidez(liquidez) {
  return {
    efectivo: Math.round(Number(liquidez?.efectivo?.disponible) || 0),
    transferencia: Math.round(Number(liquidez?.transferencia?.disponible) || 0),
    wompi: Math.round(Number(liquidez?.wompi?.disponible) || 0),
  }
}

function TraspasoAjusteModal({ open, onClose, onGuardado }) {
  const toast = useToast()
  const [fecha, setFecha] = useState(fechaHoyColombiaInput)
  const [reales, setReales] = useState({
    efectivo: '',
    transferencia: '',
    wompi: '',
  })
  const [saldosSistema, setSaldosSistema] = useState(null)
  const [cargandoSaldos, setCargandoSaldos] = useState(false)
  const [errorSaldos, setErrorSaldos] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [alarmaAbierta, setAlarmaAbierta] = useState(false)

  const limpiar = () => {
    setFecha(fechaHoyColombiaInput())
    setReales({ efectivo: '', transferencia: '', wompi: '' })
    setSaldosSistema(null)
    setErrorSaldos('')
    setError('')
    setAlarmaAbierta(false)
  }

  const handleCerrar = () => {
    if (guardando || alarmaAbierta) return
    limpiar()
    onClose?.()
  }

  useEffect(() => {
    if (!open) return undefined

    const controller = new AbortController()
    setCargandoSaldos(true)
    setErrorSaldos('')
    setError('')
    setAlarmaAbierta(false)

    obtenerLiquidezHistorica({ signal: controller.signal })
      .then((data) => {
        setSaldosSistema(saldosDesdeLiquidez(data))
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return
        setSaldosSistema(null)
        setErrorSaldos(err.message || 'No se pudieron cargar los saldos')
      })
      .finally(() => {
        if (!controller.signal.aborted) setCargandoSaldos(false)
      })

    return () => controller.abort()
  }, [open])

  const saldosRealesParseados = useMemo(() => {
    const resultado = {}
    for (const cuenta of CUENTAS_TRASPASO_AJUSTE) {
      resultado[cuenta.id] = parseMonto(reales[cuenta.id])
    }
    return resultado
  }, [reales])

  const todosRealesValidos = CUENTAS_TRASPASO_AJUSTE.every(
    (cuenta) =>
      Number.isFinite(saldosRealesParseados[cuenta.id]) &&
      saldosRealesParseados[cuenta.id] >= 0,
  )

  const plan = useMemo(() => {
    if (!saldosSistema || !todosRealesValidos) return null
    return planificarTraspasoYAjuste({
      saldosSistema,
      saldosReales: saldosRealesParseados,
    })
  }, [saldosSistema, saldosRealesParseados, todosRealesValidos])

  const totalSistema = saldosSistema
    ? CUENTAS_TRASPASO_AJUSTE.reduce(
        (suma, cuenta) => suma + (saldosSistema[cuenta.id] || 0),
        0,
      )
    : 0

  const totalReal = todosRealesValidos
    ? CUENTAS_TRASPASO_AJUSTE.reduce(
        (suma, cuenta) => suma + saldosRealesParseados[cuenta.id],
        0,
      )
    : null

  const puedeAplicar =
    Boolean(fecha && saldosSistema && plan && !plan.sinCambios) &&
    !guardando &&
    !cargandoSaldos

  const aplicarPlan = async () => {
    if (!plan || !fecha) return

    setError('')
    setGuardando(true)
    try {
      for (const traspaso of plan.traspasos) {
        await registrarTraspaso({
          fecha,
          desde: traspaso.desde,
          hacia: traspaso.hacia,
          monto: traspaso.monto,
          concepto: `Traspaso automático · cuadre de cuentas`,
        })
      }

      for (const ajuste of plan.ajustes) {
        await registrarAjusteCuenta({
          fecha,
          cuenta: ajuste.cuenta,
          monto: ajuste.monto,
          motivo: MOTIVO_AJUSTE_AUTOMATICO,
          direccion: ajuste.direccion,
        })
      }

      const partes = []
      if (plan.traspasos.length > 0) {
        partes.push(
          `${plan.traspasos.length} traspaso${plan.traspasos.length === 1 ? '' : 's'}`,
        )
      }
      if (plan.ajustes.length > 0) {
        partes.push(
          `${plan.ajustes.length} ajuste${plan.ajustes.length === 1 ? '' : 's'} automático${plan.ajustes.length === 1 ? '' : 's'}`,
        )
      }
      toast.success(`Cuadre aplicado: ${partes.join(' y ')}`)
      setAlarmaAbierta(false)
      limpiar()
      onClose?.()
      onGuardado?.()
    } catch (err) {
      setAlarmaAbierta(false)
      setError(err.message || 'No se pudo completar el traspaso y ajuste')
    } finally {
      setGuardando(false)
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!saldosSistema) {
      setError('Aún no se cargaron los saldos del sistema')
      return
    }
    if (!todosRealesValidos) {
      setError('Digita el monto real de cada cuenta (puede ser 0)')
      return
    }
    if (!plan || plan.sinCambios) {
      setError('Los montos digitados ya coinciden con el sistema')
      return
    }

    if (plan.desfase !== 0) {
      setAlarmaAbierta(true)
      return
    }

    void aplicarPlan()
  }

  const mensajeAlarma = (() => {
    if (!plan || plan.desfase === 0) return ''
    const monto = formatearPrecioCuenta(Math.abs(plan.desfase))
    if (plan.desfase > 0) {
      return `Hay un desfase positivo (a favor) de ${monto}. El sistema registrará un ajuste automático por ese valor para cuadrar las cuentas. ¿Deseas continuar?`
    }
    return `Hay un desfase negativo (en contra) de ${monto}. El sistema registrará un ajuste automático por ese valor para cuadrar las cuentas. ¿Deseas continuar?`
  })()

  return (
    <>
      <Modal
        open={open}
        onClose={handleCerrar}
        title="Traspaso y ajuste"
        className="traspaso-ajuste-modal"
      >
        <form className="ag-finanzas__form" onSubmit={handleSubmit} noValidate>
          <p className="activar-plan__metodo-pago-hint">
            Digita cuánto hay realmente en cada cuenta. El sistema hará los
            traspasos necesarios y, si queda un descuadre, registrará un ajuste
            con causal «{MOTIVO_AJUSTE_AUTOMATICO}».
          </p>

          <CampoFechaCalendario
            label="Fecha"
            value={fecha}
            onChange={setFecha}
            disabled={guardando || cargandoSaldos}
          />

          {cargandoSaldos ? (
            <p className="activar-plan__metodo-pago-hint">Cargando saldos…</p>
          ) : null}

          {errorSaldos ? (
            <p className="pf-entrenamientos__error" role="alert">
              {errorSaldos}
            </p>
          ) : null}

          {saldosSistema ? (
            <div className="traspaso-ajuste__cuentas">
              {CUENTAS_TRASPASO_AJUSTE.map((cuenta) => {
                const sistema = saldosSistema[cuenta.id] || 0
                const realNum = saldosRealesParseados[cuenta.id]
                const delta =
                  Number.isFinite(realNum) ? Math.round(realNum) - sistema : null

                return (
                  <div key={cuenta.id} className="traspaso-ajuste__cuenta">
                    <div className="traspaso-ajuste__cuenta-head">
                      <strong>{cuenta.label}</strong>
                      <span className="traspaso-ajuste__sistema">
                        Sistema: {formatearPrecioCuenta(sistema)}
                      </span>
                    </div>
                    <label className="pf-usuarios-busqueda__field ag-finanzas__field">
                      <span className="pf-usuarios-busqueda__label">
                        Monto real <span className="pf-pago-clase__required">*</span>
                      </span>
                      <input
                        type="text"
                        className="pf-usuarios-busqueda__input"
                        value={reales[cuenta.id]}
                        onChange={(e) => {
                          const valor = e.target.value.replace(/[^\d.,]/g, '')
                          setReales((prev) => ({ ...prev, [cuenta.id]: valor }))
                          setError('')
                        }}
                        placeholder="Ej. 350000"
                        inputMode="numeric"
                        disabled={guardando}
                      />
                    </label>
                    {delta !== null ? (
                      <p
                        className={`traspaso-ajuste__delta${
                          delta > 0
                            ? ' traspaso-ajuste__delta--positivo'
                            : delta < 0
                              ? ' traspaso-ajuste__delta--negativo'
                              : ''
                        }`}
                      >
                        {delta === 0
                          ? 'Coincide con el sistema'
                          : delta > 0
                            ? `Faltan ${formatearPrecioCuenta(delta)} en el sistema`
                            : `Sobran ${formatearPrecioCuenta(-delta)} en el sistema`}
                      </p>
                    ) : null}
                  </div>
                )
              })}
            </div>
          ) : null}

          {todosRealesValidos && saldosSistema ? (
            <div className="traspaso-ajuste__resumen">
              <div className="traspaso-ajuste__resumen-fila">
                <span>Total sistema</span>
                <strong>{formatearPrecioCuenta(totalSistema)}</strong>
              </div>
              <div className="traspaso-ajuste__resumen-fila">
                <span>Total real</span>
                <strong>{formatearPrecioCuenta(totalReal)}</strong>
              </div>
              <div
                className={`traspaso-ajuste__resumen-fila traspaso-ajuste__desfase${
                  plan?.desfase > 0
                    ? ' traspaso-ajuste__desfase--positivo'
                    : plan?.desfase < 0
                      ? ' traspaso-ajuste__desfase--negativo'
                      : ''
                }`}
              >
                <span>Desfase</span>
                <strong>
                  {plan?.desfase === 0
                    ? 'Sin desfase'
                    : `${plan.desfase > 0 ? '+' : '−'}${formatearPrecioCuenta(Math.abs(plan.desfase))}`}
                </strong>
              </div>
            </div>
          ) : null}

          {plan && !plan.sinCambios ? (
            <div className="traspaso-ajuste__plan">
              <p className="traspaso-ajuste__plan-title">Plan a aplicar</p>
              {plan.traspasos.length > 0 ? (
                <ul className="traspaso-ajuste__plan-lista">
                  {plan.traspasos.map((item) => (
                    <li key={`${item.desde}-${item.hacia}-${item.monto}`}>
                      Traspaso {CUENTA_LABEL[item.desde]} →{' '}
                      {CUENTA_LABEL[item.hacia]}:{' '}
                      {formatearPrecioCuenta(item.monto)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="activar-plan__metodo-pago-hint">
                  No se requieren traspasos entre cuentas.
                </p>
              )}
              {plan.ajustes.length > 0 ? (
                <ul className="traspaso-ajuste__plan-lista">
                  {plan.ajustes.map((item) => (
                    <li key={`${item.cuenta}-${item.direccion}-${item.monto}`}>
                      Ajuste automático en {CUENTA_LABEL[item.cuenta]} (
                      {item.direccion === 'disminuir' ? '−' : '+'}
                      {formatearPrecioCuenta(item.monto)})
                    </li>
                  ))}
                </ul>
              ) : null}
              {plan.desfase !== 0 ? (
                <p className="traspaso-ajuste__alarma" role="status">
                  Alarma: desfase{' '}
                  {plan.desfase > 0 ? 'positivo (a favor)' : 'negativo (en contra)'}{' '}
                  de {formatearPrecioCuenta(Math.abs(plan.desfase))}. Se pedirá
                  confirmación antes de guardar.
                </p>
              ) : null}
            </div>
          ) : null}

          {error ? (
            <p className="pf-entrenamientos__error" role="alert">
              {error}
            </p>
          ) : null}

          <div className="ag-finanzas__form-actions">
            <button
              type="button"
              className="ag-action-btn ag-action-btn--ghost"
              onClick={handleCerrar}
              disabled={guardando}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="ag-action-btn"
              disabled={!puedeAplicar}
            >
              {guardando ? 'Aplicando…' : 'Aplicar traspaso y ajuste'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        open={alarmaAbierta}
        onClose={() => {
          if (guardando) return
          setAlarmaAbierta(false)
        }}
        onConfirm={() => {
          void aplicarPlan()
        }}
        title="Alarma de desfase"
        message={mensajeAlarma}
        confirmLabel={guardando ? 'Aplicando…' : 'Confirmar y guardar'}
        cancelLabel="Volver"
        variant="danger"
        loading={guardando}
      />
    </>
  )
}

export default TraspasoAjusteModal
