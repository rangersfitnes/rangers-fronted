import { useEffect, useMemo, useRef, useState } from 'react'
import Modal from './Modal.jsx'
import LoadingOverlay from './LoadingOverlay.jsx'
import { useUsuario } from '../contexts/UsuarioContext.jsx'
import {
  calcularCaloriasDesdeFoto,
  decidirComidaAnalizada,
  obtenerCupoAnalisisDiario,
} from '../services/caloriasService.js'
import {
  faltanDatosCorporales,
  perfilCorporalCompleto,
} from '../utils/datosCorporales.js'
import { DetalleIngesta } from './comidaIngestaUi.jsx'
import './CalcularCaloriasModal.css'

function huellaArchivo(file) {
  if (!file) return ''
  return `${file.name}|${file.size}|${file.lastModified}|${file.type}`
}

function CalcularCaloriasModal({
  open,
  onClose,
  onAbrirDatosCorporales,
  onAbrirIngestas,
}) {
  const { usuario } = useUsuario()
  const camaraRef = useRef(null)
  const galeriaRef = useRef(null)
  const previewUrlRef = useRef(null)
  const fotosAnalizadasRef = useRef(new Set())
  /** Candado síncrono: setLoading no alcanza a bloquear doble clic. */
  const analizandoRef = useRef(false)
  const decidiendoRef = useRef(false)

  const [archivo, setArchivo] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [fotoListaParaAnalisis, setFotoListaParaAnalisis] = useState(false)
  const [resultado, setResultado] = useState(null)
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

  const resetInputsArchivo = () => {
    if (camaraRef.current) camaraRef.current.value = ''
    if (galeriaRef.current) galeriaRef.current.value = ''
  }

  const liberarFotoPendiente = () => {
    limpiarPreview()
    setArchivo(null)
    setFotoListaParaAnalisis(false)
    resetInputsArchivo()
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
      liberarFotoPendiente()
      setResultado(null)
      setError('')
      setLoading(false)
      setDecidiendo(false)
      analizandoRef.current = false
      decidiendoRef.current = false
      setCupo(null)
      fotosAnalizadasRef.current = new Set()
      return undefined
    }

    setSugerenciaDescartada(false)
    const controller = new AbortController()
    cargarCupo(controller.signal)
    return () => controller.abort()
  }, [open])

  useEffect(() => () => limpiarPreview(), [])

  const asignarArchivo = (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('El archivo debe ser una imagen')
      resetInputsArchivo()
      return
    }

    const huella = huellaArchivo(file)
    if (fotosAnalizadasRef.current.has(huella)) {
      setError(
        'Esta foto ya fue analizada. Toma o sube una foto nueva para otro cálculo.',
      )
      resetInputsArchivo()
      return
    }

    limpiarPreview()
    const url = URL.createObjectURL(file)
    previewUrlRef.current = url
    setPreviewUrl(url)
    setArchivo(file)
    setFotoListaParaAnalisis(true)
    setResultado(null)
    setError('')
  }

  const handleFileChange = (event) => {
    const file = event.target.files?.[0]
    asignarArchivo(file)
  }

  const sinCupo = Boolean(cupo && cupo.restantes <= 0)
  const puedeAnalizar =
    Boolean(archivo) && fotoListaParaAnalisis && !loading && !sinCupo

  const handleAnalizar = async () => {
    if (!puedeAnalizar || analizandoRef.current || decidiendoRef.current) return
    const huella = huellaArchivo(archivo)
    // Marca la huella al iniciar para bloquear re-análisis concurrente.
    if (huella) {
      if (fotosAnalizadasRef.current.has(huella)) {
        setError(
          'Esta foto ya fue analizada. Toma o sube una foto nueva para otro cálculo.',
        )
        return
      }
      fotosAnalizadasRef.current.add(huella)
    }

    analizandoRef.current = true
    setLoading(true)
    setError('')
    setResultado(null)
    try {
      const data = await calcularCaloriasDesdeFoto(archivo, {
        pesoKg: perfil.pesoKg,
        alturaCm: perfil.alturaCm,
        edad: perfil.edad,
      })
      liberarFotoPendiente()
      setResultado({
        ...data,
        estado: data.estado || 'consultado',
        id: data.registroId || data.id || null,
      })
      if (data.cupo) setCupo(data.cupo)
      else await cargarCupo()
    } catch (err) {
      // Si falló, permite reintentar la misma foto.
      if (huella) fotosAnalizadasRef.current.delete(huella)
      setError(err.message || 'No se pudieron estimar las calorías')
      await cargarCupo()
    } finally {
      analizandoRef.current = false
      setLoading(false)
    }
  }

  const handleDecision = async (decision) => {
    const comidaId = resultado?.registroId || resultado?.id
    if (!comidaId || decidiendo || loading || decidiendoRef.current) return
    decidiendoRef.current = true
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
      liberarFotoPendiente()
    } catch (err) {
      setError(err.message || 'No se pudo guardar la decisión')
    } finally {
      decidiendoRef.current = false
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
              disabled={!puedeAnalizar}
              title={
                resultado && !fotoListaParaAnalisis
                  ? 'Toma o sube una foto nueva para analizar'
                  : undefined
              }
            >
              {loading
                ? 'Analizando…'
                : fotoListaParaAnalisis
                  ? 'Analizar plato'
                  : 'Elige una foto nueva'}
            </button>
          )}
        </>
      }
    >
      <p className="calcular-calorias__intro">
        Toma o sube una foto de tu comida. Cada foto solo se analiza una vez:
        si el resultado no cuadra, corrige el alimento y toma una foto nueva.
        Luego indica si la consumiste o solo la consultaste.
      </p>

      {onAbrirIngestas && (
        <button
          type="button"
          className="calcular-calorias__link-ingestas"
          onClick={onAbrirIngestas}
          disabled={loading || decidiendo}
        >
          Ver mis ingestas →
        </button>
      )}

      {cupo && (
        <p
          className={`calcular-calorias__cupo${
            sinCupo ? ' calcular-calorias__cupo--agotado' : ''
          }`}
        >
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

      {previewUrl && fotoListaParaAnalisis ? (
        <div className="calcular-calorias__preview-wrap">
          <img
            src={previewUrl}
            alt="Vista previa del alimento"
            className="calcular-calorias__preview"
          />
        </div>
      ) : resultado ? (
        <div className="calcular-calorias__placeholder calcular-calorias__placeholder--usada">
          Foto ya analizada. Para otro cálculo toma o sube una foto nueva.
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
            }}
            onCorreccionIncorrecta={() => {
              liberarFotoPendiente()
              setError(
                'Corrección guardada. Toma o sube una foto nueva para analizar de nuevo.',
              )
            }}
          />
          {pendienteDecision ? (
            <div className="calcular-calorias__decision" role="status">
              <p>
                ¿Consumiste este plato? Confirma para registrarlo en tu
                historial de ingestas, o márcalo como solo consulta. Esta foto
                ya no se puede volver a analizar.
              </p>
            </div>
          ) : resultado.estado === 'consumido' ? (
            <p className="calcular-calorias__decision-ok">
              Registrado como consumido. Usa una foto nueva para el próximo
              análisis.
              {onAbrirIngestas && (
                <>
                  {' '}
                  <button
                    type="button"
                    className="calcular-calorias__link-inline"
                    onClick={onAbrirIngestas}
                  >
                    Ver mis ingestas
                  </button>
                </>
              )}
            </p>
          ) : resultado.estado === 'rechazado' ? (
            <p className="calcular-calorias__decision-ok">
              Guardado como consulta (no consumido). Usa una foto nueva para
              otro análisis.
            </p>
          ) : null}
        </>
      )}

      <LoadingOverlay
        visible={loading || decidiendo}
        label={decidiendo ? 'Guardando decisión' : 'Estimando calorías'}
      />
    </Modal>
  )
}

export default CalcularCaloriasModal
