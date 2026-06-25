import './RecordarSesionCheckbox.css'

function RecordarSesionCheckbox({
  checked,
  onChange,
  disabled = false,
  id = 'recordar-sesion',
}) {
  return (
    <label className="recordar-sesion" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        className="recordar-sesion__input"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        disabled={disabled}
      />
      <span className="recordar-sesion__box" aria-hidden="true">
        <svg
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 8.5l3 3 7-7" />
        </svg>
      </span>
      <span className="recordar-sesion__label">Recordar sesión</span>
    </label>
  )
}

export default RecordarSesionCheckbox
