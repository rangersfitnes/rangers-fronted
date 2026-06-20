import { Link } from 'react-router-dom'
import { colors } from '../variables/colors.jsx'
import { useUsuario } from '../contexts/UsuarioContext.jsx'
import PlanGrupoMiembros from './PlanGrupoMiembros.jsx'
import HorariosToggle from './HorariosToggle.jsx'
import UbicacionToggle from './UbicacionToggle.jsx'
import ClasesHoy from './ClasesHoy.jsx'
import Header from './Header.jsx'
import EventosCarousel from './EventosCarousel.jsx'
import heroBg from '../assets/images/hero/bk_home_user.webp'
import trainingIcon from '../assets/images/icons/training.svg'
import ChevronRightIcon from './icons/ChevronRightIcon.jsx'
import './Hero.css'

function obtenerPrimerNombre(nombre) {
  if (!nombre) return ''
  return nombre.trim().split(/\s+/)[0]
}

function inicialesNombre(nombre) {
  const texto = (nombre || '').trim()
  if (!texto) return '?'
  return texto.charAt(0).toUpperCase()
}

function formatearPrecio(valor) {
  const numero = Number(valor) || 0
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(numero)
}

function formatearFecha(ms) {
  if (!ms) return '—'
  return new Date(ms).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function calcularDiasRestantes(ms) {
  if (!ms) return null
  const restante = ms - Date.now()
  if (restante <= 0) return 0
  return Math.ceil(restante / (1000 * 60 * 60 * 24))
}

function Hero() {
  const { usuario } = useUsuario()
  const autenticado = Boolean(usuario)
  const primerNombre = obtenerPrimerNombre(usuario?.nombre)
  const fondo = heroBg
  const planActivo = usuario?.planesActivos?.[0] ?? null
  const planVencido = usuario?.planVencido ?? null
  const diasRestantes = calcularDiasRestantes(planActivo?.vigencia)

  return (
    <section
      id="inicio"
      className={`hero${autenticado ? ' hero--auth' : ' hero--guest'}`}
    >
      <div
        className="hero__background"
        style={{ backgroundImage: `url(${fondo})` }}
      />
      <div className="hero__overlay hero__overlay--user" />

      <div className="hero__scroll">
        <Header inScroll />

        {!autenticado ? (
          <div className="hero__carousel">
            <EventosCarousel />
          </div>
        ) : null}

        <div
          className={`hero__content${
            autenticado ? ' hero__content--top' : ''
          }`}
        >
        {autenticado ? (
          <>
            <div className="hero__welcome">
              <span className="hero__welcome-eyebrow">
                <span className="hero__welcome-dot" aria-hidden="true" />
                Bienvenido atleta
              </span>
              <h1 className="hero__welcome-name">{primerNombre}</h1>
              <p className="hero__welcome-sub">Tu evolución está en marcha.</p>
            </div>

            <p className="hero__tagline">
              Hechos para resistir.
              <br />
              <span style={{ color: colors.primary_orange }}>
                Entrenados para vencer.
              </span>
            </p>

            <Link to="/cuenta/rutinas" className="hero__training-btn">
              Mi entrenamiento
              <img
                src={trainingIcon}
                alt=""
                className="hero__training-btn-icon"
                aria-hidden="true"
              />
            </Link>

            {planActivo ? (
              <article className="hero__plan-card">
                <div className="hero__plan-card-top">
                  <div>
                    <span className="hero__plan-card-eyebrow">
                      Tu plan activo
                    </span>
                    <h2 className="hero__plan-card-title">
                      {planActivo.nombre}
                    </h2>
                  </div>
                  <span className="hero__plan-status">
                    <span
                      className="hero__plan-status-dot"
                      aria-hidden="true"
                    />
                    Activo
                  </span>
                </div>

                {planActivo.descripcion && (
                  <p className="hero__plan-card-desc">
                    {planActivo.descripcion}
                  </p>
                )}

                <dl className="hero__plan-card-meta">
                  <div>
                    <dt>Precio</dt>
                    <dd>
                      {formatearPrecio(planActivo.precio)}
                      {planActivo.duracion && (
                        <span className="hero__plan-card-period">
                          {' '}
                          / {planActivo.duracion}
                        </span>
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Vigencia</dt>
                    <dd>{formatearFecha(planActivo.vigencia)}</dd>
                  </div>
                  {Number.isFinite(planActivo.cantidadPersonas) && (
                    <div>
                      <dt>Atletas</dt>
                      <dd>{planActivo.cantidadPersonas}</dd>
                    </div>
                  )}
                </dl>

                <PlanGrupoMiembros
                  titular={planActivo.titular}
                  beneficiarios={planActivo.beneficiarios}
                />

                {diasRestantes !== null && (
                  <footer className="hero__plan-card-footer">
                    <span className="hero__plan-card-countdown">
                      <strong>{diasRestantes}</strong>{' '}
                      {diasRestantes === 1 ? 'día restante' : 'días restantes'}
                    </span>
                    <Link to="/planes" className="hero__plan-card-link">
                      Ver todos los planes
                      <ChevronRightIcon className="hero__plan-card-link-chevron" />
                    </Link>
                  </footer>
                )}
              </article>
            ) : planVencido ? (
              <article className="hero__plan-card hero__plan-card--vencido">
                <div className="hero__plan-card-top">
                  <div>
                    <span className="hero__plan-card-eyebrow">
                      Tu plan vencido
                    </span>
                    <h2 className="hero__plan-card-title">
                      {planVencido.planNombre || planVencido.planId || 'Plan'}
                    </h2>
                  </div>
                  <span className="hero__plan-status hero__plan-status--vencido">
                    <span
                      className="hero__plan-status-dot hero__plan-status-dot--vencido"
                      aria-hidden="true"
                    />
                    Vencido
                  </span>
                </div>

                <dl className="hero__plan-card-meta">
                  <div>
                    <dt>Venció el</dt>
                    <dd>{formatearFecha(planVencido.vigencia)}</dd>
                  </div>
                </dl>

                <footer className="hero__plan-card-footer">
                  <Link to="/planes" className="hero__plan-card-link">
                    Renovar plan
                    <ChevronRightIcon className="hero__plan-card-link-chevron" />
                  </Link>
                </footer>
              </article>
            ) : (
              <div className="hero__no-plan">
                <span className="hero__no-plan-eyebrow">
                  Aún no tienes un plan activo
                </span>
                <p className="hero__no-plan-text">
                  Da el siguiente paso y activa el plan que se ajusta a tu
                  ritmo de entrenamiento.
                </p>
                <Link to="/planes" className="hero__acquire-plan-link">
                  Adquirir plan
                  <ChevronRightIcon className="hero__acquire-plan-link__chevron" />
                </Link>
              </div>
            )}
          </>
        ) : (
          <>
            <h1 className="hero__title hero__title--after-carousel">
              Hechos para resistir, entrenados para{' '}
              <span
                className="hero__title-accent"
                style={{ color: colors.primary_orange }}
              >
                vencer
              </span>
            </h1>

            <div className="hero__cta-stack">
              <Link
                to="/planes"
                className="hero__cta-btn"
                style={{ backgroundColor: colors.primary_orange }}
              >
                ¡Estoy listo!
              </Link>
              <Link
                to="/login"
                state={{ openSignup: true }}
                className="hero__cta-btn hero__cta-btn--secondary"
              >
                Registrate gratis
              </Link>
            </div>

            <div className="hero__info-cards">
              <HorariosToggle />
              <UbicacionToggle />
            </div>
          </>
        )}
        </div>

        <ClasesHoy />
      </div>
    </section>
  )
}

export default Hero
