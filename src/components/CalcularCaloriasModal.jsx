import { useEffect, useMemo, useRef, useState } from 'react'
import Modal from './Modal.jsx'
import LoadingOverlay from './LoadingOverlay.jsx'
import { useUsuario } from '../contexts/UsuarioContext.jsx'
import {
  calcularCaloriasDesdeFoto,
  decidirComidaAnalizada,
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

function DetalleIngesta({ comida, mostrarRegistro = true, historialUsado }) {
  if (!comida) return null

  return (
    <div className="calcular-calorias__resultado">
      <div className="calcular-calorias__kcal">
        <span className="calcular-calorias__kcal-valor">
          {comida.caloriasEstimadas}
        </span>
        <span className="calcular-calorias__kcal-unidad">kcal</span>
      </div>
      <h3 className="calcular-calorias__plato">{comida.plato || 'Comida'}</h3>
      {(comida.rangoCalorias || comida.confianza) && (
        <p className="calcular-calorias__meta">
          {comida.rangoCalorias
            ? `Rango ${comida.rangoCalorias.min}–${comida.rangoCalorias.max} kcal`
            : null}
          {comida.rangoCalorias && comida.confianza ? ' · ' : null}
          {comida.confianza ? `Confianza ${comida.confianza}` : null}
        </p>
      )}
      {comida.porcionEstimada && (
        <p className="calcular-calorias__porcion">
          Porción: {comida.porcionEstimada}
        </p>
      )}
      {comida.macros && (
        <ul className="calcular-calorias__macros">
          <li>Proteínas {comida.macros.proteinasG ?? 0} g</li>
          <li>Carbohidratos {comida.macros.carbohidratosG ?? 0} g</li>
          <li>Grasas {comida.macros.grasasG ?? 0} g</li>
        </ul>
      )}
      {Array.isArray(comida.alimentosDetectados) &&
        comida.alimentosDetectados.length > 0 && (
          <p className="calcular-calorias__alimentos">
            Detectado: {comida.alimentosDetectados.join(', ')}
          </p>
        )}

      {comida.resumen && (
        <div className="calcular-calorias__resumen">
          {comida.resumen.comoFunciona && (
            <section>
              <h4>Cómo funciona en tu cuerpo</h4>
              <p>{comida.resumen.comoFunciona}</p>
            </section>
          )}
          {comida.resumen.beneficios?.length > 0 && (
            <section>
              <h4>Beneficios</h4>
              <ul>
                {comida.resumen.beneficios.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          )}
          {comida.resumen.afectaciones?.length > 0 && (
            <section>
              <h4>En qué podría afectarte</h4>
              <ul>
                {comida.resumen.afectaciones.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          )}
          {comida.resumen.personalizado && (
            <section className="calcular-calorias__resumen-personalizado">
              <h4>Resumen para ti</h4>
              <p>{comida.resumen.personalizado}</p>
            </section>
          )}
        </div>
      )}

      {mostrarRegistro && (comida.fechaLocal || comida.horaLocal) && (
        <p className="calcular-calorias__notas">
          Registrado:{' '}
          {formatearFechaComida(comida.fechaLocal, comida.horaLocal)}
          {historialUsado > 0
            ? ` · Contexto de ${historialUsado} comida(s) previa(s)`
            : ''}
        </p>
      )}

      {comida.notas && (
        <p className="calcular-calorias__notas">{comida.notas}</p>
      )}
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
            historialUsado={resultado.historialUsado}
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
                      <DetalleIngesta comida={item} mostrarRegistro={false} />
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
