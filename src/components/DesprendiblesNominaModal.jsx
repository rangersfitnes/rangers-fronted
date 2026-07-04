import Modal from './Modal.jsx'
import {
  formatearDuracionMs,
  formatearFechaCuenta,
  formatearFechaHoraCuenta,
  formatearFechaTabla,
  formatearHoraCuenta,
  formatearPrecioCuenta,
} from '../pages/cuenta/cuentaUtils.js'
import { exportarDesprendibleNominaPdf } from '../utils/exportDesprendibleNomina.js'
import './DesprendiblesNominaModal.css'

function formatearRangoTurnos(desprendible) {
  const inicio = desprendible.fechaInicio
  const fin = desprendible.fechaFin
  if (!inicio || !fin) return '—'
  const inicioTxt = formatearFechaCuenta(new Date(`${inicio}T12:00:00`).getTime())
  const finTxt = formatearFechaCuenta(new Date(`${fin}T12:00:00`).getTime())
  return inicio === fin ? inicioTxt : `${inicioTxt} – ${finTxt}`
}

function DesprendiblesNominaModal({ open, onClose, desprendibles = [] }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Desprendibles de nómina"
      footer={null}
      className="desprendibles-nomina-modal"
    >
      {desprendibles.length === 0 ? (
        <p className="desprendibles-nomina__empty">
          Aún no tienes liquidaciones de nómina registradas.
        </p>
      ) : (
        <ul className="desprendibles-nomina__lista">
          {desprendibles.map((item) => {
            const resumen = item.resumen ?? {}
            const turnos = item.turnos ?? []
            const totalTurnos = turnos.length || resumen.diasLaborados || 0

            return (
              <li key={`${item.liquidacionId || item.id}-${item.colaboradorUid}`}>
                <div className="desprendibles-nomina__item">
                  <div className="desprendibles-nomina__item-info">
                    <strong>
                      Liquidación · {formatearRangoTurnos(item)}
                    </strong>
                    <span>
                      {totalTurnos} turno{totalTurnos === 1 ? '' : 's'}
                      {resumen.totalHorasTrabajadas > 0
                        ? ` · ${Number(resumen.totalHorasTrabajadas).toFixed(2)} h`
                        : ''}
                      {resumen.totalHorasExtra > 0
                        ? ` · ${resumen.totalHorasExtra} h extra`
                        : ''}
                      {' · '}
                      Total {formatearPrecioCuenta(resumen.pagoTotal)}
                    </span>
                    <span className="desprendibles-nomina__item-detalle">
                      Ordinario {formatearPrecioCuenta(resumen.pagoOrdinario)}
                      {resumen.pagoExtra > 0
                        ? ` · Extra ${formatearPrecioCuenta(resumen.pagoExtra)}`
                        : ''}
                      {resumen.pagoRecargoDominical > 0
                        ? ` · Dom. ${formatearPrecioCuenta(resumen.pagoRecargoDominical)}`
                        : ''}
                      {resumen.pagoRecargoNocturno > 0
                        ? ` · Noct. ${formatearPrecioCuenta(resumen.pagoRecargoNocturno)}`
                        : ''}
                    </span>
                    {item.liquidadoEn ? (
                      <span className="desprendibles-nomina__item-detalle">
                        Pagado el {formatearFechaHoraCuenta(item.liquidadoEn)}
                      </span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="desprendibles-nomina__btn-pdf"
                    onClick={() => exportarDesprendibleNominaPdf(item)}
                  >
                    Descargar PDF
                  </button>
                </div>

                {turnos.length > 0 && (
                  <details className="desprendibles-nomina__detalle-turnos">
                    <summary>Ver detalle por jornada</summary>
                    <ul>
                      {turnos.map((turno) => (
                        <li key={turno.turnoId}>
                          <span>
                            {formatearFechaTabla(turno.inicioEn)} ·{' '}
                            {formatearHoraCuenta(turno.inicioEn)} –{' '}
                            {formatearHoraCuenta(turno.finEn)} ·{' '}
                            {formatearDuracionMs(turno.duracionMs)}
                            {turno.horasTrabajadas > 0
                              ? ` · ${Number(turno.horasTrabajadas).toFixed(2)} h`
                              : ''}
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
