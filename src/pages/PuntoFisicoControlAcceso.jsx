import { useCallback, useEffect, useRef, useState } from 'react'
import logo from '../assets/images/logos/logo.webp'
import LoadingOverlay from '../components/LoadingOverlay.jsx'
import { registrarAsistencia } from '../services/asistenciasService.js'
import { formatearFechaCuenta } from './cuenta/cuentaUtils.js'
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

function PantallaCumpleanos({ nombre, planNombre, rutinaHoy }) {
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
        <BloqueRutinaHoy rutinaHoy={rutinaHoy} />
      </div>
    </section>
  )
}

function BotonFullscreen({ fullscreen, onToggle }) {
  return (
    <button
      type="button"
      className="pf-control-acceso__fullscreen-btn"
      onClick={onToggle}
      aria-label={
        fullscreen ? 'Salir de pantalla completa' : 'Activar pantalla completa'
      }
      title={fullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
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
      <span>{fullscreen ? 'Salir' : 'Pantalla completa'}</span>
    </button>
  )
}

function VistaControlAcceso({ fullscreen = false, onToggleFullscreen }) {
  const inputRef = useRef(null)
  const timerRef = useRef(null)

  const [cedula, setCedula] = useState('')
  const [validando, setValidando] = useState(false)
  const [error, setError] = useState('')
  const [resultado, setResultado] = useState(null)

  const enfocarInput = useCallback(() => {
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [])

  const reiniciar = useCallback(() => {
    setCedula('')
    setError('')
    setResultado(null)
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
    if (event.key === 'Enter' && !validando && !resultado) {
      event.preventDefault()
      ejecutarValidacion()
    }
  }

  let contenido = null

  if (resultado?.tipo === 'admitido' && resultado.esCumpleanos) {
    contenido = (
      <PantallaCumpleanos
        nombre={resultado.nombre}
        planNombre={resultado.planNombre}
        rutinaHoy={resultado.rutinaHoy}
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
            Plan activo:{' '}
            <strong>{resultado.planNombre || 'Membresía'}</strong>
          </p>
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
          <h1 className="pf-control-acceso__denegado-titulo">
            {resultado.usuarioEncontrado
              ? resultado.nombre || 'Membresía no activa'
              : 'Usuario no encontrado'}
          </h1>

          {resultado.usuarioEncontrado ? (
            resultado.planVencido && resultado.fechaVencimientoUltimoPlan ? (
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
    <div className="pf-control-acceso__shell">
      {onToggleFullscreen ? (
        <BotonFullscreen
          fullscreen={fullscreen}
          onToggle={onToggleFullscreen}
        />
      ) : null}
      {contenido}
      <LoadingOverlay visible={validando} label="Validando acceso" />
    </div>
  )
}

export default VistaControlAcceso
