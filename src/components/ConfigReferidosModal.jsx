import { useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import {
  guardarConfigReferidos,
  obtenerConfigReferidos,
  obtenerRegistrosReferidos,
} from '../services/referidosService.js'
import './CrearUsuarioModal.css'
import './ConfigReferidosModal.css'

function formatearPesos(valor) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(valor) || 0)
}

function formatearFecha(ms) {
  if (!ms) return '—'
  return new Date(ms).toLocaleString('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function etiquetaOrigen(origen) {
  if (origen === 'admin-punto-fisico') return 'Admin'
  if (origen === 'pago-online') return 'Web'
  return origen || '—'
}

function ConfigReferidosModal({ open, onClose }) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [descuentoMonto, setDescuentoMonto] = useState('')
  const [activo, setActivo] = useState(true)
  const [error, setError] = useState('')
  const [okMsg, setOkMsg] = useState('')
  const [referidores, setReferidores] = useState([])
  const [registros, setRegistros] = useState([])

  useEffect(() => {
    if (!open) {
      setError('')
      setOkMsg('')
      return
    }

    const controller = new AbortController()
    const cargar = async () => {
      setLoading(true)
      setError('')
      setOkMsg('')
      try {
        const [config, data] = await Promise.all([
          obtenerConfigReferidos({ signal: controller.signal }),
          obtenerRegistrosReferidos({ signal: controller.signal }),
        ])
        setDescuentoMonto(
          config.descuentoMonto > 0 ? String(config.descuentoMonto) : '',
        )
        setActivo(config.activo !== false)
        setReferidores(data.referidores ?? [])
        setRegistros(data.registros ?? [])
      } catch (err) {
        if (err?.name === 'AbortError') return
        setError(err.message || 'No se pudo cargar la configuración')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    cargar()
    return () => controller.abort()
  }, [open])

  const handleMontoChange = (event) => {
    const soloDigitos = event.target.value.replace(/\D/g, '').slice(0, 8)
    setDescuentoMonto(soloDigitos)
    setOkMsg('')
    setError('')
  }

  const handleGuardar = async (event) => {
    event.preventDefault()
    setError('')
    setOkMsg('')

    const monto = Number(descuentoMonto || 0)
    if (!Number.isFinite(monto) || monto < 0) {
      setError('Ingresa un valor de descuento válido')
      return
    }

    setSaving(true)
    try {
      const config = await guardarConfigReferidos({
        descuentoMonto: monto,
        activo: activo && monto > 0,
      })
      setDescuentoMonto(
        config.descuentoMonto > 0 ? String(config.descuentoMonto) : '',
      )
      setActivo(config.activo !== false)
      setOkMsg(
        monto > 0
          ? `Listo: ${formatearPesos(monto)} de descuento en la próxima mensualidad de quien traiga un referido.`
          : 'Referidos desactivados (descuento en $0).',
      )
    } catch (err) {
      setError(err.message || 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={saving ? undefined : onClose}
      title="Configurar referidos"
      className="config-referidos-modal"
      footer={
        <>
          <button
            type="button"
            className="crear-usuario__btn crear-usuario__btn--ghost"
            onClick={onClose}
            disabled={saving}
          >
            Cerrar
          </button>
          <button
            type="submit"
            form="config-referidos-form"
            className="crear-usuario__btn crear-usuario__btn--primary"
            disabled={loading || saving}
          >
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </>
      }
    >
      <form
        id="config-referidos-form"
        className="crear-usuario__form config-referidos-modal__form"
        onSubmit={handleGuardar}
      >
        <p className="config-referidos-modal__ayuda">
          Cuando un usuario active su membresía por primera vez (desde el panel
          admin o la web) e indique la cédula de quien lo refirió, ese{' '}
          <strong>referidor</strong> recibe un descuento solo en su{' '}
          <strong>siguiente mensualidad</strong>, sin superar el valor del plan.
        </p>

        {error && (
          <p className="crear-usuario__error" role="alert">
            {error}
          </p>
        )}
        {okMsg && (
          <p className="config-referidos-modal__ok" role="status">
            {okMsg}
          </p>
        )}

        <label className="crear-usuario__field">
          <span className="crear-usuario__label">
            Valor del descuento (COP)
          </span>
          <input
            type="text"
            inputMode="numeric"
            className="crear-usuario__input"
            placeholder="Ej. 20000"
            value={descuentoMonto}
            onChange={handleMontoChange}
            disabled={loading || saving}
          />
          <span className="config-referidos-modal__hint">
            {descuentoMonto
              ? `Se acreditará ${formatearPesos(descuentoMonto)} al referidor; al renovar se cobra el plan menos ese monto (tope: precio del plan).`
              : 'Deja 0 para desactivar el descuento.'}
          </span>
        </label>

        <label className="config-referidos-modal__check">
          <input
            type="checkbox"
            checked={activo}
            onChange={(e) => setActivo(e.target.checked)}
            disabled={loading || saving || !descuentoMonto}
          />
          <span>Programa de referidos activo</span>
        </label>
      </form>

      <section className="config-referidos-modal__lista" aria-label="Registro de referidos">
        <h3 className="config-referidos-modal__lista-title">
          Quienes han traído referidos
        </h3>
        {loading ? (
          <p className="config-referidos-modal__lista-empty">Cargando…</p>
        ) : referidores.length === 0 ? (
          <p className="config-referidos-modal__lista-empty">
            Aún no hay referidos registrados. Al activar el primer plan de un
            usuario nuevo desde admin o web, indica la cédula del referidor.
          </p>
        ) : (
          <div className="config-referidos-modal__tabla-wrap">
            <table className="config-referidos-modal__tabla">
              <thead>
                <tr>
                  <th>Referidor</th>
                  <th>Documento</th>
                  <th>Referidos</th>
                  <th>Pendiente</th>
                  <th>Último referido</th>
                </tr>
              </thead>
              <tbody>
                {referidores.map((item) => (
                  <tr key={item.referidorUid || item.referidorDocumento}>
                    <td>
                      <strong>{item.referidorNombre || '—'}</strong>
                    </td>
                    <td>{item.referidorDocumento || '—'}</td>
                    <td>{item.referidosCount}</td>
                    <td>
                      {item.descuentoReferidosPendiente > 0
                        ? formatearPesos(item.descuentoReferidosPendiente)
                        : '—'}
                    </td>
                    <td>
                      <span className="config-referidos-modal__celda-sec">
                        {item.ultimoReferidoNombre || '—'}
                        {item.ultimoReferidoDocumento
                          ? ` · ${item.ultimoReferidoDocumento}`
                          : ''}
                      </span>
                      <span className="config-referidos-modal__celda-fecha">
                        {formatearFecha(item.ultimoReferidoEn)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {registros.length > 0 && (
          <>
            <h3 className="config-referidos-modal__lista-title config-referidos-modal__lista-title--sub">
              Historial reciente
            </h3>
            <div className="config-referidos-modal__tabla-wrap">
              <table className="config-referidos-modal__tabla">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Referidor</th>
                    <th>Referido</th>
                    <th>Descuento</th>
                    <th>Origen</th>
                  </tr>
                </thead>
                <tbody>
                  {registros.slice(0, 40).map((item) => (
                    <tr key={item.id}>
                      <td>{formatearFecha(item.creadoEn)}</td>
                      <td>
                        <strong>{item.referidorNombre || '—'}</strong>
                        <span className="config-referidos-modal__celda-sec">
                          {item.referidorDocumento}
                        </span>
                      </td>
                      <td>
                        <strong>{item.referidoNombre || '—'}</strong>
                        <span className="config-referidos-modal__celda-sec">
                          {item.referidoDocumento}
                        </span>
                      </td>
                      <td>{formatearPesos(item.descuentoMonto)}</td>
                      <td>{etiquetaOrigen(item.origen)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </Modal>
  )
}

export default ConfigReferidosModal
