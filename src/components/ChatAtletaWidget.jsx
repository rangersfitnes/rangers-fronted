import { useEffect, useRef, useState } from 'react'
import logo from '../assets/images/logos/logo.webp'
import {
  enviarMensajeChatAtleta,
  enviarMensajeChatPublico,
  obtenerHistorialChatAtleta,
  ordenarMensajesPorLlegada,
} from '../services/chatAtletaService.js'
import { obtenerContenidoWebPublico } from '../services/contenidoWebService.js'
import './ChatAtletaWidget.css'

const STORAGE_POS = 'rb_chat_atleta_pos'
const STORAGE_PUBLICO = 'rb_chat_publico_msgs'
const STORAGE_BOT = 'rb_chat_bot_branding'
const MARGEN = 12
const MOBILE_MQ = '(max-width: 640px)'
const BOT_NOMBRE_DEFAULT = 'Ranger Bot'

function leerBrandingBotCache() {
  try {
    const raw = localStorage.getItem(STORAGE_BOT)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const avatarUrl =
      typeof parsed?.avatarUrl === 'string' ? parsed.avatarUrl.trim() : ''
    const nombre = String(parsed?.nombre || '')
      .trim()
      .replace(/\s+/g, ' ')
    if (!avatarUrl && !nombre) return null
    return {
      avatarUrl,
      nombre: nombre || BOT_NOMBRE_DEFAULT,
    }
  } catch {
    return null
  }
}

function guardarBrandingBotCache({ avatarUrl, nombre }) {
  try {
    localStorage.setItem(
      STORAGE_BOT,
      JSON.stringify({
        avatarUrl: String(avatarUrl || '').trim(),
        nombre: String(nombre || BOT_NOMBRE_DEFAULT).trim() || BOT_NOMBRE_DEFAULT,
      }),
    )
  } catch {
    // ignore
  }
}

function precargarImagen(url) {
  const src = String(url || '').trim()
  if (!src || typeof Image === 'undefined') return
  const img = new Image()
  img.decoding = 'async'
  img.src = src
}

const SUGERENCIAS_ATLETA = [
  '¿Qué entreno hoy?',
  '¿Cuántas asistencias llevo este mes?',
  'Revisa mis comidas recientes',
  '¿Cómo va mi plan / membresía?',
]

const SUGERENCIAS_PUBLICO = [
  '¿Qué horarios tienen?',
  '¿Qué clases hay hoy?',
  '¿Cuáles son los planes?',
  '¿Dónde quedan?',
]

function leerHistorialPublico() {
  try {
    const raw = localStorage.getItem(STORAGE_PUBLICO)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return ordenarMensajesPorLlegada(
      parsed.filter(
        (m) =>
          m &&
          (m.role === 'user' || m.role === 'assistant') &&
          String(m.content || '').trim(),
      ),
    ).slice(-40)
  } catch {
    return []
  }
}

function guardarHistorialPublico(lista) {
  try {
    localStorage.setItem(
      STORAGE_PUBLICO,
      JSON.stringify(ordenarMensajesPorLlegada(lista).slice(-40)),
    )
  } catch {
    // ignore
  }
}

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
  return ordenarMensajesPorLlegada(
    (Array.isArray(lista) ? lista : []).filter(
      (m) =>
        m &&
        (m.role === 'user' || m.role === 'assistant') &&
        String(m.content || '').trim(),
    ),
  ).map((m, index) => ({
    id: m.id || `msg-${m.creadoEn || 0}-${m.secuencia ?? index}-${m.role}`,
    role: m.role,
    content: String(m.content).trim(),
    creadoEn: m.creadoEn || null,
    secuencia: m.secuencia ?? (m.role === 'user' ? 0 : 1),
    hora: m.creadoEn ? formatearHoraMensaje(m.creadoEn) : '',
  }))
}

function AvatarBot({ src, className, alt = BOT_NOMBRE_DEFAULT }) {
  const [fallo, setFallo] = useState(false)

  useEffect(() => {
    setFallo(false)
  }, [src])

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
      loading="eager"
      decoding="async"
    />
  )
}

function ChatAtletaWidget({ nombreUsuario, modoPublico = false }) {
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
  const [avatarUrl, setAvatarUrl] = useState(
    () => leerBrandingBotCache()?.avatarUrl || '',
  )
  const [botNombre, setBotNombre] = useState(
    () => leerBrandingBotCache()?.nombre || BOT_NOMBRE_DEFAULT,
  )

  const panelAncladoMovil = abierto && esMovil
  const nombreBot = botNombre || BOT_NOMBRE_DEFAULT
  const sugerencias = modoPublico ? SUGERENCIAS_PUBLICO : SUGERENCIAS_ATLETA

  const aplicarBrandingBot = (contenido) => {
    const url = String(contenido?.rangerBot?.avatarUrl || '').trim()
    const nombreGuardado = String(contenido?.rangerBot?.nombre || '')
      .trim()
      .replace(/\s+/g, ' ')
    const nombre = nombreGuardado || BOT_NOMBRE_DEFAULT
    setAvatarUrl(url)
    setBotNombre(nombre)
    guardarBrandingBotCache({ avatarUrl: url, nombre })
    if (url) precargarImagen(url)
  }

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

  // Carga avatar/nombre al montar (FAB) sin esperar a abrir el chat.
  useEffect(() => {
    if (avatarUrl) precargarImagen(avatarUrl)

    const controller = new AbortController()
    obtenerContenidoWebPublico({ signal: controller.signal })
      .then((contenido) => {
        if (controller.signal.aborted) return
        aplicarBrandingBot(contenido)
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return
      })

    return () => controller.abort()
    // Solo al montar el widget.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!abierto) return undefined

    const controller = new AbortController()
    setCargandoHistorial(true)
    setError('')

    const cargar = async () => {
      // Refresco liviano de branding al abrir (por si cambió en admin).
      try {
        const contenido = await obtenerContenidoWebPublico({
          signal: controller.signal,
        })
        if (!controller.signal.aborted) aplicarBrandingBot(contenido)
      } catch (err) {
        if (err?.name === 'AbortError') throw err
      }

      if (modoPublico) {
        setMensajes(mapearMensajesHistorial(leerHistorialPublico()))
        return
      }

      const historial = await obtenerHistorialChatAtleta({
        signal: controller.signal,
        limite: 60,
      })
      setMensajes(mapearMensajesHistorial(historial))
    }

    cargar()
      .catch((err) => {
        if (err?.name === 'AbortError') return
        setError(err.message || 'No se pudo cargar el historial')
      })
      .finally(() => {
        if (!controller.signal.aborted) setCargandoHistorial(false)
      })

    return () => controller.abort()
  }, [abierto, modoPublico])

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

  const limpiarListenersArrastre = () => {
    const drag = dragRef.current
    if (!drag) return
    if (drag.onMove) {
      window.removeEventListener('pointermove', drag.onMove)
    }
    if (drag.onUp) {
      window.removeEventListener('pointerup', drag.onUp)
      window.removeEventListener('pointercancel', drag.onUp)
    }
  }

  const iniciarArrastre = (event) => {
    if (event.button != null && event.button !== 0) return
    if (event.target?.closest?.('[data-no-drag="true"]')) return
    if (panelAncladoMovil) return

    event.preventDefault()

    const pointerId = event.pointerId
    const drag = {
      pointerId,
      startRight: posicion.right,
      startBottom: posicion.bottom,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
      onMove: null,
      onUp: null,
    }

    drag.onMove = (moveEvent) => {
      if (moveEvent.pointerId !== pointerId) return
      const el = rootRef.current
      if (!el) return
      const deltaX = moveEvent.clientX - drag.startX
      const deltaY = moveEvent.clientY - drag.startY
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

    drag.onUp = (upEvent) => {
      if (upEvent.pointerId !== pointerId) return
      const moved = Boolean(drag.moved)
      limpiarListenersArrastre()
      dragRef.current = null
      setArrastrando(false)
      if (!moved) {
        setAbierto((prev) => !prev)
        setError('')
      }
    }

    dragRef.current = drag
    setArrastrando(true)
    window.addEventListener('pointermove', drag.onMove, { passive: true })
    window.addEventListener('pointerup', drag.onUp)
    window.addEventListener('pointercancel', drag.onUp)
  }

  useEffect(() => {
    return () => limpiarListenersArrastre()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const enviar = async (textoOverride) => {
    const texto = String(textoOverride ?? mensaje).trim()
    if (!texto || enviando || cargandoHistorial) return

    setError('')
    setMensaje('')

    const ahoraMs = Date.now()
    const tempUserId = `tmp-user-${ahoraMs}`
    const tempBotId = `tmp-bot-${ahoraMs}`
    const msgUsuario = {
      id: tempUserId,
      role: 'user',
      content: texto,
      creadoEn: ahoraMs,
      secuencia: 0,
      hora: formatearHoraMensaje(ahoraMs),
    }

    setMensajes((prev) => ordenarMensajesPorLlegada([...prev, msgUsuario]))
    setEnviando(true)

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      let respuesta = ''
      let guardados = []

      if (modoPublico) {
        const historialEnvio = ordenarMensajesPorLlegada([
          ...mensajes.filter((m) => m.id !== tempUserId),
          msgUsuario,
        ])
        const resultado = await enviarMensajeChatPublico({
          mensaje: texto,
          historial: historialEnvio,
          signal: controller.signal,
        })
        respuesta = resultado.respuesta
        if (resultado.nombreBot) setBotNombre(resultado.nombreBot)
      } else {
        const resultado = await enviarMensajeChatAtleta({
          mensaje: texto,
          signal: controller.signal,
        })
        respuesta = resultado.respuesta
        guardados = mapearMensajesHistorial(resultado.mensajesGuardados)
      }

      const msgBot = {
        id: guardados.find((m) => m.role === 'assistant')?.id || tempBotId,
        role: 'assistant',
        content: respuesta || 'Sin respuesta.',
        creadoEn: ahoraMs + 1,
        secuencia: 1,
        hora: formatearHoraMensaje(ahoraMs + 1),
      }
      const msgUserFinal =
        guardados.find((m) => m.role === 'user') || {
          ...msgUsuario,
          id: guardados.find((m) => m.role === 'user')?.id || tempUserId,
        }

      setMensajes((prev) => {
        const sinTemp = prev.filter(
          (m) => m.id !== tempUserId && m.id !== tempBotId,
        )
        const siguiente = ordenarMensajesPorLlegada([
          ...sinTemp,
          {
            ...msgUserFinal,
            hora:
              msgUserFinal.hora ||
              formatearHoraMensaje(msgUserFinal.creadoEn || ahoraMs),
          },
          msgBot,
        ])
        if (modoPublico) guardarHistorialPublico(siguiente)
        return siguiente
      })
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
  const saludo = modoPublico
    ? `Qué más, soy ${nombreBot} de Rangers Box. Pregúntame por horarios, clases, planes o ubicación. Si quieres ver tu plan o rutina, inicia sesión.`
    : primerNombre
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
                    {sugerencias.map((s) => (
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
            abierto
              ? `Cerrar chat con ${nombreBot}`
              : `Chatea con ${nombreBot}. Mantén pulsado y arrastra para mover.`
          }
          title="Mantén pulsado y arrastra para mover"
          aria-expanded={abierto}
          onPointerDown={iniciarArrastre}
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
