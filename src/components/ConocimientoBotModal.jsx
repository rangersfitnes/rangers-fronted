import { useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import {
  actualizarBotAdministrador,
  actualizarConocimientoBot,
  crearBotAdministrador,
  crearConocimientoBot,
  eliminarBotAdministrador,
  eliminarConocimientoBot,
  obtenerBotAdministradores,
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
  const [pestana, setPestana] = useState('info')
  const [admins, setAdmins] = useState([])
  const [adminForm, setAdminForm] = useState({
    nombre: '',
    telefono: '',
    activo: true,
  })
  const [editandoAdminId, setEditandoAdminId] = useState(null)

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

  const cargarAdmins = async ({ signal } = {}) => {
    try {
      const data = await obtenerBotAdministradores({ signal })
      if (!signal?.aborted) setAdmins(data)
    } catch (err) {
      if (err?.name === 'AbortError') return
      setError(err.message || 'No se pudieron cargar los administradores')
    }
  }

  useEffect(() => {
    if (!open) {
      setForm(estadoInicial)
      setEditandoId(null)
      setError('')
      setLista([])
      setAdmins([])
      setPestana('info')
      setEditandoAdminId(null)
      setAdminForm({ nombre: '', telefono: '', activo: true })
      return undefined
    }
    const controller = new AbortController()
    cargar({ signal: controller.signal })
    cargarAdmins({ signal: controller.signal })
    return () => controller.abort()
  }, [open ])

  const handleAprobarAprendizaje = async (item) => {
    setSubmitting(true)
    setError('')
    try {
      await actualizarConocimientoBot(item.id, {
        titulo: item.titulo,
        tipo: item.tipo,
        descripcion: item.descripcion,
        palabrasClave: Array.isArray(item.palabrasClave)
          ? item.palabrasClave.join(', ')
          : '',
        contacto: item.contacto || '',
        url: item.url || '',
        activo: true,
        pendienteRevision: false,
      })
      await cargar()
    } catch (err) {
      setError(err.message || 'No se pudo activar el aprendizaje')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitAdmin = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    const payload = {
      nombre: adminForm.nombre.trim(),
      telefono: adminForm.telefono.trim(),
      activo: Boolean(adminForm.activo),
    }
    try {
      if (editandoAdminId) {
        await actualizarBotAdministrador(editandoAdminId, payload)
      } else {
        await crearBotAdministrador(payload)
      }
      setEditandoAdminId(null)
      setAdminForm({ nombre: '', telefono: '', activo: true })
      await cargarAdmins()
    } catch (err) {
      setError(err.message || 'No se pudo guardar el administrador')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEliminarAdmin = async (item) => {
    if (
      !window.confirm(
        `¿Quitar a "${item.nombre}" (${item.telefono}) como administrador del bot? Ya no podrá enseñarle por chat.`,
      )
    ) {
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await eliminarBotAdministrador(item.id)
      if (editandoAdminId === item.id) {
        setEditandoAdminId(null)
        setAdminForm({ nombre: '', telefono: '', activo: true })
      }
      await cargarAdmins()
    } catch (err) {
      setError(err.message || 'No se pudo eliminar')
    } finally {
      setSubmitting(false)
    }
  }

  const aprendizajesChat = lista.filter((item) =>
    String(item.origen || '').startsWith('chat-'),
  )
  const pendientesChat = aprendizajesChat.filter(
    (item) => item.pendienteRevision && !item.activo,
  ).length

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

  const listaVisible =
    pestana === 'aprendizajes' ? aprendizajesChat : lista

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
          {pestana === 'info' ? (
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
          ) : null}
          {pestana === 'admins' ? (
            <button
              type="submit"
              form="bot-admin-form"
              className="crear-plan__btn crear-plan__btn--primary"
              disabled={submitting}
            >
              {submitting
                ? 'Guardando…'
                : editandoAdminId
                  ? 'Actualizar número'
                  : 'Agregar número'}
            </button>
          ) : null}
        </>
      }
    >
      <div className="conocimiento-bot">
        <div className="conocimiento-bot__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={pestana === 'info'}
            className={`conocimiento-bot__tab${pestana === 'info' ? ' conocimiento-bot__tab--activo' : ''}`}
            onClick={() => setPestana('info')}
          >
            Info para el bot
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={pestana === 'admins'}
            className={`conocimiento-bot__tab${pestana === 'admins' ? ' conocimiento-bot__tab--activo' : ''}`}
            onClick={() => setPestana('admins')}
          >
            Administradores ({admins.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={pestana === 'aprendizajes'}
            className={`conocimiento-bot__tab${pestana === 'aprendizajes' ? ' conocimiento-bot__tab--activo' : ''}`}
            onClick={() => setPestana('aprendizajes')}
          >
            Aprendizajes por chat ({aprendizajesChat.length}
            {pendientesChat ? ` · ${pendientesChat} pend.` : ''})
          </button>
        </div>

        <p className="conocimiento-bot__intro">
          {pestana === 'admins'
            ? 'Números de WhatsApp autorizados a enseñarle al bot con “aprende: …”. Solo estos números (y los perfiles admin/entrenador) activan el aprendizaje al instante.'
            : pestana === 'aprendizajes'
              ? 'Todo lo que el bot ha aprendido o le han sugerido por WhatsApp / chat web. Activa, edita o elimina cada registro.'
              : 'Registra alianzas, promociones, servicios o reglas del box (ej. fisio aliado, qué pasa en festivos). Rex usará esta info cuando alguien pregunte algo relacionado.'}
        </p>

        {error ? <p className="crear-plan__error">{error}</p> : null}

        {pestana === 'admins' ? (
          <>
            {admins.length === 0 ? (
              <p className="conocimiento-bot__vacio">
                Aún no hay números autorizados. Agrega el primero abajo.
              </p>
            ) : (
              <div className="conocimiento-bot__lista">
                {admins.map((item) => (
                  <article
                    key={item.id}
                    className={`conocimiento-bot__item${item.activo ? '' : ' conocimiento-bot__item--inactivo'}`}
                  >
                    <div className="conocimiento-bot__item-main">
                      <p className="conocimiento-bot__item-titulo">
                        {item.nombre}
                      </p>
                      <p className="conocimiento-bot__item-meta">
                        WhatsApp {item.telefono} ·{' '}
                        {item.activo ? 'Autorizado' : 'Inactivo'}
                      </p>
                    </div>
                    <div className="conocimiento-bot__item-actions">
                      <button
                        type="button"
                        className="conocimiento-bot__btn-mini"
                        disabled={submitting}
                        onClick={() => {
                          setEditandoAdminId(item.id)
                          setAdminForm({
                            nombre: item.nombre || '',
                            telefono: item.telefono || '',
                            activo: item.activo !== false,
                          })
                        }}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="conocimiento-bot__btn-mini conocimiento-bot__btn-mini--danger"
                        disabled={submitting}
                        onClick={() => handleEliminarAdmin(item)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}

            <h3 className="conocimiento-bot__form-title">
              {editandoAdminId ? 'Editar administrador' : 'Nuevo administrador'}
            </h3>
            <form
              id="bot-admin-form"
              className="crear-plan__form"
              onSubmit={handleSubmitAdmin}
            >
              <label className="crear-plan__field">
                <span className="crear-plan__label">Nombre</span>
                <input
                  className="crear-plan__input"
                  value={adminForm.nombre}
                  onChange={(e) =>
                    setAdminForm((p) => ({ ...p, nombre: e.target.value }))
                  }
                  placeholder="Ej. Juanda (dueño)"
                  required
                  maxLength={120}
                />
              </label>
              <label className="crear-plan__field">
                <span className="crear-plan__label">Número de WhatsApp</span>
                <input
                  className="crear-plan__input"
                  value={adminForm.telefono}
                  onChange={(e) =>
                    setAdminForm((p) => ({ ...p, telefono: e.target.value }))
                  }
                  placeholder="300 123 4567"
                  required
                  inputMode="tel"
                />
                <p className="crear-plan__hint">
                  El mismo número desde el que escribe al bot. Puede ir con o
                  sin +57.
                </p>
              </label>
              <label className="conocimiento-bot__check">
                <input
                  type="checkbox"
                  checked={adminForm.activo}
                  onChange={(e) =>
                    setAdminForm((p) => ({ ...p, activo: e.target.checked }))
                  }
                />
                Activo (puede enseñarle al bot)
              </label>
              {editandoAdminId ? (
                <button
                  type="button"
                  className="crear-plan__btn crear-plan__btn--ghost"
                  disabled={submitting}
                  onClick={() => {
                    setEditandoAdminId(null)
                    setAdminForm({ nombre: '', telefono: '', activo: true })
                  }}
                >
                  Cancelar edición
                </button>
              ) : null}
            </form>
          </>
        ) : cargando ? (
          <p className="conocimiento-bot__cargando">Cargando…</p>
        ) : listaVisible.length === 0 ? (
          <p className="conocimiento-bot__vacio">
            {pestana === 'aprendizajes'
              ? 'Aún no hay aprendizajes por chat. Cuando alguien escriba “aprende: …”, aparecerá aquí.'
              : 'Aún no hay info registrada. Agrega la primera abajo.'}
          </p>
        ) : (
          <div className="conocimiento-bot__lista">
            {listaVisible.map((item) => (
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
                    {item.pendienteRevision && !item.activo
                      ? ' · Sugerencia por chat — pendiente de revisar'
                      : ''}
                    {item.origen ? ` · ${item.origen}` : ''}
                    {item.creadoPorNombre ? ` · ${item.creadoPorNombre}` : ''}
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
                  {item.pendienteRevision && !item.activo ? (
                    <button
                      type="button"
                      className="conocimiento-bot__btn-mini"
                      disabled={submitting}
                      onClick={() => handleAprobarAprendizaje(item)}
                    >
                      Activar
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="conocimiento-bot__btn-mini"
                    disabled={submitting}
                    onClick={() => {
                      setPestana('info')
                      handleEditar(item)
                    }}
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

        {pestana === 'info' ? (
          <>
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
          </>
        ) : null}
      </div>
    </Modal>
  )
}

export default ConocimientoBotModal
