import './EventosTable.css'

function formatearFecha(ms) {
  if (!ms) return '—'
  return new Date(ms).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function EventosTable({ eventos, onEditar, onEliminar }) {
  if (!eventos.length) {
    return (
      <p className="ag-panel__empty eventos-table__empty">
        No hay eventos registrados.
      </p>
    )
  }

  return (
    <div className="eventos-table-wrapper">
      <table className="eventos-table">
        <thead>
          <tr>
            <th>Imagen</th>
            <th>Evento</th>
            <th>Descripción</th>
            <th>URL de acción</th>
            <th>Pos</th>
            <th>Creado</th>
            {(onEditar || onEliminar) && <th aria-label="Acciones" />}
          </tr>
        </thead>
        <tbody>
          {eventos.map((evento) => (
            <tr key={evento.id} className="eventos-table__row">
              <td className="eventos-table__img-cell">
                {evento.imagen ? (
                  <img
                    src={evento.imagen}
                    alt={`Banner ${evento.nombre}`}
                    className="eventos-table__thumb"
                    loading="lazy"
                  />
                ) : (
                  <span className="eventos-table__no-img">Sin imagen</span>
                )}
              </td>
              <td className="eventos-table__nombre">{evento.nombre}</td>
              <td className="eventos-table__descripcion">
                {evento.descripcion || '—'}
              </td>
              <td className="eventos-table__url">
                {evento.accionUrl ? (
                  <a
                    href={evento.accionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="eventos-table__link"
                  >
                    {evento.accionUrl}
                  </a>
                ) : (
                  '—'
                )}
              </td>
              <td className="eventos-table__pos">
                {Number.isFinite(evento.pos) ? evento.pos : '—'}
              </td>
              <td>{formatearFecha(evento.creacion)}</td>
              {(onEditar || onEliminar) && (
                <td className="eventos-table__actions">
                  {onEditar ? (
                    <button
                      type="button"
                      className="eventos-table__edit"
                      onClick={() => onEditar(evento)}
                    >
                      Editar
                    </button>
                  ) : null}
                  {onEliminar ? (
                    <button
                      type="button"
                      className="eventos-table__delete"
                      onClick={() => onEliminar(evento)}
                    >
                      Eliminar
                    </button>
                  ) : null}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default EventosTable
