import { useCallback, useEffect, useState } from 'react'
import LoadingOverlay from '../components/LoadingOverlay.jsx'
import { useToast } from '../components/Toast.jsx'
import { SEDES } from '../services/horariosService.js'
import { obtenerMiPerfilLaboral } from '../services/miPerfilService.js'
import {
  formatearDuracionMs,
  formatearFechaTabla,
  formatearHoraCuenta,
  formatearPrecioCuenta,
} from './cuenta/cuentaUtils.js'
import './PuntoFisico.css'
import './PuntoFisicoMiPerfil.css'
import './AdministracionGeneral.css'

function etiquetaSede(sedeId) {
  return SEDES.find((sede) => sede.id === sedeId)?.nombre ?? sedeId ?? '—'
}

function formatearFechaNacimiento(valor) {
  if (!valor) return '—'
  const fecha = new Date(`${valor}T12:00:00`)
  if (Number.isNaN(fecha.getTime())) return valor
  return fecha.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatearHorasDecimal(horas) {
  const valor = Number(horas) || 0
  return `${valor.toFixed(2).replace('.', ',')} h`
}

function CampoPerfil({ etiqueta, valor }) {
  return (
    <div className="pf-mi-perfil__campo">
      <span className="pf-mi-perfil__campo-label">{etiqueta}</span>
      <span className="pf-mi-perfil__campo-valor">{valor}</span>
    </div>
  )
}

function ResumenCard({ etiqueta, valor, destacado = false }) {
  return (
    <article
      className={`pf-mi-perfil__resumen-card${
        destacado ? ' pf-mi-perfil__resumen-card--destacado' : ''
      }`}
    >
      <span className="pf-mi-perfil__resumen-label">{etiqueta}</span>
      <strong className="pf-mi-perfil__resumen-valor">{valor}</strong>
    </article>
  )
}

function PuntoFisicoMiPerfil() {
  const toast = useToast()
  const [datos, setDatos] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [noColaborador, setNoColaborador] = useState(false)

  const cargar = useCallback(async () => {
    setLoading(true)
    setError('')
    setNoColaborador(false)

    try {
      const perfil = await obtenerMiPerfilLaboral()
      setDatos(perfil)
    } catch (err) {
      if (err.message?.includes('perfil de colaborador')) {
        setNoColaborador(true)
        setDatos(null)
        return
      }
      const mensaje = err.message || 'No se pudo cargar tu perfil'
      setError(mensaje)
      toast.error(mensaje)
      setDatos(null)
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    cargar()
  }, [cargar])

  const colaborador = datos?.colaborador
  const esquema = datos?.esquema
  const turnos = datos?.turnos ?? []
  const resumen = datos?.resumen

  return (
    <section className="pf-page__view pf-mi-perfil">
      <header className="pf-page__view-header pf-page__view-header--with-action">
        <div>
          <h1 className="pf-page__title">Mi perfil</h1>
          <p className="pf-page__subtitle">
            Información laboral, turnos registrados y cálculo de pago según tu
            esquema
          </p>
        </div>
        <button
          type="button"
          className="pf-action-btn pf-action-btn--ghost"
          onClick={cargar}
          disabled={loading}
        >
          Actualizar
        </button>
      </header>

      {error ? <p className="pf-mi-perfil__error">{error}</p> : null}

      {noColaborador ? (
        <div className="pf-panel">
          <p className="pf-panel__empty">
            Esta sección está disponible solo para colaboradores registrados en
            Gestión humana.
          </p>
        </div>
      ) : null}

      {colaborador ? (
        <>
          <div className="pf-mi-perfil__grid">
            <section className="pf-mi-perfil__panel">
              <h2 className="pf-mi-perfil__panel-title">Datos personales</h2>
              <div className="pf-mi-perfil__campos">
                <CampoPerfil etiqueta="Nombre" valor={colaborador.nombre} />
                <CampoPerfil
                  etiqueta="Identificación"
                  valor={colaborador.documento}
                />
                <CampoPerfil etiqueta="Correo" valor={colaborador.correo} />
                <CampoPerfil
                  etiqueta="Fecha de nacimiento"
                  valor={formatearFechaNacimiento(colaborador.fechaNacimiento)}
                />
                <CampoPerfil
                  etiqueta="Sede"
                  valor={etiquetaSede(colaborador.sede)}
                />
                <CampoPerfil
                  etiqueta="Cronometraje"
                  valor={colaborador.cronometrajeActivo ? 'Activo' : 'Inactivo'}
                />
              </div>
            </section>

            <section className="pf-mi-perfil__panel">
              <h2 className="pf-mi-perfil__panel-title">Esquema laboral</h2>
              {esquema ? (
                <div className="pf-mi-perfil__campos">
                  <CampoPerfil etiqueta="Esquema" valor={esquema.nombre} />
                  <CampoPerfil
                    etiqueta="Valor hora ordinaria"
                    valor={formatearPrecioCuenta(esquema.valorPorHora)}
                  />
                  <CampoPerfil
                    etiqueta="Horas por jornada"
                    valor={formatearHorasDecimal(esquema.horasTurno)}
                  />
                  <CampoPerfil
                    etiqueta="Valor por turno"
                    valor={formatearPrecioCuenta(esquema.valorTurno)}
                  />
                  <CampoPerfil
                    etiqueta="Hora extra"
                    valor={`${esquema.porcentajeHoraExtra}% · ${formatearPrecioCuenta(esquema.valorHoraExtra)}`}
                  />
                </div>
              ) : (
                <p className="pf-mi-perfil__hint">
                  No se encontró el esquema de pago asignado.
                </p>
              )}
            </section>
          </div>

          {resumen ? (
            <div className="pf-mi-perfil__resumen">
              <ResumenCard
                etiqueta="Turnos registrados"
                valor={String(resumen.totalTurnos)}
              />
              <ResumenCard
                etiqueta="Tiempo total laborado"
                valor={formatearDuracionMs(resumen.totalDuracionMs)}
              />
              <ResumenCard
                etiqueta="Horas extra acumuladas"
                valor={formatearHorasDecimal(resumen.totalHorasExtra)}
              />
              <ResumenCard
                etiqueta="Total devengado"
                valor={formatearPrecioCuenta(resumen.totalPago)}
                destacado
              />
            </div>
          ) : null}

          <section className="pf-mi-perfil__turnos">
            <h2 className="pf-mi-perfil__panel-title">Turnos laborados</h2>

            {turnos.length === 0 ? (
              <div className="pf-panel">
                <p className="pf-panel__empty">
                  Aún no tienes turnos finalizados registrados.
                </p>
              </div>
            ) : (
              <div className="ag-finanzas__tabla-wrap">
                <table className="ag-finanzas__tabla pf-mi-perfil__tabla">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Inicio</th>
                      <th>Fin</th>
                      <th>Tiempo laborado</th>
                      <th>H. ordinarias</th>
                      <th>H. extra</th>
                      <th>Pago ordinario</th>
                      <th>Pago extra</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {turnos.map((turno) => (
                      <tr key={turno.id}>
                        <td>{formatearFechaTabla(turno.inicioEn)}</td>
                        <td>{formatearHoraCuenta(turno.inicioEn)}</td>
                        <td>{formatearHoraCuenta(turno.finEn)}</td>
                        <td>{formatearDuracionMs(turno.duracionMs)}</td>
                        <td>{formatearHorasDecimal(turno.horasOrdinarias)}</td>
                        <td>
                          {turno.horasExtra > 0
                            ? formatearHorasDecimal(turno.horasExtra)
                            : '—'}
                        </td>
                        <td>{formatearPrecioCuenta(turno.pagoOrdinario)}</td>
                        <td>
                          {turno.pagoExtra > 0
                            ? formatearPrecioCuenta(turno.pagoExtra)
                            : '—'}
                        </td>
                        <td className="pf-mi-perfil__total-celda">
                          {formatearPrecioCuenta(turno.pagoTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {esquema ? (
              <p className="pf-mi-perfil__nota">
                El pago se calcula con tu esquema actual: hasta{' '}
                {formatearHorasDecimal(esquema.horasTurno)} se paga el valor del
                turno ({formatearPrecioCuenta(esquema.valorTurno)}); el tiempo
                adicional se liquida a{' '}
                {formatearPrecioCuenta(esquema.valorHoraExtra)} por hora extra.
              </p>
            ) : null}
          </section>
        </>
      ) : null}

      <LoadingOverlay visible={loading} label="Cargando perfil laboral" />
    </section>
  )
}

export default PuntoFisicoMiPerfil
