import { useEffect, useRef, useState } from 'react'
import logo from '../assets/images/logos/logo.webp'
import {
  enviarMensajeChatAtleta,
  obtenerHistorialChatAtleta,
} from '../services/chatAtletaService.js'
import { obtenerContenidoWebPublico } from '../services/contenidoWebService.js'
import './ChatAtletaWidget.css'

const STORAGE_POS = 'rb_chat_atleta_pos'
const MARGEN = 12
const MOBILE_MQ = '(max-width: 640px)'
const BOT_NOMBRE_DEFAULT = 'Ranger Bot'

const SUGERENCIAS = [
  '¿Qué entreno hoy?',
  '¿Cuántas asistencias llevo este mes?',
  'Revisa mis comidas recientes',
  '¿Cómo va mi plan / membresía?',
]

function leerPosicionGuardada() {
  try {
    const raw = localStorage.getItem(STORAGE_POS)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (
      typeof parsed?.right === 'number' &&
      typeof parsed?.bottom === 'number' &&
      Number.isFinite(parsed.right) &&
      Number.isFinite(parsed.bottom)
    ) {
      return { right: parsed.right, bottom: parsed.bottom }
    }
    if (
      typeof parsed?.x === 'number' &&
      typeof parsed?.y === 'number' &&
      typeof window !== 'undefined'
    ) {
      return {
        right: Math.max(MARGEN, window.innerWidth - parsed.x - 56),
        bottom: Math.max(MARGEN, window.innerHeight - parsed.y - 56),
      }
    }
  } catch {
    // ignore
  }
  return null
}

function posicionPorDefecto() {
  return { right: MARGEN, bottom: MARGEN }
}

function esViewportMovil() {
  if (typeof window === 'undefined') return false
  return window.matchMedia(MOBILE_MQ).matches
}

function medidasViewport() {
  const vv = window.visualViewport
  return {
    width: vv?.width || window.innerWidth,
    height: vv?.height || window.innerHeight,
  }
}

function clampearPosicion(right, bottom, ancho, alto) {
  const { width, height } = medidasViewport()
  const maxRight = Math.max(MARGEN, width - ancho - MARGEN)
  const maxBottom = Math.max(MARGEN, height - alto - MARGEN)
  return {
    right: Math.min(Math.max(MARGEN, right), maxRight),
    bottom: Math.min(Math.max(MARGEN, bottom), maxBottom),
  }
}

function formatearHoraMensaje(date = new Date()) {
  try {
    return new Intl.DateTimeFormat('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date instanceof Date ? date : new Date(date))
  } catch {
    return ''
  }
}

function mapearMensajesHistorial(lista = []) {
  return (Array.isArray(lista) ? lista : [])
    .filter(
      (m) =>
        m &&
        (m.role === 'user' || m.role === 'assistant') &&
        String(m.content || '').trim(),
    )
    .map((m) => ({
      id: m.id || null,
      role: m.role,
      content: String(m.content).trim(),
      hora: m.creadoEn ? formatearHoraMensaje(m.creadoEn) : '',
    }))
}

function AvatarBot({ src, className, alt = BOT_NOMBRE_DEFAULT }) {
  const [fallo, setFallo] = useState(false)
  const url = !fallo && src ? src : logo
  return (
    <img
      src={url}
      alt={alt}
      className={`${className}${
        !src || fallo ? ` ${className}--fallback` : ''
      }`}
      onError={() => setFallo(true)}
      draggable={false}
    />
  )
}

function ChatAtletaWidget({ nombreUsuario }) {
  const rootRef = useRef(null)
  const dragRef = useRef(null)
  const listaRef = useRef(null)
  const abortRef = useRef(null)

  const [posicion, setPosicion] = useState(
    () => leerPosicionGuardada() || posicionPorDefecto(),
  )
  const [arrastrando, setArrastrando] = useState(false)
  const [abierto, setAbierto] = useState(false)
  const [esMovil, setEsMovil] = useState(() => esViewportMovil())
  const [mensaje, setMensaje] = useState('')
  const [mensajes, setMensajes] = useState([])
  const [cargandoHistorial, setCargandoHistorial] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [botNombre, setBotNombre] = useState(BOT_NOMBRE_DEFAULT)

  const panelAncladoMovil = abierto && esMovil
  const nombreBot = botNombre || BOT_NOMBRE_DEFAULT

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_POS, JSON.stringify(posicion))
    } catch {
      // ignore
    }
  }, [posicion])

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ)
    const syncMovil = () => setEsMovil(mq.matches)
    syncMovil()
    mq.addEventListener?.('change', syncMovil)
    return () => mq.removeEventListener?.('change', syncMovil)
  }, [])

  useEffect(() => {
    if (!abierto) return undefined

    const controller = new AbortController()
    setCargandoHistorial(true)
    setError('')

    Promise.all([
      obtenerContenidoWebPublico({ signal: controller.signal }),
      obtenerHistorialChatAtleta({ signal: controller.signal, limite: 60 }),
    ])
      .then(([contenido, historial]) => {
        const nombreGuardado = String(contenido?.rangerBot?.nombre || '')
          .trim()
          .replace(/\s+/g, ' ')
        setAvatarUrl(contenido?.rangerBot?.avatarUrl || '')
        setBotNombre(nombreGuardado || BOT_NOMBRE_DEFAULT)
        setMensajes(mapearMensajesHistorial(historial))
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return
        setError(err.message || 'No se pudo cargar el historial')
      })
      .finally(() => {
        if (!controller.signal.aborted) setCargandoHistorial(false)
      })

    return () => controller.abort()
  }, [abierto])

  useEffect(() => {
    const reclamar = () => {
      setEsMovil(esViewportMovil())
      if (abierto && esViewportMovil()) return
      const el = rootRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      setPosicion((prev) => {
        const next = clampearPosicion(
          prev.right,
          prev.bottom,
          rect.width,
          rect.height,
        )
        if (next.right === prev.right && next.bottom === prev.bottom) {
          return prev
        }
        return next
      })
    }
    reclamar()
    window.addEventListener('resize', reclamar)
    window.visualViewport?.addEventListener('resize', reclamar)
    window.visualViewport?.addEventListener('scroll', reclamar)
    return () => {
      window.removeEventListener('resize', reclamar)
      window.visualViewport?.removeEventListener('resize', reclamar)
      window.visualViewport?.removeEventListener('scroll', reclamar)
    }
  }, [abierto])

  useEffect(() => {
    const el = listaRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [mensajes, enviando, error, abierto])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  const iniciarArrastre = (event) => {
    if (event.button != null && event.button !== 0) return
    if (event.target?.closest?.('[data-no-drag="true"]')) return
    if (panelAncladoMovil) return
    dragRef.current = {
      pointerId: event.pointerId,
      startRight: posicion.right,
      startBottom: posicion.bottom,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    }
    setArrastrando(true)
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // ignore
    }
  }

  const moverArrastre = (event) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    if (panelAncladoMovil) return
    const el = rootRef.current
    if (!el) return

    const deltaX = event.clientX - drag.startX
    const deltaY = event.clientY - drag.startY
    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) drag.moved = true

    const rect = el.getBoundingClientRect()
    setPosicion(
      clampearPosicion(
        drag.startRight - deltaX,
        drag.startBottom - deltaY,
        rect.width,
        rect.height,
      ),
    )
  }

  const terminarArrastre = (event) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    const moved = drag.moved
    dragRef.current = null
    setArrastrando(false)
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      // ignore
    }
    return moved
  }

  const toggleFab = (event) => {
    const moved = terminarArrastre(event)
    if (moved) return
    setAbierto((prev) => !prev)
    setError('')
  }

  const enviar = async (textoOverride) => {
    const texto = String(textoOverride ?? mensaje).trim()
    if (!texto || enviando || cargandoHistorial) return

    setError('')
    setMensaje('')

    const ahora = new Date()
    const tempUserId = `tmp-user-${Date.now()}`
    setMensajes((prev) => [
      ...prev,
      {
        id: tempUserId,
        role: 'user',
        content: texto,
        hora: formatearHoraMensaje(ahora),
      },
    ])
    setEnviando(true)

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const { respuesta, mensajesGuardados } = await enviarMensajeChatAtleta({
        mensaje: texto,
        signal: controller.signal,
      })

      const guardados = mapearMensajesHistorial(mensajesGuardados)
      if (guardados.length >= 2) {
        setMensajes((prev) => {
          const sinTemp = prev.filter((m) => m.id !== tempUserId)
          return [...sinTemp, ...guardados]
        })
      } else {
        setMensajes((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: respuesta || 'Sin respuesta.',
            hora: formatearHoraMensaje(new Date()),
          },
        ])
      }
    } catch (err) {
      if (err?.name === 'AbortError') return
      setMensajes((prev) => prev.filter((m) => m.id !== tempUserId))
      setError(err.message || 'No se pudo enviar el mensaje')
    } finally {
      if (!controller.signal.aborted) setEnviando(false)
    }
  }

  const onSubmit = (event) => {
    event.preventDefault()
    enviar()
  }

  const onKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      enviar()
    }
  }

  const primerNombre = nombreUsuario
    ? String(nombreUsuario).split(/\s+/)[0]
    : ''
  const saludo = primerNombre
    ? `Hola atleta ${primerNombre}, soy ${nombreBot}. Reporta: entreno, comidas, asistencias o tu plan. ¿Cuál es la misión?`
    : `Hola atleta, soy ${nombreBot}. Reporta: entreno, comidas, asistencias o tu plan. ¿Cuál es la misión?`

  const estiloRoot = panelAncladoMovil
    ? undefined
    : { right: posicion.right, bottom: posicion.bottom }

  return (
    <div
      ref={rootRef}
      className={[
        'chat-atleta',
        arrastrando ? 'chat-atleta--arrastrando' : '',
        abierto ? 'chat-atleta--abierto' : '',
        panelAncladoMovil ? 'chat-atleta--movil-anclado' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={estiloRoot}
    >
      {abierto && (
        <div
          className="chat-atleta__panel"
          role="dialog"
          aria-label={`Chat con ${nombreBot}`}
        >
          <div
            className="chat-atleta__cabecera"
            onPointerDown={iniciarArrastre}
            onPointerMove={moverArrastre}
            onPointerUp={terminarArrastre}
            onPointerCancel={terminarArrastre}
          >
            <div className="chat-atleta__persona">
              <div className="chat-atleta__avatar-wrap">
                <AvatarBot
                  src={avatarUrl}
                  className="chat-atleta__avatar"
                  alt={nombreBot}
                />
                <span className="chat-atleta__online" aria-hidden="true" />
              </div>
              <div className="chat-atleta__titulo-wrap">
                <h2 className="chat-atleta__titulo">{nombreBot}</h2>
                <p className="chat-atleta__subtitulo">en línea · Rangers Box</p>
              </div>
            </div>
            <button
              type="button"
              className="chat-atleta__cerrar"
              data-no-drag="true"
              aria-label="Cerrar chat"
              onClick={() => setAbierto(false)}
            >
              ×
            </button>
          </div>

          <div className="chat-atleta__mensajes" ref={listaRef}>
            {cargandoHistorial && (
              <div className="chat-atleta__typing" aria-live="polite">
                Cargando conversación…
              </div>
            )}

            {!cargandoHistorial && mensajes.length === 0 && !enviando && (
              <div className="chat-atleta__msg chat-atleta__msg--assistant">
                <AvatarBot
                  src={avatarUrl}
                  className="chat-atleta__msg-avatar"
                  alt={nombreBot}
                />
                <div className="chat-atleta__msg-col">
                  <span className="chat-atleta__msg-nombre">{nombreBot}</span>
                  <div className="chat-atleta__burbuja chat-atleta__burbuja--assistant">
                    {saludo}
                  </div>
                  <div className="chat-atleta__sugerencias">
                    {SUGERENCIAS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className="chat-atleta__sugerencia"
                        data-no-drag="true"
                        disabled={enviando}
                        onClick={() => enviar(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {mensajes.map((m, index) =>
              m.role === 'user' ? (
                <div
                  key={m.id || `user-${index}`}
                  className="chat-atleta__msg chat-atleta__msg--user"
                >
                  <div className="chat-atleta__msg-col chat-atleta__msg-col--user">
                    <div className="chat-atleta__burbuja chat-atleta__burbuja--user">
                      {m.content}
                    </div>
                    {m.hora ? (
                      <span className="chat-atleta__hora chat-atleta__hora--user">
                        {m.hora}
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div
                  key={m.id || `bot-${index}`}
                  className="chat-atleta__msg chat-atleta__msg--assistant"
                >
                  <AvatarBot
                    src={avatarUrl}
                    className="chat-atleta__msg-avatar"
                    alt={nombreBot}
                  />
                  <div className="chat-atleta__msg-col">
                    <span className="chat-atleta__msg-nombre">{nombreBot}</span>
                    <div className="chat-atleta__burbuja chat-atleta__burbuja--assistant">
                      {m.content}
                    </div>
                    {m.hora ? (
                      <span className="chat-atleta__hora">{m.hora}</span>
                    ) : null}
                  </div>
                </div>
              ),
            )}

            {enviando && (
              <div className="chat-atleta__msg chat-atleta__msg--assistant">
                <AvatarBot
                  src={avatarUrl}
                  className="chat-atleta__msg-avatar"
                  alt={nombreBot}
                />
                <div className="chat-atleta__msg-col">
                  <span className="chat-atleta__msg-nombre">{nombreBot}</span>
                  <div
                    className="chat-atleta__burbuja chat-atleta__burbuja--assistant chat-atleta__burbuja--typing"
                    aria-live="polite"
                  >
                    <span className="chat-atleta__dot" />
                    <span className="chat-atleta__dot" />
                    <span className="chat-atleta__dot" />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="chat-atleta__burbuja chat-atleta__burbuja--error">
                {error}
              </div>
            )}
          </div>

          <form className="chat-atleta__form" onSubmit={onSubmit}>
            <textarea
              className="chat-atleta__input"
              data-no-drag="true"
              rows={1}
              value={mensaje}
              disabled={enviando || cargandoHistorial}
              placeholder="Escribe un mensaje…"
              aria-label={`Mensaje para ${nombreBot}`}
              onChange={(e) => setMensaje(e.target.value)}
              onKeyDown={onKeyDown}
            />
            <button
              type="submit"
              className="chat-atleta__enviar"
              data-no-drag="true"
              disabled={enviando || cargandoHistorial || !mensaje.trim()}
              aria-label="Enviar mensaje"
            >
              <span className="chat-atleta__enviar-texto">Enviar</span>
              <span className="chat-atleta__enviar-icono" aria-hidden="true">
                ↑
              </span>
            </button>
          </form>
        </div>
      )}

      <div className="chat-atleta__fab-wrap">
        {!abierto && (
          <div className="chat-atleta__fab-aviso" aria-hidden="true">
            <span className="chat-atleta__fab-aviso-texto">
              Chatea con <strong>{nombreBot}</strong>
            </span>
            <span className="chat-atleta__fab-aviso-punto" />
          </div>
        )}
        <button
          type="button"
          className="chat-atleta__fab"
          aria-label={
            abierto ? `Cerrar chat con ${nombreBot}` : `Chatea con ${nombreBot}`
          }
          aria-expanded={abierto}
          onPointerDown={iniciarArrastre}
          onPointerMove={moverArrastre}
          onPointerUp={toggleFab}
          onPointerCancel={terminarArrastre}
        >
          <AvatarBot
            src={avatarUrl}
            className="chat-atleta__fab-avatar"
            alt={nombreBot}
          />
          <span className="chat-atleta__fab-online" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

export default ChatAtletaWidget
