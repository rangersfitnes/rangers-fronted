import { useCallback, useEffect, useMemo, useState } from 'react'
import ConfirmModal from './ConfirmModal.jsx'
import Modal from './Modal.jsx'
import { etiquetaMetodoPagoColaborador } from '../constants/metodosPagoColaborador.js'
import { obtenerPreviewColaborador } from '../services/liquidacionNominaService.js'
import { obtenerLiquidezHistorica } from '../services/reportesFinancierosService.js'
import { eliminarTurnoLaboral } from '../services/turnosService.js'
import {
  formatearFechaTabla,
  formatearHoraCuenta,
  formatearPrecioCuenta,
  parseMonedaCOP,
} from '../pages/cuenta/cuentaUtils.js'
import './LiquidarColaboradorModal.css'

const ALMACENAMIENTOS = [
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'transferencia', label: 'Transferencia' },
  { id: 'wompi', label: 'Wompi' },
]

function formatearHoras(valor) {
  const n = Number(valor) || 0
  return `${n.toFixed(2)} h`
}

function parseMontoCargo(valor) {
  // Solo dígitos (COP): evita desfaces por puntos/comas decimales.
  const numero = parseMonedaCOP(valor)
  return Number.isFinite(numero) ? numero : NaN
}

function metodoAlmacenamientoDesdeColaborador(metodoPago) {
  const metodo = String(metodoPago || '')
    .trim()
    .toLowerCase()
  if (metodo === 'efectivo') return 'efectivo'
  if (metodo === 'wompi') return 'wompi'
  if (
    metodo === 'transferencia' ||
    metodo === 'nequi' ||
    metodo === 'daviplata' ||
    metodo === 'bancolombia' ||
    metodo === 'nubank'
  ) {
    return 'transferencia'
  }
  return 'efectivo'
}

function montosVacios() {
  return { efectivo: '', transferencia: '', wompi: '' }
}

function prellenarMontos(total, metodoPreferido) {
  const base = montosVacios()
  const preferido = ALMACENAMIENTOS.some((a) => a.id === metodoPreferido)
    ? metodoPreferido
    : 'efectivo'
  if (total > 0) {
    base[preferido] = String(total)
  }
  return base
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
  const [montoExternoInput, setMontoExternoInput] = useState('')
  const [cargoValorInput, setCargoValorInput] = useState('')
  const [cargoConceptoInput, setCargoConceptoInput] = useState('')
  const [cargoAdicional, setCargoAdicional] = useState(0)
  const [cargoAdicionalConcepto, setCargoAdicionalConcepto] = useState(
    'Cargo adicional',
  )
  const [cargoError, setCargoError] = useState('')
  const [montosOrigen, setMontosOrigen] = useState(montosVacios)
  const [saldosDisponibles, setSaldosDisponibles] = useState(null)
  const [cargandoSaldos, setCargandoSaldos] = useState(false)
  const [origenError, setOrigenError] = useState('')

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
      setMontoExternoInput('')
      setCargoValorInput('')
      setCargoConceptoInput('')
      setCargoAdicional(0)
      setCargoAdicionalConcepto('Cargo adicional')
      setCargoError('')
      setMontosOrigen(montosVacios())
      setSaldosDisponibles(null)
      setOrigenError('')
      return
    }

    let cancelado = false
    setLoading(true)
    setError('')
    setCargoValorInput('')
    setCargoConceptoInput('')
    setCargoAdicional(0)
    setCargoAdicionalConcepto('Cargo adicional')
    setCargoError('')
    setMontoExternoInput('')
    setOrigenError('')
    setMontosOrigen(montosVacios())

    obtenerPreviewColaborador({ colaboradorUid: colaborador.uid })
      .then((data) => {
        if (cancelado) return
        setPreview(data)
        const total = Math.round(Number(data?.resumen?.pagoTotal) || 0)
        setMontosOrigen(
          prellenarMontos(
            total,
            metodoAlmacenamientoDesdeColaborador(
              data?.metodoPago || colaborador?.metodoPago,
            ),
          ),
        )
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

    setCargandoSaldos(true)
    obtenerLiquidezHistorica()
      .then((liquidez) => {
        if (cancelado) return
        setSaldosDisponibles({
          efectivo: Math.round(Number(liquidez?.efectivo?.disponible) || 0),
          transferencia: Math.round(
            Number(liquidez?.transferencia?.disponible) || 0,
          ),
          wompi: Math.round(Number(liquidez?.wompi?.disponible) || 0),
        })
      })
      .catch(() => {
        if (!cancelado) setSaldosDisponibles(null)
      })
      .finally(() => {
        if (!cancelado) setCargandoSaldos(false)
      })

    return () => {
      cancelado = true
    }
  }, [open, colaborador?.uid, colaborador?.metodoPago])

  const resumen = preview?.resumen ?? {}
  const turnos = preview?.turnos ?? []
  const metodoPagoEfectivo =
    String(preview?.metodoPago || colaborador?.metodoPago || '').trim()
  const totalAPagar = useMemo(() => {
    const base = Math.round(Number(resumen.pagoTotal) || 0)
    return base + Math.round(Number(cargoAdicional) || 0)
  }, [resumen.pagoTotal, cargoAdicional])

  const montoExterno = useMemo(() => {
    const valor = Math.round(parseMontoCargo(montoExternoInput)) || 0
    return Math.max(0, Math.min(valor, totalAPagar))
  }, [montoExternoInput, totalAPagar])

  const montoCajaEsperado = Math.max(0, totalAPagar - montoExterno)

  useEffect(() => {
    if (!open || !preview || montoCajaEsperado <= 0) return
    setMontosOrigen((prev) => {
      const sumaActual = ALMACENAMIENTOS.reduce(
        (acc, item) => acc + (Math.round(parseMontoCargo(prev[item.id])) || 0),
        0,
      )
      const conValor = ALMACENAMIENTOS.filter(
        (item) => (Math.round(parseMontoCargo(prev[item.id])) || 0) > 0,
      )
      if (conValor.length === 1 && sumaActual !== montoCajaEsperado) {
        return prellenarMontos(montoCajaEsperado, conValor[0].id)
      }
      if (sumaActual === 0 && montoCajaEsperado > 0) {
        return prellenarMontos(
          montoCajaEsperado,
          metodoAlmacenamientoDesdeColaborador(
            preview.metodoPago || colaborador?.metodoPago,
          ),
        )
      }
      return prev
    })
  }, [
    open,
    preview,
    montoCajaEsperado,
    colaborador?.metodoPago,
  ])

  useEffect(() => {
    if (!open || montoCajaEsperado > 0) return
    setMontosOrigen(montosVacios())
  }, [open, montoCajaEsperado])

  const origenesCalculados = useMemo(() => {
    return ALMACENAMIENTOS.map((item) => ({
      metodo: item.id,
      monto: Math.round(parseMontoCargo(montosOrigen[item.id])) || 0,
    })).filter((item) => item.monto > 0)
  }, [montosOrigen])

  const sumaOrigenes = useMemo(
    () => origenesCalculados.reduce((acc, item) => acc + item.monto, 0),
    [origenesCalculados],
  )

  const sumaAsignada = montoExterno + sumaOrigenes
  const faltanteOrigenes = totalAPagar - sumaAsignada

  const handleAgregarCargo = () => {
    const monto = Math.round(parseMontoCargo(cargoValorInput))
    if (!Number.isFinite(monto) || monto <= 0) {
      setCargoError('Ingresa un valor mayor a cero')
      return
    }

    const concepto =
      String(cargoConceptoInput || '').trim() || 'Cargo adicional'
    setCargoAdicional((prev) => prev + monto)
    setCargoAdicionalConcepto(concepto)
    setCargoValorInput('')
    setCargoConceptoInput('')
    setCargoError('')
  }

  const handleQuitarCargo = () => {
    setCargoAdicional(0)
    setCargoAdicionalConcepto('Cargo adicional')
    setCargoValorInput('')
    setCargoConceptoInput('')
    setCargoError('')
  }

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

  const handleCompletarRestante = (metodoId) => {
    const otros = ALMACENAMIENTOS.filter((item) => item.id !== metodoId).reduce(
      (acc, item) =>
        acc + (Math.round(parseMontoCargo(montosOrigen[item.id])) || 0),
      0,
    )
    const restante = Math.max(0, totalAPagar - montoExterno - otros)
    setMontosOrigen((prev) => ({
      ...prev,
      [metodoId]: restante > 0 ? String(restante) : '',
    }))
    setOrigenError('')
  }

  const handleCompletarRestanteExterno = () => {
    const restante = Math.max(0, totalAPagar - sumaOrigenes)
    setMontoExternoInput(restante > 0 ? String(restante) : '')
    setOrigenError('')
  }

  const handleTodoExterno = () => {
    setMontoExternoInput(totalAPagar > 0 ? String(totalAPagar) : '')
    setMontosOrigen(montosVacios())
    setOrigenError('')
  }

  const handleTodoCaja = () => {
    setMontoExternoInput('')
    setMontosOrigen(
      prellenarMontos(
        totalAPagar,
        metodoAlmacenamientoDesdeColaborador(metodoPagoEfectivo),
      ),
    )
    setOrigenError('')
  }

  const handleLiquidarClick = () => {
    setOrigenError('')

    if (sumaAsignada !== totalAPagar) {
      setOrigenError(
        `Externo + caja (${formatearPrecioCuenta(sumaAsignada)}) debe igualar el total (${formatearPrecioCuenta(totalAPagar)})`,
      )
      return
    }

    if (montoCajaEsperado > 0 && origenesCalculados.length === 0) {
      setOrigenError(
        'Indica de qué almacenamiento del box sale la parte de caja',
      )
      return
    }

    if (montoCajaEsperado > 0 && sumaOrigenes !== montoCajaEsperado) {
      setOrigenError(
        `La parte de caja (${formatearPrecioCuenta(sumaOrigenes)}) debe ser ${formatearPrecioCuenta(montoCajaEsperado)}`,
      )
      return
    }

    if (saldosDisponibles && montoCajaEsperado > 0) {
      for (const origen of origenesCalculados) {
        const disponible = saldosDisponibles[origen.metodo] ?? 0
        if (origen.monto > disponible) {
          const label =
            ALMACENAMIENTOS.find((a) => a.id === origen.metodo)?.label ||
            origen.metodo
          setOrigenError(
            `No hay suficiente disponible en ${label}: pide ${formatearPrecioCuenta(origen.monto)} y hay ${formatearPrecioCuenta(disponible)}`,
          )
          return
        }
      }
    }

    onLiquidar?.(colaborador, {
      presupuestoExterno: montoExterno === totalAPagar && totalAPagar > 0,
      montoPresupuestoExterno: montoExterno,
      cargoAdicional,
      cargoAdicionalConcepto,
      origenesPresupuesto: montoCajaEsperado > 0 ? origenesCalculados : [],
    })
  }

  const ocupado = loading || liquidando || eliminando
  const montosCuadran = sumaAsignada === totalAPagar && totalAPagar > 0
  const puedeLiquidar =
    turnos.length > 0 &&
    Boolean(metodoPagoEfectivo) &&
    !ocupado &&
    montosCuadran &&
    (montoCajaEsperado === 0 || sumaOrigenes === montoCajaEsperado)

  const motivoDeshabilitado = (() => {
    if (ocupado) return ''
    if (!preview) return ''
    if (turnos.length === 0) {
      return preview.horasExtraPendientes > 0
        ? 'No hay turnos elegibles: resuelve las horas extra pendientes.'
        : 'No hay turnos pendientes por liquidar.'
    }
    if (!metodoPagoEfectivo) {
      return 'Configura el método de pago del colaborador en Gestión humana → Colaboradores.'
    }
    if (!montosCuadran) {
      return `Externo + caja (${formatearPrecioCuenta(sumaAsignada)}) debe igualar el total (${formatearPrecioCuenta(totalAPagar)}). Puedes mezclar ambos.`
    }
    return ''
  })()

  const footer = (
    <>
      {motivoDeshabilitado ? (
        <p className="liquidar-colaborador__footer-aviso" role="status">
          {motivoDeshabilitado}
        </p>
      ) : null}
      <div className="liquidar-colaborador__footer-actions">
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
          onClick={handleLiquidarClick}
          disabled={!puedeLiquidar}
          title={motivoDeshabilitado || 'Liquidar nómina'}
        >
          {liquidando ? 'Liquidando…' : 'Liquidar'}
        </button>
      </div>
    </>
  )

  return (
    <>
      <Modal
        open={open}
        onClose={ocupado ? undefined : onClose}
        title={`Liquidar nómina — ${colaborador?.nombre ?? ''}`}
        footer={footer}
        className="liquidar-colaborador-modal modal--elevated"
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
                    <dt>Método al colaborador</dt>
                    <dd>
                      {metodoPagoEfectivo
                        ? etiquetaMetodoPagoColaborador(metodoPagoEfectivo)
                        : 'Sin configurar'}
                    </dd>
                  </div>
                  <div>
                    <dt>Cuenta / número</dt>
                    <dd>{preview.numeroCuenta || '—'}</dd>
                  </div>
                </dl>
                {!metodoPagoEfectivo ? (
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

              </section>

              <section className="liquidar-colaborador__origenes">
                <h3>Cómo se paga (puede ser mixto)</h3>
                <p>
                  Combina presupuesto externo y caja del box. La suma de ambos
                  debe igualar el total. Solo la parte de caja descuenta
                  efectivo, transferencia o Wompi.
                  {cargandoSaldos ? ' Cargando saldos…' : ''}
                </p>

                <div className="liquidar-colaborador__mixto-atajos">
                  <button
                    type="button"
                    className="liquidar-colaborador__btn-restante"
                    onClick={handleTodoExterno}
                    disabled={ocupado || totalAPagar <= 0}
                  >
                    Todo externo
                  </button>
                  <button
                    type="button"
                    className="liquidar-colaborador__btn-restante"
                    onClick={handleTodoCaja}
                    disabled={ocupado || totalAPagar <= 0}
                  >
                    Todo caja
                  </button>
                </div>

                <div className="liquidar-colaborador__origenes-grid">
                  <label className="liquidar-colaborador__origen-field liquidar-colaborador__origen-field--externo">
                    <span className="liquidar-colaborador__origen-label">
                      Presupuesto externo
                      <small>No afecta caja ni finanzas del box</small>
                    </span>
                    <div className="liquidar-colaborador__origen-input-row">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={montoExternoInput}
                        onChange={(e) => {
                          setMontoExternoInput(
                            e.target.value.replace(/[^\d.,]/g, ''),
                          )
                          setOrigenError('')
                        }}
                        placeholder="0"
                        disabled={ocupado}
                      />
                      <button
                        type="button"
                        className="liquidar-colaborador__btn-restante"
                        onClick={handleCompletarRestanteExterno}
                        disabled={ocupado || totalAPagar <= 0}
                        title="Completar con el restante del total"
                      >
                        Restante
                      </button>
                    </div>
                  </label>

                  {ALMACENAMIENTOS.map((item) => {
                    const disponible = saldosDisponibles?.[item.id]
                    const monto =
                      Math.round(parseMontoCargo(montosOrigen[item.id])) || 0
                    const excede =
                      disponible != null && monto > disponible && monto > 0
                    return (
                      <label
                        key={item.id}
                        className={`liquidar-colaborador__origen-field${
                          excede
                            ? ' liquidar-colaborador__origen-field--alerta'
                            : ''
                        }`}
                      >
                        <span className="liquidar-colaborador__origen-label">
                          {item.label}
                          {disponible != null ? (
                            <small>
                              Disp. {formatearPrecioCuenta(disponible)}
                            </small>
                          ) : null}
                        </span>
                        <div className="liquidar-colaborador__origen-input-row">
                          <input
                            type="text"
                            inputMode="numeric"
                            value={montosOrigen[item.id]}
                            onChange={(e) => {
                              setMontosOrigen((prev) => ({
                                ...prev,
                                [item.id]: e.target.value.replace(
                                  /[^\d.,]/g,
                                  '',
                                ),
                              }))
                              setOrigenError('')
                            }}
                            placeholder="0"
                            disabled={ocupado || montoCajaEsperado <= 0}
                          />
                          <button
                            type="button"
                            className="liquidar-colaborador__btn-restante"
                            onClick={() => handleCompletarRestante(item.id)}
                            disabled={
                              ocupado ||
                              totalAPagar <= 0 ||
                              montoCajaEsperado <= 0
                            }
                            title="Completar con el restante de la parte de caja"
                          >
                            Restante
                          </button>
                        </div>
                      </label>
                    )
                  })}
                </div>

                <div className="liquidar-colaborador__origenes-resumen">
                  <span>
                    Externo:{' '}
                    <strong>{formatearPrecioCuenta(montoExterno)}</strong>
                  </span>
                  <span>
                    Caja: <strong>{formatearPrecioCuenta(sumaOrigenes)}</strong>
                  </span>
                  <span>
                    {faltanteOrigenes === 0
                      ? 'Cuadra con el total'
                      : faltanteOrigenes > 0
                        ? `Faltan ${formatearPrecioCuenta(faltanteOrigenes)}`
                        : `Sobran ${formatearPrecioCuenta(Math.abs(faltanteOrigenes))}`}
                  </span>
                </div>
                {origenError ? (
                  <p className="liquidar-colaborador__error" role="alert">
                    {origenError}
                  </p>
                ) : null}
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
                  {cargoAdicional > 0 ? (
                    <li className="liquidar-colaborador__concepto--cargo">
                      <span>
                        {cargoAdicionalConcepto || 'Cargo adicional'}
                      </span>
                      <strong>
                        {formatearPrecioCuenta(cargoAdicional)}
                        <button
                          type="button"
                          className="liquidar-colaborador__btn-quitar-cargo"
                          onClick={handleQuitarCargo}
                          disabled={ocupado}
                        >
                          Quitar
                        </button>
                      </strong>
                    </li>
                  ) : null}
                </ul>

                <div className="liquidar-colaborador__cargo">
                  <h4>Cargo adicional</h4>
                  <p>
                    Suma un monto extra al total a liquidar (bono, ajuste u otro
                    concepto). Quedará en el desprendible del colaborador.
                  </p>
                  <div className="liquidar-colaborador__cargo-campos">
                    <label className="liquidar-colaborador__cargo-field">
                      <span>Concepto</span>
                      <input
                        type="text"
                        value={cargoConceptoInput}
                        onChange={(e) => {
                          setCargoConceptoInput(e.target.value)
                          setCargoError('')
                        }}
                        placeholder="Ej. Bono / ajuste"
                        disabled={ocupado}
                      />
                    </label>
                    <label className="liquidar-colaborador__cargo-field">
                      <span>Valor</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={cargoValorInput}
                        onChange={(e) => {
                          setCargoValorInput(
                            e.target.value.replace(/[^\d.,]/g, ''),
                          )
                          setCargoError('')
                        }}
                        placeholder="Ej. 50000"
                        disabled={ocupado}
                      />
                    </label>
                    <button
                      type="button"
                      className="liquidar-colaborador__btn-cargo"
                      onClick={handleAgregarCargo}
                      disabled={ocupado || !cargoValorInput.trim()}
                    >
                      Agregar
                    </button>
                  </div>
                  {cargoError ? (
                    <p className="liquidar-colaborador__error" role="alert">
                      {cargoError}
                    </p>
                  ) : null}
                </div>
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
                          <th>Dom. / festivo</th>
                          <th>Extra</th>
                          <th>Pago</th>
                          <th aria-label="Acciones" />
                        </tr>
                      </thead>
                      <tbody>
                        {turnos.map((turno) => (
                          <tr key={turno.turnoId}>
                            <td>
                              <span className="liquidar-colaborador__fecha-celda">
                                {formatearFechaTabla(turno.inicioEn)}
                                {turno.esFestivo && !turno.esDiaDominical ? (
                                  <small className="liquidar-colaborador__dia-tag">
                                    Festivo
                                  </small>
                                ) : null}
                                {turno.esDiaDominical ? (
                                  <small className="liquidar-colaborador__dia-tag">
                                    Domingo
                                  </small>
                                ) : null}
                              </span>
                            </td>
                            <td>
                              {formatearHoraCuenta(turno.inicioEn)} –{' '}
                              {formatearHoraCuenta(turno.finEn)}
                            </td>
                            <td>{formatearHoras(turno.horasTrabajadas)}</td>
                            <td>
                              {turno.horasDominicales > 0 ? (
                                <span className="liquidar-colaborador__fecha-celda">
                                  {formatearHoras(turno.horasDominicales)}
                                  {turno.pagoRecargoDominical > 0 ? (
                                    <small>
                                      +
                                      {formatearPrecioCuenta(
                                        turno.pagoRecargoDominical,
                                      )}
                                    </small>
                                  ) : null}
                                </span>
                              ) : (
                                '—'
                              )}
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
                <strong>{formatearPrecioCuenta(totalAPagar)}</strong>
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
