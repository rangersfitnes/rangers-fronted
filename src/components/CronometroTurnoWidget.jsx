import { useEffect, useRef, useState } from 'react'
import './CronometroTurnoWidget.css'

const STORAGE_POS = 'rb_cronometro_turno_pos'
const STORAGE_COLLAPSED = 'rb_cronometro_turno_collapsed'
const MARGEN = 8

export function formatearTiempoLaborado(ms) {
  const totalSeg = Math.max(0, Math.floor(Number(ms) / 1000))
  const horas = Math.floor(totalSeg / 3600)
  const minutos = Math.floor((totalSeg % 3600) / 60)
  const segundos = totalSeg % 60

  return [horas, minutos, segundos]
    .map((valor) => String(valor).padStart(2, '0'))
    .join(':')
}

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

function leerColapsadoGuardado() {
  try {
    return localStorage.getItem(STORAGE_COLLAPSED) === '1'
  } catch {
    return false
  }
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

function etiquetaNivelPuntualidad(nivel) {
  if (nivel === 'excelente') return 'Puntualidad excelente'
  if (nivel === 'media') return 'Puntualidad media'
  if (nivel === 'baja') return 'Puntualidad baja'
  if (nivel === 'sin_malla') return 'Sin turno en malla'
  return 'Puntualidad'
}

function renderPuntualidad(puntualidad) {
  if (!puntualidad?.nivel) return null

  const nivel = puntualidad.nivel
  return (
    <div
      className={`cronometro-turno__puntualidad cronometro-turno__puntualidad--${nivel}`}
      role="status"
    >
      <span className="cronometro-turno__puntualidad-nivel">
        {etiquetaNivelPuntualidad(nivel)}
      </span>
      <span className="cronometro-turno__puntualidad-msg">
        {puntualidad.mensaje ||
          (puntualidad.horaEntradaPlanificada
            ? `Hora de entrada: ${puntualidad.horaEntradaPlanificada}`
            : '')}
      </span>
    </div>
  )
}

function renderEstadoExtra({ horasTurno, estadoHorasExtra }) {
  if (!horasTurno) {
    return (
      <span className="cronometro-turno__jornada">Jornada no configurada</span>
    )
  }

  if (!estadoHorasExtra || estadoHorasExtra.enJornada) {
    return (
      <span className="cronometro-turno__jornada">Jornada: {horasTurno} h</span>
    )
  }

  if (estadoHorasExtra.horasExtraLiquidadas > 0) {
    const etiqueta =
      estadoHorasExtra.horasExtraLiquidadas === 1
        ? '1 hora extra liquidada'
        : `${estadoHorasExtra.horasExtraLiquidadas} horas extra liquidadas`

    return (
      <span className="cronometro-turno__extra cronometro-turno__extra--activa">
        {etiqueta}
      </span>
    )
  }

  return (
    <span className="cronometro-turno__extra cronometro-turno__extra--pendiente">
      Extra: {estadoHorasExtra.minutosExtra} min
      {estadoHorasExtra.minutosParaLiquidar > 0
        ? ` · faltan ${estadoHorasExtra.minutosParaLiquidar} min para liquidar 1 h`
        : ''}
    </span>
  )
}

function renderEstadoDominical(estadoRecargoDominical) {
  if (!estadoRecargoDominical?.etiqueta) return null

  const horas = Number(estadoRecargoDominical.horasDominicales) || 0
  const detalleHoras = horas > 0 ? ` · ${horas.toFixed(2)} h dominicales` : ''

  return (
    <span
      className={
        estadoRecargoDominical.activoAhora
          ? 'cronometro-turno__dominical cronometro-turno__dominical--activo'
          : 'cronometro-turno__dominical'
      }
    >
      {estadoRecargoDominical.etiqueta}
      {detalleHoras}
    </span>
  )
}

function renderEstadoNocturno(estadoRecargoNocturno) {
  if (!estadoRecargoNocturno?.etiqueta) return null

  const horas = Number(estadoRecargoNocturno.horasNocturnas) || 0
  const detalleHoras = horas > 0 ? ` · ${horas.toFixed(2)} h nocturnas` : ''

  return (
    <span
      className={
        estadoRecargoNocturno.activoAhora
          ? 'cronometro-turno__nocturno cronometro-turno__nocturno--activo'
          : 'cronometro-turno__nocturno'
      }
    >
      {estadoRecargoNocturno.etiqueta}
      {detalleHoras}
    </span>
  )
}

function CronometroTurnoWidget({
  tiempoMs,
  horasTurno = 0,
  estadoHorasExtra,
  estadoRecargoDominical,
  estadoRecargoNocturno,
  puntualidad = null,
  onFinalizar,
  finalizando,
  recordatorioActivo = false,
  onRecordatorioChange,
  onProbarAudio,
  probandoAudio = false,
  audioDisponible = false,
}) {
  const rootRef = useRef(null)
  const dragRef = useRef(null)
  const [posicion, setPosicion] = useState(
    () => leerPosicionGuardada() || posicionPorDefecto(),
  )
  const [colapsado, setColapsado] = useState(() => leerColapsadoGuardado())
  const [arrastrando, setArrastrando] = useState(false)

  const enDominical = Boolean(estadoRecargoDominical?.activoAhora)
  const enNocturno = Boolean(estadoRecargoNocturno?.activoAhora)
  const tiempoTexto = formatearTiempoLaborado(tiempoMs)

  const claseAside = [
    'cronometro-turno',
    colapsado ? 'cronometro-turno--colapsado' : '',
    arrastrando ? 'cronometro-turno--arrastrando' : '',
    enDominical ? 'cronometro-turno--dominical' : '',
    enNocturno ? 'cronometro-turno--nocturno' : '',
    puntualidad?.nivel === 'baja' ? 'cronometro-turno--puntualidad-baja' : '',
    puntualidad?.nivel === 'media' ? 'cronometro-turno--puntualidad-media' : '',
  ]
    .filter(Boolean)
    .join(' ')

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_POS, JSON.stringify(posicion))
    } catch {
      // ignore
    }
  }, [posicion])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_COLLAPSED, colapsado ? '1' : '0')
    } catch {
      // ignore
    }
  }, [colapsado])

  useEffect(() => {
    const reclamarDentroPantalla = () => {
      const el = rootRef.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      setPosicion((prev) => {
        const next = clampearPosicion(prev.x, prev.y, rect.width, rect.height)
        if (next.x === prev.x && next.y === prev.y) return prev
        return next
      })
    }

    reclamarDentroPantalla()
    window.addEventListener('resize', reclamarDentroPantalla)
    return () => window.removeEventListener('resize', reclamarDentroPantalla)
  }, [colapsado])

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

    const ancho = el.offsetWidth
    const alto = el.offsetHeight
    const next = clampearPosicion(
      event.clientX - drag.offsetX,
      event.clientY - drag.offsetY,
      ancho,
      alto,
    )
    setPosicion(next)
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

  const toggleColapsado = (event) => {
    event.stopPropagation()
    if (dragRef.current?.moved) return
    setColapsado((prev) => !prev)
  }

  return (
    <aside
      ref={rootRef}
      className={claseAside}
      aria-live="polite"
      style={{
        top: posicion.y,
        left: posicion.x,
        right: 'auto',
        bottom: 'auto',
      }}
    >
      <div
        className="cronometro-turno__barra"
        onPointerDown={iniciarArrastre}
        onPointerMove={moverArrastre}
        onPointerUp={terminarArrastre}
        onPointerCancel={terminarArrastre}
      >
        <button
          type="button"
          className="cronometro-turno__toggle"
          data-no-drag="true"
          onClick={toggleColapsado}
          aria-expanded={!colapsado}
          aria-label={colapsado ? 'Expandir cronómetro' : 'Contraer cronómetro'}
          title={colapsado ? 'Expandir' : 'Contraer'}
        >
          {colapsado ? '▸' : '▾'}
        </button>

        <div className="cronometro-turno__resumen">
          <span className="cronometro-turno__estado">En turno</span>
          <span className="cronometro-turno__tiempo">{tiempoTexto}</span>
        </div>

        <span className="cronometro-turno__agarre" aria-hidden="true">
          ⠿
        </span>
      </div>

      {!colapsado ? (
        <div className="cronometro-turno__cuerpo">
          <div className="cronometro-turno__info">
            {renderPuntualidad(puntualidad)}
            {renderEstadoExtra({ horasTurno, estadoHorasExtra })}
            {renderEstadoDominical(estadoRecargoDominical)}
            {renderEstadoNocturno(estadoRecargoNocturno)}
          </div>

          <div className="cronometro-turno__recordatorio" data-no-drag="true">
            <label className="cronometro-turno__switch">
              <input
                type="checkbox"
                checked={Boolean(recordatorioActivo)}
                onChange={(e) => onRecordatorioChange?.(e.target.checked)}
                disabled={!audioDisponible}
              />
              <span>Reproducir recordatorio</span>
            </label>
            <p className="cronometro-turno__recordatorio-hint">
              {audioDisponible
                ? 'Cada 30 min mientras esté activo'
                : 'Sin audio configurado en Eventos'}
            </p>
            <button
              type="button"
              className="cronometro-turno__btn cronometro-turno__btn--secondary"
              onClick={onProbarAudio}
              disabled={!audioDisponible || probandoAudio || finalizando}
            >
              {probandoAudio ? 'Reproduciendo…' : 'Probar audio'}
            </button>
          </div>

          <button
            type="button"
            className="cronometro-turno__btn"
            data-no-drag="true"
            onClick={onFinalizar}
            disabled={finalizando}
          >
            {finalizando ? 'Finalizando…' : 'Terminar turno'}
          </button>
        </div>
      ) : null}
    </aside>
  )
}

export default CronometroTurnoWidget
