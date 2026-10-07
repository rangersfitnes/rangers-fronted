import { useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import {
  actualizarContenidoWebAdmin,
  eliminarAudioAsistenciasAdmin,
  obtenerContenidoWebAdmin,
  subirAudioAsistenciasAdmin,
} from '../services/contenidoWebService.js'
import './CrearPlanModal.css'
import './AsistenciasAudioModal.css'

const INTERVALO_RECORDATORIO_SEGUNDOS = 30 * 60

function AsistenciasAudioModal({ open, onClose }) {
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [archivo, setArchivo] = useState(null)
  const [audioActivo, setAudioActivo] = useState(true)
  const [audioActual, setAudioActual] = useState(null)

  useEffect(() => {
    if (!open) {
      setArchivo(null)
      setError('')
      setSubmitting(false)
      setLoading(false)
      setAudioActivo(true)
      setAudioActual(null)
      return undefined
    }

    const controller = new AbortController()
    setLoading(true)
    setError('')

    obtenerContenidoWebAdmin({ signal: controller.signal })
      .then((contenido) => {
        if (controller.signal.aborted) return
        const asistencias = contenido?.asistencias || {}
        setAudioActual({
          url: asistencias.audioUrl || null,
          nombre: asistencias.audioNombre || null,
          activo: Boolean(asistencias.audioActivo && asistencias.audioUrl),
        })
        setAudioActivo(
          asistencias.audioActivo === undefined
            ? Boolean(asistencias.audioUrl)
            : Boolean(asistencias.audioActivo),
        )
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return
        setError(err.message || 'No se pudo cargar la configuración')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })

    return () => controller.abort()
  }, [open])

  const handleArchivo = (event) => {
    const file = event.target.files?.[0]
    setError('')
    if (!file) {
      setArchivo(null)
      return
    }
    const mime = String(file.type || '').toLowerCase()
    const esMp3 =
      mime === 'audio/mpeg' ||
      mime === 'audio/mp3' ||
      /\.mp3$/i.test(file.name)
    if (!esMp3) {
      setArchivo(null)
      setError('Solo se permiten archivos MP3')
      event.target.value = ''
      return
    }
    setArchivo(file)
  }

  const handleGuardar = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      let contenido
      if (archivo) {
        contenido = await subirAudioAsistenciasAdmin({
          archivo,
          intervaloSegundos: INTERVALO_RECORDATORIO_SEGUNDOS,
          audioActivo,
        })
      } else if (audioActual?.url) {
        contenido = await actualizarContenidoWebAdmin({
          asistencias: {
            audioIntervaloSegundos: INTERVALO_RECORDATORIO_SEGUNDOS,
            audioActivo,
          },
        })
      } else {
        setError('Sube un archivo MP3 para activar el audio')
        setSubmitting(false)
        return
      }

      const asistencias = contenido?.asistencias || {}
      setAudioActual({
        url: asistencias.audioUrl || null,
        nombre: asistencias.audioNombre || null,
        activo: Boolean(asistencias.audioActivo && asistencias.audioUrl),
      })
      setArchivo(null)
      onClose?.(contenido)
    } catch (err) {
      setError(err.message || 'No se pudo guardar el audio')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEliminar = async () => {
    if (!audioActual?.url || submitting) return
    setError('')
    setSubmitting(true)
    try {
      const contenido = await eliminarAudioAsistenciasAdmin()
      setAudioActual(null)
      setArchivo(null)
      setAudioActivo(false)
      onClose?.(contenido)
    } catch (err) {
      setError(err.message || 'No se pudo eliminar el audio')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={submitting ? undefined : onClose}
      title="Audio de asistencias"
      className="asistencias-audio-modal"
      footer={
        <>
          <button
            type="button"
            className="crear-plan__btn crear-plan__btn--ghost"
            onClick={onClose}
            disabled={submitting}
          >
            Cerrar
          </button>
          {audioActual?.url ? (
            <button
              type="button"
              className="crear-plan__btn crear-plan__btn--danger"
              onClick={handleEliminar}
              disabled={submitting || loading}
            >
              Eliminar audio
            </button>
          ) : null}
          <button
            type="submit"
            form="asistencias-audio-form"
            className="crear-plan__btn crear-plan__btn--primary"
            disabled={submitting || loading}
          >
            {submitting ? 'Guardando…' : 'Guardar'}
          </button>
        </>
      }
    >
      <p className="asistencias-audio__intro">
        Este MP3 es el recordatorio de asistencias. Los colaboradores lo
        reproducen desde el cronómetro flotante (switch “Reproducir
        recordatorio”, cada 30 minutos) o con “Probar audio”.
      </p>

      {loading ? (
        <p className="asistencias-audio__loading">Cargando configuración…</p>
      ) : (
        <form
          id="asistencias-audio-form"
          className="crear-plan__form"
          onSubmit={handleGuardar}
        >
          {error ? (
            <p className="crear-plan__error" role="alert">
              {error}
            </p>
          ) : null}

          {audioActual?.url ? (
            <div className="asistencias-audio__actual">
              <span className="asistencias-audio__actual-label">
                Audio actual
              </span>
              <strong>{audioActual.nombre || 'asistencias-audio.mp3'}</strong>
              <audio
                controls
                preload="none"
                src={audioActual.url}
                className="asistencias-audio__player"
              >
                Tu navegador no reproduce audio.
              </audio>
            </div>
          ) : (
            <p className="asistencias-audio__vacio">
              Aún no hay un audio configurado.
            </p>
          )}

          <label className="crear-plan__field">
            <span className="crear-plan__label">
              {audioActual?.url ? 'Reemplazar MP3' : 'Subir MP3'}
            </span>
            <input
              type="file"
              accept="audio/mpeg,audio/mp3,.mp3"
              onChange={handleArchivo}
              disabled={submitting}
              className="asistencias-audio__file"
            />
            {archivo ? (
              <span className="asistencias-audio__file-name">
                Seleccionado: {archivo.name}
              </span>
            ) : null}
          </label>

          <p className="asistencias-audio__hint">
            Con el switch del cronómetro activo, el recordatorio suena cada 30
            minutos.
          </p>

          <label className="asistencias-audio__switch">
            <input
              type="checkbox"
              checked={audioActivo}
              onChange={(e) => setAudioActivo(e.target.checked)}
              disabled={submitting}
            />
            <span>Audio disponible para el recordatorio</span>
          </label>
        </form>
      )}
    </Modal>
  )
}

export default AsistenciasAudioModal
