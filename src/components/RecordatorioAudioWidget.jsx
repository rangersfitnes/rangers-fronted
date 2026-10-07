import { useEffect, useRef, useState } from 'react'
import AsistenciasAudioModal from './AsistenciasAudioModal.jsx'
import './RecordatorioAudioWidget.css'

const STORAGE_POS = 'rb_recordatorio_audio_pos'
const MARGEN = 8

function leerPosicionGuardada() {
  try {
    const raw = localStorage.getItem(STORAGE_POS)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (
      typeof parsed?.x === 'number' &&
      typeof parsed?.y === 'number' &&
      Number.isFinite(parsed.x) &&
      Number.isFinite(parsed.y)
    ) {
      return { x: parsed.x, y: parsed.y }
    }
  } catch {
    // ignore
  }
  return null
}

function posicionPorDefecto() {
  return { x: MARGEN, y: MARGEN }
}

function clampearPosicion(x, y, ancho, alto) {
  const maxX = Math.max(MARGEN, window.innerWidth - ancho - MARGEN)
  const maxY = Math.max(MARGEN, window.innerHeight - alto - MARGEN)
  return {
    x: Math.min(Math.max(MARGEN, x), maxX),
    y: Math.min(Math.max(MARGEN, y), maxY),
  }
}

function RecordatorioAudioWidget({
  recordatorioActivo = false,
  onRecordatorioChange,
  onProbarAudio,
  probandoAudio = false,
  audioDisponible = false,
  onAudioConfigurado,
}) {
  const rootRef = useRef(null)
  const dragRef = useRef(null)
  const [posicion, setPosicion] = useState(
    () => leerPosicionGuardada() || posicionPorDefecto(),
  )
  const [arrastrando, setArrastrando] = useState(false)
  const [expandido, setExpandido] = useState(false)
  const [configOpen, setConfigOpen] = useState(false)

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
        const next = clampearPosicion(prev.x, prev.y, rect.width, rect.height)
        if (next.x === prev.x && next.y === prev.y) return prev
        return next
      })
    }
    reclamar()
    window.addEventListener('resize', reclamar)
    return () => window.removeEventListener('resize', reclamar)
  }, [expandido])

  const iniciarArrastre = (event) => {
    if (event.button != null && event.button !== 0) return
    if (event.target?.closest?.('[data-no-drag="true"]')) return
    const el = rootRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      moved: false,
      startX: event.clientX,
      startY: event.clientY,
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
    if (
      Math.abs(event.clientX - drag.startX) > 3 ||
      Math.abs(event.clientY - drag.startY) > 3
    ) {
      drag.moved = true
    }
    setPosicion(
      clampearPosicion(
        event.clientX - drag.offsetX,
        event.clientY - drag.offsetY,
        el.offsetWidth,
        el.offsetHeight,
      ),
    )
  }

  const terminarArrastre = (event) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    dragRef.current = null
    setArrastrando(false)
    try {
      event.currentTarget.releasePointerCapture(event.pointerId)
    } catch {
      // ignore
    }
  }

  return (
    <>
      <aside
        ref={rootRef}
        className={`recordatorio-audio${
          arrastrando ? ' recordatorio-audio--arrastrando' : ''
        }${expandido ? ' recordatorio-audio--expandido' : ''}`}
        style={{
          top: posicion.y,
          left: posicion.x,
          right: 'auto',
          bottom: 'auto',
        }}
      >
        <div
          className="recordatorio-audio__barra"
          onPointerDown={iniciarArrastre}
          onPointerMove={moverArrastre}
          onPointerUp={terminarArrastre}
          onPointerCancel={terminarArrastre}
        >
          <button
            type="button"
            className="recordatorio-audio__fab"
            data-no-drag="true"
            onClick={() => {
              if (dragRef.current?.moved) return
              setExpandido((prev) => !prev)
            }}
            aria-expanded={expandido}
            title="Audio de recordatorio"
          >
            🔊
          </button>
          {expandido ? (
            <span className="recordatorio-audio__titulo">Recordatorio</span>
          ) : null}
        </div>

        {expandido ? (
          <div className="recordatorio-audio__cuerpo" data-no-drag="true">
            <label className="recordatorio-audio__switch">
              <input
                type="checkbox"
                checked={Boolean(recordatorioActivo)}
                onChange={(e) => onRecordatorioChange?.(e.target.checked)}
                disabled={!audioDisponible}
              />
              <span>Reproducir recordatorio</span>
            </label>
            <p className="recordatorio-audio__hint">
              {audioDisponible
                ? 'Cada 30 min mientras esté activo'
                : 'Sube un MP3 para activarlo'}
            </p>
            <button
              type="button"
              className="recordatorio-audio__btn"
              onClick={onProbarAudio}
              disabled={!audioDisponible || probandoAudio}
            >
              {probandoAudio ? 'Reproduciendo…' : 'Probar audio'}
            </button>
            <button
              type="button"
              className="recordatorio-audio__btn recordatorio-audio__btn--primary"
              onClick={() => setConfigOpen(true)}
            >
              Configurar audio
            </button>
          </div>
        ) : null}
      </aside>

      <AsistenciasAudioModal
        open={configOpen}
        onClose={(contenido) => {
          setConfigOpen(false)
          if (contenido) onAudioConfigurado?.(contenido)
        }}
      />
    </>
  )
}

export default RecordatorioAudioWidget
