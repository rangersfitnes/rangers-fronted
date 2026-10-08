import { useCallback, useEffect, useMemo, useState } from 'react'
import logo from '../assets/images/logos/logo.webp'
import {
  AMOR_ICONOS_IDLE,
  HALLOWEEN_ICONOS_IDLE,
  ICONOS_HALLOWEEN,
} from '../assets/images/temas/temaIconos.js'
import LoadingOverlay from '../components/LoadingOverlay.jsx'
import { useToast } from '../components/Toast.jsx'
import {
  actualizarContenidoWebAdmin,
  eliminarAvatarRangerBotAdmin,
  obtenerContenidoWebAdmin,
  subirAvatarRangerBotAdmin,
  urlEmbedYoutube,
} from '../services/contenidoWebService.js'
import './AdministracionGeneral.css'
import './PuntoFisico.css'

const TEMAS_FALLBACK = [
  {
    id: 'predeterminado',
    etiqueta: 'Predeterminado',
    descripcion: 'Pantalla de asistencias estándar de Rangers Box.',
  },
  {
    id: 'amor_amistad',
    etiqueta: 'Amor y la amistad',
    descripcion:
      'Tema rosa/naranja con partículas y copy del mes del amor y la amistad.',
  },
  {
    id: 'halloween',
    etiqueta: 'Halloween',
    descripcion:
      'Tema naranja y púrpura con fantasmas, calaveras, murciélagos, telarañas y más.',
  },
]

function VistaPreviaTemaAsistencia({ tema }) {
  const esAmor = tema === 'amor_amistad'
  const esHalloween = tema === 'halloween'
  const iconosPreview = esHalloween
    ? HALLOWEEN_ICONOS_IDLE.slice(0, 7)
    : esAmor
      ? AMOR_ICONOS_IDLE.slice(0, 6)
      : []

  const banner = esAmor
    ? {
        eyebrow: 'Mes del amor y la amistad',
        titulo: 'Entrena con tu gente',
        sub: 'Registra aquí tu asistencia',
        eyebrowClass: 'pf-control-acceso__banner-eyebrow--amor',
      }
    : esHalloween
      ? {
          eyebrow: 'Halloween en Rangers',
          titulo: 'Noche de entrenamiento',
          sub: 'Registra aquí tu asistencia',
          eyebrowClass: 'pf-control-acceso__banner-eyebrow--halloween',
        }
      : {
          eyebrow: 'Bienvenido',
          titulo: 'Registra aquí tu asistencia',
          sub: '',
          eyebrowClass: '',
        }

  return (
    <div
      className={`ag-contenido-web__tema-preview pf-control-acceso__shell pf-control-acceso__shell--fullscreen${
        esAmor ? ' pf-control-acceso__shell--amor' : ''
      }${esHalloween ? ' pf-control-acceso__shell--halloween' : ''}`}
      aria-hidden="true"
    >
      {esAmor ? (
        <div className="pf-control-acceso__amor-ambient">
          <div className="pf-control-acceso__amor-glow pf-control-acceso__amor-glow--a" />
          <div className="pf-control-acceso__amor-glow pf-control-acceso__amor-glow--b" />
          {iconosPreview.map((icono) => (
            <img
              key={icono.id}
              src={icono.src}
              alt=""
              className={`pf-control-acceso__tema-icono pf-control-acceso__tema-icono--amor pf-control-acceso__tema-icono--${icono.tipo}`}
              style={{
                left: icono.left,
                top: icono.top,
                width: Math.max(16, Math.round(icono.size * 0.7)),
                height: Math.max(16, Math.round(icono.size * 0.7)),
                animationDelay: icono.delay,
                animationDuration: icono.duration,
              }}
              draggable={false}
            />
          ))}
        </div>
      ) : null}

      {esHalloween ? (
        <div className="pf-control-acceso__halloween-ambient">
          <div className="pf-control-acceso__halloween-glow pf-control-acceso__halloween-glow--a" />
          <div className="pf-control-acceso__halloween-glow pf-control-acceso__halloween-glow--b" />
          <div className="pf-control-acceso__halloween-mist" />
          <img
            src={ICONOS_HALLOWEEN.moon}
            alt=""
            className="pf-control-acceso__halloween-moon"
            draggable={false}
          />
          <img
            src={ICONOS_HALLOWEEN.cobweb}
            alt=""
            className="pf-control-acceso__halloween-cobweb pf-control-acceso__halloween-cobweb--tl"
            draggable={false}
          />
          <img
            src={ICONOS_HALLOWEEN.cobweb}
            alt=""
            className="pf-control-acceso__halloween-cobweb pf-control-acceso__halloween-cobweb--tr"
            draggable={false}
          />
          {iconosPreview.map((icono) => (
            <img
              key={icono.id}
              src={icono.src}
              alt=""
              className={`pf-control-acceso__tema-icono pf-control-acceso__tema-icono--halloween pf-control-acceso__tema-icono--${icono.tipo}`}
              style={{
                left: icono.left,
                top: icono.top,
                width: Math.max(16, Math.round(icono.size * 0.7)),
                height: Math.max(16, Math.round(icono.size * 0.7)),
                animationDelay: icono.delay,
                animationDuration: icono.duration,
              }}
              draggable={false}
            />
          ))}
        </div>
      ) : null}

      <header className="pf-control-acceso__banner">
        <p
          className={`pf-control-acceso__banner-eyebrow${
            banner.eyebrowClass ? ` ${banner.eyebrowClass}` : ''
          }`}
        >
          {banner.eyebrow}
        </p>
        <h1 className="pf-control-acceso__banner-titulo">{banner.titulo}</h1>
        {banner.sub ? (
          <p className="pf-control-acceso__banner-sub">{banner.sub}</p>
        ) : null}
      </header>

      <section
        className={`pf-control-acceso${
          esAmor ? ' pf-control-acceso--amor-idle' : ''
        }${esHalloween ? ' pf-control-acceso--halloween-idle' : ''}`}
      >
        <div className="pf-control-acceso__contenido">
          <div className="pf-control-acceso__entrada">
            <img
              src={logo}
              alt=""
              className={`pf-control-acceso__logo${
                esAmor ? ' pf-control-acceso__logo--amor' : ''
              }${esHalloween ? ' pf-control-acceso__logo--halloween' : ''}`}
            />
            <div className="ag-contenido-web__tema-preview-field">
              <span className="pf-control-acceso__label">Número de cédula</span>
              <div className="ag-contenido-web__tema-preview-input">
                Digita tu cédula y presiona Enter
              </div>
            </div>
          </div>
          <p className="pf-control-acceso__hint">
            Presiona Enter para validar tu acceso
          </p>
        </div>
      </section>
    </div>
  )
}

function AdministracionGeneralContenidoWeb() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [subiendoAvatar, setSubiendoAvatar] = useState(false)
  const [error, setError] = useState('')
  const [videoYoutubeUrl, setVideoYoutubeUrl] = useState('')
  const [temaAsistencia, setTemaAsistencia] = useState('predeterminado')
  const [temaPublicado, setTemaPublicado] = useState('predeterminado')
  const [temasDisponibles, setTemasDisponibles] = useState(TEMAS_FALLBACK)
  const [rangerBotNombre, setRangerBotNombre] = useState('Ranger Bot')
  const [rangerBotAvatarUrl, setRangerBotAvatarUrl] = useState('')
  const [rangerBotAvatarNombre, setRangerBotAvatarNombre] = useState('')

  const cargar = useCallback(
    async ({ signal } = {}) => {
      setLoading(true)
      try {
        const contenido = await obtenerContenidoWebAdmin({ signal })
        const tema = contenido?.asistencias?.tema || 'predeterminado'
        setVideoYoutubeUrl(contenido?.inicio?.videoYoutubeUrl ?? '')
        setTemaAsistencia(tema)
        setTemaPublicado(tema)
        setRangerBotNombre(contenido?.rangerBot?.nombre || 'Ranger Bot')
        setRangerBotAvatarUrl(contenido?.rangerBot?.avatarUrl || '')
        setRangerBotAvatarNombre(contenido?.rangerBot?.avatarNombre || '')
        if (
          Array.isArray(contenido?.temasAsistenciaDisponibles) &&
          contenido.temasAsistenciaDisponibles.length
        ) {
          setTemasDisponibles(contenido.temasAsistenciaDisponibles)
        } else {
          setTemasDisponibles(TEMAS_FALLBACK)
        }
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

  const temaSeleccionadoMeta = useMemo(
    () =>
      temasDisponibles.find((tema) => tema.id === temaAsistencia) ||
      TEMAS_FALLBACK[0],
    [temaAsistencia, temasDisponibles],
  )

  const temaSinPublicar = temaAsistencia !== temaPublicado

  const handleGuardar = async () => {
    setError('')
    setGuardando(true)
    try {
      await actualizarContenidoWebAdmin({
        inicio: { videoYoutubeUrl: videoYoutubeUrl.trim() },
        asistencias: { tema: temaAsistencia },
        rangerBot: { nombre: rangerBotNombre.trim() || 'Ranger Bot' },
      })
      toast.success('Contenido web publicado')
      await cargar()
    } catch (err) {
      setError(err.message || 'No se pudo guardar el contenido')
    } finally {
      setGuardando(false)
    }
  }

  const handleSubirAvatar = async (event) => {
    const archivo = event.target.files?.[0]
    event.target.value = ''
    if (!archivo) return
    setError('')
    setSubiendoAvatar(true)
    try {
      const contenido = await subirAvatarRangerBotAdmin(archivo)
      setRangerBotAvatarUrl(contenido?.rangerBot?.avatarUrl || '')
      setRangerBotAvatarNombre(contenido?.rangerBot?.avatarNombre || '')
      toast.success('Imagen de Ranger Bot actualizada')
    } catch (err) {
      setError(err.message || 'No se pudo subir la imagen')
      toast.error(err.message || 'No se pudo subir la imagen')
    } finally {
      setSubiendoAvatar(false)
    }
  }

  const handleEliminarAvatar = async () => {
    setError('')
    setSubiendoAvatar(true)
    try {
      const contenido = await eliminarAvatarRangerBotAdmin()
      setRangerBotAvatarUrl(contenido?.rangerBot?.avatarUrl || '')
      setRangerBotAvatarNombre(contenido?.rangerBot?.avatarNombre || '')
      toast.success('Imagen de Ranger Bot eliminada')
    } catch (err) {
      setError(err.message || 'No se pudo eliminar la imagen')
      toast.error(err.message || 'No se pudo eliminar la imagen')
    } finally {
      setSubiendoAvatar(false)
    }
  }

  const loadingVisible = loading || guardando || subiendoAvatar

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
        <h2 className="ag-contenido-web__section-title">
          Pantalla de asistencias
        </h2>
        <p className="ag-contenido-web__section-desc">
          Elige el tema visual de la pestaña donde se registran las asistencias.
          Al publicar, la pantalla de control de acceso lo aplica (se actualiza
          sola en unos segundos si ya está abierta).
        </p>

        <label className="pf-usuarios-busqueda__field ag-contenido-web__field">
          <span className="pf-usuarios-busqueda__label">Tema personalizado</span>
          <select
            className="pf-usuarios-busqueda__select"
            value={temaAsistencia}
            onChange={(e) => {
              setTemaAsistencia(e.target.value)
              setError('')
            }}
            disabled={loadingVisible}
          >
            {temasDisponibles.map((tema) => (
              <option key={tema.id} value={tema.id}>
                {tema.etiqueta}
              </option>
            ))}
          </select>
        </label>

        {temaSeleccionadoMeta?.descripcion ? (
          <p className="ag-contenido-web__tema-hint">
            {temaSeleccionadoMeta.descripcion}
          </p>
        ) : null}

        <div className="ag-contenido-web__preview">
          <p className="ag-contenido-web__preview-label">
            Vista previa
            {temaSinPublicar ? ' · sin publicar' : ' · tema publicado'}
          </p>
          <div className="ag-contenido-web__tema-preview-frame">
            <VistaPreviaTemaAsistencia tema={temaAsistencia} />
          </div>
        </div>

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

        <h2 className="ag-contenido-web__section-title">Chat del bot</h2>
        <p className="ag-contenido-web__section-desc">
          Nombre e imagen del chat flotante con atletas. Si no configuras una
          imagen, se usa el logo de Rangers Box.
        </p>

        <label className="pf-usuarios-busqueda__field ag-contenido-web__field">
          <span className="pf-usuarios-busqueda__label">Nombre del bot</span>
          <input
            type="text"
            className="pf-usuarios-busqueda__input"
            value={rangerBotNombre}
            onChange={(e) => {
              setRangerBotNombre(e.target.value)
              setError('')
            }}
            placeholder="Ranger Bot"
            maxLength={40}
            disabled={loadingVisible}
            autoComplete="off"
          />
        </label>

        <div className="ag-contenido-web__ranger-bot">
          <div className="ag-contenido-web__ranger-bot-avatar">
            <img
              src={rangerBotAvatarUrl || logo}
              alt={rangerBotNombre || 'Ranger Bot'}
              className={
                rangerBotAvatarUrl
                  ? 'ag-contenido-web__ranger-bot-foto'
                  : 'ag-contenido-web__ranger-bot-foto ag-contenido-web__ranger-bot-foto--logo'
              }
            />
            <div>
              <p className="ag-contenido-web__ranger-bot-nombre">
                {rangerBotNombre.trim() || 'Ranger Bot'}
              </p>
              <p className="ag-contenido-web__tema-hint">
                {rangerBotAvatarNombre
                  ? `Archivo: ${rangerBotAvatarNombre}`
                  : 'Sin imagen personalizada'}
              </p>
            </div>
          </div>

          <div className="ag-contenido-web__ranger-bot-acciones">
            <label className="ag-action-btn ag-action-btn--ghost ag-contenido-web__ranger-bot-upload">
              {subiendoAvatar ? 'Subiendo…' : 'Subir imagen'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                hidden
                disabled={loadingVisible}
                onChange={handleSubirAvatar}
              />
            </label>
            {rangerBotAvatarUrl ? (
              <button
                type="button"
                className="ag-action-btn ag-action-btn--ghost"
                onClick={handleEliminarAvatar}
                disabled={loadingVisible}
              >
                Quitar imagen
              </button>
            ) : null}
          </div>
        </div>

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
          Publicar cambios
        </button>
      </div>

      <LoadingOverlay
        visible={loadingVisible}
        label={guardando ? 'Publicando contenido' : 'Cargando contenido web'}
      />
    </section>
  )
}

export default AdministracionGeneralContenidoWeb
