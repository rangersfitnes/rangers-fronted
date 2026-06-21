import { useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import { etiquetaMetodoPagoColaborador } from '../constants/metodosPagoColaborador.js'
import { obtenerPreviewColaborador } from '../services/liquidacionNominaService.js'
import {
  formatearFechaCuenta,
  formatearFechaTabla,
  formatearHoraCuenta,
  formatearPrecioCuenta,
} from '../pages/cuenta/cuentaUtils.js'
import './LiquidarColaboradorModal.css'

function formatearPeriodo(fechaInicio, fechaFin) {
  const inicio = formatearFechaCuenta(
    new Date(`${fechaInicio}T12:00:00`).getTime(),
  )
  const fin = formatearFechaCuenta(new Date(`${fechaFin}T12:00:00`).getTime())
  return `${inicio} – ${fin}`
}

function LiquidarColaboradorModal({
  open,
  onClose,
  colaborador,
  fechaInicio,
  fechaFin,
  onLiquidar,
  liquidando,
}) {
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open || !colaborador?.uid) {
      setPreview(null)
      setError('')
      return
    }

    let cancelado = false
    setLoading(true)
    setError('')

    obtenerPreviewColaborador({
      colaboradorUid: colaborador.uid,
      fechaInicio,
      fechaFin,
    })
      .then((data) => {
        if (!cancelado) setPreview(data)
      })
      .catch((err) => {
        if (!cancelado) {
          setError(err.message || 'No se pudo cargar el detalle de liquidación')
          setPreview(null)
        }
      })
      .finally(() => {
        if (!cancelado) setLoading(false)
      })

    return () => {
      cancelado = true
    }
  }, [open, colaborador?.uid, fechaInicio, fechaFin])

  const resumen = preview?.resumen ?? {}
  const turnos = preview?.turnos ?? []
  const puedeLiquidar =
    turnos.length > 0 &&
    Boolean(preview?.metodoPago) &&
    !loading &&
    !liquidando &&
    !(preview?.horasExtraPendientes > 0)

  const footer = (
    <>
      <button
        type="button"
        className="modal__btn modal__btn--ghost"
        onClick={onClose}
        disabled={liquidando}
      >
        Cancelar
      </button>
      <button
        type="button"
        className="modal__btn modal__btn--primary"
        onClick={() => onLiquidar?.(colaborador)}
        disabled={!puedeLiquidar}
      >
        {liquidando ? 'Liquidando…' : 'Liquidar'}
      </button>
    </>
  )

  return (
    <Modal
      open={open}
      onClose={liquidando ? undefined : onClose}
      title={`Liquidar nómina — ${colaborador?.nombre ?? ''}`}
      footer={footer}
    >
      <div className="liquidar-colaborador">
        <p className="liquidar-colaborador__periodo">
          Periodo: {formatearPeriodo(fechaInicio, fechaFin)}
        </p>

        {loading ? (
          <p className="liquidar-colaborador__loading">Cargando detalle…</p>
        ) : null}

        {error ? <p className="liquidar-colaborador__error">{error}</p> : null}

        {preview && !loading ? (
          <>
            <section className="liquidar-colaborador__pago">
              <h3>Datos de pago</h3>
              <dl>
                <div>
                  <dt>Método</dt>
                  <dd>
                    {preview.metodoPago
                      ? etiquetaMetodoPagoColaborador(preview.metodoPago)
                      : 'Sin configurar'}
                  </dd>
                </div>
                <div>
                  <dt>Cuenta / número</dt>
                  <dd>{preview.numeroCuenta || '—'}</dd>
                </div>
              </dl>
              {!preview.metodoPago ? (
                <p className="liquidar-colaborador__aviso">
                  Configura el método de pago del colaborador antes de liquidar.
                </p>
              ) : null}
              {preview.horasExtraPendientes > 0 ? (
                <p className="liquidar-colaborador__aviso liquidar-colaborador__aviso--bloqueo">
                  No se puede liquidar: hay {preview.horasExtraPendientes}{' '}
                  solicitud
                  {preview.horasExtraPendientes === 1 ? '' : 'es'} de horas extra
                  pendiente
                  {preview.horasExtraPendientes === 1 ? '' : 's'} en este periodo.
                  Aprueba o rechaza cada una en «Aprobar horas extra».
                </p>
              ) : null}
              {preview.turnosYaLiquidados > 0 ? (
                <p className="liquidar-colaborador__aviso liquidar-colaborador__aviso--info">
                  {preview.turnosYaLiquidados} turno
                  {preview.turnosYaLiquidados === 1 ? '' : 's'} en este periodo
                  ya fue
                  {preview.turnosYaLiquidados === 1 ? '' : 'ron'} pagado
                  {preview.turnosYaLiquidados === 1 ? '' : 's'} en liquidaciones
                  anteriores y no se incluirán en este pago.
                </p>
              ) : null}
            </section>

            <section className="liquidar-colaborador__desglose">
              <h3>Desglose</h3>
              <ul className="liquidar-colaborador__conceptos">
                <li>
                  <span>Pago ordinario</span>
                  <strong>{formatearPrecioCuenta(resumen.pagoOrdinario)}</strong>
                </li>
                {resumen.pagoExtra > 0 ? (
                  <li>
                    <span>Horas extra</span>
                    <strong>{formatearPrecioCuenta(resumen.pagoExtra)}</strong>
                  </li>
                ) : null}
                {resumen.pagoRecargoDominical > 0 ? (
                  <li>
                    <span>Recargo dominical</span>
                    <strong>
                      {formatearPrecioCuenta(resumen.pagoRecargoDominical)}
                    </strong>
                  </li>
                ) : null}
                {resumen.pagoRecargoNocturno > 0 ? (
                  <li>
                    <span>Recargo nocturno</span>
                    <strong>
                      {formatearPrecioCuenta(resumen.pagoRecargoNocturno)}
                    </strong>
                  </li>
                ) : null}
              </ul>
            </section>

            {turnos.length > 0 ? (
              <details className="liquidar-colaborador__turnos">
                <summary>
                  {turnos.length} turno{turnos.length === 1 ? '' : 's'} a liquidar
                </summary>
                <ul>
                  {turnos.map((turno) => (
                    <li key={turno.turnoId}>
                      <span>
                        {formatearFechaTabla(turno.inicioEn)} ·{' '}
                        {formatearHoraCuenta(turno.inicioEn)} –{' '}
                        {formatearHoraCuenta(turno.finEn)}
                      </span>
                      <span>{formatearPrecioCuenta(turno.pagoTotal)}</span>
                    </li>
                  ))}
                </ul>
              </details>
            ) : (
              <p className="liquidar-colaborador__sin-turnos">
                No hay turnos elegibles para liquidar en este periodo.
              </p>
            )}

            <div className="liquidar-colaborador__total">
              <span>Total a liquidar</span>
              <strong>{formatearPrecioCuenta(resumen.pagoTotal)}</strong>
            </div>
          </>
        ) : null}
      </div>
    </Modal>
  )
}

export default LiquidarColaboradorModal
