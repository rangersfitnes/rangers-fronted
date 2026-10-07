import { useEffect, useMemo, useRef, useState } from 'react'
import Modal from './Modal.jsx'
import LoadingOverlay from './LoadingOverlay.jsx'
import { useUsuario } from '../contexts/UsuarioContext.jsx'
import {
  calcularCaloriasDesdeFoto,
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

function CalcularCaloriasModal({ open, onClose, onAbrirDatosCorporales }) {
  const { usuario } = useUsuario()
  const camaraRef = useRef(null)
  const galeriaRef = useRef(null)
  const previewUrlRef = useRef(null)

  const [archivo, setArchivo] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [resultado, setResultado] = useState(null)
  const [historial, setHistorial] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
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

  useEffect(() => {
    if (!open) {
      limpiarPreview()
      setArchivo(null)
      setResultado(null)
      setError('')
      setLoading(false)
      if (camaraRef.current) camaraRef.current.value = ''
      if (galeriaRef.current) galeriaRef.current.value = ''
      return undefined
    }

    setSugerenciaDescartada(false)
    const controller = new AbortController()
    cargarHistorial(controller.signal)
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

  const handleAnalizar = async () => {
    if (!archivo || loading) return
    setLoading(true)
    setError('')
    setResultado(null)
    try {
      const data = await calcularCaloriasDesdeFoto(archivo, {
        pesoKg: perfil.pesoKg,
        alturaCm: perfil.alturaCm,
        edad: perfil.edad,
      })
      setResultado(data)
      await cargarHistorial()
    } catch (err) {
      setError(err.message || 'No se pudieron estimar las calorías')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onClose}
      title="Calcular calorías"
      className="calcular-calorias-modal"
      footer={
        <>
          <button
            type="button"
            className="calcular-calorias__btn calcular-calorias__btn--ghost"
            onClick={onClose}
            disabled={loading}
          >
            Cerrar
          </button>
          <button
            type="button"
            className="calcular-calorias__btn calcular-calorias__btn--primary"
            onClick={handleAnalizar}
            disabled={!archivo || loading}
          >
            {loading ? 'Analizando…' : 'Analizar plato'}
          </button>
        </>
      }
    >
      <p className="calcular-calorias__intro">
        Toma o sube una foto de tu comida. Cada análisis se guarda con fecha y
        hora para personalizar futuros resúmenes según lo que ya comiste.
      </p>

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
        <div className="calcular-calorias__resultado">
          <div className="calcular-calorias__kcal">
            <span className="calcular-calorias__kcal-valor">
              {resultado.caloriasEstimadas}
            </span>
            <span className="calcular-calorias__kcal-unidad">kcal</span>
          </div>
          <h3 className="calcular-calorias__plato">{resultado.plato}</h3>
          <p className="calcular-calorias__meta">
            Rango {resultado.rangoCalorias?.min}–{resultado.rangoCalorias?.max}{' '}
            kcal · Confianza {resultado.confianza}
          </p>
          {resultado.porcionEstimada && (
            <p className="calcular-calorias__porcion">
              Porción: {resultado.porcionEstimada}
            </p>
          )}
          {resultado.macros && (
            <ul className="calcular-calorias__macros">
              <li>Proteínas {resultado.macros.proteinasG} g</li>
              <li>Carbohidratos {resultado.macros.carbohidratosG} g</li>
              <li>Grasas {resultado.macros.grasasG} g</li>
            </ul>
          )}
          {Array.isArray(resultado.alimentosDetectados) &&
            resultado.alimentosDetectados.length > 0 && (
              <p className="calcular-calorias__alimentos">
                Detectado: {resultado.alimentosDetectados.join(', ')}
              </p>
            )}

          {resultado.resumen && (
            <div className="calcular-calorias__resumen">
              {resultado.resumen.comoFunciona && (
                <section>
                  <h4>Cómo funciona en tu cuerpo</h4>
                  <p>{resultado.resumen.comoFunciona}</p>
                </section>
              )}
              {resultado.resumen.beneficios?.length > 0 && (
                <section>
                  <h4>Beneficios</h4>
                  <ul>
                    {resultado.resumen.beneficios.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              )}
              {resultado.resumen.afectaciones?.length > 0 && (
                <section>
                  <h4>En qué podría afectarte</h4>
                  <ul>
                    {resultado.resumen.afectaciones.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </section>
              )}
              {resultado.resumen.personalizado && (
                <section className="calcular-calorias__resumen-personalizado">
                  <h4>Resumen para ti</h4>
                  <p>{resultado.resumen.personalizado}</p>
                </section>
              )}
            </div>
          )}

          {(resultado.fechaLocal || resultado.horaLocal) && (
            <p className="calcular-calorias__notas">
              Registrado: {formatearFechaComida(resultado.fechaLocal, resultado.horaLocal)}
              {resultado.historialUsado > 0
                ? ` · Contexto de ${resultado.historialUsado} comida(s) previa(s)`
                : ''}
            </p>
          )}

          {resultado.notas && (
            <p className="calcular-calorias__notas">{resultado.notas}</p>
          )}
        </div>
      )}

      {historial.length > 0 && (
        <section className="calcular-calorias__historial" aria-label="Comidas registradas">
          <h3 className="calcular-calorias__historial-title">
            Comidas registradas
          </h3>
          <ul className="calcular-calorias__historial-list">
            {historial.map((item) => (
              <li key={item.id} className="calcular-calorias__historial-item">
                <div className="calcular-calorias__historial-main">
                  <span className="calcular-calorias__historial-plato">
                    {item.plato || 'Comida'}
                  </span>
                  <span className="calcular-calorias__historial-kcal">
                    {item.caloriasEstimadas} kcal
                  </span>
                </div>
                <span className="calcular-calorias__historial-meta">
                  {formatearFechaComida(item.fechaLocal, item.horaLocal)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <LoadingOverlay visible={loading} label="Estimando calorías" />
    </Modal>
  )
}

export default CalcularCaloriasModal
