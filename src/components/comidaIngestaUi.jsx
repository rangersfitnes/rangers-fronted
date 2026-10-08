import { useState } from 'react'
import { enviarFeedbackInterpretacion } from '../services/caloriasService.js'

export function formatearFechaComida(fechaLocal, horaLocal) {
  if (!fechaLocal && !horaLocal) return '—'
  if (fechaLocal && horaLocal) return `${fechaLocal} · ${horaLocal}`
  return fechaLocal || horaLocal
}

export function etiquetaEstadoComida(estado) {
  if (estado === 'consumido') return 'Consumido'
  if (estado === 'rechazado') return 'Solo consultado'
  if (estado === 'consultado') return 'Pendiente'
  return 'Consumido'
}

function reconocimientoDudoso(comida) {
  if (!comida) return false
  const confianza = String(comida.confianza || '').toLowerCase()
  if (confianza === 'baja') return true
  const plato = String(comida.plato || '').toLowerCase()
  return (
    plato.includes('no identificado') ||
    plato.includes('no reconoc') ||
    plato.includes('desconocido')
  )
}

function FeedbackInterpretacion({
  comida,
  onGuardado,
  onCorreccionIncorrecta,
  dudoso = false,
}) {
  const comidaId = comida?.registroId || comida?.id
  const feedbackExistente = comida?.feedbackInterpretacion
  const [correcta, setCorrecta] = useState(
    feedbackExistente?.correcta ?? null,
  )
  const [texto, setTexto] = useState(
    feedbackExistente?.platoCorregido ||
      feedbackExistente?.comentario ||
      '',
  )
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [ok, setOk] = useState(Boolean(feedbackExistente))

  if (!comidaId) return null

  if (ok || feedbackExistente) {
    const fb = feedbackExistente
    const fueIncorrecta =
      fb?.correcta === false || (ok && correcta === false)
    return (
      <div
        className={`calcular-calorias__feedback${
          fueIncorrecta
            ? ' calcular-calorias__feedback--correccion'
            : ' calcular-calorias__feedback--ok'
        }`}
      >
        <p>
          {fb?.correcta === true || (ok && correcta === true)
            ? 'Gracias: confirmaste que la interpretación era correcta.'
            : fb?.platoCorregido || (ok && correcta === false && texto)
              ? `Corrección guardada: ${
                  fb?.platoCorregido || texto
                }. Se usará en próximos análisis.`
              : 'Gracias por tu corrección. Se usará en próximos análisis.'}
        </p>
        {fueIncorrecta && (
          <p className="calcular-calorias__feedback-hint">
            Esta foto ya no se puede reanalizar. Toma o sube una foto nueva
            si quieres otro cálculo.
          </p>
        )}
      </div>
    )
  }

  const handleEnviar = async () => {
    if (enviando || correcta === null) return
    const limpio = String(texto || '').trim()
    if (correcta === false && !limpio) {
      setError('Escribe qué alimento era realmente')
      return
    }
    setEnviando(true)
    setError('')
    try {
      const comidaActualizada = await enviarFeedbackInterpretacion(comidaId, {
        correcta,
        platoCorregido: correcta === false ? limpio : '',
        comentario: correcta === true ? limpio : '',
      })
      setOk(true)
      onGuardado?.(comidaActualizada)
      if (correcta === false) {
        onCorreccionIncorrecta?.(comidaActualizada)
      }
    } catch (err) {
      setError(err.message || 'No se pudo guardar la corrección')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div
      className={`calcular-calorias__feedback${
        dudoso ? ' calcular-calorias__feedback--dudoso' : ''
      }`}
    >
      <p className="calcular-calorias__feedback-pregunta">
        {dudoso
          ? 'La detección parece incierta. ¿El alimento es correcto?'
          : '¿La interpretación del alimento fue correcta?'}
      </p>
      {dudoso && (
        <p className="calcular-calorias__feedback-hint">
          Si no coincide, corrige el nombre y luego toma una foto nueva y más
          clara (cerca, buena luz, plato completo). No se puede volver a
          analizar la misma imagen.
        </p>
      )}
      <div className="calcular-calorias__feedback-ops">
        <button
          type="button"
          className={`calcular-calorias__feedback-chip${
            correcta === true ? ' is-active' : ''
          }`}
          onClick={() => {
            setCorrecta(true)
            setError('')
          }}
          disabled={enviando}
        >
          Sí, estaba bien
        </button>
        <button
          type="button"
          className={`calcular-calorias__feedback-chip${
            correcta === false ? ' is-active' : ''
          }`}
          onClick={() => {
            setCorrecta(false)
            setError('')
          }}
          disabled={enviando}
        >
          No, era otra cosa
        </button>
      </div>
      {correcta === false && (
        <label className="calcular-calorias__feedback-label">
          ¿Qué alimento era realmente?
          <textarea
            className="calcular-calorias__feedback-input"
            rows={2}
            maxLength={500}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Ej. papa guisada, no zanahoria"
            disabled={enviando}
          />
        </label>
      )}
      {error && (
        <p className="calcular-calorias__error" role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        className="calcular-calorias__btn calcular-calorias__btn--ghost calcular-calorias__feedback-enviar"
        onClick={handleEnviar}
        disabled={enviando || correcta === null}
      >
        {enviando
          ? 'Guardando…'
          : correcta === false
            ? 'Enviar corrección'
            : 'Confirmar'}
      </button>
    </div>
  )
}

export function DetalleIngesta({
  comida,
  mostrarFeedback = false,
  onFeedbackGuardado,
  onCorreccionIncorrecta,
}) {
  if (!comida) return null

  const resumen = comida.resumen || {}
  const beneficios = Array.isArray(resumen.beneficios)
    ? resumen.beneficios.filter(Boolean)
    : []
  const afectaciones = Array.isArray(resumen.afectaciones)
    ? resumen.afectaciones.filter(Boolean)
    : []
  const alimentos = Array.isArray(comida.alimentosDetectados)
    ? comida.alimentosDetectados.filter(Boolean)
    : []
  const dudoso = reconocimientoDudoso(comida)

  return (
    <div
      className={`calcular-calorias__resultado${
        dudoso ? ' calcular-calorias__resultado--dudoso' : ''
      }`}
    >
      <p className="calcular-calorias__detectado-label">Comida detectada</p>
      <h3 className="calcular-calorias__plato">{comida.plato || 'Comida'}</h3>
      {alimentos.length > 0 && (
        <p className="calcular-calorias__alimentos">{alimentos.join(', ')}</p>
      )}

      {dudoso && (
        <p className="calcular-calorias__aviso-dudoso" role="status">
          No estamos seguros de este alimento. Revisa el resultado: si no
          coincide, indícalo abajo y toma una foto nueva (más cerca y con
          mejor luz). La misma imagen no se puede analizar otra vez.
        </p>
      )}

      <div className="calcular-calorias__kcal">
        <span className="calcular-calorias__kcal-valor">
          {comida.caloriasEstimadas}
        </span>
        <span className="calcular-calorias__kcal-unidad">kcal</span>
      </div>
      {(comida.porcionEstimada || comida.macros) && (
        <p className="calcular-calorias__meta-resumen">
          {[
            comida.porcionEstimada
              ? `Porción: ${comida.porcionEstimada}`
              : null,
            comida.macros
              ? `P ${comida.macros.proteinasG ?? 0}g · C ${comida.macros.carbohidratosG ?? 0}g · G ${comida.macros.grasasG ?? 0}g`
              : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      )}

      {resumen.personalizado && (
        <div className="calcular-calorias__resumen">
          <section className="calcular-calorias__resumen-personalizado">
            <h4>Para ti</h4>
            <p>{resumen.personalizado}</p>
          </section>
        </div>
      )}

      {(beneficios.length > 0 || afectaciones.length > 0) && (
        <div className="calcular-calorias__resumen">
          {beneficios.length > 0 && (
            <section>
              <h4>Beneficios</h4>
              <ul>
                {beneficios.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          )}
          {afectaciones.length > 0 && (
            <section>
              <h4>Afectaciones</h4>
              <ul>
                {afectaciones.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {mostrarFeedback && (
        <FeedbackInterpretacion
          comida={comida}
          dudoso={dudoso}
          onGuardado={onFeedbackGuardado}
          onCorreccionIncorrecta={onCorreccionIncorrecta}
        />
      )}
    </div>
  )
}
