import { useMemo } from 'react'
import Modal from './Modal.jsx'
import './CrearPlanModal.css'
import './CuponesModals.css'

function formatearFecha(valor) {
  if (!valor) return '—'

  if (typeof valor === 'string') {
    const [anio, mes, dia] = valor.split('-')
    if (anio && mes && dia) return `${dia}/${mes}/${anio}`
    return valor
  }

  return new Date(valor).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function estadoCupon(cupon) {
  if (!cupon.activo) return { texto: 'Inactivo', clase: 'inactivo' }
  if (cupon.vencido) return { texto: 'Vencido', clase: 'vencido' }
  if (cupon.agotado) return { texto: 'Agotado', clase: 'vencido' }
  return { texto: 'Activo', clase: 'activo' }
}

function CuponesListModal({
  open,
  onClose,
  cupones = [],
  planes = [],
  onToggleActivo,
  onEliminar,
  procesandoId = '',
}) {
  const planesPorId = useMemo(
    () => Object.fromEntries(planes.map((plan) => [plan.id, plan])),
    [planes],
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cupones de descuento"
      className="cupones-list-modal"
      footer={
        <button
          type="button"
          className="crear-plan__btn crear-plan__btn--ghost"
          onClick={onClose}
        >
          Cerrar
        </button>
      }
    >
      {cupones.length === 0 ? (
        <p className="cupones-modal__empty">
          Aún no hay cupones registrados. Genera el primero con el botón
          «Generar cupón».
        </p>
      ) : (
        <div className="cupones-list-modal__table-wrap">
          <table className="cupones-list-modal__table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Código</th>
                <th>Descuento</th>
                <th>Estado</th>
                <th>Vence</th>
                <th>Usos</th>
                <th>Planes</th>
                <th aria-label="Acciones" />
              </tr>
            </thead>
            <tbody>
              {cupones.map((cupon) => {
                const estado = estadoCupon(cupon)
                const ocupado = procesandoId === cupon.id

                return (
                  <tr key={cupon.id}>
                    <td>{cupon.nombre}</td>
                    <td>
                      <code>{cupon.codigo}</code>
                    </td>
                    <td>{cupon.porcentajeDescuento}%</td>
                    <td>
                      <span
                        className={`cupones-list-modal__estado cupones-list-modal__estado--${estado.clase}`}
                      >
                        {estado.texto}
                      </span>
                    </td>
                    <td>{formatearFecha(cupon.fechaExpiracion)}</td>
                    <td>
                      {cupon.usos}
                      {cupon.maxUsos ? ` / ${cupon.maxUsos}` : ''}
                      {cupon.maxUsosPorUsuario ? (
                        <small className="cupones-list-modal__nota">
                          máx. {cupon.maxUsosPorUsuario} por usuario
                        </small>
                      ) : null}
                    </td>
                    <td>
                      <ul className="cupones-list-modal__planes">
                        {(cupon.planIds || []).map((planId) => (
                          <li key={planId}>
                            {planesPorId[planId]?.nombre || planId}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td>
                      <div className="cupones-list-modal__acciones">
                        <button
                          type="button"
                          className="cupones-modal__link-btn"
                          onClick={() => onToggleActivo?.(cupon)}
                          disabled={ocupado}
                        >
                          {cupon.activo ? 'Desactivar' : 'Activar'}
                        </button>
                        <button
                          type="button"
                          className="cupones-modal__link-btn cupones-modal__link-btn--danger"
                          onClick={() => onEliminar?.(cupon)}
                          disabled={ocupado}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  )
}

export default CuponesListModal
