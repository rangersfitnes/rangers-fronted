import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { colors } from '../variables/colors.jsx'
import {
  enviarRespuestaFormularioPublico,
  obtenerFormularioPublico,
} from '../services/formulariosService.js'
import './FormularioPublico.css'

function FormularioPublico() {
  const { id } = useParams()
  const [formulario, setFormulario] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  const [valores, setValores] = useState({})
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [mensajeOk, setMensajeOk] = useState('')

  useEffect(() => {
    if (!id) return undefined
    const controller = new AbortController()
    setCargando(true)
    setError('')
    setEnviado(false)
    setValores({})

    obtenerFormularioPublico(id, { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return
        setFormulario(data)
        const inicial = {}
        for (const p of data.preguntas || []) {
          inicial[p.id] = ''
        }
        setValores(inicial)
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return
        setError(err.message || 'No se pudo cargar el formulario')
        setFormulario(null)
      })
      .finally(() => {
        if (!controller.signal.aborted) setCargando(false)
      })

    return () => controller.abort()
  }, [id])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formulario || enviando) return

    setEnviando(true)
    setError('')
    try {
      const respuestas = (formulario.preguntas || []).map((p) => ({
        preguntaId: p.id,
        valor: String(valores[p.id] ?? '').trim(),
      }))
      const result = await enviarRespuestaFormularioPublico(id, respuestas)
      setMensajeOk(
        result.mensajeAgradecimiento ||
          formulario.mensajeAgradecimiento ||
          '¡Gracias! Recibimos tus respuestas.',
      )
      setEnviado(true)
    } catch (err) {
      setError(err.message || 'No se pudo enviar el formulario')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div
      className="form-publico"
      style={{ backgroundColor: colors.page_background }}
    >
      {formulario?.portadaUrl ? (
        <div className="form-publico__portada">
          <img src={formulario.portadaUrl} alt="" />
          <div className="form-publico__portada-fade" aria-hidden="true" />
        </div>
      ) : (
        <div className="form-publico__portada form-publico__portada--vacia" />
      )}

      <main className="form-publico__main">
        <p className="form-publico__brand">
          <Link to="/">RANGERS</Link>
        </p>

        {cargando ? (
          <p className="form-publico__estado">Cargando formulario…</p>
        ) : error && !formulario ? (
          <div className="form-publico__estado form-publico__estado--error">
            <h1>No disponible</h1>
            <p>{error}</p>
            <Link to="/" className="form-publico__link-home">
              Ir al inicio
            </Link>
          </div>
        ) : enviado ? (
          <div className="form-publico__gracias">
            <h1>Listo</h1>
            <p>{mensajeOk}</p>
            <Link to="/" className="form-publico__link-home">
              Ir al inicio
            </Link>
          </div>
        ) : formulario ? (
          <form className="form-publico__form" onSubmit={handleSubmit}>
            <header className="form-publico__header">
              <h1>{formulario.titulo}</h1>
              {formulario.descripcion ? (
                <p className="form-publico__desc">{formulario.descripcion}</p>
              ) : null}
            </header>

            {(formulario.preguntas || []).map((pregunta) => (
              <fieldset key={pregunta.id} className="form-publico__campo">
                <legend>
                  {pregunta.enunciado}
                  {pregunta.requerida !== false ? (
                    <span className="form-publico__req" aria-hidden="true">
                      *
                    </span>
                  ) : (
                    <span className="form-publico__opt"> (opcional)</span>
                  )}
                </legend>

                {pregunta.tipo === 'opcion_unica' ? (
                  <div className="form-publico__opciones" role="radiogroup">
                    {(pregunta.opciones || []).map((opcion) => {
                      const inputId = `${pregunta.id}_${opcion}`
                      return (
                        <label key={inputId} htmlFor={inputId}>
                          <input
                            id={inputId}
                            type="radio"
                            name={pregunta.id}
                            value={opcion}
                            checked={valores[pregunta.id] === opcion}
                            onChange={() =>
                              setValores((prev) => ({
                                ...prev,
                                [pregunta.id]: opcion,
                              }))
                            }
                            required={pregunta.requerida !== false}
                          />
                          <span>{opcion}</span>
                        </label>
                      )
                    })}
                  </div>
                ) : (
                  <textarea
                    value={valores[pregunta.id] || ''}
                    onChange={(e) =>
                      setValores((prev) => ({
                        ...prev,
                        [pregunta.id]: e.target.value,
                      }))
                    }
                    rows={3}
                    maxLength={2000}
                    required={pregunta.requerida !== false}
                    placeholder="Tu respuesta"
                  />
                )}
              </fieldset>
            ))}

            {error ? <p className="form-publico__error">{error}</p> : null}

            <button
              type="submit"
              className="form-publico__submit"
              disabled={enviando}
            >
              {enviando ? 'Enviando…' : 'Enviar'}
            </button>
          </form>
        ) : null}
      </main>
    </div>
  )
}

export default FormularioPublico
