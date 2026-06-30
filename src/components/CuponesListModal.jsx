import { useMemo } from 'react'
import Modal from './Modal.jsx'
import './CrearPlanModal.css'
import './CuponesModals.css'

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

function CuponesListModal({ open, onClose, cupones = [], planes = [] }) {
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
                <th>Planes</th>
                <th>Creado</th>
              </tr>
            </thead>
            <tbody>
              {cupones.map((cupon) => (
                <tr key={cupon.id}>
                  <td>{cupon.nombre}</td>
                  <td>
                    <code>{cupon.codigo}</code>
                  </td>
                  <td>{cupon.porcentajeDescuento}%</td>
                  <td>
                    <ul className="cupones-list-modal__planes">
                      {(cupon.planIds || []).map((planId) => (
                        <li key={planId}>
                          {planesPorId[planId]?.nombre || planId}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td>{formatearFecha(cupon.creadoEn)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  )
}

export default CuponesListModal
