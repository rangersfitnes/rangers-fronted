import Modal from './Modal.jsx'
import {
  formatearDuracionMs,
  formatearFechaCuenta,
  formatearFechaTabla,
  formatearHoraCuenta,
  formatearPrecioCuenta,
} from '../pages/cuenta/cuentaUtils.js'
import { exportarDesprendibleNominaPdf } from '../utils/exportDesprendibleNomina.js'
import './DesprendiblesNominaModal.css'

function formatearPeriodo(desprendible) {
  const inicio = formatearFechaCuenta(
    new Date(`${desprendible.fechaInicio}T12:00:00`).getTime(),
  )
  const fin = formatearFechaCuenta(
    new Date(`${desprendible.fechaFin}T12:00:00`).getTime(),
  )
  return `${inicio} – ${fin}`
}

function DesprendiblesNominaModal({ open, onClose, desprendibles = [] }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Desprendibles de nómina"
      footer={null}
    >
      {desprendibles.length === 0 ? (
        <p className="desprendibles-nomina__empty">
          Aún no tienes liquidaciones de nómina registradas.
        </p>
      ) : (
        <ul className="desprendibles-nomina__lista">
          {desprendibles.map((item) => {
            const resumen = item.resumen ?? {}
            return (
              <li key={`${item.liquidacionId}-${item.colaboradorUid}`}>
                <div className="desprendibles-nomina__item">
                  <div className="desprendibles-nomina__item-info">
                    <strong>{formatearPeriodo(item)}</strong>
                    <span>
                      {resumen.diasLaborados ?? 0} día
                      {(resumen.diasLaborados ?? 0) === 1 ? '' : 's'} ·{' '}
                      {resumen.totalHorasExtra > 0
                        ? `${resumen.totalHorasExtra} h extra · `
                        : ''}
                      Total {formatearPrecioCuenta(resumen.pagoTotal)}
                    </span>
                    <span className="desprendibles-nomina__item-detalle">
                      Ordinario {formatearPrecioCuenta(resumen.pagoOrdinario)}
                      {resumen.pagoRecargoDominical > 0
                        ? ` · Dom. ${formatearPrecioCuenta(resumen.pagoRecargoDominical)}`
                        : ''}
                      {resumen.pagoRecargoNocturno > 0
                        ? ` · Noct. ${formatearPrecioCuenta(resumen.pagoRecargoNocturno)}`
                        : ''}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="desprendibles-nomina__btn-pdf"
                    onClick={() => exportarDesprendibleNominaPdf(item)}
                  >
                    Descargar PDF
                  </button>
                </div>

                {(item.turnos ?? []).length > 0 && (
                  <details className="desprendibles-nomina__detalle-turnos">
                    <summary>Ver detalle por jornada</summary>
                    <ul>
                      {item.turnos.map((turno) => (
                        <li key={turno.turnoId}>
                          <span>
                            {formatearFechaTabla(turno.inicioEn)} ·{' '}
                            {formatearHoraCuenta(turno.inicioEn)} –{' '}
                            {formatearHoraCuenta(turno.finEn)} ·{' '}
                            {formatearDuracionMs(turno.duracionMs)}
                          </span>
                          <span>
                            {turno.horasExtra > 0
                              ? `${turno.horasExtra} h extra · `
                              : ''}
                            {turno.esDomingo ? 'Dominical · ' : ''}
                            {turno.horasNocturnas > 0
                              ? `${turno.horasNocturnas} h noct. · `
                              : ''}
                            {formatearPrecioCuenta(turno.pagoTotal)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Modal>
  )
}

export default DesprendiblesNominaModal
