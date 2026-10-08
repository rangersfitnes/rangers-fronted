import { useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import {
  actualizarConocimientoBot,
  crearConocimientoBot,
  eliminarConocimientoBot,
  obtenerConocimientoBot,
} from '../services/conocimientoBotService.js'
import './CrearPlanModal.css'
import './ConocimientoBotModal.css'

const TIPOS = [
  { value: 'alianza', label: 'Alianza' },
  { value: 'promocion', label: 'Promoción' },
  { value: 'servicio', label: 'Servicio' },
  { value: 'beneficio', label: 'Beneficio' },
  { value: 'otro', label: 'Otro' },
]

const estadoInicial = {
  titulo: '',
  tipo: 'alianza',
  descripcion: '',
  palabrasClave: '',
  contacto: '',
  url: '',
  activo: true,
}

function etiquetaTipo(tipo) {
  return TIPOS.find((t) => t.value === tipo)?.label || 'Otro'
}

function ConocimientoBotModal({ open, onClose }) {
  const [lista, setLista] = useState([])
  const [cargando, setCargando] = useState(false)
  const [form, setForm] = useState(estadoInicial)
  const [editandoId, setEditandoId] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const cargar = async ({ signal } = {}) => {
    setCargando(true)
    try {
      const data = await obtenerConocimientoBot({ signal })
      if (!signal?.aborted) setLista(data)
    } catch (err) {
      if (err?.name === 'AbortError') return
      setError(err.message || 'No se pudo cargar la lista')
    } finally {
      if (!signal?.aborted) setCargando(false)
    }
  }

  useEffect(() => {
    if (!open) {
      setForm(estadoInicial)
      setEditandoId(null)
      setError('')
      setLista([])
      return undefined
    }
    const controller = new AbortController()
    cargar({ signal: controller.signal })
    return () => controller.abort()
  }, [open])

  const resetForm = () => {
    setForm(estadoInicial)
    setEditandoId(null)
    setError('')
  }

  const handleChange = (field) => (event) => {
    const value =
      field === 'activo' ? Boolean(event.target.checked) : event.target.value
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleEditar = (item) => {
    setEditandoId(item.id)
    setForm({
      titulo: item.titulo || '',
      tipo: item.tipo || 'alianza',
      descripcion: item.descripcion || '',
      palabrasClave: Array.isArray(item.palabrasClave)
        ? item.palabrasClave.join(', ')
        : '',
      contacto: item.contacto || '',
      url: item.url || '',
      activo: item.activo !== false,
    })
    setError('')
  }

  const handleEliminar = async (item) => {
    if (
      !window.confirm(
        `¿Eliminar "${item.titulo}"? El bot dejará de usar esta info.`,
      )
    ) {
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await eliminarConocimientoBot(item.id)
      if (editandoId === item.id) resetForm()
      await cargar()
    } catch (err) {
      setError(err.message || 'No se pudo eliminar')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    const payload = {
      titulo: form.titulo.trim(),
      tipo: form.tipo,
      descripcion: form.descripcion.trim(),
      palabrasClave: form.palabrasClave,
      contacto: form.contacto.trim(),
      url: form.url.trim(),
      activo: Boolean(form.activo),
    }
    try {
      if (editandoId) {
        await actualizarConocimientoBot(editandoId, payload)
      } else {
        await crearConocimientoBot(payload)
      }
      resetForm()
      await cargar()
    } catch (err) {
      setError(err.message || 'No se pudo guardar')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={() => {
        if (submitting) return
        onClose?.()
      }}
      title="Info para el bot"
      className="conocimiento-bot-modal"
      footer={
        <>
          <button
            type="button"
            className="crear-plan__btn crear-plan__btn--ghost"
            disabled={submitting}
            onClick={() => {
              if (submitting) return
              onClose?.()
            }}
          >
            Cerrar
          </button>
          <button
            type="submit"
            form="conocimiento-bot-form"
            className="crear-plan__btn crear-plan__btn--primary"
            disabled={submitting}
          >
            {submitting
              ? 'Guardando…'
              : editandoId
                ? 'Actualizar'
                : 'Agregar info'}
          </button>
        </>
      }
    >
      <div className="conocimiento-bot">
        <p className="conocimiento-bot__intro">
          Registra alianzas, promociones o servicios (ej. fisio aliado). El
          Ranger Bot usará esta info cuando un cliente pregunte algo
          relacionado, además de sus recomendaciones generales.
        </p>

        {error ? <p className="crear-plan__error">{error}</p> : null}

        {cargando ? (
          <p className="conocimiento-bot__cargando">Cargando…</p>
        ) : lista.length === 0 ? (
          <p className="conocimiento-bot__vacio">
            Aún no hay info registrada. Agrega la primera abajo.
          </p>
        ) : (
          <div className="conocimiento-bot__lista">
            {lista.map((item) => (
              <article
                key={item.id}
                className={`conocimiento-bot__item${
                  item.activo ? '' : ' conocimiento-bot__item--inactivo'
                }`}
              >
                <div className="conocimiento-bot__item-main">
                  <p className="conocimiento-bot__item-titulo">
                    <span
                      className={`conocimiento-bot__chip${
                        item.activo ? '' : ' conocimiento-bot__chip--off'
                      }`}
                    >
                      {etiquetaTipo(item.tipo)}
                    </span>
                    {item.titulo}
                  </p>
                  <p className="conocimiento-bot__item-meta">
                    {item.activo ? 'Activo' : 'Inactivo'}
                    {item.palabrasClave?.length
                      ? ` · ${item.palabrasClave.join(', ')}`
                      : ''}
                  </p>
                  {item.descripcion ? (
                    <p className="conocimiento-bot__item-desc">
                      {item.descripcion}
                    </p>
                  ) : null}
                </div>
                <div className="conocimiento-bot__item-actions">
                  <button
                    type="button"
                    className="conocimiento-bot__btn-mini"
                    disabled={submitting}
                    onClick={() => handleEditar(item)}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    className="conocimiento-bot__btn-mini conocimiento-bot__btn-mini--danger"
                    disabled={submitting}
                    onClick={() => handleEliminar(item)}
                  >
                    Eliminar
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        <h3 className="conocimiento-bot__form-title">
          {editandoId ? 'Editar registro' : 'Nuevo registro'}
        </h3>

        <form
          id="conocimiento-bot-form"
          className="crear-plan__form"
          onSubmit={handleSubmit}
        >
          <label className="crear-plan__field">
            <span className="crear-plan__label">Título</span>
            <input
              className="crear-plan__input"
              value={form.titulo}
              onChange={handleChange('titulo')}
              placeholder="Ej. Alianza fisioterapia Manizales"
              required
              maxLength={120}
            />
          </label>

          <label className="crear-plan__field">
            <span className="crear-plan__label">Tipo</span>
            <select
              className="crear-plan__input crear-plan__select"
              value={form.tipo}
              onChange={handleChange('tipo')}
            >
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          <label className="crear-plan__field">
            <span className="crear-plan__label">Info para la IA</span>
            <textarea
              className="crear-plan__input crear-plan__textarea"
              value={form.descripcion}
              onChange={handleChange('descripcion')}
              placeholder="Qué debe saber y recomendar el bot. Ej: Tenemos alianza con Fisio X; si un atleta tiene dolor de hombro o lesión, recomendar consulta con descuento del 15%."
              required
              maxLength={2000}
              rows={4}
            />
            <p className="crear-plan__hint">
              Sé concreto: cuándo recomendarlo, beneficio y cómo contactar.
            </p>
          </label>

          <label className="crear-plan__field">
            <span className="crear-plan__label">Palabras clave</span>
            <input
              className="crear-plan__input"
              value={form.palabrasClave}
              onChange={handleChange('palabrasClave')}
              placeholder="hombro, dolor, lesión, fisio, fisioterapia"
            />
            <p className="crear-plan__hint">
              Separadas por coma. Ayudan al bot a relacionar el mensaje del
              cliente.
            </p>
          </label>

          <label className="crear-plan__field">
            <span className="crear-plan__label">Contacto (opcional)</span>
            <input
              className="crear-plan__input"
              value={form.contacto}
              onChange={handleChange('contacto')}
              placeholder="WhatsApp 300… / pedir en recepción"
              maxLength={300}
            />
          </label>

          <label className="crear-plan__field">
            <span className="crear-plan__label">URL (opcional)</span>
            <input
              className="crear-plan__input"
              type="url"
              value={form.url}
              onChange={handleChange('url')}
              placeholder="https://"
              maxLength={500}
            />
          </label>

          <label className="conocimiento-bot__check">
            <input
              type="checkbox"
              checked={form.activo}
              onChange={handleChange('activo')}
            />
            Activo (el bot puede usarlo)
          </label>

          {editandoId ? (
            <button
              type="button"
              className="crear-plan__btn crear-plan__btn--ghost"
              disabled={submitting}
              onClick={resetForm}
            >
              Cancelar edición
            </button>
          ) : null}
        </form>
      </div>
    </Modal>
  )
}

export default ConocimientoBotModal
