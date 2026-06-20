import './PlanGrupoMiembros.css'

function iniciales(nombre) {
  const texto = (nombre || '').trim()
  if (!texto) return '?'
  return texto.charAt(0).toUpperCase()
}

function PlanMiembroItem({ persona, etiqueta }) {
  return (
    <li className="plan-grupo__item">
      {persona.profileImage ? (
        <img
          src={persona.profileImage}
          alt=""
          className="plan-grupo__avatar"
        />
      ) : (
        <span
          className="plan-grupo__avatar plan-grupo__avatar--placeholder"
          aria-hidden="true"
        >
          {iniciales(persona.nombre)}
        </span>
      )}
      <div className="plan-grupo__info">
        <span className="plan-grupo__etiqueta">{etiqueta}</span>
        <span className="plan-grupo__nombre">{persona.nombre || 'Atleta'}</span>
      </div>
    </li>
  )
}

function PlanGrupoMiembros({ titular, beneficiarios = [] }) {
  const listaBeneficiarios = Array.isArray(beneficiarios) ? beneficiarios : []
  const mostrarTitular = Boolean(titular?.uid)
  const mostrarBeneficiarios = listaBeneficiarios.length > 0

  if (!mostrarTitular && !mostrarBeneficiarios) return null

  return (
    <div className="plan-grupo">
      <p className="plan-grupo__title">
        {mostrarBeneficiarios ? 'Beneficiarios del plan' : 'Titular del plan'}
      </p>
      <ul className="plan-grupo__list">
        {mostrarTitular && (
          <PlanMiembroItem persona={titular} etiqueta="Titular" />
        )}
        {listaBeneficiarios.map((persona) => (
          <PlanMiembroItem
            key={persona.uid || persona.documento}
            persona={persona}
            etiqueta="Beneficiario"
          />
        ))}
      </ul>
    </div>
  )
}

export default PlanGrupoMiembros
