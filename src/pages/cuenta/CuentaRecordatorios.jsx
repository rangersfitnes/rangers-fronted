import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import LoadingOverlay from '../../components/LoadingOverlay.jsx'
import { DIAS_SEMANA, etiquetaDiaSemana } from '../../constants/diasSemana.js'
import {
  actualizarRecordatorio,
  crearRecordatorio,
  eliminarRecordatorio,
  interpretarRecordatorio,
  obtenerMisRecordatorios,
} from '../../services/userService.js'
import { colors } from '../../variables/colors.jsx'
import './CuentaRecordatorios.css'

const DIAS_TODOS = DIAS_SEMANA.map((d) => d.value)
const ABREV_DIA = {
  lunes: 'L',
  martes: 'M',
  miercoles: 'X',
  jueves: 'J',
  viernes: 'V',
  sabado: 'S',
  domingo: 'D',
}

function previewConNombre(mensaje) {
  return String(mensaje || '')
    .replaceAll('{nombre}', 'atleta')
    .trim()
}

function CuentaRecordatorios() {
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [peticion, setPeticion] = useState('')
  const [borrador, setBorrador] = useState(null)
  const [editandoId, setEditandoId] = useState(null)
  const [interpretando, setInterpretando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [errorForm, setErrorForm] = useState('')
  const [accionId, setAccionId] = useState(null)

  const cargar = useCallback(async (signal) => {
    setLoading(true)
    setError('')
    try {
      const data = await obtenerMisRecordatorios({ signal })
      setLista(data)
    } catch (err) {
      if (err?.name === 'AbortError') return
      setError(err.message || 'No se pudieron cargar los recordatorios')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    cargar(controller.signal)
    return () => controller.abort()
  }, [cargar])

  const resetFlujo = () => {
    setPeticion('')
    setBorrador(null)
    setEditandoId(null)
    setErrorForm('')
  }

  const handleInterpretar = async (e) => {
    e.preventDefault()
    setErrorForm('')
    setInterpretando(true)
    try {
      const interpretado = await interpretarRecordatorio(peticion.trim())
      setBorrador({
        titulo: interpretado.titulo,
        mensaje: interpretado.mensaje || interpretado.mensajeRex,
        hora: interpretado.hora,
        dias: interpretado.dias?.length ? interpretado.dias : [...DIAS_TODOS],
        activo: true,
        peticionOriginal: interpretado.peticionOriginal || peticion.trim(),
        resumen: interpretado.resumen || '',
      })
      setEditandoId(null)
    } catch (err) {
      setErrorForm(err.message || 'Rex no pudo interpretar eso')
      setBorrador(null)
    } finally {
      setInterpretando(false)
    }
  }

  const toggleDia = (dia) => {
    setBorrador((prev) => {
      if (!prev) return prev
      const tiene = prev.dias.includes(dia)
      const dias = tiene
        ? prev.dias.filter((d) => d !== dia)
        : [...prev.dias, dia]
      return { ...prev, dias }
    })
  }

  const abrirEdicion = (item) => {
    setEditandoId(item.id)
    setPeticion(item.peticionOriginal || '')
    setBorrador({
      titulo: item.titulo || '',
      mensaje: item.mensaje || '',
      hora: item.hora || '07:00',
      dias:
        Array.isArray(item.dias) && item.dias.length
          ? [...item.dias]
          : [...DIAS_TODOS],
      activo: item.activo !== false,
      peticionOriginal: item.peticionOriginal || '',
      resumen: '',
    })
    setErrorForm('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleGuardar = async (e) => {
    e.preventDefault()
    if (!borrador) return
    setErrorForm('')
    setGuardando(true)
    try {
      const payload = {
        titulo: borrador.titulo.trim(),
        mensaje: borrador.mensaje.trim(),
        hora: borrador.hora,
        dias: borrador.dias,
        activo: borrador.activo,
        peticionOriginal: borrador.peticionOriginal || peticion.trim() || undefined,
      }
      if (editandoId) {
        const actualizado = await actualizarRecordatorio(editandoId, payload)
        setLista((prev) =>
          prev.map((r) => (r.id === actualizado.id ? actualizado : r)),
        )
      } else {
        const creado = await crearRecordatorio(payload)
        setLista((prev) => [creado, ...prev])
      }
      resetFlujo()
    } catch (err) {
      setErrorForm(err.message || 'No se pudo guardar')
    } finally {
      setGuardando(false)
    }
  }

  const handleToggleActivo = async (item) => {
    setAccionId(item.id)
    try {
      const actualizado = await actualizarRecordatorio(item.id, {
        titulo: item.titulo,
        mensaje: item.mensaje,
        hora: item.hora,
        dias: item.dias,
        activo: !item.activo,
        peticionOriginal: item.peticionOriginal || undefined,
      })
      setLista((prev) =>
        prev.map((r) => (r.id === actualizado.id ? actualizado : r)),
      )
    } catch (err) {
      setError(err.message || 'No se pudo actualizar')
    } finally {
      setAccionId(null)
    }
  }

  const handleEliminar = async (item) => {
    if (!window.confirm(`¿Eliminar el recordatorio "${item.titulo}"?`)) return
    setAccionId(item.id)
    try {
      await eliminarRecordatorio(item.id)
      setLista((prev) => prev.filter((r) => r.id !== item.id))
      if (editandoId === item.id) resetFlujo()
    } catch (err) {
      setError(err.message || 'No se pudo eliminar')
    } finally {
      setAccionId(null)
    }
  }

  const mostrarLista = !loading && !error
  const ocupado = loading || interpretando || guardando

  return (
    <main
      className="recordatorios-page"
      style={{ backgroundColor: colors.page_background }}
      aria-label="Recordatorios de Rex"
    >
      <div className="recordatorios-page__glow" aria-hidden="true" />
      <LoadingOverlay visible={ocupado} />

      <div className="recordatorios-page__inner">
        <Link to="/" className="recordatorios-page__back">
          ← Volver al inicio
        </Link>

        <header className="recordatorios-hero">
          <p className="recordatorios-hero__eyebrow">Rex · WhatsApp</p>
          <h1 className="recordatorios-hero__title">Recordatorios</h1>
          <p className="recordatorios-hero__sub">
            Dile a Rex qué quieres que te recuerde, en tus palabras. Él lo
            interpreta y te escribe por WhatsApp con su tono de coach.
          </p>
        </header>

        <form className="recordatorios-form" onSubmit={handleInterpretar}>
          <h2 className="recordatorios-form__title">
            {editandoId ? 'Reescribir o ajustar' : 'Nueva petición'}
          </h2>

          <label className="recordatorios-field">
            <span>Petición en lenguaje natural</span>
            <textarea
              rows={3}
              maxLength={500}
              value={peticion}
              onChange={(e) => setPeticion(e.target.value)}
              placeholder="Ej. Tomarme la creatina todos los días a las 7 am"
              required={!borrador || !editandoId}
            />
          </label>

          <div className="recordatorios-form__actions">
            <button
              type="submit"
              className="recordatorios-btn"
              disabled={interpretando || !peticion.trim()}
            >
              {interpretando ? 'Interpretando…' : 'Que Rex lo interprete'}
            </button>
          </div>
        </form>

        {borrador && (
          <form className="recordatorios-form recordatorios-form--confirm" onSubmit={handleGuardar}>
            <h2 className="recordatorios-form__title">Así lo enviará Rex</h2>
            {borrador.resumen && (
              <p className="recordatorios-resumen">{borrador.resumen}</p>
            )}

            <p className="recordatorios-preview" aria-live="polite">
              <em>{previewConNombre(borrador.mensaje)}</em>
            </p>

            <label className="recordatorios-field">
              <span>Título</span>
              <input
                type="text"
                maxLength={80}
                value={borrador.titulo}
                onChange={(e) =>
                  setBorrador((prev) => ({ ...prev, titulo: e.target.value }))
                }
                required
              />
            </label>

            <label className="recordatorios-field">
              <span>Mensaje de Rex (puedes ajustar el tono)</span>
              <textarea
                rows={3}
                maxLength={400}
                value={borrador.mensaje}
                onChange={(e) =>
                  setBorrador((prev) => ({ ...prev, mensaje: e.target.value }))
                }
                required
              />
              <span className="recordatorios-field__hint">
                Usa {'{nombre}'} para el primer nombre del atleta.
              </span>
            </label>

            <label className="recordatorios-field">
              <span>Hora (Colombia)</span>
              <input
                type="time"
                value={borrador.hora}
                onChange={(e) =>
                  setBorrador((prev) => ({ ...prev, hora: e.target.value }))
                }
                required
              />
            </label>

            <fieldset className="recordatorios-dias">
              <legend>Días</legend>
              <div className="recordatorios-dias__row">
                {DIAS_SEMANA.map((d) => {
                  const on = borrador.dias.includes(d.value)
                  return (
                    <button
                      key={d.value}
                      type="button"
                      className={`recordatorios-dias__chip${on ? ' is-on' : ''}`}
                      aria-pressed={on}
                      onClick={() => toggleDia(d.value)}
                      title={d.label}
                    >
                      {ABREV_DIA[d.value] || d.label[0]}
                    </button>
                  )
                })}
                <button
                  type="button"
                  className="recordatorios-dias__todos"
                  onClick={() =>
                    setBorrador((prev) => ({ ...prev, dias: [...DIAS_TODOS] }))
                  }
                >
                  Todos
                </button>
              </div>
            </fieldset>

            <label className="recordatorios-switch">
              <input
                type="checkbox"
                checked={borrador.activo}
                onChange={(e) =>
                  setBorrador((prev) => ({
                    ...prev,
                    activo: e.target.checked,
                  }))
                }
              />
              <span>Activo (Rex enviará el mensaje)</span>
            </label>

            {errorForm && (
              <p className="recordatorios-page__error" role="alert">
                {errorForm}
              </p>
            )}

            <div className="recordatorios-form__actions">
              <button
                type="button"
                className="recordatorios-btn recordatorios-btn--ghost"
                onClick={resetFlujo}
                disabled={guardando}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="recordatorios-btn"
                disabled={guardando}
              >
                {editandoId ? 'Guardar cambios' : 'Activar recordatorio'}
              </button>
            </div>
          </form>
        )}

        {!borrador && errorForm && (
          <p className="recordatorios-page__error" role="alert">
            {errorForm}
          </p>
        )}

        {error && (
          <p className="recordatorios-page__error" role="alert">
            {error}
          </p>
        )}

        {mostrarLista && (
          <section className="recordatorios-lista" aria-label="Tus recordatorios">
            <h2 className="recordatorios-lista__title">
              Tus recordatorios ({lista.length})
            </h2>

            {lista.length === 0 ? (
              <p className="recordatorios-lista__vacio">
                Aún no tienes recordatorios. Prueba con: “Tomarme la creatina
                todos los días a las 7 am”.
              </p>
            ) : (
              <ul className="recordatorios-lista__ul">
                {lista.map((item) => (
                  <li
                    key={item.id}
                    className={`recordatorios-card${item.activo ? '' : ' is-off'}`}
                  >
                    <div className="recordatorios-card__top">
                      <h3>{item.titulo}</h3>
                      <span
                        className={`recordatorios-card__badge${item.activo ? ' is-on' : ''}`}
                      >
                        {item.activo ? 'Activo' : 'Pausado'}
                      </span>
                    </div>
                    {item.peticionOriginal && (
                      <p className="recordatorios-card__peticion">
                        “{item.peticionOriginal}”
                      </p>
                    )}
                    <p className="recordatorios-card__msg">
                      {previewConNombre(item.mensaje)}
                    </p>
                    <p className="recordatorios-card__meta">
                      {item.hora} ·{' '}
                      {item.dias?.length === 7
                        ? 'Todos los días'
                        : (item.dias || [])
                            .map((d) => etiquetaDiaSemana(d))
                            .join(', ')}
                    </p>
                    <div className="recordatorios-card__actions">
                      <button
                        type="button"
                        className="recordatorios-btn recordatorios-btn--ghost"
                        disabled={accionId === item.id}
                        onClick={() => handleToggleActivo(item)}
                      >
                        {item.activo ? 'Pausar' : 'Activar'}
                      </button>
                      <button
                        type="button"
                        className="recordatorios-btn recordatorios-btn--ghost"
                        disabled={accionId === item.id}
                        onClick={() => abrirEdicion(item)}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="recordatorios-btn recordatorios-btn--danger"
                        disabled={accionId === item.id}
                        onClick={() => handleEliminar(item)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </main>
  )
}

export default CuentaRecordatorios
