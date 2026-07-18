import { useCallback, useEffect, useState } from 'react'
import ConfirmModal from './ConfirmModal.jsx'
import Modal from './Modal.jsx'
import { etiquetaMetodoPagoColaborador } from '../constants/metodosPagoColaborador.js'
import { obtenerPreviewColaborador } from '../services/liquidacionNominaService.js'
import { eliminarTurnoLaboral } from '../services/turnosService.js'
import {
  formatearFechaTabla,
  formatearHoraCuenta,
  formatearPrecioCuenta,
} from '../pages/cuenta/cuentaUtils.js'
import './LiquidarColaboradorModal.css'

function formatearHoras(valor) {
  const n = Number(valor) || 0
  return `${n.toFixed(2)} h`
}

function LiquidarColaboradorModal({
  open,
  onClose,
  colaborador,
  onLiquidar,
  liquidando,
  onTurnosCambiados,
}) {
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [turnoEliminar, setTurnoEliminar] = useState(null)
  const [eliminando, setEliminando] = useState(false)
  const [presupuestoExterno, setPresupuestoExterno] = useState(false)

  const cargarPreview = useCallback(async () => {
    if (!colaborador?.uid) return

    setLoading(true)
    setError('')
    try {
      const data = await obtenerPreviewColaborador({
        colaboradorUid: colaborador.uid,
      })
      setPreview(data)
    } catch (err) {
      setError(err.message || 'No se pudo cargar el detalle de liquidación')
      setPreview(null)
    } finally {
      setLoading(false)
    }
  }, [colaborador?.uid])

  useEffect(() => {
    if (!open || !colaborador?.uid) {
      setPreview(null)
      setError('')
      setTurnoEliminar(null)
      setPresupuestoExterno(false)
      return
    }

    let cancelado = false
    setLoading(true)
    setError('')

    obtenerPreviewColaborador({ colaboradorUid: colaborador.uid })
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
  }, [open, colaborador?.uid])

  const handleConfirmarEliminar = async () => {
    if (!turnoEliminar?.turnoId || !turnoEliminar?.sede) return

    setEliminando(true)
    setError('')
    try {
      await eliminarTurnoLaboral({
        sede: turnoEliminar.sede,
        turnoId: turnoEliminar.turnoId,
      })
      setTurnoEliminar(null)
      await cargarPreview()
      onTurnosCambiados?.()
    } catch (err) {
      setError(err.message || 'No se pudo eliminar el turno')
    } finally {
      setEliminando(false)
    }
  }

  const resumen = preview?.resumen ?? {}
  const turnos = preview?.turnos ?? []
  const ocupado = loading || liquidando || eliminando
  const puedeLiquidar =
    turnos.length > 0 &&
    Boolean(preview?.metodoPago) &&
    !ocupado

  const footer = (
    <>
      <button
        type="button"
        className="modal__btn modal__btn--ghost"
        onClick={onClose}
        disabled={ocupado}
      >
        Cerrar
      </button>
      <button
        type="button"
        className="modal__btn modal__btn--primary"
        onClick={() => onLiquidar?.(colaborador, { presupuestoExterno })}
        disabled={!puedeLiquidar}
      >
        {liquidando ? 'Liquidando…' : 'Liquidar'}
      </button>
    </>
  )

  return (
    <>
      <Modal
        open={open}
        onClose={ocupado ? undefined : onClose}
        title={`Liquidar nómina — ${colaborador?.nombre ?? ''}`}
        footer={footer}
        className="liquidar-colaborador-modal"
      >
        <div className="liquidar-colaborador">
          <p className="liquidar-colaborador__periodo">
            Turnos pendientes por liquidar (automático, hasta el día anterior).
            Puedes eliminar un turno si fue registrado por error.
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
                    <dt>Documento</dt>
                    <dd>{preview.colaboradorDocumento || '—'}</dd>
                  </div>
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
                    Hay {preview.horasExtraPendientes} turno
                    {preview.horasExtraPendientes === 1 ? '' : 's'} con horas extra
                    pendientes de aprobar o rechazar. Esos turnos no se incluyen
                    hasta resolverlos en «Aprobar horas extra».
                  </p>
                ) : null}

                <label className="liquidar-colaborador__externo">
                  <input
                    type="checkbox"
                    checked={presupuestoExterno}
                    onChange={(e) => setPresupuestoExterno(e.target.checked)}
                    disabled={ocupado}
                  />
                  <span>
                    Pagado con <strong>presupuesto externo</strong> al box
                    <small>
                      No crea salida en finanzas ni afecta el disponible de
                      efectivo, transferencia o Wompi.
                    </small>
                  </span>
                </label>
              </section>

              <section className="liquidar-colaborador__desglose">
                <h3>Desglose</h3>
                <ul className="liquidar-colaborador__conceptos">
                  <li>
                    <span>Horas trabajadas</span>
                    <strong>{formatearHoras(resumen.totalHorasTrabajadas)}</strong>
                  </li>
                  <li>
                    <span>Pago ordinario</span>
                    <strong>{formatearPrecioCuenta(resumen.pagoOrdinario)}</strong>
                  </li>
                  {resumen.pagoExtra > 0 ? (
                    <li>
                      <span>
                        Horas extra ({formatearHoras(resumen.totalHorasExtra)})
                      </span>
                      <strong>{formatearPrecioCuenta(resumen.pagoExtra)}</strong>
                    </li>
                  ) : null}
                  {resumen.pagoRecargoDominical > 0 ||
                  resumen.totalHorasDominicales > 0 ? (
                    <li>
                      <span>
                        Recargo dominical / festivo
                        {resumen.totalHorasDominicales > 0
                          ? ` (${formatearHoras(resumen.totalHorasDominicales)})`
                          : ''}
                      </span>
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
                <section className="liquidar-colaborador__turnos-lista">
                  <h3>
                    {turnos.length} turno{turnos.length === 1 ? '' : 's'} a liquidar
                  </h3>
                  <div className="liquidar-colaborador__turnos-table-wrap">
                    <table className="liquidar-colaborador__turnos-table">
                      <thead>
                        <tr>
                          <th>Fecha</th>
                          <th>Horario</th>
                          <th>Horas</th>
                          <th>Dominicales</th>
                          <th>Extra</th>
                          <th>Pago</th>
                          <th aria-label="Acciones" />
                        </tr>
                      </thead>
                      <tbody>
                        {turnos.map((turno) => (
                          <tr key={turno.turnoId}>
                            <td>{formatearFechaTabla(turno.inicioEn)}</td>
                            <td>
                              {formatearHoraCuenta(turno.inicioEn)} –{' '}
                              {formatearHoraCuenta(turno.finEn)}
                            </td>
                            <td>{formatearHoras(turno.horasTrabajadas)}</td>
                            <td>
                              {turno.horasDominicales > 0
                                ? formatearHoras(turno.horasDominicales)
                                : '—'}
                            </td>
                            <td>
                              {turno.horasExtra > 0
                                ? formatearHoras(turno.horasExtra)
                                : '—'}
                            </td>
                            <td>{formatearPrecioCuenta(turno.pagoTotal)}</td>
                            <td>
                              <button
                                type="button"
                                className="liquidar-colaborador__btn-eliminar"
                                onClick={() => setTurnoEliminar(turno)}
                                disabled={ocupado}
                              >
                                Eliminar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : (
                <p className="liquidar-colaborador__sin-turnos">
                  No hay turnos pendientes por liquidar.
                </p>
              )}

              <div className="liquidar-colaborador__total">
                <span>Total a pagar</span>
                <strong>{formatearPrecioCuenta(resumen.pagoTotal)}</strong>
              </div>
            </>
          ) : null}
        </div>
      </Modal>

      <ConfirmModal
        open={Boolean(turnoEliminar)}
        onClose={() => {
          if (eliminando) return
          setTurnoEliminar(null)
        }}
        onConfirm={handleConfirmarEliminar}
        title="Eliminar turno laboral"
        message={
          turnoEliminar
            ? `¿Eliminar el turno del ${formatearFechaTabla(turnoEliminar.inicioEn)} (${formatearHoraCuenta(turnoEliminar.inicioEn)} – ${formatearHoraCuenta(turnoEliminar.finEn)}) por ${formatearPrecioCuenta(turnoEliminar.pagoTotal)}? Esta acción no se puede deshacer.`
            : ''
        }
        confirmLabel="Eliminar turno"
        variant="danger"
        loading={eliminando}
      />
    </>
  )
}

export default LiquidarColaboradorModal
