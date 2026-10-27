import { useEffect, useMemo, useState } from 'react'
import Modal from './Modal.jsx'
import ConfirmModal from './ConfirmModal.jsx'
import {
  actualizarFormulario,
  crearFormulario,
  eliminarFormulario,
  linkPublicoFormulario,
  obtenerFormularios,
  obtenerRespuestasFormulario,
} from '../services/formulariosService.js'
import { optimizarImagenFormulario } from '../utils/optimizarImagenFormulario.js'
import './CrearPlanModal.css'
import './FormulariosModal.css'

const NUEVO_ID = '__nuevo__'

function nuevoIdLocal() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 16)
  }
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function preguntaVacia(tipo = 'abierta') {
  return {
    id: nuevoIdLocal(),
    tipo,
    enunciado: '',
    opciones: tipo === 'opcion_unica' ? ['', ''] : undefined,
    requerida: true,
    orden: 0,
  }
}

function crearEstadoInicial() {
  return {
    titulo: '',
    descripcion: '',
    mensajeAgradecimiento: '¡Gracias! Recibimos tus respuestas.',
    activo: true,
    preguntas: [],
  }
}

function formatearFecha(ms) {
  if (!ms) return '—'
  try {
    return new Date(ms).toLocaleString('es-CO', {
      timeZone: 'America/Bogota',
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return '—'
  }
}

function formDesdeItem(item) {
  return {
    titulo: item.titulo || '',
    descripcion: item.descripcion || '',
    mensajeAgradecimiento:
      item.mensajeAgradecimiento || '¡Gracias! Recibimos tus respuestas.',
    activo: item.activo !== false,
    preguntas: Array.isArray(item.preguntas)
      ? item.preguntas.map((p, i) => ({
          id: p.id || nuevoIdLocal(),
          tipo: p.tipo === 'opcion_unica' ? 'opcion_unica' : 'abierta',
          enunciado: p.enunciado || '',
          opciones:
            p.tipo === 'opcion_unica'
              ? Array.isArray(p.opciones) && p.opciones.length
                ? [...p.opciones]
                : ['', '']
              : undefined,
          requerida: p.requerida !== false,
          orden: Number.isFinite(p.orden) ? p.orden : i,
        }))
      : [],
  }
}

function FormulariosModal({ open, onClose }) {
  const [lista, setLista] = useState([])
  const [cargando, setCargando] = useState(false)
  const [expandidoId, setExpandidoId] = useState(null)
  const [pestana, setPestana] = useState('formulario')
  const [form, setForm] = useState(crearEstadoInicial)
  const [portadaFile, setPortadaFile] = useState(null)
  const [portadaPreview, setPortadaPreview] = useState('')
  const [portadaProcesando, setPortadaProcesando] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [copiadoId, setCopiadoId] = useState(null)
  const [eliminarTarget, setEliminarTarget] = useState(null)
  const [eliminando, setEliminando] = useState(false)
  const [respuestas, setRespuestas] = useState([])
  const [cargandoRespuestas, setCargandoRespuestas] = useState(false)
  const [baselineJson, setBaselineJson] = useState(() =>
    JSON.stringify(crearEstadoInicial()),
  )

  const editandoId = expandidoId && expandidoId !== NUEVO_ID ? expandidoId : null
  const creandoNuevo = expandidoId === NUEVO_ID
  const hayCambiosSinGuardar = useMemo(() => {
    if (!expandidoId) return false
    if (portadaFile) return true
    return JSON.stringify(form) !== baselineJson
  }, [expandidoId, form, portadaFile, baselineJson])

  const linkPublico = useMemo(
    () => (editandoId ? linkPublicoFormulario(editandoId) : ''),
    [editandoId],
  )

  const mapaPreguntas = useMemo(() => {
    const map = new Map()
    for (const p of form.preguntas || []) {
      map.set(p.id, p)
    }
    return map
  }, [form.preguntas])

  const cargar = async ({ signal } = {}) => {
    setCargando(true)
    try {
      const data = await obtenerFormularios({ signal })
      if (!signal?.aborted) setLista(data)
    } catch (err) {
      if (err?.name === 'AbortError') return
      setError(err.message || 'No se pudieron cargar los formularios')
    } finally {
      if (!signal?.aborted) setCargando(false)
    }
  }

  const resetEditor = () => {
    const inicial = crearEstadoInicial()
    setForm(inicial)
    setBaselineJson(JSON.stringify(inicial))
    setPortadaFile(null)
    setPortadaPreview('')
    setPestana('formulario')
    setRespuestas([])
  }

  const confirmarDescartarSiHayCambios = () => {
    if (!hayCambiosSinGuardar) return true
    return window.confirm(
      'Tienes cambios sin guardar. ¿Descartarlos y continuar?',
    )
  }

  useEffect(() => {
    if (!open) {
      setLista([])
      setExpandidoId(null)
      resetEditor()
      setError('')
      setCopiadoId(null)
      setEliminarTarget(null)
      return undefined
    }
    const controller = new AbortController()
    cargar({ signal: controller.signal })
    return () => controller.abort()
  }, [open])

  useEffect(() => {
    if (!open || !editandoId || pestana !== 'respuestas') {
      return undefined
    }
    const controller = new AbortController()
    setCargandoRespuestas(true)
    obtenerRespuestasFormulario(editandoId, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setRespuestas(data)
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return
        setError(err.message || 'No se pudieron cargar las respuestas')
      })
      .finally(() => {
        if (!controller.signal.aborted) setCargandoRespuestas(false)
      })
    return () => controller.abort()
  }, [open, editandoId, pestana])

  const cargarItemEnEditor = (item) => {
    setError('')
    const siguiente = formDesdeItem(item)
    setForm(siguiente)
    setBaselineJson(JSON.stringify(siguiente))
    setPortadaFile(null)
    setPortadaPreview(item.portadaUrl || '')
    // No tocar pestana aquí si ya estamos editando el mismo; al abrir otro sí volver a formulario
    setPestana('formulario')
    setRespuestas([])
  }

  const toggleExpandir = (item) => {
    if (submitting) return
    if (expandidoId === item.id) {
      if (!confirmarDescartarSiHayCambios()) return
      setExpandidoId(null)
      resetEditor()
      return
    }
    if (expandidoId && !confirmarDescartarSiHayCambios()) return
    cargarItemEnEditor(item)
    setExpandidoId(item.id)
  }

  const abrirCrear = () => {
    if (submitting) return
    if (expandidoId && !confirmarDescartarSiHayCambios()) return
    setError('')
    resetEditor()
    setExpandidoId(NUEVO_ID)
  }

  const colapsar = () => {
    if (submitting) return
    if (!confirmarDescartarSiHayCambios()) return
    setExpandidoId(null)
    resetEditor()
  }

  const setCampo = (campo, valor) => {
    setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  const actualizarPregunta = (id, patch) => {
    setForm((prev) => ({
      ...prev,
      preguntas: prev.preguntas.map((p) =>
        p.id === id ? { ...p, ...patch } : p,
      ),
    }))
  }

  const agregarPregunta = (tipo) => {
    setForm((prev) => ({
      ...prev,
      preguntas: [
        ...prev.preguntas,
        { ...preguntaVacia(tipo), orden: prev.preguntas.length },
      ],
    }))
  }

  const quitarPregunta = (id) => {
    setForm((prev) => ({
      ...prev,
      preguntas: prev.preguntas
        .filter((p) => p.id !== id)
        .map((p, i) => ({ ...p, orden: i })),
    }))
  }

  const moverPregunta = (id, dir) => {
    setForm((prev) => {
      const idx = prev.preguntas.findIndex((p) => p.id === id)
      if (idx < 0) return prev
      const dest = idx + dir
      if (dest < 0 || dest >= prev.preguntas.length) return prev
      const next = [...prev.preguntas]
      const [item] = next.splice(idx, 1)
      next.splice(dest, 0, item)
      return {
        ...prev,
        preguntas: next.map((p, i) => ({ ...p, orden: i })),
      }
    })
  }

  const onPortadaChange = async (e) => {
    const file = e.target.files?.[0] || null
    setError('')

    if (!file) {
      setPortadaFile(null)
      return
    }

    setPortadaProcesando(true)
    try {
      const optimizada = await optimizarImagenFormulario(file)
      setPortadaFile(optimizada)
      setPortadaPreview(URL.createObjectURL(optimizada))
    } catch (err) {
      setPortadaFile(null)
      e.target.value = ''
      setError(err.message || 'No se pudo comprimir la imagen')
    } finally {
      setPortadaProcesando(false)
    }
  }

  const handleGuardar = async () => {
    setSubmitting(true)
    setError('')
    try {
      const payload = {
        titulo: form.titulo,
        descripcion: form.descripcion,
        mensajeAgradecimiento: form.mensajeAgradecimiento,
        activo: form.activo,
        preguntas: form.preguntas.map((p, i) => ({
          id: p.id,
          tipo: p.tipo,
          enunciado: p.enunciado,
          requerida: p.requerida !== false,
          orden: i,
          ...(p.tipo === 'opcion_unica'
            ? { opciones: (p.opciones || []).map((o) => String(o || '')) }
            : {}),
        })),
        portada: portadaFile || undefined,
      }

      let guardado
      if (editandoId) {
        guardado = await actualizarFormulario(editandoId, payload)
      } else {
        guardado = await crearFormulario(payload)
        setExpandidoId(guardado.id)
      }

      setPortadaFile(null)
      setPortadaPreview(guardado.portadaUrl || portadaPreview)
      const siguiente = formDesdeItem(guardado)
      setForm(siguiente)
      setBaselineJson(JSON.stringify(siguiente))
      await cargar()
    } catch (err) {
      setError(err.message || 'No se pudo guardar el formulario')
    } finally {
      setSubmitting(false)
    }
  }

  const copiarLink = async (id) => {
    try {
      await navigator.clipboard.writeText(linkPublicoFormulario(id))
      setCopiadoId(id)
      setTimeout(() => setCopiadoId((prev) => (prev === id ? null : prev)), 2000)
    } catch {
      setError('No se pudo copiar el link')
    }
  }

  const handleConfirmEliminar = async () => {
    if (!eliminarTarget) return
    setEliminando(true)
    setError('')
    try {
      await eliminarFormulario(eliminarTarget.id)
      if (expandidoId === eliminarTarget.id) {
        setExpandidoId(null)
        resetEditor()
      }
      setEliminarTarget(null)
      await cargar()
    } catch (err) {
      setError(err.message || 'No se pudo eliminar')
    } finally {
      setEliminando(false)
    }
  }

  const renderEditor = () => (
    <div className="formularios__panel">
      <div className="formularios__tabs">
        <button
          type="button"
          className={`formularios__tab${pestana === 'formulario' ? ' formularios__tab--activo' : ''}`}
          onClick={() => setPestana('formulario')}
        >
          Formulario
        </button>
        <button
          type="button"
          className={`formularios__tab${pestana === 'respuestas' ? ' formularios__tab--activo' : ''}`}
          onClick={() => setPestana('respuestas')}
          title={
            editandoId
              ? undefined
              : 'Guarda el formulario para ver respuestas'
          }
        >
          Respuestas
        </button>
      </div>

      {/* Se ocultan con CSS (no se desmontan) para no perder el avance al cambiar de pestaña. */}
      <div
        className="formularios__editor"
        hidden={pestana !== 'formulario'}
      >
          {editandoId ? (
            <div className="formularios__link-box">
              <label>Link público</label>
              <div className="formularios__link-row">
                <input type="text" readOnly value={linkPublico} />
                <button type="button" onClick={() => copiarLink(editandoId)}>
                  {copiadoId === editandoId ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </div>
          ) : null}

          <label className="formularios__label">
            Título
            <input
              type="text"
              value={form.titulo}
              onChange={(e) => setCampo('titulo', e.target.value)}
              placeholder="Ej. Encuesta de satisfacción"
              maxLength={160}
            />
          </label>

          <label className="formularios__label">
            Descripción
            <textarea
              value={form.descripcion}
              onChange={(e) => setCampo('descripcion', e.target.value)}
              placeholder="Texto debajo del título en la página pública"
              rows={3}
              maxLength={2000}
            />
          </label>

          <label className="formularios__label">
            Foto de portada
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              onChange={onPortadaChange}
              disabled={portadaProcesando || submitting}
            />
            {portadaProcesando ? (
              <span className="formularios__hint">Comprimiendo imagen…</span>
            ) : (
              <span className="formularios__hint">
                Se comprime automáticamente para cargar rápido
              </span>
            )}
          </label>
          {portadaPreview ? (
            <div className="formularios__portada-preview">
              <img src={portadaPreview} alt="Portada" />
            </div>
          ) : null}

          <label className="formularios__check">
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(e) => setCampo('activo', e.target.checked)}
            />
            Formulario activo (acepta respuestas públicas)
          </label>

          <label className="formularios__label">
            Mensaje de agradecimiento
            <input
              type="text"
              value={form.mensajeAgradecimiento}
              onChange={(e) =>
                setCampo('mensajeAgradecimiento', e.target.value)
              }
              maxLength={400}
            />
          </label>

          <div className="formularios__preguntas-header">
            <h3>Preguntas</h3>
            <div className="formularios__preguntas-actions">
              <button
                type="button"
                className="formularios__btn-add"
                onClick={() => agregarPregunta('abierta')}
              >
                + Abierta
              </button>
              <button
                type="button"
                className="formularios__btn-add"
                onClick={() => agregarPregunta('opcion_unica')}
              >
                + Opción única
              </button>
            </div>
          </div>

          {form.preguntas.length === 0 ? (
            <p className="formularios__vacio">
              Agrega preguntas abiertas (ej. nombre, celular, cédula) u opción
              única. Marca cuáles son obligatorias.
            </p>
          ) : (
            <ul className="formularios__preguntas">
              {form.preguntas.map((p, index) => (
                <li key={p.id} className="formularios__pregunta">
                  <div className="formularios__pregunta-top">
                    <span className="formularios__pregunta-tipo">
                      {p.tipo === 'opcion_unica' ? 'Opción única' : 'Abierta'} ·
                      #{index + 1}
                    </span>
                    <div className="formularios__pregunta-tools">
                      <button
                        type="button"
                        onClick={() => moverPregunta(p.id, -1)}
                        disabled={index === 0}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moverPregunta(p.id, 1)}
                        disabled={index === form.preguntas.length - 1}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className="formularios__btn-texto--danger"
                        onClick={() => quitarPregunta(p.id)}
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    className="formularios__pregunta-enunciado"
                    value={p.enunciado}
                    onChange={(e) =>
                      actualizarPregunta(p.id, {
                        enunciado: e.target.value,
                      })
                    }
                    placeholder="Enunciado de la pregunta"
                    maxLength={500}
                  />
                  <div className="formularios__requerida">
                    <span className="formularios__requerida-label">
                      ¿Obligatoria?
                    </span>
                    <div
                      className="formularios__requerida-toggle"
                      role="group"
                      aria-label="Obligatoriedad de la pregunta"
                    >
                      <button
                        type="button"
                        className={`formularios__requerida-btn${p.requerida !== false ? ' formularios__requerida-btn--on' : ''}`}
                        onClick={() =>
                          actualizarPregunta(p.id, { requerida: true })
                        }
                      >
                        Sí
                      </button>
                      <button
                        type="button"
                        className={`formularios__requerida-btn${p.requerida === false ? ' formularios__requerida-btn--off' : ''}`}
                        onClick={() =>
                          actualizarPregunta(p.id, { requerida: false })
                        }
                      >
                        No
                      </button>
                    </div>
                  </div>
                  {p.tipo === 'opcion_unica' ? (
                    <div className="formularios__opciones">
                      {(p.opciones || []).map((op, oi) => (
                        <div
                          key={`${p.id}_op_${oi}`}
                          className="formularios__opcion-row"
                        >
                          <input
                            type="text"
                            value={op}
                            onChange={(e) => {
                              const next = [...(p.opciones || [])]
                              next[oi] = e.target.value
                              actualizarPregunta(p.id, { opciones: next })
                            }}
                            placeholder={`Opción ${oi + 1}`}
                            maxLength={200}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const next = (p.opciones || []).filter(
                                (_, i) => i !== oi,
                              )
                              actualizarPregunta(p.id, {
                                opciones:
                                  next.length >= 2 ? next : [...next, ''],
                              })
                            }}
                            disabled={(p.opciones || []).length <= 2}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="formularios__btn-add"
                        onClick={() =>
                          actualizarPregunta(p.id, {
                            opciones: [...(p.opciones || []), ''],
                          })
                        }
                      >
                        + Opción
                      </button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
      </div>

      <div
        className="formularios__respuestas"
        hidden={pestana !== 'respuestas'}
      >
        {!editandoId ? (
          <p className="formularios__vacio">
            Guarda el formulario primero para ver respuestas. Tus cambios del
            formulario se mantienen al volver a la otra pestaña.
          </p>
        ) : cargandoRespuestas ? (
          <p className="formularios__cargando">Cargando respuestas…</p>
        ) : respuestas.length === 0 ? (
          <p className="formularios__vacio">Todavía no hay respuestas.</p>
        ) : (
          <ul className="formularios__respuestas-lista">
            {respuestas.map((r, idx) => (
              <li key={r.id} className="formularios__respuesta-item">
                <header>
                  <strong>Envío #{respuestas.length - idx}</strong>
                  <span>{formatearFecha(r.creadoEn)}</span>
                </header>
                <dl>
                  {(r.respuestas || []).map((entry) => {
                    const pregunta = mapaPreguntas.get(entry.preguntaId)
                    return (
                      <div key={`${r.id}_${entry.preguntaId}`}>
                        <dt>{pregunta?.enunciado || entry.preguntaId}</dt>
                        <dd>{String(entry.valor ?? '—')}</dd>
                      </div>
                    )
                  })}
                </dl>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="formularios__panel-actions">
        <button
          type="button"
          className="crear-plan__btn crear-plan__btn--ghost"
          onClick={colapsar}
          disabled={submitting}
        >
          Cerrar card
        </button>
        <button
          type="button"
          className="crear-plan__btn crear-plan__btn--primary"
          onClick={handleGuardar}
          disabled={submitting || portadaProcesando}
        >
          {submitting ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  )

  return (
    <>
      <Modal
        open={open}
        onClose={() => {
          if (submitting) return
          if (!confirmarDescartarSiHayCambios()) return
          onClose?.()
        }}
        title="Formularios / Preguntas"
        className="formularios-modal"
        footer={
          <div className="formularios-modal__footer">
            <button
              type="button"
              className="crear-plan__btn crear-plan__btn--ghost"
              onClick={onClose}
              disabled={submitting}
            >
              Cerrar
            </button>
            <button
              type="button"
              className="crear-plan__btn crear-plan__btn--primary"
              onClick={abrirCrear}
              disabled={submitting || creandoNuevo}
            >
              Crear formulario
            </button>
          </div>
        }
      >
        <div className="formularios">
          {error ? <p className="formularios__error">{error}</p> : null}

          <p className="formularios__intro">
            Despliega una card para editarla. El link público es corto:{' '}
            <code>/f/…</code>
          </p>

          {cargando ? (
            <p className="formularios__cargando">Cargando formularios…</p>
          ) : null}

          <div className="formularios__cards">
            {creandoNuevo ? (
              <article className="formularios__card formularios__card--expandida formularios__card--nueva">
                <button
                  type="button"
                  className="formularios__card-header"
                  onClick={colapsar}
                  aria-expanded="true"
                >
                  <div className="formularios__card-header-main">
                    <span className="formularios__chevron" aria-hidden="true">
                      ▾
                    </span>
                    <div>
                      <h3 className="formularios__card-titulo">
                        Nuevo formulario
                      </h3>
                      <p className="formularios__card-meta">
                        Completa y guarda para publicar el link
                      </p>
                    </div>
                  </div>
                </button>
                <div className="formularios__card-expand">{renderEditor()}</div>
              </article>
            ) : null}

            {!cargando && lista.length === 0 && !creandoNuevo ? (
              <p className="formularios__vacio">
                Aún no hay formularios. Crea el primero.
              </p>
            ) : null}

            {lista.map((item) => {
              const expandida = expandidoId === item.id
              return (
                <article
                  key={item.id}
                  className={`formularios__card${expandida ? ' formularios__card--expandida' : ''}${item.activo === false ? ' formularios__card--inactivo' : ''}`}
                >
                  <button
                    type="button"
                    className="formularios__card-header"
                    onClick={() => toggleExpandir(item)}
                    aria-expanded={expandida}
                  >
                    <div className="formularios__card-header-main">
                      <span className="formularios__chevron" aria-hidden="true">
                        {expandida ? '▾' : '▸'}
                      </span>
                      <div className="formularios__card-thumb">
                        {item.portadaUrl ? (
                          <img src={item.portadaUrl} alt="" />
                        ) : (
                          <span>Sin portada</span>
                        )}
                      </div>
                      <div className="formularios__card-summary">
                        <div className="formularios__card-top">
                          <h3 className="formularios__card-titulo">
                            {item.titulo || 'Sin título'}
                          </h3>
                          <span
                            className={`formularios__badge${item.activo === false ? ' formularios__badge--off' : ''}`}
                          >
                            {item.activo === false ? 'Inactivo' : 'Activo'}
                          </span>
                        </div>
                        <p className="formularios__card-meta">
                          {(item.preguntas || []).length} pregunta
                          {(item.preguntas || []).length === 1 ? '' : 's'} ·{' '}
                          {item.totalRespuestas || 0} respuesta
                          {(item.totalRespuestas || 0) === 1 ? '' : 's'}
                        </p>
                      </div>
                    </div>
                  </button>

                  {!expandida ? (
                    <div className="formularios__card-actions">
                      <button
                        type="button"
                        className="formularios__btn-texto"
                        onClick={() => copiarLink(item.id)}
                      >
                        {copiadoId === item.id ? 'Copiado' : 'Copiar link'}
                      </button>
                      <button
                        type="button"
                        className="formularios__btn-texto formularios__btn-texto--danger"
                        onClick={() => setEliminarTarget(item)}
                      >
                        Eliminar
                      </button>
                    </div>
                  ) : (
                    <div className="formularios__card-expand">
                      {renderEditor()}
                      <div className="formularios__card-actions formularios__card-actions--inner">
                        <button
                          type="button"
                          className="formularios__btn-texto formularios__btn-texto--danger"
                          onClick={() => setEliminarTarget(item)}
                        >
                          Eliminar formulario
                        </button>
                      </div>
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        </div>
      </Modal>

      <ConfirmModal
        open={Boolean(eliminarTarget)}
        onClose={() => {
          if (eliminando) return
          setEliminarTarget(null)
        }}
        onConfirm={handleConfirmEliminar}
        title="Eliminar formulario"
        message={
          eliminarTarget
            ? `¿Eliminar "${eliminarTarget.titulo}"? Se borrarán la portada y todas las respuestas.`
            : ''
        }
        confirmLabel="Eliminar"
        variant="danger"
        loading={eliminando}
      />
    </>
  )
}

export default FormulariosModal
