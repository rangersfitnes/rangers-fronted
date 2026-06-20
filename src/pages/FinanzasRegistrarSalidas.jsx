import { useCallback, useEffect, useState } from 'react'
import CampoFechaCalendario from '../components/CampoFechaCalendario.jsx'
import FinanzasSubvistaHeader from '../components/FinanzasSubvistaHeader.jsx'
import LoadingOverlay from '../components/LoadingOverlay.jsx'
import {
  BotonEliminarMovimiento,
  useEliminarMovimiento,
} from '../components/MovimientoEliminar.jsx'
import { useToast } from '../components/Toast.jsx'
import { registrarSalida } from '../services/finanzasService.js'
import { obtenerReporteFinanciero } from '../services/reportesFinancierosService.js'
import {
  formatearFechaCuenta,
  formatearFechaHoraCuenta,
  formatearPrecioCuenta,
} from './cuenta/cuentaUtils.js'
import '../components/ActivarPlanModal.css'
import './AdministracionGeneral.css'
import './PuntoFisico.css'

const METODOS_SALIDA = [
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'transferencia', label: 'Transferencia' },
  { id: 'wompi', label: 'Wompi' },
  { id: 'otro', label: 'Otro' },
]

const METODO_LABEL = Object.fromEntries(
  METODOS_SALIDA.map((m) => [m.id, m.label]),
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

function FinanzasRegistrarSalidas({ onVolver }) {
  const toast = useToast()
  const [fecha, setFecha] = useState(fechaHoyColombiaInput)
  const [concepto, setConcepto] = useState('')
  const [valor, setValor] = useState('')
  const [metodoPago, setMetodoPago] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [salidas, setSalidas] = useState([])
  const [cargandoLista, setCargandoLista] = useState(true)
  const [filtroDesde, setFiltroDesde] = useState(inicioMesColombiaInput)
  const [filtroHasta, setFiltroHasta] = useState(fechaHoyColombiaInput)

  const cargarSalidas = useCallback(async () => {
    setCargandoLista(true)
    try {
      const data = await obtenerReporteFinanciero({
        desde: filtroDesde,
        hasta: filtroHasta,
      })
      setSalidas(data.egresos ?? [])
    } catch (err) {
      toast.error(err.message || 'No se pudieron cargar las salidas')
      setSalidas([])
    } finally {
      setCargandoLista(false)
    }
  }, [filtroDesde, filtroHasta, toast])

  useEffect(() => {
    cargarSalidas()
  }, [cargarSalidas])

  const { solicitarEliminar, modalEliminar, eliminando } = useEliminarMovimiento({
    onEliminado: cargarSalidas,
  })

  const montoValido = parseMonto(valor) > 0
  const puedeGuardar =
    Boolean(fecha && concepto.trim() && metodoPago && montoValido) && !guardando

  const limpiarFormulario = () => {
    setConcepto('')
    setValor('')
    setMetodoPago('')
    setFecha(fechaHoyColombiaInput())
  }

  const handleGuardar = async (event) => {
    event.preventDefault()

    if (!concepto.trim()) {
      setError('Escribe el concepto de la salida')
      return
    }
    if (!metodoPago) {
      setError('Selecciona de dónde salió el pago')
      return
    }
    if (!montoValido) {
      setError('Ingresa un valor mayor a cero')
      return
    }

    setError('')
    setGuardando(true)

    try {
      await registrarSalida({
        fecha,
        concepto: concepto.trim(),
        monto: parseMonto(valor),
        metodoPago,
      })
      toast.success('Salida registrada correctamente')
      limpiarFormulario()
      await cargarSalidas()
    } catch (err) {
      setError(err.message || 'No se pudo registrar la salida')
    } finally {
      setGuardando(false)
    }
  }

  const loadingVisible = guardando || cargandoLista || eliminando

  return (
    <section className="ag-page__view">
      <FinanzasSubvistaHeader
        titulo="Registrar salidas"
        subtitulo="Egresos y gastos del box"
        onVolver={onVolver}
      />

      <form className="ag-panel ag-finanzas__form" onSubmit={handleGuardar}>
        <CampoFechaCalendario
          label="Fecha"
          value={fecha}
          onChange={setFecha}
          disabled={loadingVisible}
        />

        <label className="pf-usuarios-busqueda__field ag-finanzas__field">
          <span className="pf-usuarios-busqueda__label">
            Concepto <span className="pf-pago-clase__required">*</span>
          </span>
          <input
            type="text"
            className="pf-usuarios-busqueda__input"
            value={concepto}
            onChange={(e) => {
              setConcepto(e.target.value)
              setError('')
            }}
            placeholder="Ej. Compra de insumos, arriendo, servicios"
            disabled={loadingVisible}
          />
        </label>

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
            placeholder="Ej. 150000"
            inputMode="numeric"
            disabled={loadingVisible}
          />
        </label>

        <div className="activar-plan__metodo-pago ag-finanzas__metodo">
          <p className="activar-plan__metodo-pago-title">
            De dónde salió el pago <span className="activar-plan__required">*</span>
          </p>
          <p className="activar-plan__metodo-pago-hint">
            Indica la fuente del egreso.
          </p>
          <div className="activar-plan__metodo-pago-options pf-pago-clase__opciones">
            {METODOS_SALIDA.map((metodo) => (
              <label
                key={metodo.id}
                className={`activar-plan__metodo-option${
                  metodoPago === metodo.id
                    ? ' activar-plan__metodo-option--checked'
                    : ''
                }`}
              >
                <input
                  type="radio"
                  name="metodoSalida"
                  className="activar-plan__radio"
                  value={metodo.id}
                  checked={metodoPago === metodo.id}
                  onChange={() => {
                    setMetodoPago(metodo.id)
                    setError('')
                  }}
                  disabled={loadingVisible}
                />
                <span>{metodo.label}</span>
              </label>
            ))}
          </div>
        </div>

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
            Registrar salida
          </button>
        </div>
      </form>

      <section className="ag-finanzas__salidas-lista" aria-label="Salidas registradas">
        <header className="ag-finanzas__salidas-header">
          <div>
            <h2 className="ag-finanzas__salidas-title">Salidas registradas</h2>
            <p className="ag-finanzas__salidas-meta">
              {salidas.length} salida(s) en el periodo seleccionado
            </p>
          </div>
          <button
            type="button"
            className="ag-action-btn ag-action-btn--ghost"
            onClick={cargarSalidas}
            disabled={loadingVisible}
          >
            Actualizar
          </button>
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
            onClick={cargarSalidas}
            disabled={loadingVisible}
          >
            Consultar
          </button>
        </div>

        {!cargandoLista && salidas.length === 0 && (
          <div className="ag-panel">
            <p className="ag-panel__empty">
              No hay salidas registradas en el intervalo seleccionado.
            </p>
          </div>
        )}

        {salidas.length > 0 && (
          <div className="ag-finanzas__tabla-wrap">
            <table className="ag-finanzas__tabla">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Registrado</th>
                  <th>Concepto</th>
                  <th>Método</th>
                  <th>Valor</th>
                  <th aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {salidas.map((salida) => (
                  <tr key={salida.id}>
                    <td>
                      {salida.fecha
                        ? formatearFechaCuenta(
                            new Date(`${salida.fecha}T12:00:00-05:00`).getTime(),
                          )
                        : '—'}
                    </td>
                    <td>{formatearFechaHoraCuenta(salida.creadoEn)}</td>
                    <td>{salida.descripcion || salida.concepto || '—'}</td>
                    <td>
                      {METODO_LABEL[salida.metodoPago] || salida.metodoPago || '—'}
                    </td>
                    <td className="ag-finanzas__tabla-monto">
                      −{formatearPrecioCuenta(salida.monto)}
                    </td>
                    <td className="ag-finanzas__tabla-acciones">
                      <BotonEliminarMovimiento
                        mov={salida}
                        onEliminar={solicitarEliminar}
                        disabled={loadingVisible}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <LoadingOverlay
        visible={loadingVisible}
        label={
          guardando
            ? 'Registrando salida'
            : eliminando
              ? 'Eliminando salida'
              : 'Cargando salidas'
        }
      />
      {modalEliminar}
    </section>
  )
}

export default FinanzasRegistrarSalidas
