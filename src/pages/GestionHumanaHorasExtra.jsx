import { useCallback, useEffect, useState } from 'react'
import ConfirmModal from '../components/ConfirmModal.jsx'
import LoadingOverlay from '../components/LoadingOverlay.jsx'
import Modal from '../components/Modal.jsx'
import { useToast } from '../components/Toast.jsx'
import { SEDES } from '../services/horariosService.js'
import {
  aprobarHorasExtra,
  obtenerHorasExtraPendientes,
  rechazarHorasExtra,
  sincronizarHorasExtraPendientes,
} from '../services/horasExtraService.js'
import {
  formatearDuracionMs,
  formatearFechaHoraCuenta,
  formatearFechaTabla,
  formatearHoraCuenta,
  formatearPrecioCuenta,
} from './cuenta/cuentaUtils.js'
import './AdministracionGeneral.css'

function etiquetaSede(sedeId) {
  return SEDES.find((sede) => sede.id === sedeId)?.nombre ?? sedeId ?? '—'
}

function formatearHorasEnteras(horas) {
  const valor = Number(horas) || 0
  return valor === 1 ? '1 hora' : `${valor} horas`
}

function GestionHumanaHorasExtra({ onVolver, onAprobadasChange }) {
  const toast = useToast()
  const [registros, setRegistros] = useState([])
  const [loading, setLoading] = useState(true)
  const [sincronizando, setSincronizando] = useState(false)
  const [aprobandoId, setAprobandoId] = useState('')
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [rechazarTarget, setRechazarTarget] = useState(null)
  const [causalRechazo, setCausalRechazo] = useState('')
  const [rechazandoId, setRechazandoId] = useState('')

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const lista = await obtenerHorasExtraPendientes()
      setRegistros(lista)
    } catch (err) {
      toast.error(err.message || 'No se pudieron cargar las solicitudes')
      setRegistros([])
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    cargar()
  }, [cargar])

  const handleSincronizar = async () => {
    setSincronizando(true)
    try {
      const resultado = await sincronizarHorasExtraPendientes()
      const partes = []
      if (resultado.creados > 0) {
        partes.push(`${resultado.creados} solicitud(es) nueva(s)`)
      }
      if (resultado.actualizados > 0) {
        partes.push(`${resultado.actualizados} actualizada(s)`)
      }
      toast.success(
        partes.length > 0
          ? `Sincronización: ${partes.join(' · ')}`
          : 'No hay turnos nuevos con horas extra por aprobar',
      )
      await cargar()
      onAprobadasChange?.()
    } catch (err) {
      toast.error(err.message || 'No se pudo sincronizar')
    } finally {
      setSincronizando(false)
    }
  }

  const handleConfirmarAprobar = async () => {
    if (!confirmTarget?.id) return

    setAprobandoId(confirmTarget.id)
    try {
      await aprobarHorasExtra({ id: confirmTarget.id })
      toast.success(
        `Horas extra de ${confirmTarget.colaboradorNombre} aprobadas correctamente`,
      )
      setConfirmTarget(null)
      await cargar()
      onAprobadasChange?.()
    } catch (err) {
      toast.error(err.message || 'No se pudo aprobar el registro')
    } finally {
      setAprobandoId('')
    }
  }

  const handleConfirmarRechazar = async () => {
    if (!rechazarTarget?.id) return

    const causal = causalRechazo.trim()
    if (!causal) {
      toast.error('Debes indicar la causal del rechazo')
      return
    }

    setRechazandoId(rechazarTarget.id)
    try {
      await rechazarHorasExtra({ id: rechazarTarget.id, causal })
      toast.success(
        `Horas extra de ${rechazarTarget.colaboradorNombre} rechazadas`,
      )
      setRechazarTarget(null)
      setCausalRechazo('')
      await cargar()
      onAprobadasChange?.()
    } catch (err) {
      toast.error(err.message || 'No se pudo rechazar el registro')
    } finally {
      setRechazandoId('')
    }
  }

  const accionesDeshabilitadas =
    loading || sincronizando || Boolean(aprobandoId) || Boolean(rechazandoId)

  return (
    <section className="ag-page__view">
      <header className="ag-page__view-header ag-page__view-header--with-action ag-finanzas__sub-header">
        <div className="ag-finanzas__sub-header-main">
          <button
            type="button"
            className="ag-action-btn ag-action-btn--ghost ag-finanzas__volver"
            onClick={onVolver}
            disabled={accionesDeshabilitadas}
          >
            ← Volver a Gestión humana
          </button>
          <div>
            <h1 className="ag-page__title">Aprobar horas extra</h1>
            <p className="ag-page__subtitle">
              Revisa y aprueba las horas extra registradas por el cronometraje
              de los colaboradores
            </p>
          </div>
        </div>
        <div className="ag-page__view-actions">
          <button
            type="button"
            className="ag-action-btn ag-action-btn--ghost"
            onClick={handleSincronizar}
            disabled={accionesDeshabilitadas}
          >
            Buscar pendientes
          </button>
          <button
            type="button"
            className="ag-action-btn ag-action-btn--ghost"
            onClick={cargar}
            disabled={accionesDeshabilitadas}
          >
            Actualizar
          </button>
        </div>
      </header>

      {!loading && registros.length > 0 && (
        <p className="ag-horas-extra__alerta" role="status">
          Tienes {registros.length} solicitud
          {registros.length === 1 ? '' : 'es'} de horas extra pendiente
          {registros.length === 1 ? '' : 's'} por aprobar.
        </p>
      )}

      {!loading && registros.length === 0 && (
        <div className="ag-panel">
          <p className="ag-panel__empty">
            No hay horas extra pendientes de aprobación. Cuando un colaborador
            finalice un turno con tiempo adicional liquidable, aparecerá aquí.
            Usa «Buscar pendientes» para revisar turnos anteriores.
          </p>
        </div>
      )}

      {registros.length > 0 && (
        <div className="ag-horas-extra__lista">
          {registros.map((registro) => (
            <article key={registro.id} className="ag-horas-extra__card">
              <header className="ag-horas-extra__card-head">
                <div>
                  <p className="ag-horas-extra__card-eyebrow">Pendiente de aprobación</p>
                  <h2 className="ag-horas-extra__card-nombre">
                    {registro.colaboradorNombre}
                  </h2>
                  <p className="ag-horas-extra__card-meta">
                    {registro.colaboradorDocumento || 'Sin documento'} ·{' '}
                    {etiquetaSede(registro.sede)}
                  </p>
                </div>
                <div className="ag-horas-extra__card-extra">
                  <span className="ag-horas-extra__card-extra-label">Horas extra</span>
                  <strong className="ag-horas-extra__card-extra-valor">
                    {formatearHorasEnteras(registro.horasExtra)}
                  </strong>
                </div>
              </header>

              <dl className="ag-horas-extra__detalle">
                <div>
                  <dt>Fecha del turno</dt>
                  <dd>{formatearFechaTabla(registro.inicioEn)}</dd>
                </div>
                <div>
                  <dt>Inicio</dt>
                  <dd>{formatearHoraCuenta(registro.inicioEn)}</dd>
                </div>
                <div>
                  <dt>Fin</dt>
                  <dd>{formatearHoraCuenta(registro.finEn)}</dd>
                </div>
                <div>
                  <dt>Tiempo laborado</dt>
                  <dd>{formatearDuracionMs(registro.duracionMs)}</dd>
                </div>
                <div>
                  <dt>Jornada del esquema</dt>
                  <dd>{registro.horasTurno} h</dd>
                </div>
                <div>
                  <dt>Tiempo extra registrado</dt>
                  <dd>{registro.minutosExtra} min</dd>
                </div>
                <div>
                  <dt>Esquema de pago</dt>
                  <dd>{registro.esquemaNombre || registro.esquemaPago}</dd>
                </div>
                <div>
                  <dt>Valor hora extra</dt>
                  <dd>{formatearPrecioCuenta(registro.valorHoraExtra)}</dd>
                </div>
                <div>
                  <dt>Pago ordinario del turno</dt>
                  <dd>{formatearPrecioCuenta(registro.pagoOrdinario)}</dd>
                </div>
                <div>
                  <dt>Pago por horas extra</dt>
                  <dd className="ag-horas-extra__monto-destacado">
                    {formatearPrecioCuenta(registro.pagoExtra)}
                  </dd>
                </div>
                <div>
                  <dt>Registrado</dt>
                  <dd>{formatearFechaHoraCuenta(registro.registradoEn)}</dd>
                </div>
              </dl>

              <footer className="ag-horas-extra__card-footer">
                <button
                  type="button"
                  className="ag-action-btn ag-action-btn--ghost ag-horas-extra__btn-rechazar"
                  onClick={() => {
                    setCausalRechazo('')
                    setRechazarTarget(registro)
                  }}
                  disabled={accionesDeshabilitadas}
                >
                  {rechazandoId === registro.id ? 'Rechazando…' : 'Rechazar'}
                </button>
                <button
                  type="button"
                  className="ag-action-btn"
                  onClick={() => setConfirmTarget(registro)}
                  disabled={accionesDeshabilitadas}
                >
                  {aprobandoId === registro.id ? 'Aprobando…' : 'Aprobar horas extra'}
                </button>
              </footer>
            </article>
          ))}
        </div>
      )}

      <ConfirmModal
        open={Boolean(confirmTarget)}
        onClose={() => {
          if (aprobandoId) return
          setConfirmTarget(null)
        }}
        onConfirm={handleConfirmarAprobar}
        title="Aprobar horas extra"
        message={
          confirmTarget
            ? `¿Aprobar ${formatearHorasEnteras(confirmTarget.horasExtra)} de ${confirmTarget.colaboradorNombre} del ${formatearFechaTabla(confirmTarget.inicioEn)} por ${formatearPrecioCuenta(confirmTarget.pagoExtra)}?`
            : ''
        }
        confirmLabel="Aprobar"
        loading={Boolean(aprobandoId)}
      />

      <Modal
        open={Boolean(rechazarTarget)}
        onClose={() => {
          if (rechazandoId) return
          setRechazarTarget(null)
          setCausalRechazo('')
        }}
        title="Rechazar horas extra"
        footer={
          <>
            <button
              type="button"
              className="modal__btn modal__btn--ghost"
              onClick={() => {
                if (rechazandoId) return
                setRechazarTarget(null)
                setCausalRechazo('')
              }}
              disabled={Boolean(rechazandoId)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="modal__btn confirm-modal__btn--danger"
              onClick={handleConfirmarRechazar}
              disabled={Boolean(rechazandoId) || !causalRechazo.trim()}
            >
              {rechazandoId ? 'Rechazando…' : 'Rechazar horas extra'}
            </button>
          </>
        }
      >
        {rechazarTarget ? (
          <div className="ag-horas-extra__rechazo-modal">
            <p>
              Rechazar {formatearHorasEnteras(rechazarTarget.horasExtra)} de{' '}
              {rechazarTarget.colaboradorNombre} del{' '}
              {formatearFechaTabla(rechazarTarget.inicioEn)}. El turno se
              liquidará solo con pago ordinario.
            </p>
            <label className="ag-horas-extra__rechazo-campo">
              <span>Causal del rechazo *</span>
              <textarea
                rows={4}
                value={causalRechazo}
                onChange={(e) => setCausalRechazo(e.target.value)}
                placeholder="Indica el motivo del rechazo…"
                disabled={Boolean(rechazandoId)}
              />
            </label>
          </div>
        ) : null}
      </Modal>

      <LoadingOverlay
        visible={loading || sincronizando || Boolean(aprobandoId) || Boolean(rechazandoId)}
        label={
          sincronizando
            ? 'Buscando turnos con horas extra'
            : aprobandoId
              ? 'Aprobando horas extra'
              : rechazandoId
                ? 'Rechazando horas extra'
                : 'Cargando solicitudes'
        }
      />
    </section>
  )
}

export default GestionHumanaHorasExtra
