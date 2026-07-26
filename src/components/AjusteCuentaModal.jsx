import { useState } from 'react'
import CampoFechaCalendario from './CampoFechaCalendario.jsx'
import Modal from './Modal.jsx'
import { useToast } from './Toast.jsx'
import { registrarAjusteCuenta } from '../services/finanzasService.js'
import './ActivarPlanModal.css'

const CUENTAS = [
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'transferencia', label: 'Transferencia' },
  { id: 'wompi', label: 'Wompi' },
]

const CUENTA_LABEL = Object.fromEntries(CUENTAS.map((c) => [c.id, c.label]))

const DIRECCIONES = [
  { id: 'aumentar', label: 'Aumentar saldo (+)' },
  { id: 'disminuir', label: 'Disminuir saldo (−)' },
]

function fechaHoyColombiaInput() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function parseMonto(valor) {
  const limpio = String(valor || '')
    .trim()
    .replace(/\./g, '')
    .replace(/,/g, '.')
  const numero = Number(limpio)
  return Number.isFinite(numero) ? numero : NaN
}

function AjusteCuentaModal({ open, onClose, onGuardado }) {
  const toast = useToast()
  const [fecha, setFecha] = useState(fechaHoyColombiaInput)
  const [cuenta, setCuenta] = useState('')
  const [direccion, setDireccion] = useState('aumentar')
  const [valor, setValor] = useState('')
  const [motivo, setMotivo] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const montoValido = parseMonto(valor) > 0
  const puedeGuardar =
    Boolean(fecha && cuenta && direccion && montoValido && motivo.trim()) &&
    !guardando

  const limpiar = () => {
    setFecha(fechaHoyColombiaInput())
    setCuenta('')
    setDireccion('aumentar')
    setValor('')
    setMotivo('')
    setError('')
  }

  const handleCerrar = () => {
    if (guardando) return
    limpiar()
    onClose?.()
  }

  const handleGuardar = async (event) => {
    event.preventDefault()

    if (!cuenta) {
      setError('Selecciona la cuenta a ajustar')
      return
    }
    if (!montoValido) {
      setError('Ingresa un valor mayor a cero')
      return
    }
    if (!motivo.trim()) {
      setError('El motivo del ajuste es obligatorio')
      return
    }

    setError('')
    setGuardando(true)
    try {
      await registrarAjusteCuenta({
        fecha,
        cuenta,
        monto: parseMonto(valor),
        motivo: motivo.trim(),
        direccion,
      })
      toast.success(
        `Ajuste registrado en ${CUENTA_LABEL[cuenta]} (${
          direccion === 'disminuir' ? 'disminución' : 'aumento'
        })`,
      )
      limpiar()
      onClose?.()
      onGuardado?.()
    } catch (err) {
      setError(err.message || 'No se pudo registrar el ajuste')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleCerrar}
      title="Registrar ajuste de cuenta"
      className="ajuste-cuenta-modal"
    >
      <form className="ag-finanzas__form" onSubmit={handleGuardar} noValidate>
        <p className="activar-plan__metodo-pago-hint">
          Corrige el saldo de una cuenta. El movimiento queda registrado y
          actualiza la liquidez total y la de la cuenta seleccionada.
        </p>

        <CampoFechaCalendario
          label="Fecha"
          value={fecha}
          onChange={setFecha}
          disabled={guardando}
        />

        <div className="activar-plan__metodo-pago ag-finanzas__metodo">
          <p className="activar-plan__metodo-pago-title">
            Tipo de ajuste <span className="activar-plan__required">*</span>
          </p>
          <div className="activar-plan__metodo-pago-options pf-pago-clase__opciones">
            {DIRECCIONES.map((dir) => (
              <label
                key={dir.id}
                className={`activar-plan__metodo-option${
                  direccion === dir.id
                    ? ' activar-plan__metodo-option--checked'
                    : ''
                }`}
              >
                <input
                  type="radio"
                  name="ajusteDireccion"
                  className="activar-plan__radio"
                  value={dir.id}
                  checked={direccion === dir.id}
                  onChange={() => {
                    setDireccion(dir.id)
                    setError('')
                  }}
                  disabled={guardando}
                />
                <span>{dir.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="activar-plan__metodo-pago ag-finanzas__metodo">
          <p className="activar-plan__metodo-pago-title">
            Cuenta <span className="activar-plan__required">*</span>
          </p>
          <p className="activar-plan__metodo-pago-hint">
            Cuenta cuyo saldo se va a ajustar.
          </p>
          <div className="activar-plan__metodo-pago-options pf-pago-clase__opciones">
            {CUENTAS.map((c) => (
              <label
                key={c.id}
                className={`activar-plan__metodo-option${
                  cuenta === c.id ? ' activar-plan__metodo-option--checked' : ''
                }`}
              >
                <input
                  type="radio"
                  name="ajusteCuenta"
                  className="activar-plan__radio"
                  value={c.id}
                  checked={cuenta === c.id}
                  onChange={() => {
                    setCuenta(c.id)
                    setError('')
                  }}
                  disabled={guardando}
                />
                <span>{c.label}</span>
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
            placeholder="Ej. 50000"
            inputMode="numeric"
            disabled={guardando}
          />
        </label>

        <label className="pf-usuarios-busqueda__field ag-finanzas__field">
          <span className="pf-usuarios-busqueda__label">
            Motivo <span className="pf-pago-clase__required">*</span>
          </span>
          <input
            type="text"
            className="pf-usuarios-busqueda__input"
            value={motivo}
            onChange={(e) => {
              setMotivo(e.target.value)
              setError('')
            }}
            placeholder="Ej. Corrección de descuadre de caja"
            disabled={guardando}
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
            onClick={handleCerrar}
            disabled={guardando}
          >
            Cancelar
          </button>
          <button type="submit" className="ag-action-btn" disabled={!puedeGuardar}>
            {guardando ? 'Registrando…' : 'Registrar ajuste'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default AjusteCuentaModal
