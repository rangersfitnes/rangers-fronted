import { useCallback, useEffect, useRef, useState } from 'react'
import logo from '../assets/images/logos/logo.webp'
import LoadingOverlay from '../components/LoadingOverlay.jsx'
import { registrarAsistencia } from '../services/asistenciasService.js'
import { registrarPagoClaseDia } from '../services/pagosClasesService.js'
import { formatearFechaCuenta } from './cuenta/cuentaUtils.js'
import '../components/ActivarPlanModal.css'
import './PuntoFisico.css'

const PANTALLA_MS = 3000
const PANTALLA_CUMPLE_MS = 5500

const CONFETTI_PARTICULAS = Array.from({ length: 28 }, (_, indice) => ({
  id: indice,
  left: `${(indice * 13 + 7) % 100}%`,
  delay: `${(indice % 7) * 0.12}s`,
  duration: `${2.6 + (indice % 6) * 0.4}s`,
  size: `${6 + (indice % 4) * 2}px`,
  color: ['#f97316', '#fbbf24', '#22c55e', '#38bdf8', '#f472b6', '#a78bfa'][
    indice % 6
  ],
}))

function obtenerPrimerNombre(nombre) {
  if (!nombre) return 'atleta'
  return nombre.trim().split(/\s+/)[0]
}

function etiquetaAccesoAdmitido(resultado) {
  if (resultado.tipoPlan === 'tiquetera') {
    return resultado.planNombre || 'Tiquetera'
  }
  if (resultado.tipoAcceso === 'clase-cortesia') return 'Clase de cortesía'
  if (resultado.tipoAcceso === 'clase-dia') return 'Clase del día'
  return resultado.planNombre || 'Membresía'
}

function PantallaRegistroPagoClase({ datos, onCancelar, onIngresoAdmitido }) {
  const [metodoPago, setMetodoPago] = useState('')
  const [valorPagado, setValorPagado] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [recordatorioWhatsapp, setRecordatorioWhatsapp] = useState(null)

  const esCortesia = metodoPago === 'cortesia'
  const requiereValor = Boolean(metodoPago) && !esCortesia
  const valorPagadoValido =
    !requiereValor ||
    (valorPagado.trim() !== '' &&
      Number(valorPagado.trim().replace(/\./g, '').replace(/,/g, '.')) > 0)
  const puedeRegistrar =
    Boolean(metodoPago && valorPagadoValido) && !guardando && !recordatorioWhatsapp

  const seleccionarMetodo = (valor) => {
    setMetodoPago(valor)
    setError('')
    if (valor === 'cortesia') setValorPagado('')
  }

  const ejecutarRegistro = async () => {
    if (!metodoPago) {
      setError('Selecciona cómo se registra la clase de hoy')
      return
    }
    if (requiereValor && !valorPagadoValido) {
      setError('Ingresa el valor pagado por la clase del día')
      return
    }

    setError('')
    setGuardando(true)

    try {
      const pago = await registrarPagoClaseDia({
        cedula: datos.cedula,
        metodoPago,
        valorPagado: requiereValor ? valorPagado : undefined,
      })

      if (pago?.metodoPago === 'transferencia' || pago?.requiereCapturaWhatsapp) {
        setRecordatorioWhatsapp({
          cedula: pago.cedula ?? datos.cedula,
          valorPagado: pago.valorPagado ?? pago.valorTransferencia,
        })
        return
      }

      const ingreso = await registrarAsistencia({ cedula: datos.cedula })
      onIngresoAdmitido({ tipo: 'admitido', ...ingreso })
    } catch (err) {
      setError(err.message || 'No se pudo registrar el pago')
    } finally {
      setGuardando(false)
    }
  }

  const continuarTrasWhatsapp = async () => {
    setGuardando(true)
    setError('')
    try {
      const ingreso = await registrarAsistencia({ cedula: datos.cedula })
      onIngresoAdmitido({ tipo: 'admitido', ...ingreso })
    } catch (err) {
      setError(err.message || 'Pago registrado, pero no se pudo validar el ingreso')
      setRecordatorioWhatsapp(null)
    } finally {
      setGuardando(false)
    }
  }

  if (recordatorioWhatsapp) {
    return (
      <section className="pf-control-acceso pf-control-acceso--pago" aria-live="polite">
        <div className="pf-control-acceso__pago-card">
          <p className="pf-pago-clase__anuncio-etiqueta">Importante</p>
          <h1 className="pf-control-acceso__pago-titulo">
            Envía el comprobante al grupo de WhatsApp
          </h1>
          <p className="pf-control-acceso__pago-detalle">
            El pago por <strong>transferencia</strong> de la cédula{' '}
            <strong>{recordatorioWhatsapp.cedula}</strong>
            {recordatorioWhatsapp.valorPagado != null ? (
              <>
                {' '}
                por{' '}
                <strong>
                  ${Number(recordatorioWhatsapp.valorPagado).toLocaleString('es-CO')}
                </strong>
              </>
            ) : null}{' '}
            quedó registrado. Envía la captura al grupo de Rangers Box y luego
            confirma el ingreso.
          </p>
          {error ? (
            <p className="pf-control-acceso__error" role="alert">
              {error}
            </p>
          ) : null}
          <div className="pf-control-acceso__pago-acciones">
            <button
              type="button"
              className="pf-action-btn pf-action-btn--ghost"
              onClick={onCancelar}
              disabled={guardando}
            >
              Cancelar
            </button>
          <button
            type="button"
            className="pf-action-btn"
            onClick={continuarTrasWhatsapp}
            disabled={guardando}
          >
            Confirmar ingreso
          </button>
        </div>
        <LoadingOverlay visible={guardando} label="Validando ingreso" />
      </div>
    </section>
  )
}

  return (
    <section className="pf-control-acceso pf-control-acceso--pago" aria-live="polite">
      <div className="pf-control-acceso__pago-card">
        <p className="pf-control-acceso__pago-etiqueta">Pago del día</p>
        <h1 className="pf-control-acceso__pago-titulo">
          {datos.usuarioEncontrado
            ? datos.nombre || 'Sin membresía activa'
            : 'Visitante sin membresía'}
        </h1>
        <p className="pf-control-acceso__pago-detalle">
          Cédula <strong>{datos.cedula}</strong>
          {datos.tiqueteraAgotada
            ? ' · Tiquetera sin entradas disponibles'
            : datos.planVencido
              ? ' · Plan vencido'
              : datos.usuarioEncontrado
                ? ' · Sin plan activo'
                : ' · Usuario no registrado en el sistema'}
        </p>
        <p className="pf-control-acceso__pago-hint">
          El staff debe registrar el pago de la clase o marcar una cortesía para
          admitir el ingreso.
        </p>

        <div className="activar-plan__metodo-pago pf-pago-clase__metodo">
          <p className="activar-plan__metodo-pago-title">
            Tipo de registro <span className="activar-plan__required">*</span>
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
                name="metodoPagoClaseAcceso"
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
                name="metodoPagoClaseAcceso"
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
              }${datos.cortesiaDisponible === false ? ' activar-plan__metodo-option--disabled' : ''}`}
            >
              <input
                type="radio"
                name="metodoPagoClaseAcceso"
                className="activar-plan__radio"
                value="cortesia"
                checked={metodoPago === 'cortesia'}
                onChange={() => seleccionarMetodo('cortesia')}
                disabled={guardando || datos.cortesiaDisponible === false}
              />
              <span>Clase de cortesía</span>
            </label>
          </div>
          {datos.cortesiaDisponible === false ? (
            <p className="pf-pago-clase__cortesia-hint">
              Esta cédula ya utilizó su clase de cortesía.
            </p>
          ) : metodoPago === 'cortesia' ? (
            <p className="pf-pago-clase__cortesia-hint">
              Solo una cortesía por cédula en el historial del box.
            </p>
          ) : null}
        </div>

        {requiereValor ? (
          <label className="pf-control-acceso__field pf-control-acceso__field--pago">
            <span className="pf-control-acceso__label">
              Valor pagado por la clase del día{' '}
              <span className="pf-pago-clase__required">*</span>
            </span>
            <div className="pf-pago-clase__valor-wrap">
              <span className="pf-pago-clase__valor-prefix" aria-hidden="true">
                $
              </span>
              <input
                type="text"
                className="pf-control-acceso__input pf-pago-clase__valor-input"
                value={valorPagado}
                onChange={(e) => {
                  setValorPagado(e.target.value.replace(/[^\d.,]/g, ''))
                  setError('')
                }}
                placeholder="Ej. 25000"
                inputMode="decimal"
                autoComplete="off"
                disabled={guardando}
              />
            </div>
          </label>
        ) : null}

        {error ? (
          <p className="pf-control-acceso__error" role="alert">
            {error}
          </p>
        ) : null}

        <div className="pf-control-acceso__pago-acciones">
          <button
            type="button"
            className="pf-action-btn pf-action-btn--ghost"
            onClick={onCancelar}
            disabled={guardando}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="pf-action-btn"
            onClick={ejecutarRegistro}
            disabled={!puedeRegistrar}
          >
            Registrar y admitir
          </button>
        </div>
      </div>
      <LoadingOverlay visible={guardando} label="Registrando pago" />
    </section>
  )
}

function BloqueTiqueteraSaldo({ entradasRestantes, entradasIncluidas }) {
  if (!Number.isFinite(entradasIncluidas)) return null

  const restantes = Number.isFinite(entradasRestantes) ? entradasRestantes : 0

  return (
    <div className="pf-control-acceso__tiquetera">
      <p className="pf-control-acceso__tiquetera-etiqueta">Entradas de tu tiquetera</p>
      <p className="pf-control-acceso__tiquetera-valor">
        <strong>{restantes}</strong>
        <span> de {entradasIncluidas}</span>
      </p>
      <p className="pf-control-acceso__tiquetera-hint">
        {restantes === 0
          ? 'Usaste tu última entrada de esta tiquetera'
          : restantes === 1
            ? 'Te queda 1 entrada para entrenar'
            : `Te quedan ${restantes} entradas para entrenar`}
      </p>
    </div>
  )
}

function BloqueRutinaHoy({ rutinaHoy }) {
  if (!rutinaHoy?.titulo) return null

  return (
    <div className="pf-control-acceso__rutina">
      <p className="pf-control-acceso__rutina-etiqueta">Te toca entrenar hoy</p>
      <h2 className="pf-control-acceso__rutina-titulo">{rutinaHoy.titulo}</h2>
      {rutinaHoy.actividad ? (
        <p className="pf-control-acceso__rutina-actividad">{rutinaHoy.actividad}</p>
      ) : null}
      {rutinaHoy.origen === 'admin' ? (
        <span className="pf-control-acceso__rutina-badge">Rutina asignada</span>
      ) : null}
    </div>
  )
}

function PantallaCumpleanos({
  nombre,
  planNombre,
  rutinaHoy,
  entradasRestantes,
  entradasIncluidas,
}) {
  const primerNombre = obtenerPrimerNombre(nombre)

  return (
    <section
      className="pf-control-acceso pf-control-acceso--cumpleanos"
      aria-live="polite"
    >
      <div className="pf-control-acceso__cumple-confetti" aria-hidden="true">
        {CONFETTI_PARTICULAS.map((particula) => (
          <span
            key={particula.id}
            className="pf-control-acceso__cumple-confetti-item"
            style={{
              left: particula.left,
              animationDelay: particula.delay,
              animationDuration: particula.duration,
              width: particula.size,
              height: particula.size,
              backgroundColor: particula.color,
            }}
          />
        ))}
      </div>

      <div className="pf-control-acceso__cumple-glow" aria-hidden="true" />

      <div className="pf-control-acceso__cumple-contenido">
        <div className="pf-control-acceso__cumple-iconos" aria-hidden="true">
          <span className="pf-control-acceso__cumple-emoji pf-control-acceso__cumple-emoji--left">
            🎈
          </span>
          <span className="pf-control-acceso__cumple-emoji pf-control-acceso__cumple-emoji--cake">
            🎂
          </span>
          <span className="pf-control-acceso__cumple-emoji pf-control-acceso__cumple-emoji--right">
            🎉
          </span>
        </div>

        <p className="pf-control-acceso__cumple-etiqueta">¡Hoy es un día especial!</p>
        <h1 className="pf-control-acceso__cumple-titulo">¡Feliz cumpleaños!</h1>
        <p className="pf-control-acceso__cumple-nombre">{primerNombre}</p>
        <p className="pf-control-acceso__cumple-mensaje">
          Rangers Box te desea un día lleno de energía, metas cumplidas y buenos
          entrenamientos.
        </p>
        <p className="pf-control-acceso__cumple-plan">
          Ingreso admitido · Plan{' '}
          <strong>{planNombre || 'Membresía'}</strong>
        </p>
        <BloqueTiqueteraSaldo
          entradasRestantes={entradasRestantes}
          entradasIncluidas={entradasIncluidas}
        />
        <BloqueRutinaHoy rutinaHoy={rutinaHoy} />
      </div>
    </section>
  )
}

function BotonFullscreen({ fullscreen, onToggle, modoKiosco = false }) {
  return (
    <button
      type="button"
      className={`pf-control-acceso__fullscreen-btn${
        modoKiosco ? ' pf-control-acceso__fullscreen-btn--kiosco' : ''
      }`}
      onClick={onToggle}
      aria-label={
        modoKiosco
          ? 'Salir de pantalla completa (staff)'
          : fullscreen
            ? 'Salir de pantalla completa'
            : 'Activar pantalla completa'
      }
      title={
        modoKiosco
          ? 'Salir de pantalla completa (staff)'
          : fullscreen
            ? 'Salir de pantalla completa'
            : 'Pantalla completa'
      }
    >
      {fullscreen ? (
        <svg
          className="pf-control-acceso__fullscreen-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M4 14h6v6M20 10h-6V4M14 10l7-7M3 21l7-7" />
        </svg>
      ) : (
        <svg
          className="pf-control-acceso__fullscreen-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" />
        </svg>
      )}
      <span>
        {modoKiosco ? 'Staff' : fullscreen ? 'Salir' : 'Pantalla completa'}
      </span>
    </button>
  )
}

function VistaControlAcceso({
  fullscreen = false,
  modoKiosco = false,
  onToggleFullscreen,
}) {
  const inputRef = useRef(null)
  const timerRef = useRef(null)

  const [cedula, setCedula] = useState('')
  const [validando, setValidando] = useState(false)
  const [error, setError] = useState('')
  const [resultado, setResultado] = useState(null)
  const [pagoPendiente, setPagoPendiente] = useState(null)

  const enfocarInput = useCallback(() => {
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [])

  const reiniciar = useCallback(() => {
    setCedula('')
    setError('')
    setResultado(null)
    setPagoPendiente(null)
    enfocarInput()
  }, [enfocarInput])

  useEffect(() => {
    enfocarInput()
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [enfocarInput])

  const mostrarResultadoTemporal = useCallback(
    (datos) => {
      setResultado(datos)
      if (timerRef.current) clearTimeout(timerRef.current)
      const duracion =
        datos.esCumpleanos || datos.rutinaHoy ? PANTALLA_CUMPLE_MS : PANTALLA_MS
      timerRef.current = setTimeout(reiniciar, duracion)
    },
    [reiniciar],
  )

  const ejecutarValidacion = async () => {
    const doc = cedula.trim().replace(/\s/g, '').replace(/\./g, '')
    if (!doc) {
      setError('Ingresa el número de cédula')
      return
    }

    setError('')
    setValidando(true)

    try {
      const res = await registrarAsistencia({ cedula: doc })
      mostrarResultadoTemporal({ tipo: 'admitido', ...res })
    } catch (err) {
      if (err.codigo === 'requiere_pago_clase' && err.accesoDenegado) {
        setPagoPendiente({
          cedula: doc,
          ...err.accesoDenegado,
        })
        return
      }
      if (err.codigo === 'acceso_denegado' && err.accesoDenegado) {
        mostrarResultadoTemporal({
          tipo: 'denegado',
          ...err.accesoDenegado,
        })
      } else {
        setError(err.message || 'No se pudo validar el acceso')
        enfocarInput()
      }
    } finally {
      setValidando(false)
    }
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !validando && !resultado && !pagoPendiente) {
      event.preventDefault()
      ejecutarValidacion()
    }
  }

  let contenido = null

  if (pagoPendiente) {
    contenido = (
      <PantallaRegistroPagoClase
        datos={pagoPendiente}
        onCancelar={reiniciar}
        onIngresoAdmitido={mostrarResultadoTemporal}
      />
    )
  } else if (resultado?.tipo === 'admitido' && resultado.esCumpleanos) {
    contenido = (
      <PantallaCumpleanos
        nombre={resultado.nombre}
        planNombre={resultado.planNombre}
        rutinaHoy={resultado.rutinaHoy}
        entradasRestantes={resultado.entradasRestantes}
        entradasIncluidas={resultado.entradasIncluidas}
      />
    )
  } else if (resultado?.tipo === 'admitido') {
    contenido = (
      <section
        className="pf-control-acceso pf-control-acceso--bienvenida"
        aria-live="polite"
      >
        <div className="pf-control-acceso__bienvenida">
          <div className="pf-control-acceso__bienvenida-icono" aria-hidden="true">
            ✓
          </div>
          <p className="pf-control-acceso__bienvenida-etiqueta">Ingreso admitido</p>
          <h1 className="pf-control-acceso__bienvenida-nombre">
            ¡Bienvenido/a, {resultado.nombre || 'atleta'}!
          </h1>
          <p className="pf-control-acceso__bienvenida-plan">
            {resultado.tipoPlan === 'tiquetera'
              ? 'Tiquetera: '
              : resultado.tipoAcceso === 'membresia'
                ? 'Plan activo: '
                : 'Acceso: '}
            <strong>{etiquetaAccesoAdmitido(resultado)}</strong>
          </p>
          <BloqueTiqueteraSaldo
            entradasRestantes={resultado.entradasRestantes}
            entradasIncluidas={resultado.entradasIncluidas}
          />
          <BloqueRutinaHoy rutinaHoy={resultado.rutinaHoy} />
        </div>
      </section>
    )
  } else if (resultado?.tipo === 'denegado') {
    const fechaVencimiento = formatearFechaCuenta(
      resultado.fechaVencimientoUltimoPlan,
    )

    contenido = (
      <section
        className="pf-control-acceso pf-control-acceso--denegado"
        aria-live="assertive"
      >
        <div className="pf-control-acceso__denegado">
          <div className="pf-control-acceso__denegado-icono" aria-hidden="true">
            ✕
          </div>
          <p className="pf-control-acceso__denegado-etiqueta">Acceso denegado</p>
          {resultado.planVencido ? (
            <p className="pf-control-acceso__denegado-plan-vencido">Plan vencido</p>
          ) : null}
          {resultado.tiqueteraAgotada ? (
            <p className="pf-control-acceso__denegado-plan-vencido">
              Tiquetera sin entradas
            </p>
          ) : null}
          <h1 className="pf-control-acceso__denegado-titulo">
            {resultado.usuarioEncontrado
              ? resultado.nombre || 'Membresía no activa'
              : 'Usuario no encontrado'}
          </h1>

          {resultado.usuarioEncontrado ? (
            resultado.tiqueteraAgotada ? (
              <p className="pf-control-acceso__denegado-detalle">
                Tu tiquetera sigue vigente, pero ya usaste todas las entradas
                incluidas.
              </p>
            ) : resultado.planVencido && resultado.fechaVencimientoUltimoPlan ? (
              <p className="pf-control-acceso__denegado-detalle">
                Tu plan
                {resultado.planNombreUltimo ? (
                  <>
                    {' '}
                    <strong>{resultado.planNombreUltimo}</strong>
                  </>
                ) : null}{' '}
                venció el <strong>{fechaVencimiento}</strong>.
              </p>
            ) : (
              <p className="pf-control-acceso__denegado-detalle">
                No tienes una membresía activa.
              </p>
            )
          ) : (
            <p className="pf-control-acceso__denegado-detalle">
              No existe un usuario registrado con esta cédula.
            </p>
          )}

          {(resultado.tieneClaseDiaHoy || resultado.tieneClaseCortesiaHoy) && (
            <div className="pf-control-acceso__info">
              <p className="pf-control-acceso__info-titulo">Información adicional</p>
              <ul className="pf-control-acceso__info-lista">
                {resultado.tieneClaseDiaHoy ? (
                  <li>Clase del día registrada para hoy</li>
                ) : null}
                {resultado.tieneClaseCortesiaHoy ? (
                  <li>Clase de cortesía registrada para hoy</li>
                ) : null}
              </ul>
            </div>
          )}
        </div>
      </section>
    )
  } else {
    contenido = (
      <section className="pf-control-acceso">
        <div className="pf-control-acceso__contenido">
          <div className="pf-control-acceso__entrada">
            <img
              src={logo}
              alt="Rangers Box"
              className="pf-control-acceso__logo"
            />

            <label className="pf-control-acceso__field">
              <span className="pf-control-acceso__label">Número de cédula</span>
              <input
                ref={inputRef}
                type="text"
                className="pf-control-acceso__input"
                value={cedula}
                onChange={(e) => {
                  setCedula(e.target.value.replace(/\s/g, ''))
                  setError('')
                }}
                onKeyDown={handleKeyDown}
                placeholder="Digita tu cédula y presiona Enter"
                inputMode="numeric"
                autoComplete="off"
                disabled={validando}
              />
            </label>
          </div>

          {error ? (
            <p className="pf-control-acceso__error" role="alert">
              {error}
            </p>
          ) : null}

          <p className="pf-control-acceso__hint">
            Presiona Enter para validar tu acceso
          </p>
        </div>
      </section>
    )
  }

  return (
    <div
      className={`pf-control-acceso__shell${
        fullscreen || modoKiosco ? ' pf-control-acceso__shell--fullscreen' : ''
      }${modoKiosco ? ' pf-control-acceso__shell--kiosco' : ''}`}
    >
      {!resultado && !pagoPendiente ? (
        <header className="pf-control-acceso__banner" aria-label="Bienvenida">
          <p className="pf-control-acceso__banner-eyebrow">Bienvenido</p>
          <h1 className="pf-control-acceso__banner-titulo">
            Registra aquí tu asistencia
          </h1>
        </header>
      ) : null}

      {onToggleFullscreen ? (
        <BotonFullscreen
          fullscreen={fullscreen}
          modoKiosco={modoKiosco}
          onToggle={onToggleFullscreen}
        />
      ) : null}
      {contenido}
      <LoadingOverlay visible={validando} label="Validando acceso" />
    </div>
  )
}

export default VistaControlAcceso
