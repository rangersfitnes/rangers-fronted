import './PlanesTable.css'

function formatearPrecio(valor) {
  const numero = Number(valor) || 0
  return numero.toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  })
}

function formatearFecha(ms) {
  if (!ms) return '—'
  return new Date(ms).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function PlanesTable({ planes, onRowClick }) {
  const handleClick = (event, plan) => {
    onRowClick?.(plan, { x: event.clientX, y: event.clientY })
  }

  return (
    <div className="planes-table-wrapper">
      <table className="planes-table">
        <thead>
          <tr>
            <th>Pos</th>
            <th>Nombre</th>
            <th>Tipo</th>
            <th>Descripción</th>
            <th>Precio</th>
            <th>Duración</th>
            <th>Personas</th>
            <th>Oferta</th>
            <th>Estado</th>
            <th>Creado</th>
          </tr>
        </thead>
        <tbody>
          {planes.map((plan) => {
            const estado = (plan.estado || 'activo').toLowerCase()
            const esActivo = estado === 'activo'
            return (
              <tr
                key={plan.id}
                className="planes-table__row"
                onClick={(e) => handleClick(e, plan)}
              >
                <td className="planes-table__pos">
                  {Number.isFinite(plan.pos) ? plan.pos : '—'}
                </td>
                <td className="planes-table__nombre">{plan.nombre}</td>
                <td>
                  {plan.tipo === 'tiquetera' ? (
                    <span className="planes-table__badge planes-table__badge--tiquetera">
                      Tiquetera
                      {Number.isFinite(plan.entradasIncluidas)
                        ? ` (${plan.entradasIncluidas})`
                        : ''}
                    </span>
                  ) : (
                    'Plan'
                  )}
                </td>
                <td className="planes-table__descripcion">{plan.descripcion}</td>
                <td className="planes-table__precio">
                  {formatearPrecio(plan.precio)}
                </td>
                <td>{plan.duracion || '—'}</td>
                <td className="planes-table__personas">
                  {Number.isFinite(plan.cantidadPersonas)
                    ? plan.cantidadPersonas
                    : '—'}
                </td>
                <td>
                  <span
                    className={`planes-table__badge${
                      plan.oferta ? ' planes-table__badge--on' : ''
                    }`}
                  >
                    {plan.oferta ? 'Sí' : 'No'}
                  </span>
                </td>
                <td>
                  <span
                    className={`planes-table__badge planes-table__badge--${
                      esActivo ? 'activo' : 'inactivo'
                    }`}
                  >
                    {esActivo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td>{formatearFecha(plan.fechaCreacion)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default PlanesTable
