import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import { colors } from '../variables/colors.jsx'
import { useUsuario } from '../contexts/UsuarioContext.jsx'
import LoadingOverlay from '../components/LoadingOverlay.jsx'
import ErrorModal from '../components/ErrorModal.jsx'
import PagoExitoModal from '../components/PagoExitoModal.jsx'
import { obtenerPlanesPublicos } from '../services/planesService.js'
import { validarCuponParaPlan } from '../services/cuponesService.js'
import { consultarBeneficiarios } from '../services/userService.js'
import { cargarWidgetWompi } from '../services/wompiService.js'
import { useWompiCheckout } from '../hooks/useWompiCheckout.js'
import planesBg from '../assets/images/hero/plans-background.webp'
import './PaymentPlan.css'

const SEDE = 'alta-suiza'

function formatearPrecio(valor) {
  const numero = Number(valor) || 0
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(numero)
}

function formatearFecha(ms) {
  if (!ms) return null
  try {
    return new Date(ms).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return null
  }
}

function PaymentPlan() {
  const { planId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { usuario } = useUsuario()
  const planActivoUsuario = usuario?.planesActivos?.[0] ?? null

  const {
    pagar,
    procesando,
    confirmando,
    pagoExito,
    error: errorPago,
    limpiarError,
  } = useWompiCheckout({ sede: SEDE })

  const planFromState = location.state?.plan
  const [plan, setPlan] = useState(planFromState || null)
  const [loading, setLoading] = useState(
    !planFromState && !planActivoUsuario,
  )
  const [error, setError] = useState('')

  const cantidadPersonas = Number.isFinite(plan?.cantidadPersonas)
    ? plan.cantidadPersonas
    : 1
  const beneficiariosRequeridos = Math.max(0, cantidadPersonas - 1)

  const [beneficiarios, setBeneficiarios] = useState([])
  const [resultados, setResultados] = useState({})
  const [codigoCupon, setCodigoCupon] = useState('')
  const [cuponAplicado, setCuponAplicado] = useState(null)
  const [validandoCupon, setValidandoCupon] = useState(false)
  const [errorCupon, setErrorCupon] = useState('')
  const timersRef = useRef({})

  useEffect(() => {
    setCuponAplicado(null)
    setErrorCupon('')
    setCodigoCupon('')
  }, [plan?.id])

  const precioFinal = cuponAplicado?.precioFinal ?? plan?.precio ?? 0
  const precioOriginal = cuponAplicado?.precioOriginal ?? plan?.precio ?? 0

  const aplicarCupon = async () => {
    const codigo = codigoCupon.trim()
    if (!codigo || !plan?.id) return

    setValidandoCupon(true)
    setErrorCupon('')
    try {
      const resultado = await validarCuponParaPlan({
        codigo,
        planId: plan.id,
        precioOriginal: plan.precio,
      })
      setCuponAplicado(resultado)
    } catch (err) {
      setCuponAplicado(null)
      setErrorCupon(err.message || 'No se pudo aplicar el cupón')
    } finally {
      setValidandoCupon(false)
    }
  }

  const quitarCupon = () => {
    setCuponAplicado(null)
    setErrorCupon('')
    setCodigoCupon('')
  }

  const validandoBeneficiarios = useMemo(
    () => Object.values(resultados).some((r) => r?.loading),
    [resultados],
  )

  useEffect(() => {
    if (plan) return
    if (planActivoUsuario) return
    const controller = new AbortController()

    const cargar = async () => {
      try {
        const planes = await obtenerPlanesPublicos({
          signal: controller.signal,
        })

        const encontrado = planes.find((p) => p.id === planId)
        if (!encontrado) {
          setError('No encontramos el plan seleccionado.')
        } else {
          setPlan(encontrado)
        }
      } catch (err) {
        if (err?.name === 'AbortError') return
        setError(err.message || 'No se pudo cargar el plan')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    cargar()

    return () => controller.abort()
  }, [plan, planId, planActivoUsuario])

  useEffect(() => {
    cargarWidgetWompi().catch(() => {})
  }, [])

  useEffect(() => {
    setBeneficiarios((prev) => {
      if (prev.length === beneficiariosRequeridos) return prev
      const next = prev.slice(0, beneficiariosRequeridos)
      while (next.length < beneficiariosRequeridos) next.push('')
      return next
    })
    setResultados({})
  }, [beneficiariosRequeridos])

  const handleBeneficiarioChange = (index) => (event) => {
    const valor = event.target.value.replace(/\D/g, '').slice(0, 20)

    setBeneficiarios((prev) => {
      const next = [...prev]
      next[index] = valor
      return next
    })

    setResultados((prev) => {
      const next = { ...prev }
      delete next[index]
      return next
    })

    if (timersRef.current[index]) clearTimeout(timersRef.current[index])

    if (!valor || valor.length < 4) return

    timersRef.current[index] = setTimeout(() => {
      verificarBeneficiario(index, valor)
    }, 500)
  }

  const verificarBeneficiario = async (index, documento) => {
    setResultados((prev) => ({
      ...prev,
      [index]: { loading: true },
    }))

    try {
      const data = await consultarBeneficiarios([documento])
      const info = data[0]

      if (!info) {
        setResultados((prev) => ({
          ...prev,
          [index]: { error: 'Sin información' },
        }))
        return
      }

      if (info.esTitular) {
        setResultados((prev) => ({
          ...prev,
          [index]: { error: 'No puedes incluirte como beneficiario' },
        }))
        return
      }

      if (!info.encontrado) {
        setResultados((prev) => ({
          ...prev,
          [index]: { error: 'No existe un usuario con ese documento' },
        }))
        return
      }

      if (info.tienePlanActivo) {
        setResultados((prev) => ({
          ...prev,
          [index]: {
            error: 'Este usuario ya tiene un plan activo',
            nombre: info.nombre,
            profileImage: info.profileImage ?? null,
          },
        }))
        return
      }

      setResultados((prev) => ({
        ...prev,
        [index]: {
          ok: true,
          nombre: info.nombre,
          uid: info.uid,
          profileImage: info.profileImage ?? null,
        },
      }))
    } catch (err) {
      setResultados((prev) => ({
        ...prev,
        [index]: { error: err.message || 'Error al consultar' },
      }))
    }
  }

  const duplicados = useMemo(() => {
    const cuenta = {}
    const docs = [usuario?.documento ?? '', ...beneficiarios.map((b) => b.trim())]
    const dups = new Set()
    docs.forEach((d) => {
      if (!d) return
      cuenta[d] = (cuenta[d] || 0) + 1
      if (cuenta[d] > 1) dups.add(d)
    })
    return dups
  }, [beneficiarios, usuario?.documento])

  const todosOk = useMemo(() => {
    if (beneficiariosRequeridos === 0) return true
    if (duplicados.size > 0) return false
    for (let i = 0; i < beneficiariosRequeridos; i++) {
      if (!beneficiarios[i] || !resultados[i]?.ok) return false
    }
    return true
  }, [beneficiarios, beneficiariosRequeridos, duplicados, resultados])

  if (!usuario) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ redirectTo: `/payment-plan/${planId}`, openSignup: true }}
      />
    )
  }

  const handlePagar = () => {
    if (!todosOk || procesando || confirmando) return
    const idPlan = plan?.id || planId
    pagar({
      planId: idPlan,
      beneficiarios: beneficiarios.map((doc) => doc.trim()).filter(Boolean),
      codigoCupon: cuponAplicado?.cupon?.codigo || codigoCupon.trim() || undefined,
    })
  }

  if (planActivoUsuario) {
    return (
      <main
        className="payment-page"
        style={{ backgroundColor: colors.page_background }}
      >
        <div
          className="payment-page__background"
          style={{ backgroundImage: `url(${planesBg})` }}
        />
        <div
          className="payment-page__overlay"
          style={{ backgroundColor: colors.overlay_dark }}
        />

        <section className="payment-card payment-card--active-plan">
          <header className="payment-card__header">
            <p className="payment-card__eyebrow">Ya tienes un plan activo</p>
            <h1 className="payment-card__title">
              {planActivoUsuario.nombre || 'Tu plan'}
            </h1>
          </header>

          <p className="payment-card__active-plan-message">
            No puedes adquirir un nuevo plan mientras tengas uno activo. Podrás
            contratar otro cuando finalice la vigencia de tu plan actual.
          </p>

          {planActivoUsuario.descripcion && (
            <p className="payment-card__description">
              {planActivoUsuario.descripcion}
            </p>
          )}

          <dl className="payment-card__active-plan-meta">
            <div>
              <dt>Precio</dt>
              <dd>
                {formatearPrecio(planActivoUsuario.precio)}
                {planActivoUsuario.duracion && (
                  <span className="payment-card__price-period">
                    {' '}
                    / {planActivoUsuario.duracion}
                  </span>
                )}
              </dd>
            </div>
            {formatearFecha(planActivoUsuario.vigencia) && (
              <div>
                <dt>Vigencia</dt>
                <dd>{formatearFecha(planActivoUsuario.vigencia)}</dd>
              </div>
            )}
            {Number.isFinite(planActivoUsuario.cantidadPersonas) && (
              <div>
                <dt>Atletas</dt>
                <dd>{planActivoUsuario.cantidadPersonas}</dd>
              </div>
            )}
          </dl>

          <div className="payment-card__actions">
            <Link to="/planes" className="payment-card__back">
              Ver planes
            </Link>
            <Link to="/" className="payment-card__pay-btn">
              Ir al inicio
            </Link>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main
      className="payment-page"
      style={{ backgroundColor: colors.page_background }}
    >
      <div
        className="payment-page__background"
        style={{ backgroundImage: `url(${planesBg})` }}
      />
      <div
        className="payment-page__overlay"
        style={{ backgroundColor: colors.overlay_dark }}
      />

      <section className="payment-card">
        <header className="payment-card__header">
          <p className="payment-card__eyebrow">Confirmar compra</p>
          <h1 className="payment-card__title">
            {plan ? plan.nombre : 'Tu plan'}
          </h1>
        </header>

        <div className="payment-card__user">
          <span className="payment-card__user-label">Titular</span>
          <span className="payment-card__user-name">{usuario.nombre}</span>
          <span className="payment-card__user-doc">
            Documento: {usuario.documento || '—'}
          </span>
        </div>

        {plan && (
          <div className="payment-card__details">
            {plan.descripcion && (
              <p className="payment-card__description">{plan.descripcion}</p>
            )}

            <div className="payment-card__cupon">
              <p className="payment-card__cupon-title">Código de descuento</p>
              <div className="payment-card__cupon-row">
                <input
                  type="text"
                  className="payment-card__cupon-input"
                  value={codigoCupon}
                  onChange={(e) => {
                    setCodigoCupon(
                      e.target.value.toUpperCase().replace(/\s+/g, ''),
                    )
                    setErrorCupon('')
                    if (cuponAplicado) setCuponAplicado(null)
                  }}
                  placeholder="Ej. VERANO20"
                  disabled={procesando || confirmando || validandoCupon}
                />
                {cuponAplicado ? (
                  <button
                    type="button"
                    className="payment-card__cupon-btn payment-card__cupon-btn--ghost"
                    onClick={quitarCupon}
                    disabled={procesando || confirmando}
                  >
                    Quitar
                  </button>
                ) : (
                  <button
                    type="button"
                    className="payment-card__cupon-btn"
                    onClick={aplicarCupon}
                    disabled={
                      !codigoCupon.trim() ||
                      procesando ||
                      confirmando ||
                      validandoCupon
                    }
                  >
                    {validandoCupon ? 'Validando…' : 'Aplicar'}
                  </button>
                )}
              </div>
              {errorCupon && (
                <p className="payment-card__cupon-error" role="alert">
                  {errorCupon}
                </p>
              )}
              {cuponAplicado && (
                <p className="payment-card__cupon-ok">
                  Cupón <strong>{cuponAplicado.cupon.codigo}</strong> aplicado (
                  {cuponAplicado.cupon.porcentajeDescuento}% de descuento)
                </p>
              )}
            </div>

            <div className="payment-card__price-row">
              <span className="payment-card__price-label">Total a pagar</span>
              <span className="payment-card__price-value">
                {cuponAplicado && (
                  <span className="payment-card__price-original">
                    {formatearPrecio(precioOriginal)}
                  </span>
                )}
                {formatearPrecio(precioFinal)}
                {plan.duracion && (
                  <span className="payment-card__price-period">
                    {' '}
                    / {plan.duracion}
                  </span>
                )}
              </span>
            </div>
            {cuponAplicado && (
              <p className="payment-card__descuento">
                Ahorras {formatearPrecio(cuponAplicado.descuentoMonto)}
              </p>
            )}
          </div>
        )}

        {beneficiariosRequeridos > 0 && (
          <div className="payment-card__beneficiarios">
            <p className="payment-card__beneficiarios-title">
              Beneficiarios del plan
            </p>
            <p className="payment-card__beneficiarios-hint">
              Este plan cubre a {cantidadPersonas} atletas. Ingresa el
              documento{' '}
              {beneficiariosRequeridos === 1
                ? 'del beneficiario adicional'
                : `de los ${beneficiariosRequeridos} beneficiarios adicionales`}{' '}
              para confirmar quiénes recibirán el plan.
            </p>

            {beneficiarios.map((valor, index) => {
              const resultado = resultados[index]
              const esDuplicado = valor && duplicados.has(valor.trim())

              return (
                <div className="payment-card__beneficiario" key={index}>
                  <label className="payment-card__beneficiario-label">
                    <span>Documento beneficiario {index + 1}</span>
                    <input
                      type="text"
                      className="payment-card__beneficiario-input"
                      value={valor}
                      onChange={handleBeneficiarioChange(index)}
                      inputMode="numeric"
                      placeholder="Ej. 1023456789"
                      autoComplete="off"
                    />
                  </label>

                  {esDuplicado ? (
                    <p className="payment-card__beneficiario-status payment-card__beneficiario-status--error">
                      Este documento ya está incluido en la compra.
                    </p>
                  ) : resultado?.loading ? null : resultado?.ok ? (
                    <p className="payment-card__beneficiario-status payment-card__beneficiario-status--ok">
                      {resultado.profileImage && (
                        <img
                          src={resultado.profileImage}
                          alt=""
                          className="payment-card__beneficiario-avatar"
                        />
                      )}
                      <span>{resultado.nombre}</span>
                    </p>
                  ) : resultado?.error ? (
                    <p className="payment-card__beneficiario-status payment-card__beneficiario-status--error">
                      {resultado.profileImage && (
                        <img
                          src={resultado.profileImage}
                          alt=""
                          className="payment-card__beneficiario-avatar"
                        />
                      )}
                      <span>
                        {resultado.error}
                        {resultado.nombre && ` (${resultado.nombre})`}
                      </span>
                    </p>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}

        {error && (
          <p className="payment-card__error" role="alert">
            {error}
          </p>
        )}

        <div className="payment-card__actions">
          <Link to="/planes" className="payment-card__back">
            Volver
          </Link>
          <button
            type="button"
            className="payment-card__pay-btn"
            disabled={!plan || loading || !todosOk || procesando || confirmando}
            onClick={handlePagar}
          >
            {procesando ? (
              <span
                className="payment-card__pay-spinner"
                aria-label="Procesando"
              />
            ) : (
              `Pagar ${plan ? formatearPrecio(precioFinal) : ''}`
            )}
          </button>
        </div>
      </section>

      <ErrorModal
        open={Boolean(errorPago)}
        message={errorPago}
        onClose={limpiarError}
      />
      <PagoExitoModal
        open={pagoExito}
        onContinue={() => navigate('/', { replace: true })}
      />
      <LoadingOverlay
        visible={
          (loading || validandoBeneficiarios || validandoCupon || confirmando) &&
          !pagoExito
        }
        label={
          confirmando
            ? 'Confirmando tu pago'
            : validandoCupon
              ? 'Validando cupón'
            : validandoBeneficiarios
              ? 'Verificando documento'
              : 'Cargando plan'
        }
        useLogo={confirmando}
        labelNormalCase={validandoBeneficiarios || validandoCupon || confirmando}
      />
    </main>
  )
}

export default PaymentPlan
