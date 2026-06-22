import { useCallback, useEffect, useMemo, useState } from 'react'
import LoadingOverlay from '../components/LoadingOverlay.jsx'
import { useToast } from '../components/Toast.jsx'
import {
  actualizarContenidoWebAdmin,
  obtenerContenidoWebAdmin,
  urlEmbedYoutube,
} from '../services/contenidoWebService.js'
import './AdministracionGeneral.css'
import './PuntoFisico.css'

function AdministracionGeneralContenidoWeb() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [videoYoutubeUrl, setVideoYoutubeUrl] = useState('')

  const cargar = useCallback(
    async ({ signal } = {}) => {
      setLoading(true)
      try {
        const contenido = await obtenerContenidoWebAdmin({ signal })
        setVideoYoutubeUrl(contenido?.inicio?.videoYoutubeUrl ?? '')
        setError('')
      } catch (err) {
        if (err?.name === 'AbortError') return
        toast.error(err.message || 'No se pudo cargar el contenido web')
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [toast],
  )

  useEffect(() => {
    const controller = new AbortController()
    cargar({ signal: controller.signal })
    return () => controller.abort()
  }, [cargar])

  const videoPreviewId = useMemo(() => {
    const match = String(videoYoutubeUrl || '').match(
      /(?:youtu\.be\/|[?&]v=|embed\/|shorts\/)([\w-]{11})/i,
    )
    return match?.[1] ?? ''
  }, [videoYoutubeUrl])

  const handleGuardar = async () => {
    setError('')
    setGuardando(true)
    try {
      await actualizarContenidoWebAdmin({
        inicio: { videoYoutubeUrl: videoYoutubeUrl.trim() },
      })
      toast.success('Contenido web actualizado')
      await cargar()
    } catch (err) {
      setError(err.message || 'No se pudo guardar el contenido')
    } finally {
      setGuardando(false)
    }
  }

  const loadingVisible = loading || guardando

  return (
    <section className="ag-page__view">
      <header className="ag-page__view-header ag-page__view-header--with-action">
        <div>
          <h1 className="ag-page__title">Contenido web</h1>
          <p className="ag-page__subtitle">
            Administra textos, enlaces y recursos visibles en el sitio público
          </p>
        </div>
        <button
          type="button"
          className="ag-action-btn ag-action-btn--ghost"
          onClick={() => cargar()}
          disabled={loadingVisible}
        >
          Actualizar
        </button>
      </header>

      <div className="ag-panel ag-contenido-web__panel">
        <h2 className="ag-contenido-web__section-title">Pantalla de inicio</h2>
        <p className="ag-contenido-web__section-desc">
          El video configurado se muestra en la página principal para visitantes
          y usuarios registrados. Deja el campo vacío para ocultarlo.
        </p>

        <label className="pf-usuarios-busqueda__field ag-contenido-web__field">
          <span className="pf-usuarios-busqueda__label">
            Enlace de YouTube
          </span>
          <input
            type="url"
            className="pf-usuarios-busqueda__input"
            value={videoYoutubeUrl}
            onChange={(e) => {
              setVideoYoutubeUrl(e.target.value)
              setError('')
            }}
            placeholder="https://www.youtube.com/watch?v=..."
            disabled={loadingVisible}
            autoComplete="off"
          />
        </label>

        {videoPreviewId ? (
          <div className="ag-contenido-web__preview">
            <p className="ag-contenido-web__preview-label">Vista previa</p>
            <div className="ag-contenido-web__preview-frame">
              <iframe
                src={urlEmbedYoutube(videoPreviewId)}
                title="Vista previa del video de inicio"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          </div>
        ) : null}

        {error ? (
          <p className="pf-entrenamientos__error" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          className="ag-action-btn ag-contenido-web__guardar"
          onClick={handleGuardar}
          disabled={loadingVisible}
        >
          Guardar cambios
        </button>
      </div>

      <LoadingOverlay
        visible={loadingVisible}
        label={guardando ? 'Guardando contenido' : 'Cargando contenido web'}
      />
    </section>
  )
}

export default AdministracionGeneralContenidoWeb
