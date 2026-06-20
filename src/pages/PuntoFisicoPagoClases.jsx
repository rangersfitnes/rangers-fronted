import { useState } from 'react'
import LoadingOverlay from '../components/LoadingOverlay.jsx'
import { useToast } from '../components/Toast.jsx'
import { registrarPagoClaseDia } from '../services/pagosClasesService.js'
import '../components/ActivarPlanModal.css'

function VistaPagoClases() {
  const toast = useToast()
  const [cedula, setCedula] = useState('')
  const [metodoPago, setMetodoPago] = useState('')
  const [valorPagado, setValorPagado] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [recordatorioOpen, setRecordatorioOpen] = useState(false)
  const [ultimoPago, setUltimoPago] = useState(null)

  const esCortesia = metodoPago === 'cortesia'
  const requiereValor = Boolean(metodoPago) && !esCortesia

  const valorPagadoValido =
    !requiereValor ||
    (valorPagado.trim() !== '' &&
      Number(valorPagado.trim().replace(/\./g, '').replace(/,/g, '.')) > 0)

  const puedeGuardar =
    Boolean(cedula.trim() && metodoPago && valorPagadoValido) && !guardando

  const limpiarFormulario = () => {
    setCedula('')
    setMetodoPago('')
    setValorPagado('')
  }

  const seleccionarMetodo = (valor) => {
    setMetodoPago(valor)
    setError('')
    if (valor === 'cortesia') setValorPagado('')
  }

  const handleGuardar = async () => {
    const doc = cedula.trim().replace(/\s/g, '').replace(/\./g, '')
    if (!doc) {
      setError('Ingresa el número de cédula del cliente')
      return
    }
    if (!metodoPago) {
      setError('Selecciona el tipo de registro')
      return
    }
    if (requiereValor && !valorPagadoValido) {
      setError('Ingresa el valor pagado por la clase del día')
      return
    }

    setError('')
    setGuardando(true)
    let abrirRecordatorioWhatsapp = false

    try {
      const fueTransferencia = metodoPago === 'transferencia'
      const pago = await registrarPagoClaseDia({
        cedula: doc,
        metodoPago,
        valorPagado: requiereValor ? valorPagado : undefined,
      })

      setUltimoPago({
        ...pago,
        cedula: pago?.cedula ?? doc,
        metodoPago: pago?.metodoPago ?? metodoPago,
      })
      limpiarFormulario()

      if (fueTransferencia || pago?.requiereCapturaWhatsapp) {
        abrirRecordatorioWhatsapp = true
      } else {
        toast.success(
          metodoPago === 'cortesia'
            ? 'Clase de cortesía registrada'
            : 'Pago de la clase registrado',
        )
      }
    } catch (err) {
      setError(err.message || 'No se pudo guardar el pago')
    } finally {
      setGuardando(false)
      if (abrirRecordatorioWhatsapp) {
        setRecordatorioOpen(true)
      }
    }
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && puedeGuardar) {
      event.preventDefault()
      handleGuardar()
    }
  }

  return (
    <section className="pf-page__view">
      <header className="pf-page__view-header">
        <h1 className="pf-page__title">Pago del día</h1>
        <p className="pf-page__subtitle">
          Registra el pago de la clase de hoy por cédula del cliente
        </p>
      </header>

      {recordatorioOpen ? (
        <aside
          className="pf-pago-clase__anuncio"
          role="alert"
          aria-live="assertive"
        >
          <p className="pf-pago-clase__anuncio-etiqueta">Importante</p>
          <h2 className="pf-pago-clase__anuncio-titulo">
            Envía el comprobante al grupo de WhatsApp
          </h2>
          <p className="pf-pago-clase__anuncio-texto">
            El pago por <strong>transferencia</strong>
            {ultimoPago?.cedula ? (
              <>
                {' '}
                de la cédula <strong>{ultimoPago.cedula}</strong>
              </>
            ) : null}
            {(ultimoPago?.valorPagado ?? ultimoPago?.valorTransferencia) != null ? (
              <>
                {' '}
                por{' '}
                <strong>
                  $
                  {(
                    ultimoPago.valorPagado ?? ultimoPago.valorTransferencia
                  ).toLocaleString('es-CO')}
                </strong>
              </>
            ) : null}{' '}
            quedó registrado. <strong>Envía la captura del comprobante</strong> al
            grupo de WhatsApp de Rangers Box para dejar constancia del pago.
          </p>
          <button
            type="button"
            className="pf-action-btn pf-pago-clase__anuncio-btn"
            onClick={() => setRecordatorioOpen(false)}
          >
            Entendido
          </button>
        </aside>
      ) : null}

      <div className="pf-pago-clase">
        <label className="pf-usuarios-busqueda__field pf-pago-clase__field">
          <span className="pf-usuarios-busqueda__label">
            Cédula del cliente <span className="pf-pago-clase__required">*</span>
          </span>
          <input
            type="text"
            className="pf-usuarios-busqueda__input"
            value={cedula}
            onChange={(e) => {
              setCedula(e.target.value.replace(/\s/g, ''))
              setError('')
            }}
            onKeyDown={handleKeyDown}
            placeholder="Número de cédula"
            inputMode="numeric"
            autoComplete="off"
            disabled={guardando}
          />
        </label>

        <div className="activar-plan__metodo-pago pf-pago-clase__metodo">
          <p className="activar-plan__metodo-pago-title">
            Tipo de registro <span className="activar-plan__required">*</span>
          </p>
          <p className="activar-plan__metodo-pago-hint">
            Elige cómo se registró la clase de hoy.
          </p>
          <div className="activar-plan__metodo-pago-options pf-pago-clase__opciones">
            <label
              className={`activar-plan__metodo-option${
                metodoPago === 'efectivo'
                  ? ' activar-plan__metodo-option--checked'
                  : ''
              }`}
            >
              <input
                type="radio"
                name="metodoPagoClase"
                className="activar-plan__radio"
                value="efectivo"
                checked={metodoPago === 'efectivo'}
                onChange={() => seleccionarMetodo('efectivo')}
                disabled={guardando}
              />
              <span>Efectivo</span>
            </label>
            <label
              className={`activar-plan__metodo-option${
                metodoPago === 'transferencia'
                  ? ' activar-plan__metodo-option--checked'
                  : ''
              }`}
            >
              <input
                type="radio"
                name="metodoPagoClase"
                className="activar-plan__radio"
                value="transferencia"
                checked={metodoPago === 'transferencia'}
                onChange={() => seleccionarMetodo('transferencia')}
                disabled={guardando}
              />
              <span>Transferencia</span>
            </label>
            <label
              className={`activar-plan__metodo-option activar-plan__metodo-option--cortesia${
                metodoPago === 'cortesia'
                  ? ' activar-plan__metodo-option--checked'
                  : ''
              }`}
            >
              <input
                type="radio"
                name="metodoPagoClase"
                className="activar-plan__radio"
                value="cortesia"
                checked={metodoPago === 'cortesia'}
                onChange={() => seleccionarMetodo('cortesia')}
                disabled={guardando}
              />
              <span>Clase de cortesía</span>
            </label>
          </div>
          {metodoPago === 'cortesia' ? (
            <p className="pf-pago-clase__cortesia-hint">
              Solo una clase de cortesía por cédula. Si ya la usó, el sistema
              rechazará el registro.
            </p>
          ) : null}
        </div>

        {requiereValor ? (
          <label className="pf-usuarios-busqueda__field pf-pago-clase__field">
            <span className="pf-usuarios-busqueda__label">
              Valor pagado por la clase del día{' '}
              <span className="pf-pago-clase__required">*</span>
            </span>
            <div className="pf-pago-clase__valor-wrap">
              <span className="pf-pago-clase__valor-prefix" aria-hidden="true">
                $
              </span>
              <input
                type="text"
                className="pf-usuarios-busqueda__input pf-pago-clase__valor-input"
                value={valorPagado}
                onChange={(e) => {
                  setValorPagado(e.target.value.replace(/[^\d.,]/g, ''))
                  setError('')
                }}
                onKeyDown={handleKeyDown}
                placeholder="Ej. 25000"
                inputMode="decimal"
                autoComplete="off"
                disabled={guardando}
              />
            </div>
          </label>
        ) : null}

        {error ? (
          <p className="pf-entrenamientos__error" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          className="pf-action-btn pf-pago-clase__guardar"
          onClick={handleGuardar}
          disabled={!puedeGuardar}
        >
          Guardar pago
        </button>
      </div>

      <LoadingOverlay visible={guardando} label="Guardando pago" />
    </section>
  )
}

export default VistaPagoClases
