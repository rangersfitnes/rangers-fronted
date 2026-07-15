import { useCallback, useEffect, useMemo, useState } from 'react'
import CampoFechaCalendario from '../components/CampoFechaCalendario.jsx'
import FinanzasSubvistaHeader from '../components/FinanzasSubvistaHeader.jsx'
import LoadingOverlay from '../components/LoadingOverlay.jsx'
import {
  BotonEliminarMovimiento,
  useEliminarMovimiento,
} from '../components/MovimientoEliminar.jsx'
import { useToast } from '../components/Toast.jsx'
import { obtenerMovimientosRango } from '../services/cierreDiarioService.js'
import { registrarTraspaso } from '../services/finanzasService.js'
import {
  formatearFechaCuenta,
  formatearFechaHoraCuenta,
  formatearPrecioCuenta,
} from './cuenta/cuentaUtils.js'
import '../components/ActivarPlanModal.css'
import './AdministracionGeneral.css'
import './PuntoFisico.css'

const ALMACENAMIENTOS = [
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'transferencia', label: 'Transferencia' },
  { id: 'wompi', label: 'Wompi' },
]

const ALMACENAMIENTO_LABEL = Object.fromEntries(
  ALMACENAMIENTOS.map((m) => [m.id, m.label]),
)

function fechaHoyColombiaInput() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function inicioMesColombiaInput() {
  const hoy = fechaHoyColombiaInput()
  return `${hoy.slice(0, 8)}01`
}

function parseMonto(valor) {
  const limpio = String(valor || '')
    .trim()
    .replace(/\./g, '')
    .replace(/,/g, '.')
  const numero = Number(limpio)
  return Number.isFinite(numero) ? numero : NaN
}

function agruparTraspasos(movimientos = []) {
  const porGrupo = new Map()

  for (const mov of movimientos) {
    if (mov.categoria !== 'traspaso' && mov.tipo !== 'traspaso') continue

    const grupoId =
      mov.traspasoGrupoId || mov.referenciaId || mov.documentoFirestoreId || mov.id
    const actual = porGrupo.get(grupoId) || {
      grupoId,
      categoria: 'traspaso',
      tipo: 'traspaso',
      fecha: mov.fecha,
      creadoEn: mov.creadoEn,
      concepto: mov.concepto || mov.descripcion,
      monto: Number(mov.monto) || 0,
      desde: mov.metodoOrigen || null,
      hacia: mov.metodoDestino || null,
      fuente: mov.fuente,
      documentoFirestoreId: mov.documentoFirestoreId,
      descripcion: mov.descripcion,
    }

    if (mov.naturaleza === 'egreso') {
      actual.desde = mov.metodoPago || actual.desde
      actual.documentoFirestoreId = mov.documentoFirestoreId || actual.documentoFirestoreId
    }
    if (mov.naturaleza === 'ingreso') {
      actual.hacia = mov.metodoPago || actual.hacia
    }

    actual.fecha = actual.fecha || mov.fecha
    actual.creadoEn = Math.max(actual.creadoEn ?? 0, mov.creadoEn ?? 0)
    actual.concepto = actual.concepto || mov.concepto || mov.descripcion
    actual.monto = actual.monto || Number(mov.monto) || 0
    actual.fuente = actual.fuente || mov.fuente
    actual.descripcion =
      actual.concepto ||
      `Traspaso · ${ALMACENAMIENTO_LABEL[actual.desde] || actual.desde || '—'} → ${ALMACENAMIENTO_LABEL[actual.hacia] || actual.hacia || '—'}`

    porGrupo.set(grupoId, actual)
  }

  return [...porGrupo.values()].sort(
    (a, b) => (b.creadoEn ?? 0) - (a.creadoEn ?? 0),
  )
}

function FinanzasTraspasos({ onVolver }) {
  const toast = useToast()
  const [fecha, setFecha] = useState(fechaHoyColombiaInput)
  const [desde, setDesde] = useState('')
  const [hacia, setHacia] = useState('')
  const [valor, setValor] = useState('')
  const [concepto, setConcepto] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [traspasos, setTraspasos] = useState([])
  const [cargandoLista, setCargandoLista] = useState(true)
  const [filtroDesde, setFiltroDesde] = useState(inicioMesColombiaInput)
  const [filtroHasta, setFiltroHasta] = useState(fechaHoyColombiaInput)

  const cargarTraspasos = useCallback(async () => {
    setCargandoLista(true)
    try {
      const registro = await obtenerMovimientosRango({
        desde: filtroDesde,
        hasta: filtroHasta,
      })
      setTraspasos(agruparTraspasos(registro?.movimientos ?? []))
    } catch (err) {
      toast.error(err.message || 'No se pudieron cargar los traspasos')
      setTraspasos([])
    } finally {
      setCargandoLista(false)
    }
  }, [filtroDesde, filtroHasta, toast])

  useEffect(() => {
    cargarTraspasos()
  }, [cargarTraspasos])

  const { solicitarEliminar, modalEliminar, eliminando } = useEliminarMovimiento({
    onEliminado: cargarTraspasos,
  })

  const montoValido = parseMonto(valor) > 0
  const puedeGuardar =
    Boolean(fecha && desde && hacia && desde !== hacia && montoValido) &&
    !guardando

  const opcionesHacia = useMemo(
    () => ALMACENAMIENTOS.filter((m) => m.id !== desde),
    [desde],
  )

  const limpiarFormulario = () => {
    setDesde('')
    setHacia('')
    setValor('')
    setConcepto('')
    setFecha(fechaHoyColombiaInput())
    setError('')
  }

  const handleGuardar = async (event) => {
    event.preventDefault()

    if (!desde) {
      setError('Selecciona desde qué almacenamiento sale el dinero')
      return
    }
    if (!hacia) {
      setError('Selecciona a qué almacenamiento llega el dinero')
      return
    }
    if (desde === hacia) {
      setError('El origen y el destino deben ser diferentes')
      return
    }
    if (!montoValido) {
      setError('Ingresa un valor mayor a cero')
      return
    }

    setError('')
    setGuardando(true)
    try {
      await registrarTraspaso({
        fecha,
        desde,
        hacia,
        monto: parseMonto(valor),
        concepto: concepto.trim() || undefined,
      })
      toast.success(
        `Traspaso registrado: ${ALMACENAMIENTO_LABEL[desde]} → ${ALMACENAMIENTO_LABEL[hacia]}`,
      )
      limpiarFormulario()
      await cargarTraspasos()
    } catch (err) {
      setError(err.message || 'No se pudo registrar el traspaso')
    } finally {
      setGuardando(false)
    }
  }

  const loadingVisible = guardando || cargandoLista || eliminando

  return (
    <section className="ag-page__view">
      <FinanzasSubvistaHeader
        titulo="Traspasos entre cuentas"
        subtitulo="Mueve dinero entre efectivo, transferencia y Wompi. Actualiza el disponible de cada almacenamiento."
        onVolver={onVolver}
      />

      <form
        className="ag-panel ag-finanzas__form"
        onSubmit={handleGuardar}
        noValidate
      >
        <CampoFechaCalendario
          label="Fecha"
          value={fecha}
          onChange={setFecha}
          disabled={loadingVisible}
        />

        <div className="activar-plan__metodo-pago ag-finanzas__metodo">
          <p className="activar-plan__metodo-pago-title">
            Desde <span className="activar-plan__required">*</span>
          </p>
          <p className="activar-plan__metodo-pago-hint">
            Almacenamiento de origen del dinero.
          </p>
          <div className="activar-plan__metodo-pago-options pf-pago-clase__opciones">
            {ALMACENAMIENTOS.map((metodo) => (
              <label
                key={`desde-${metodo.id}`}
                className={`activar-plan__metodo-option${
                  desde === metodo.id
                    ? ' activar-plan__metodo-option--checked'
                    : ''
                }`}
              >
                <input
                  type="radio"
                  name="traspasoDesde"
                  className="activar-plan__radio"
                  value={metodo.id}
                  checked={desde === metodo.id}
                  onChange={() => {
                    setDesde(metodo.id)
                    if (hacia === metodo.id) setHacia('')
                    setError('')
                  }}
                  disabled={loadingVisible}
                />
                <span>{metodo.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="activar-plan__metodo-pago ag-finanzas__metodo">
          <p className="activar-plan__metodo-pago-title">
            Hacia <span className="activar-plan__required">*</span>
          </p>
          <p className="activar-plan__metodo-pago-hint">
            Almacenamiento de destino del dinero.
          </p>
          <div className="activar-plan__metodo-pago-options pf-pago-clase__opciones">
            {opcionesHacia.map((metodo) => (
              <label
                key={`hacia-${metodo.id}`}
                className={`activar-plan__metodo-option${
                  hacia === metodo.id
                    ? ' activar-plan__metodo-option--checked'
                    : ''
                }`}
              >
                <input
                  type="radio"
                  name="traspasoHacia"
                  className="activar-plan__radio"
                  value={metodo.id}
                  checked={hacia === metodo.id}
                  onChange={() => {
                    setHacia(metodo.id)
                    setError('')
                  }}
                  disabled={loadingVisible || !desde}
                />
                <span>{metodo.label}</span>
              </label>
            ))}
          </div>
        </div>

        <label className="pf-usuarios-busqueda__field ag-finanzas__field">
          <span className="pf-usuarios-busqueda__label">
            Valor <span className="pf-pago-clase__required">*</span>
          </span>
          <input
            type="text"
            className="pf-usuarios-busqueda__input"
            value={valor}
            onChange={(e) => {
              setValor(e.target.value.replace(/[^\d.,]/g, ''))
              setError('')
            }}
            placeholder="Ej. 200000"
            inputMode="numeric"
            disabled={loadingVisible}
          />
        </label>

        <label className="pf-usuarios-busqueda__field ag-finanzas__field">
          <span className="pf-usuarios-busqueda__label">Nota (opcional)</span>
          <input
            type="text"
            className="pf-usuarios-busqueda__input"
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
            placeholder="Ej. Consignación de efectivo en banco"
            disabled={loadingVisible}
          />
        </label>

        {error ? (
          <p className="pf-entrenamientos__error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="ag-finanzas__form-actions">
          <button
            type="button"
            className="ag-action-btn ag-action-btn--ghost"
            onClick={limpiarFormulario}
            disabled={loadingVisible}
          >
            Limpiar
          </button>
          <button type="submit" className="ag-action-btn" disabled={!puedeGuardar}>
            Registrar traspaso
          </button>
        </div>
      </form>

      <section className="ag-finanzas__salidas-lista" aria-label="Traspasos registrados">
        <header className="ag-finanzas__salidas-header">
          <div>
            <h2 className="ag-finanzas__salidas-title">Historial de traspasos</h2>
            <p className="ag-finanzas__salidas-meta">
              {traspasos.length} traspaso(s) en el periodo seleccionado
            </p>
          </div>
        </header>

        <div className="pf-registro__filtros ag-finanzas__salidas-filtros">
          <div className="pf-registro__filtros-campos">
            <CampoFechaCalendario
              label="Desde"
              value={filtroDesde}
              onChange={setFiltroDesde}
              disabled={loadingVisible}
            />
            <CampoFechaCalendario
              label="Hasta"
              value={filtroHasta}
              onChange={setFiltroHasta}
              disabled={loadingVisible}
            />
          </div>
          <button
            type="button"
            className="ag-action-btn"
            onClick={cargarTraspasos}
            disabled={loadingVisible}
          >
            Consultar
          </button>
        </div>

        {!cargandoLista && traspasos.length === 0 ? (
          <div className="ag-panel">
            <p className="ag-panel__empty">
              No hay traspasos registrados en el intervalo seleccionado.
            </p>
          </div>
        ) : null}

        {traspasos.length > 0 ? (
          <div className="ag-finanzas__tabla-wrap">
            <table className="ag-finanzas__tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Registro</th>
                  <th>Desde</th>
                  <th>Hacia</th>
                  <th>Nota</th>
                  <th>Valor</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {traspasos.map((item) => (
                  <tr key={item.grupoId}>
                    <td>
                      {item.fecha
                        ? formatearFechaCuenta(
                            new Date(`${item.fecha}T12:00:00-05:00`).getTime(),
                          )
                        : '—'}
                    </td>
                    <td>{formatearFechaHoraCuenta(item.creadoEn)}</td>
                    <td>{ALMACENAMIENTO_LABEL[item.desde] || item.desde || '—'}</td>
                    <td>{ALMACENAMIENTO_LABEL[item.hacia] || item.hacia || '—'}</td>
                    <td>{item.concepto || '—'}</td>
                    <td className="ag-finanzas__tabla-monto">
                      {formatearPrecioCuenta(item.monto)}
                    </td>
                    <td className="ag-finanzas__tabla-acciones">
                      <BotonEliminarMovimiento
                        mov={item}
                        onEliminar={solicitarEliminar}
                        disabled={loadingVisible}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      {modalEliminar}
      <LoadingOverlay
        visible={loadingVisible}
        label={
          eliminando
            ? 'Eliminando traspaso'
            : guardando
              ? 'Registrando traspaso'
              : 'Cargando traspasos'
        }
      />
    </section>
  )
}

export default FinanzasTraspasos
