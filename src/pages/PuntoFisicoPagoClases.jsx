import { useState } from 'react'
import LoadingOverlay from '../components/LoadingOverlay.jsx'
import { useToast } from '../components/Toast.jsx'
import { registrarPagoClaseDia } from '../services/pagosClasesService.js'
import { formatearFechaCuenta } from './cuenta/cuentaUtils.js'
import '../components/ActivarPlanModal.css'
import './PuntoFisico.css'

function etiquetaPlanEstado(planEstado) {
  if (planEstado === 'vencido') return 'Plan vencido'
  if (planEstado === 'sin_plan') return 'Sin plan activo'
  return 'Sin membresía activa'
}

/** Formatea el valor con puntos de miles (ej. 25000 → 25.000). */
function formatearValorMiles(valor) {
  const digitos = String(valor ?? '').replace(/\D/g, '')
  if (!digitos) return ''
  return Number(digitos).toLocaleString('es-CO')
}

function PanelUsuarioRegistrado({ usuario, onCerrar }) {
  const documentoCompleto = [usuario.tipoDocumento, usuario.documento]
    .filter(Boolean)
    .join(' ')
  const vigencia = formatearFechaCuenta(usuario.vigenciaPlan)

  return (
    <aside
      className="pf-pago-clase__usuario"
      role="status"
      aria-live="polite"
    >
      <p className="pf-pago-clase__usuario-etiqueta">Usuario registrado</p>
      <h2 className="pf-pago-clase__usuario-nombre">{usuario.nombre || '—'}</h2>
      <dl className="pf-pago-clase__usuario-datos">
        {documentoCompleto ? (
          <>
            <dt>Documento</dt>
            <dd>{documentoCompleto}</dd>
          </>
        ) : null}
        {usuario.celular ? (
          <>
            <dt>Celular</dt>
            <dd>{usuario.celular}</dd>
          </>
        ) : null}
        <dt>Estado</dt>
        <dd>{etiquetaPlanEstado(usuario.planEstado)}</dd>
        {usuario.planEstado === 'vencido' && usuario.planNombre ? (
          <>
            <dt>Último plan</dt>
            <dd>{usuario.planNombre}</dd>
          </>
        ) : null}
        {usuario.planEstado === 'vencido' && usuario.vigenciaPlan ? (
          <>
            <dt>Venció</dt>
            <dd>{vigencia}</dd>
          </>
        ) : null}
      </dl>
      <button
        type="button"
        className="pf-action-btn pf-pago-clase__anuncio-btn"
        onClick={onCerrar}
      >
        Continuar
      </button>
    </aside>
  )
}

function VistaPagoClases() {
  const toast = useToast()
  const [cedula, setCedula] = useState('')
  const [nombreCliente, setNombreCliente] = useState('')
  const [metodoPago, setMetodoPago] = useState('')
  const [valorPagado, setValorPagado] = useState(() => formatearValorMiles('10000'))
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [recordatorioOpen, setRecordatorioOpen] = useState(false)
  const [usuarioRegistradoOpen, setUsuarioRegistradoOpen] = useState(false)
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
    setNombreCliente('')
    setMetodoPago('')
    setValorPagado(formatearValorMiles('10000'))
  }

  const seleccionarMetodo = (valor) => {
    setMetodoPago(valor)
    setError('')
    if (valor === 'cortesia') {
      setValorPagado('')
    } else if (!valorPagado.trim()) {
      setValorPagado(formatearValorMiles('10000'))
    }
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
    let abrirUsuarioRegistrado = false

    try {
      const fueTransferencia = metodoPago === 'transferencia'
      const pago = await registrarPagoClaseDia({
        cedula: doc,
        metodoPago,
        valorPagado: requiereValor ? valorPagado : undefined,
        nombre: nombreCliente.trim() || undefined,
      })

      setUltimoPago({
        ...pago,
        cedula: pago?.cedula ?? doc,
        metodoPago: pago?.metodoPago ?? metodoPago,
      })
      limpiarFormulario()

      if (pago?.usuario) {
        abrirUsuarioRegistrado = true
      } else if (fueTransferencia || pago?.requiereCapturaWhatsapp) {
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
      if (abrirUsuarioRegistrado) {
        setUsuarioRegistradoOpen(true)
      } else if (abrirRecordatorioWhatsapp) {
        setRecordatorioOpen(true)
      }
    }
  }

  const cerrarUsuarioRegistrado = () => {
    setUsuarioRegistradoOpen(false)
    const pago = ultimoPago
    const fueTransferencia =
      pago?.metodoPago === 'transferencia' || pago?.requiereCapturaWhatsapp

    if (fueTransferencia) {
      setRecordatorioOpen(true)
      return
    }

    toast.success(
      pago?.metodoPago === 'cortesia'
        ? 'Clase de cortesía registrada'
        : 'Pago de la clase registrado',
    )
    setUltimoPago(null)
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

      {usuarioRegistradoOpen && ultimoPago?.usuario ? (
        <PanelUsuarioRegistrado
          usuario={ultimoPago.usuario}
          onCerrar={cerrarUsuarioRegistrado}
        />
      ) : null}

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
            onClick={() => {
              setRecordatorioOpen(false)
              setUltimoPago(null)
            }}
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

        <label className="pf-usuarios-busqueda__field pf-pago-clase__field">
          <span className="pf-usuarios-busqueda__label">
            Nombre del visitante{' '}
            <span className="pf-pago-clase__opcional">(opcional)</span>
          </span>
          <input
            type="text"
            className="pf-usuarios-busqueda__input"
            value={nombreCliente}
            onChange={(e) => {
              setNombreCliente(e.target.value)
              setError('')
            }}
            onKeyDown={handleKeyDown}
            placeholder="Ej. Juan Pérez"
            autoComplete="off"
            maxLength={120}
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
                  setValorPagado(formatearValorMiles(e.target.value))
                  setError('')
                }}
                onKeyDown={handleKeyDown}
                placeholder="Ej. 25.000"
                inputMode="numeric"
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
