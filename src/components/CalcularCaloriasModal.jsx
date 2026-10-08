import { useEffect, useMemo, useRef, useState } from 'react'
import Modal from './Modal.jsx'
import LoadingOverlay from './LoadingOverlay.jsx'
import { useUsuario } from '../contexts/UsuarioContext.jsx'
import {
  calcularCaloriasDesdeFoto,
  decidirComidaAnalizada,
  enviarFeedbackInterpretacion,
  obtenerCupoAnalisisDiario,
  obtenerMisComidas,
} from '../services/caloriasService.js'
import {
  faltanDatosCorporales,
  perfilCorporalCompleto,
} from '../utils/datosCorporales.js'
import './CalcularCaloriasModal.css'

function formatearFechaComida(fechaLocal, horaLocal) {
  if (!fechaLocal && !horaLocal) return '—'
  if (fechaLocal && horaLocal) return `${fechaLocal} · ${horaLocal}`
  return fechaLocal || horaLocal
}

function etiquetaEstadoComida(estado) {
  if (estado === 'consumido') return 'Consumido'
  if (estado === 'rechazado') return 'Solo consultado'
  if (estado === 'consultado') return 'Pendiente'
  return 'Consumido'
}

function DetalleIngesta({
  comida,
  mostrarFeedback = false,
  onFeedbackGuardado,
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

  return (
    <div className="calcular-calorias__resultado">
      <p className="calcular-calorias__detectado-label">Comida detectada</p>
      <h3 className="calcular-calorias__plato">{comida.plato || 'Comida'}</h3>
      {alimentos.length > 0 && (
        <p className="calcular-calorias__alimentos">{alimentos.join(', ')}</p>
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
          onGuardado={onFeedbackGuardado}
        />
      )}
    </div>
  )
}

function FeedbackInterpretacion({ comida, onGuardado }) {
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
    return (
      <div className="calcular-calorias__feedback calcular-calorias__feedback--ok">
        <p>
          {fb?.correcta === true || (ok && correcta === true)
            ? 'Gracias: confirmaste que la interpretación era correcta.'
            : fb?.platoCorregido
              ? `Corrección guardada: ${fb.platoCorregido}. Se usará en próximos análisis.`
              : 'Gracias por tu corrección. Se usará en próximos análisis.'}
        </p>
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
    } catch (err) {
      setError(err.message || 'No se pudo guardar la corrección')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="calcular-calorias__feedback">
      <p className="calcular-calorias__feedback-pregunta">
        ¿La interpretación del alimento fue correcta?
      </p>
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

function CalcularCaloriasModal({ open, onClose, onAbrirDatosCorporales }) {
  const { usuario } = useUsuario()
  const camaraRef = useRef(null)
  const galeriaRef = useRef(null)
  const previewUrlRef = useRef(null)

  const [archivo, setArchivo] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [resultado, setResultado] = useState(null)
  const [historial, setHistorial] = useState([])
  const [comidaExpandidaId, setComidaExpandidaId] = useState(null)
  const [cupo, setCupo] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [decidiendo, setDecidiendo] = useState(false)
  const [sugerenciaDescartada, setSugerenciaDescartada] = useState(false)

  const perfil = useMemo(() => perfilCorporalCompleto(usuario), [usuario])
  const faltanDatos = faltanDatosCorporales(usuario)
  const mostrarSugerencia = open && faltanDatos && !sugerenciaDescartada

  const limpiarPreview = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }
    setPreviewUrl('')
  }

  const cargarHistorial = async (signal) => {
    try {
      const comidas = await obtenerMisComidas({ signal, limite: 12 })
      if (!signal?.aborted) setHistorial(comidas)
    } catch (err) {
      if (err?.name === 'AbortError') return
      console.warn('[calorias] historial:', err.message)
    }
  }

  const cargarCupo = async (signal) => {
    try {
      const data = await obtenerCupoAnalisisDiario({ signal })
      if (!signal?.aborted) setCupo(data)
    } catch (err) {
      if (err?.name === 'AbortError') return
      console.warn('[calorias] cupo:', err.message)
    }
  }

  useEffect(() => {
    if (!open) {
      limpiarPreview()
      setArchivo(null)
      setResultado(null)
      setError('')
      setLoading(false)
      setDecidiendo(false)
      setCupo(null)
      setComidaExpandidaId(null)
      if (camaraRef.current) camaraRef.current.value = ''
      if (galeriaRef.current) galeriaRef.current.value = ''
      return undefined
    }

    setSugerenciaDescartada(false)
    setComidaExpandidaId(null)
    const controller = new AbortController()
    cargarHistorial(controller.signal)
    cargarCupo(controller.signal)
    return () => controller.abort()
  }, [open])

  useEffect(() => () => limpiarPreview(), [])

  const asignarArchivo = (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('El archivo debe ser una imagen')
      return
    }
    limpiarPreview()
    const url = URL.createObjectURL(file)
    previewUrlRef.current = url
    setPreviewUrl(url)
    setArchivo(file)
    setResultado(null)
    setError('')
  }

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]
    asignarArchivo(file)
  }

  const sinCupo = Boolean(cupo && cupo.restantes <= 0)

  const handleAnalizar = async () => {
    if (!archivo || loading || sinCupo) return
    setLoading(true)
    setError('')
    setResultado(null)
    try {
      const data = await calcularCaloriasDesdeFoto(archivo, {
        pesoKg: perfil.pesoKg,
        alturaCm: perfil.alturaCm,
        edad: perfil.edad,
      })
      setResultado({
        ...data,
        estado: data.estado || 'consultado',
        id: data.registroId || data.id || null,
      })
      if (data.cupo) setCupo(data.cupo)
      else await cargarCupo()
      await cargarHistorial()
    } catch (err) {
      setError(err.message || 'No se pudieron estimar las calorías')
      await cargarCupo()
    } finally {
      setLoading(false)
    }
  }

  const handleDecision = async (decision) => {
    const comidaId = resultado?.registroId || resultado?.id
    if (!comidaId || decidiendo || loading) return
    setDecidiendo(true)
    setError('')
    try {
      const comida = await decidirComidaAnalizada(comidaId, decision)
      setResultado((prev) =>
        prev
          ? {
              ...prev,
              ...comida,
              registroId: comida.id,
              estado: comida.estado,
            }
          : prev,
      )
      await cargarHistorial()
    } catch (err) {
      setError(err.message || 'No se pudo guardar la decisión')
    } finally {
      setDecidiendo(false)
    }
  }

  const pendienteDecision =
    Boolean(resultado) &&
    (resultado.estado === 'consultado' || !resultado.estado) &&
    Boolean(resultado.registroId || resultado.id)

  return (
    <Modal
      open={open}
      onClose={loading || decidiendo ? undefined : onClose}
      title="Calcular calorías"
      className="calcular-calorias-modal"
      footer={
        <>
          <button
            type="button"
            className="calcular-calorias__btn calcular-calorias__btn--ghost"
            onClick={onClose}
            disabled={loading || decidiendo}
          >
            Cerrar
          </button>
          {pendienteDecision ? (
            <>
              <button
                type="button"
                className="calcular-calorias__btn calcular-calorias__btn--reject"
                onClick={() => handleDecision('rechazado')}
                disabled={decidiendo}
              >
                {decidiendo ? 'Guardando…' : 'No lo consumí'}
              </button>
              <button
                type="button"
                className="calcular-calorias__btn calcular-calorias__btn--primary"
                onClick={() => handleDecision('consumido')}
                disabled={decidiendo}
              >
                {decidiendo ? 'Guardando…' : 'Sí, lo consumí'}
              </button>
            </>
          ) : (
            <button
              type="button"
              className="calcular-calorias__btn calcular-calorias__btn--primary"
              onClick={handleAnalizar}
              disabled={!archivo || loading || sinCupo}
            >
              {loading ? 'Analizando…' : 'Analizar plato'}
            </button>
          )}
        </>
      }
    >
      <p className="calcular-calorias__intro">
        Toma o sube una foto de tu comida. Tras el análisis elige si la
        consumiste o solo la consultaste; así el historial separa consultas y
        ingestas reales.
      </p>

      {cupo && (
        <p className={`calcular-calorias__cupo${sinCupo ? ' calcular-calorias__cupo--agotado' : ''}`}>
          {sinCupo
            ? `Límite diario alcanzado (${cupo.limite}/día). Vuelve mañana.`
            : `Análisis hoy: ${cupo.cantidad}/${cupo.limite} · Te quedan ${cupo.restantes}`}
        </p>
      )}

      {mostrarSugerencia && (
        <div className="calcular-calorias__sugerencia" role="status">
          <p>
            Para un resumen más personalizado, completa tu peso
            {perfil.tieneFechaNacimiento ? ' y altura' : ', altura y edad'}.
            {perfil.tieneFechaNacimiento
              ? ' Tu edad se calcula con la fecha de nacimiento del registro.'
              : ''}
          </p>
          <div className="calcular-calorias__sugerencia-acciones">
            <button
              type="button"
              className="calcular-calorias__btn calcular-calorias__btn--primary"
              onClick={() => onAbrirDatosCorporales?.()}
              disabled={loading}
            >
              Completar datos
            </button>
            <button
              type="button"
              className="calcular-calorias__btn calcular-calorias__btn--ghost"
              onClick={() => setSugerenciaDescartada(true)}
              disabled={loading}
            >
              Continuar sin datos
            </button>
          </div>
        </div>
      )}

      {!faltanDatos && (
        <p className="calcular-calorias__perfil-ok">
          Usando tu perfil: {perfil.pesoKg} kg · {perfil.alturaCm} cm ·{' '}
          {perfil.edad} años
        </p>
      )}

      <div className="calcular-calorias__acciones">
        <button
          type="button"
          className="calcular-calorias__accion"
          onClick={() => camaraRef.current?.click()}
          disabled={loading}
        >
          Abrir cámara
        </button>
        <button
          type="button"
          className="calcular-calorias__accion calcular-calorias__accion--secondary"
          onClick={() => galeriaRef.current?.click()}
          disabled={loading}
        >
          Subir foto
        </button>
      </div>

      <input
        ref={camaraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="calcular-calorias__input-file"
        onChange={handleFileChange}
      />
      <input
        ref={galeriaRef}
        type="file"
        accept="image/*"
        className="calcular-calorias__input-file"
        onChange={handleFileChange}
      />

      {previewUrl ? (
        <div className="calcular-calorias__preview-wrap">
          <img
            src={previewUrl}
            alt="Vista previa del alimento"
            className="calcular-calorias__preview"
          />
        </div>
      ) : (
        <div className="calcular-calorias__placeholder">
          Aún no hay foto. Usa la cámara o sube una imagen.
        </div>
      )}

      {error && (
        <p className="calcular-calorias__error" role="alert">
          {error}
        </p>
      )}

      {resultado && (
        <>
          <DetalleIngesta
            comida={resultado}
            mostrarFeedback
            onFeedbackGuardado={(comida) => {
              setResultado((prev) =>
                prev
                  ? {
                      ...prev,
                      ...comida,
                      registroId: comida.id || prev.registroId,
                    }
                  : prev,
              )
              cargarHistorial()
            }}
          />
          {pendienteDecision ? (
            <div className="calcular-calorias__decision" role="status">
              <p>
                ¿Consumiste este plato? Confirma para registrarlo en tu
                historial de ingestas, o márcalo como solo consulta.
              </p>
            </div>
          ) : resultado.estado === 'consumido' ? (
            <p className="calcular-calorias__decision-ok">
              Registrado como consumido.
            </p>
          ) : resultado.estado === 'rechazado' ? (
            <p className="calcular-calorias__decision-ok">
              Guardado como consulta (no consumido).
            </p>
          ) : null}
        </>
      )}

      {historial.length > 0 && (
        <section className="calcular-calorias__historial" aria-label="Comidas registradas">
          <h3 className="calcular-calorias__historial-title">
            Consultas e ingestas
          </h3>
          <p className="calcular-calorias__historial-hint">
            Toca una comida para ver el detalle. Solo las consumidas alimentan
            futuros resúmenes.
          </p>
          <ul className="calcular-calorias__historial-list">
            {historial.map((item) => {
              const expandida = comidaExpandidaId === item.id
              const estado = item.estado || 'consumido'
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`calcular-calorias__historial-item${
                      expandida
                        ? ' calcular-calorias__historial-item--abierta'
                        : ''
                    }`}
                    onClick={() =>
                      setComidaExpandidaId((actual) =>
                        actual === item.id ? null : item.id,
                      )
                    }
                    aria-expanded={expandida}
                  >
                    <div className="calcular-calorias__historial-main">
                      <span className="calcular-calorias__historial-plato">
                        {item.plato || 'Comida'}
                      </span>
                      <span className="calcular-calorias__historial-kcal">
                        {item.caloriasEstimadas} kcal
                      </span>
                    </div>
                    <span className="calcular-calorias__historial-meta">
                      <span>
                        {formatearFechaComida(item.fechaLocal, item.horaLocal)}
                        <span
                          className={`calcular-calorias__estado calcular-calorias__estado--${estado}`}
                        >
                          {etiquetaEstadoComida(estado)}
                        </span>
                      </span>
                      <span className="calcular-calorias__historial-chevron" aria-hidden="true">
                        {expandida ? '▴' : '▾'}
                      </span>
                    </span>
                  </button>
                  {expandida && (
                    <div className="calcular-calorias__historial-detalle">
                      <DetalleIngesta
                        comida={item}
                        mostrarFeedback={!item.feedbackInterpretacion}
                        onFeedbackGuardado={(comida) => {
                          setHistorial((prev) =>
                            prev.map((row) =>
                              row.id === comida.id ? { ...row, ...comida } : row,
                            ),
                          )
                        }}
                      />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <LoadingOverlay
        visible={loading || decidiendo}
        label={decidiendo ? 'Guardando decisión' : 'Estimando calorías'}
      />
    </Modal>
  )
}

export default CalcularCaloriasModal
