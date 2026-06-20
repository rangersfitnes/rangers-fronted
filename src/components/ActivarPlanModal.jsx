import { useEffect, useMemo, useState } from 'react'
import Modal from './Modal.jsx'
import LoadingOverlay from './LoadingOverlay.jsx'
import { obtenerPlanesPublicos } from '../services/planesService.js'
import './ActivarPlanModal.css'
import './CrearUsuarioModal.css'

function formatearPrecio(valor) {
  const numero = Number(valor) || 0
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(numero)
}

function ActivarPlanModal({
  open,
  onClose,
  onSubmit,
  submitting,
  error,
  usuario,
}) {
  const [planes, setPlanes] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [seleccionado, setSeleccionado] = useState(null)
  const [acompanantes, setAcompanantes] = useState([])
  const [metodoPago, setMetodoPago] = useState('')
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    if (!open) {
      setSeleccionado(null)
      setLoadError('')
      setAcompanantes([])
      setMetodoPago('')
      setLocalError('')
      return
    }

    const controller = new AbortController()

    const cargar = async () => {
      setLoading(true)
      setLoadError('')
      try {
        const data = await obtenerPlanesPublicos({
          force: true,
          signal: controller.signal,
        })
        const ordenados = [...data].sort((a, b) => {
          const posA = Number.isFinite(a.pos) ? a.pos : Number.MAX_SAFE_INTEGER
          const posB = Number.isFinite(b.pos) ? b.pos : Number.MAX_SAFE_INTEGER
          return posA - posB
        })
        setPlanes(ordenados)
      } catch (err) {
        if (err?.name === 'AbortError') return
        setLoadError(err.message || 'No se pudieron cargar los planes')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    cargar()

    return () => controller.abort()
  }, [open])

  const planSeleccionado = useMemo(
    () => planes.find((p) => p.id === seleccionado) ?? null,
    [planes, seleccionado],
  )

  const cantidadPersonas = Number.isFinite(planSeleccionado?.cantidadPersonas)
    ? planSeleccionado.cantidadPersonas
    : 1
  const acompanantesRequeridos = Math.max(0, cantidadPersonas - 1)

  useEffect(() => {
    setLocalError('')
    setAcompanantes((prev) => {
      if (prev.length === acompanantesRequeridos) return prev
      const next = prev.slice(0, acompanantesRequeridos)
      while (next.length < acompanantesRequeridos) next.push('')
      return next
    })
  }, [acompanantesRequeridos])

  const handleSelectPlan = (planId) => {
    setSeleccionado(planId)
    setMetodoPago('')
    setLocalError('')
  }

  const puedeActivar =
    Boolean(seleccionado && metodoPago) && !submitting

  const handleAcompananteChange = (index) => (event) => {
    const valor = event.target.value.replace(/\D/g, '').slice(0, 20)
    setAcompanantes((prev) => {
      const next = [...prev]
      next[index] = valor
      return next
    })
    setLocalError('')
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!seleccionado || !metodoPago || submitting) return

    const limpios = acompanantes.map((d) => d.trim())

    if (limpios.length !== acompanantesRequeridos) {
      setLocalError(
        `El plan requiere ${acompanantesRequeridos} acompañante${
          acompanantesRequeridos === 1 ? '' : 's'
        }`,
      )
      return
    }

    if (limpios.some((d) => !d)) {
      setLocalError('Completa el documento de todos los acompañantes')
      return
    }

    const todos = [usuario?.documento ?? '', ...limpios]
    if (new Set(todos).size !== todos.length) {
      setLocalError('Los documentos no pueden repetirse')
      return
    }

    if (!metodoPago) {
      setLocalError('Selecciona el método de pago')
      return
    }

    onSubmit?.({
      planId: seleccionado,
      acompanantes: limpios,
      metodoPago,
    })
  }

  const mensajeError = error || localError

  return (
    <>
    <Modal
      open={open}
      onClose={submitting ? undefined : onClose}
      title="Activar plan"
      footer={
        <>
          <button
            type="button"
            className="crear-usuario__btn crear-usuario__btn--ghost"
            onClick={onClose}
            disabled={submitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="activar-plan-form"
            className="crear-usuario__btn crear-usuario__btn--primary"
            disabled={!puedeActivar}
            aria-disabled={!puedeActivar}
            title={
              seleccionado && !metodoPago
                ? 'Selecciona el método de pago para continuar'
                : undefined
            }
          >
            {submitting ? 'Activando…' : 'Activar plan'}
          </button>
        </>
      }
    >
      <form
        id="activar-plan-form"
        className="activar-plan__form"
        onSubmit={handleSubmit}
      >
        {usuario && (
          <p className="activar-plan__user">
            Asignar plan a <strong>{usuario.nombre || '—'}</strong>
            {usuario.documento && (
              <span className="activar-plan__user-doc">
                {' '}
                · Doc. {usuario.documento}
              </span>
            )}
          </p>
        )}

        {mensajeError && (
          <p className="crear-usuario__error" role="alert">
            {mensajeError}
          </p>
        )}

        {loadError && (
          <p className="crear-usuario__error" role="alert">
            {loadError}
          </p>
        )}

        {!loading && !loadError && planes.length === 0 && (
          <p className="activar-plan__empty">
            No hay planes activos disponibles.
          </p>
        )}

        {!loading && planes.length > 0 && (
          <ul className="activar-plan__list">
            {planes.map((plan) => {
              const checked = seleccionado === plan.id
              const planPersonas = Number.isFinite(plan.cantidadPersonas)
                ? plan.cantidadPersonas
                : 1
              return (
                <li key={plan.id}>
                  <label
                    className={`activar-plan__option${
                      checked ? ' activar-plan__option--checked' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="plan"
                      className="activar-plan__radio"
                      value={plan.id}
                      checked={checked}
                      onChange={() => handleSelectPlan(plan.id)}
                      disabled={submitting}
                    />
                    <span className="activar-plan__option-content">
                      <span className="activar-plan__option-title">
                        {plan.nombre}
                      </span>
                      <span className="activar-plan__option-meta">
                        {formatearPrecio(plan.precio)}
                        {plan.duracion && ` · ${plan.duracion}`}
                        {planPersonas > 1 && ` · ${planPersonas} atletas`}
                        {plan.oferta && ' · En oferta'}
                      </span>
                      {plan.descripcion && (
                        <span className="activar-plan__option-desc">
                          {plan.descripcion}
                        </span>
                      )}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        )}

        {!loading && planes.length > 0 && (
          <div
            className={`activar-plan__metodo-pago${
              !planSeleccionado ? ' activar-plan__metodo-pago--locked' : ''
            }`}
          >
            <p className="activar-plan__metodo-pago-title">
              Método de pago <span className="activar-plan__required">*</span>
            </p>
            <p className="activar-plan__metodo-pago-hint">
              {planSeleccionado
                ? 'Registra cómo pagó el usuario para guardar el historial en su cuenta.'
                : 'Primero selecciona un plan para elegir el método de pago.'}
            </p>
            <div className="activar-plan__metodo-pago-options">
              <label
                className={`activar-plan__metodo-option${
                  metodoPago === 'transferencia'
                    ? ' activar-plan__metodo-option--checked'
                    : ''
                }`}
              >
                <input
                  type="radio"
                  name="metodoPago"
                  className="activar-plan__radio"
                  value="transferencia"
                  checked={metodoPago === 'transferencia'}
                  onChange={() => {
                    setMetodoPago('transferencia')
                    setLocalError('')
                  }}
                  disabled={submitting || !planSeleccionado}
                />
                <span>Transferencia</span>
              </label>
              <label
                className={`activar-plan__metodo-option${
                  metodoPago === 'efectivo'
                    ? ' activar-plan__metodo-option--checked'
                    : ''
                }`}
              >
                <input
                  type="radio"
                  name="metodoPago"
                  className="activar-plan__radio"
                  value="efectivo"
                  checked={metodoPago === 'efectivo'}
                  onChange={() => {
                    setMetodoPago('efectivo')
                    setLocalError('')
                  }}
                  disabled={submitting || !planSeleccionado}
                />
                <span>Efectivo</span>
              </label>
            </div>
          </div>
        )}

        {planSeleccionado && acompanantesRequeridos > 0 && (
          <div className="activar-plan__acompanantes">
            <p className="activar-plan__acompanantes-title">
              Documentos de los acompañantes
            </p>
            <p className="activar-plan__acompanantes-hint">
              Este plan cubre {cantidadPersonas} atletas. Ingresa el documento
              de los {acompanantesRequeridos}{' '}
              {acompanantesRequeridos === 1 ? 'usuario' : 'usuarios'}{' '}
              adicional{acompanantesRequeridos === 1 ? '' : 'es'} (deben estar
              registrados y sin plan activo).
            </p>

            {acompanantes.map((valor, index) => (
              <label
                key={index}
                className="crear-usuario__field activar-plan__acompanante-field"
              >
                <span className="crear-usuario__label">
                  Documento acompañante {index + 1}
                </span>
                <input
                  type="text"
                  className="crear-usuario__input"
                  value={valor}
                  onChange={handleAcompananteChange(index)}
                  inputMode="numeric"
                  placeholder="Ej. 1023456789"
                  disabled={submitting}
                  required
                />
              </label>
            ))}
          </div>
        )}

        <p className="activar-plan__hint">
          La vigencia se calculará automáticamente al mismo día del siguiente
          mes y se asignará el mismo plan a todos los atletas.
        </p>
      </form>
    </Modal>
    <LoadingOverlay visible={open && loading} label="Cargando planes" />
    </>
  )
}

export default ActivarPlanModal
