import { useRef } from 'react'
import { formatearFechaCuenta } from '../pages/cuenta/cuentaUtils.js'
import './CampoFechaCalendario.css'

function CampoFechaCalendario({
  label,
  value,
  onChange,
  disabled = false,
  className = '',
}) {
  const inputRef = useRef(null)

  const abrirCalendario = () => {
    const input = inputRef.current
    if (!input || disabled) return

    try {
      if (typeof input.showPicker === 'function') {
        input.showPicker()
        return
      }
    } catch {
      // Safari/iOS puede lanzar error si no hay gesto directo del usuario.
    }

    input.focus()
    input.click()
  }

  return (
    <label className={`campo-fecha-calendario ${className}`.trim()}>
      <span className="campo-fecha-calendario__label">{label}</span>
      <button
        type="button"
        className="campo-fecha-calendario__trigger"
        onClick={abrirCalendario}
        disabled={disabled}
        aria-label={`Seleccionar fecha: ${label}`}
      >
        <span className="campo-fecha-calendario__valor">
          {value
            ? formatearFechaCuenta(
                new Date(`${value}T12:00:00-05:00`).getTime(),
              )
            : 'Seleccionar fecha'}
        </span>
        <span className="campo-fecha-calendario__icono" aria-hidden="true">
          ▾
        </span>
      </button>
      <input
        ref={inputRef}
        type="date"
        className="campo-fecha-calendario__input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
      />
    </label>
  )
}

export default CampoFechaCalendario
