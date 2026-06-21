import { useCallback, useEffect, useState } from 'react'
import { formatearTiempoLaborado } from './CronometroTurnoWidget.jsx'
import { SEDES } from '../services/horariosService.js'
import { obtenerTurnosActivos } from '../services/turnosService.js'
import {
  formatearFechaHoraCuenta,
  normalizarTimestampMs,
} from '../pages/cuenta/cuentaUtils.js'
import './TurnosActivosPanel.css'

const INTERVALO_RECARGA_MS = 20_000

function etiquetaSede(sedeId) {
  return SEDES.find((sede) => sede.id === sedeId)?.nombre ?? sedeId ?? '—'
}

function calcularTranscurridoMs(inicioEn, ahora) {
  const inicioMs = normalizarTimestampMs(inicioEn)
  if (!inicioMs) return 0
  return Math.max(0, ahora - inicioMs)
}

function TurnosActivosPanel() {
  const [turnos, setTurnos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ahora, setAhora] = useState(Date.now())

  const cargar = useCallback(async () => {
    try {
      const lista = await obtenerTurnosActivos()
      setTurnos(lista)
      setError('')
    } catch (err) {
      setTurnos([])
      setError(err.message || 'No se pudieron cargar los turnos activos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargar()
    const recarga = window.setInterval(cargar, INTERVALO_RECARGA_MS)
    return () => window.clearInterval(recarga)
  }, [cargar])

  useEffect(() => {
    if (turnos.length === 0) return undefined

    const tick = window.setInterval(() => {
      setAhora(Date.now())
    }, 1000)

    return () => window.clearInterval(tick)
  }, [turnos.length])

  return (
    <section className="ag-turnos-activos" aria-live="polite">
      <header className="ag-turnos-activos__header">
        <div>
          <h2 className="ag-turnos-activos__title">
            <span className="ag-turnos-activos__live" aria-hidden="true" />
            Colaboradores en turno
          </h2>
          <p className="ag-turnos-activos__subtitle">
            Seguimiento en tiempo real del cronometraje activo
          </p>
        </div>
        {!loading && turnos.length > 0 ? (
          <span className="ag-turnos-activos__contador">
            {turnos.length} en curso
          </span>
        ) : null}
      </header>

      {loading ? (
        <p className="ag-turnos-activos__estado">Cargando turnos activos…</p>
      ) : null}

      {error ? <p className="ag-turnos-activos__error">{error}</p> : null}

      {!loading && !error && turnos.length === 0 ? (
        <p className="ag-turnos-activos__estado">
          No hay colaboradores con turno activo en este momento.
        </p>
      ) : null}

      {!loading && turnos.length > 0 ? (
        <div className="ag-finanzas__tabla-wrap">
          <table className="ag-finanzas__tabla ag-turnos-activos__tabla">
            <thead>
              <tr>
                <th>Colaborador</th>
                <th>Sede</th>
                <th>Rol</th>
                <th>Inicio</th>
                <th>Tiempo transcurrido</th>
              </tr>
            </thead>
            <tbody>
              {turnos.map((turno) => (
                <tr key={`${turno.sede}-${turno.id}`}>
                  <td>
                    <span className="ag-horas-extra__tabla-nombre">
                      {turno.colaboradorNombre || '—'}
                    </span>
                  </td>
                  <td>{etiquetaSede(turno.sede)}</td>
                  <td>{turno.rol || turno.esquemaPago || '—'}</td>
                  <td>{formatearFechaHoraCuenta(turno.inicioEn)}</td>
                  <td className="ag-turnos-activos__tiempo">
                    {formatearTiempoLaborado(
                      calcularTranscurridoMs(turno.inicioEn, ahora),
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  )
}

export default TurnosActivosPanel
