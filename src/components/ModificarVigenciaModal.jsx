import { useCallback, useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import {
  consultarUsuarioVigencia,
  modificarVigenciaUsuario,
  revertirModificacionVigencia,
} from '../services/planesService.js'
import { formatearFechaTabla } from '../pages/cuenta/cuentaUtils.js'
import './ModificarVigenciaModal.css'
import './CrearPlanModal.css'

const TIPOS_MODIFICACION = [
  { id: 'agregar_dias', label: 'Agregar días a la vigencia' },
  { id: 'restar_dias', label: 'Restar días a la vigencia' },
  { id: 'mover_inicio', label: 'Mover fecha de inicio' },
]

const TIPO_LABEL = {
  agregar_dias: 'Agregar días',
  restar_dias: 'Restar días',
  mover_inicio: 'Mover inicio',
}

function ModificarVigenciaModal({ open, onClose, onSuccess, submitting, setSubmitting }) {
  const [documento, setDocumento] = useState('')
  const [tipo, setTipo] = useState('agregar_dias')
  const [dias, setDias] = useState('')
  const [nuevaFechaInicio, setNuevaFechaInicio] = useState('')
  const [causal, setCausal] = useState('')
  const [buscando, setBuscando] = useState(false)
  const [revertiendoId, setRevertiendoId] = useState(null)
  const [usuario, setUsuario] = useState(null)
  const [historial, setHistorial] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setDocumento('')
    setTipo('agregar_dias')
    setDias('')
    setNuevaFechaInicio('')
    setCausal('')
    setUsuario(null)
    setHistorial([])
    setError('')
    setRevertiendoId(null)
  }, [open])

  const refrescarDatos = useCallback(async (doc) => {
    const docLimpio = String(doc || '')
      .trim()
      .replace(/\s/g, '')

    if (!docLimpio) return null

    const data = await consultarUsuarioVigencia(docLimpio)
    setUsuario(data.usuario)
    setHistorial(data.historial || [])
    return data
  }, [])

  const handleBuscar = async () => {
    const docLimpio = documento.trim().replace(/\s/g, '')
    if (!docLimpio) {
      setError('Indica el número de documento')
      return
    }

    setError('')
    setBuscando(true)
    try {
      await refrescarDatos(docLimpio)
    } catch (err) {
      setUsuario(null)
      setHistorial([])
      setError(err.message || 'No se pudo consultar el usuario')
    } finally {
      setBuscando(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!usuario || submitting) return

    setError('')
    setSubmitting(true)

    try {
      const payload = {
        documento: usuario.documento,
        tipo,
        causal: causal.trim(),
      }

      if (tipo === 'mover_inicio') {
        payload.nuevaFechaInicio = nuevaFechaInicio
      } else {
        payload.dias = Number(dias)
      }

      const resultado = await modificarVigenciaUsuario(payload)
      onSuccess?.(resultado)
      await refrescarDatos(usuario.documento)
      setDias('')
      setNuevaFechaInicio('')
      setCausal('')
    } catch (err) {
      setError(err.message || 'No se pudo modificar la vigencia')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRevertir = async (item) => {
    if (!usuario || revertiendoId) return

    const confirmar = window.confirm(
      '¿Revertir esta modificación? Se restaurará la vigencia anterior del usuario y sus beneficiarios.',
    )

    if (!confirmar) return

    setError('')
    setRevertiendoId(item.id)

    try {
      const resultado = await revertirModificacionVigencia(item.id)
      onSuccess?.(resultado)
      await refrescarDatos(usuario.documento)
    } catch (err) {
      setError(err.message || 'No se pudo revertir la modificación')
    } finally {
      setRevertiendoId(null)
    }
  }

  const ocupado = submitting || buscando || Boolean(revertiendoId)

  const footer = (
    <>
      <button
        type="button"
        className="modal__btn modal__btn--ghost"
        onClick={onClose}
        disabled={ocupado}
      >
        Cerrar
      </button>
      <button
        type="submit"
        form="modificar-vigencia-form"
        className="modal__btn"
        disabled={!usuario || ocupado}
      >
        {submitting ? 'Guardando…' : 'Aplicar modificación'}
      </button>
    </>
  )

  return (
    <Modal
      open={open}
      onClose={ocupado ? undefined : onClose}
      title="Modificar vigencia de usuario"
      footer={footer}
      className="modificar-vigencia-modal"
    >
      <form id="modificar-vigencia-form" onSubmit={handleSubmit}>
        <p className="modificar-vigencia-modal__hint">
          Busca al usuario por cédula, ajusta su vigencia y registra la causal del
          cambio. La modificación aplica al titular y beneficiarios del mismo plan.
        </p>

        <div className="modificar-vigencia-modal__busqueda">
          <label className="crear-plan-field">
            <span className="crear-plan-field__label">Documento (CC)</span>
            <input
              type="text"
              className="crear-plan-field__input"
              value={documento}
              onChange={(e) => {
                setDocumento(e.target.value.replace(/\s/g, ''))
                setError('')
              }}
              inputMode="numeric"
              placeholder="Ej. 1234567890"
              disabled={ocupado}
            />
          </label>
          <button
            type="button"
            className="modal__btn modal__btn--ghost"
            onClick={handleBuscar}
            disabled={ocupado}
          >
            {buscando ? 'Buscando…' : 'Buscar'}
          </button>
        </div>

        {usuario ? (
          <div className="modificar-vigencia-modal__resumen">
            <p>
              <strong>{usuario.nombre}</strong> · CC {usuario.documento}
            </p>
            <p>
              Inicio actual:{' '}
              <strong>{formatearFechaTabla(usuario.fechaInicio)}</strong>
              {' · '}
              Vigencia actual:{' '}
              <strong>{formatearFechaTabla(usuario.vigencia)}</strong>
            </p>
            {usuario.vigenciaModificada ? (
              <p className="modificar-vigencia-modal__badge">
                Vigencia modificada previamente
                {usuario.ultimaModificacionVigencia?.causal
                  ? ` — ${usuario.ultimaModificacionVigencia.causal}`
                  : ''}
              </p>
            ) : null}
          </div>
        ) : null}

        {usuario ? (
          <>
            <fieldset className="modificar-vigencia-modal__tipos">
              <legend className="crear-plan-field__label">Tipo de ajuste</legend>
              {TIPOS_MODIFICACION.map((opcion) => (
                <label key={opcion.id} className="modificar-vigencia-modal__tipo">
                  <input
                    type="radio"
                    name="tipo-modificacion"
                    value={opcion.id}
                    checked={tipo === opcion.id}
                    onChange={() => {
                      setTipo(opcion.id)
                      setError('')
                    }}
                    disabled={ocupado}
                  />
                  <span>{opcion.label}</span>
                </label>
              ))}
            </fieldset>

            {tipo === 'mover_inicio' ? (
              <label className="crear-plan-field">
                <span className="crear-plan-field__label">Nueva fecha de inicio</span>
                <input
                  type="date"
                  className="crear-plan-field__input"
                  value={nuevaFechaInicio}
                  onChange={(e) => setNuevaFechaInicio(e.target.value)}
                  disabled={ocupado}
                  required
                />
              </label>
            ) : (
              <label className="crear-plan-field">
                <span className="crear-plan-field__label">Cantidad de días</span>
                <input
                  type="number"
                  min={1}
                  max={3650}
                  className="crear-plan-field__input"
                  value={dias}
                  onChange={(e) => setDias(e.target.value)}
                  placeholder="Ej. 7"
                  disabled={ocupado}
                  required
                />
              </label>
            )}

            <label className="crear-plan-field">
              <span className="crear-plan-field__label">Causal de la modificación</span>
              <textarea
                className="crear-plan-field__input modificar-vigencia-modal__causal"
                value={causal}
                onChange={(e) => setCausal(e.target.value)}
                placeholder="Describe el motivo del ajuste (mínimo 5 caracteres)"
                rows={3}
                disabled={ocupado}
                required
                minLength={5}
              />
            </label>
          </>
        ) : null}

        {usuario ? (
          <div className="modificar-vigencia-modal__historial">
            <h3 className="modificar-vigencia-modal__historial-title">
              Historial de modificaciones
            </h3>
            {historial.length === 0 ? (
              <p className="modificar-vigencia-modal__historial-empty">
                Este usuario aún no tiene modificaciones de vigencia registradas.
              </p>
            ) : (
              <div className="modificar-vigencia-modal__historial-table-wrap">
                <table className="modificar-vigencia-modal__historial-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Tipo</th>
                      <th>Inicio</th>
                      <th>Vigencia</th>
                      <th>Causal</th>
                      <th>Por</th>
                      <th>Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historial.map((item) => (
                      <tr key={item.id}>
                        <td>{formatearFechaTabla(item.creadoEn)}</td>
                        <td>
                          {TIPO_LABEL[item.tipo] || item.tipo || '—'}
                          {item.dias ? ` (${item.dias} d)` : ''}
                        </td>
                        <td>
                          {formatearFechaTabla(item.fechaInicioAnterior)} →{' '}
                          {formatearFechaTabla(item.fechaInicioNueva)}
                        </td>
                        <td>
                          {formatearFechaTabla(item.vigenciaAnterior)} →{' '}
                          {formatearFechaTabla(item.vigenciaNueva)}
                        </td>
                        <td>{item.causal || '—'}</td>
                        <td>{item.modificadoPorNombre || '—'}</td>
                        <td>
                          {item.puedeRevertir ? (
                            <button
                              type="button"
                              className="modificar-vigencia-modal__revertir-btn"
                              onClick={() => handleRevertir(item)}
                              disabled={ocupado}
                            >
                              {revertiendoId === item.id
                                ? 'Revirtiendo…'
                                : 'Revertir'}
                            </button>
                          ) : (
                            <span className="modificar-vigencia-modal__sin-accion">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}

        {error ? <p className="modal__error">{error}</p> : null}
      </form>
    </Modal>
  )
}

export default ModificarVigenciaModal
