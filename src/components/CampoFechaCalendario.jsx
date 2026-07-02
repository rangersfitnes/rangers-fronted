import './CampoFechaCalendario.css'

function fechaHoyIso() {
  const hoy = new Date()
  const mes = String(hoy.getMonth() + 1).padStart(2, '0')
  const dia = String(hoy.getDate()).padStart(2, '0')
  return `${hoy.getFullYear()}-${mes}-${dia}`
}

function CampoFechaCalendario({
  label,
  value,
  onChange,
  disabled = false,
  className = '',
  max = fechaHoyIso(),
  min,
}) {
  return (
    <label className={`campo-fecha-calendario ${className}`.trim()}>
      <span className="campo-fecha-calendario__label">{label}</span>
      <input
        type="date"
        className="campo-fecha-calendario__input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        max={max}
        min={min}
      />
    </label>
  )
}

export default CampoFechaCalendario
