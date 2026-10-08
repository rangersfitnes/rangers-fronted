import { useEffect, useRef, useState } from 'react'
import { enviarMensajeChatAtleta } from '../services/chatAtletaService.js'
import './ChatAtletaWidget.css'

const STORAGE_POS = 'rb_chat_atleta_pos'
const MARGEN = 12

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
    // Migración de formato anterior { x, y }
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

function clampearPosicion(right, bottom, ancho, alto) {
  const maxRight = Math.max(MARGEN, window.innerWidth - ancho - MARGEN)
  const maxBottom = Math.max(MARGEN, window.innerHeight - alto - MARGEN)
  return {
    right: Math.min(Math.max(MARGEN, right), maxRight),
    bottom: Math.min(Math.max(MARGEN, bottom), maxBottom),
  }
}

function IconoChat({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 18.5 3.5 21l3.2-1.1c.9.4 1.9.6 3 .6 4.7 0 8.5-3.4 8.5-7.5S14.4 5.5 9.7 5.5 1.2 8.9 1.2 13c0 1.6.5 3.1 1.5 4.3L5 18.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M10.2 9.6h7.6M10.2 12.4h5.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
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
  const [mensaje, setMensaje] = useState('')
  const [mensajes, setMensajes] = useState([])
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_POS, JSON.stringify(posicion))
    } catch {
      // ignore
    }
  }, [posicion])

  useEffect(() => {
    const reclamar = () => {
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
    return () => window.removeEventListener('resize', reclamar)
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
    if (!texto || enviando) return

    setError('')
    setMensaje('')
    const historialApi = mensajes
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content }))

    setMensajes((prev) => [...prev, { role: 'user', content: texto }])
    setEnviando(true)

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const { respuesta } = await enviarMensajeChatAtleta({
        mensaje: texto,
        historial: historialApi,
        signal: controller.signal,
      })
      setMensajes((prev) => [
        ...prev,
        { role: 'assistant', content: respuesta || 'Sin respuesta.' },
      ])
    } catch (err) {
      if (err?.name === 'AbortError') return
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

  const saludo = nombreUsuario
    ? `Hola ${String(nombreUsuario).split(' ')[0]}, pregunta por tu entrenamiento, comidas, asistencias o membresía.`
    : 'Pregunta por tu entrenamiento, comidas, asistencias o membresía.'

  return (
    <div
      ref={rootRef}
      className={`chat-atleta${arrastrando ? ' chat-atleta--arrastrando' : ''}`}
      style={{ right: posicion.right, bottom: posicion.bottom }}
    >
      {abierto && (
        <div className="chat-atleta__panel" role="dialog" aria-label="Asistente Rangers">
          <div
            className="chat-atleta__cabecera"
            onPointerDown={iniciarArrastre}
            onPointerMove={moverArrastre}
            onPointerUp={terminarArrastre}
            onPointerCancel={terminarArrastre}
          >
            <div className="chat-atleta__titulo-wrap">
              <h2 className="chat-atleta__titulo">Coach IA</h2>
              <p className="chat-atleta__subtitulo">Basado en tus datos del box</p>
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
            {mensajes.length === 0 && !enviando && (
              <div className="chat-atleta__vacio">
                {saludo}
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
            )}

            {mensajes.map((m, index) => (
              <div
                key={`${m.role}-${index}`}
                className={`chat-atleta__burbuja chat-atleta__burbuja--${m.role}`}
              >
                {m.content}
              </div>
            ))}

            {enviando && (
              <div className="chat-atleta__typing" aria-live="polite">
                Pensando…
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
              disabled={enviando}
              placeholder="Escribe tu pregunta…"
              aria-label="Mensaje para el coach IA"
              onChange={(e) => setMensaje(e.target.value)}
              onKeyDown={onKeyDown}
            />
            <button
              type="submit"
              className="chat-atleta__enviar"
              data-no-drag="true"
              disabled={enviando || !mensaje.trim()}
            >
              Enviar
            </button>
          </form>
        </div>
      )}

      <button
        type="button"
        className="chat-atleta__fab"
        aria-label={abierto ? 'Cerrar coach IA' : 'Abrir coach IA'}
        aria-expanded={abierto}
        onPointerDown={iniciarArrastre}
        onPointerMove={moverArrastre}
        onPointerUp={toggleFab}
        onPointerCancel={terminarArrastre}
      >
        <IconoChat className="chat-atleta__fab-icon" />
      </button>
    </div>
  )
}

export default ChatAtletaWidget
