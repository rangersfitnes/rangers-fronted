import './TiqueteraSaldoBox.css'

function TiqueteraSaldoBox({ plan, className = '' }) {
  if (!plan || plan.tipo !== 'tiquetera') return null

  const incluidas = Number(plan.entradasIncluidas) || 0
  const restantes = Number.isFinite(plan.entradasRestantes)
    ? plan.entradasRestantes
    : Math.max(0, incluidas - (Number(plan.entradasUsadas) || 0))

  if (incluidas <= 0) return null

  return (
    <div className={`tiquetera-saldo${className ? ` ${className}` : ''}`}>
      <span className="tiquetera-saldo__label">Entradas de tu tiquetera</span>
      <p className="tiquetera-saldo__valor">
        <strong>{restantes}</strong>
        <span className="tiquetera-saldo__total"> de {incluidas}</span>
      </p>
      <p className="tiquetera-saldo__hint">
        {restantes === 0
          ? 'Agotaste tus entradas. Puedes renovar la tiquetera antes de que venza.'
          : restantes === 1
            ? 'Te queda 1 entrada dentro de la vigencia'
            : `Te quedan ${restantes} entradas dentro de la vigencia`}
      </p>
    </div>
  )
}

export default TiqueteraSaldoBox
