import './CronometroTurnoWidget.css'

export function formatearTiempoLaborado(ms) {
  const totalSeg = Math.max(0, Math.floor(Number(ms) / 1000))
  const horas = Math.floor(totalSeg / 3600)
  const minutos = Math.floor((totalSeg % 3600) / 60)
  const segundos = totalSeg % 60

  return [horas, minutos, segundos]
    .map((valor) => String(valor).padStart(2, '0'))
    .join(':')
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
      <span className="cronometro-turno__jornada">
        Jornada no configurada
      </span>
    )
  }

  if (!estadoHorasExtra || estadoHorasExtra.enJornada) {
    return (
      <span className="cronometro-turno__jornada">
        Jornada: {horasTurno} h
      </span>
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
  const detalleHoras =
    horas > 0 ? ` · ${horas.toFixed(2)} h dominicales` : ''

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
  const detalleHoras =
    horas > 0 ? ` · ${horas.toFixed(2)} h nocturnas` : ''

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
}) {
  const enDominical = Boolean(estadoRecargoDominical?.activoAhora)
  const enNocturno = Boolean(estadoRecargoNocturno?.activoAhora)

  const claseAside = [
    'cronometro-turno',
    enDominical ? 'cronometro-turno--dominical' : '',
    enNocturno ? 'cronometro-turno--nocturno' : '',
    puntualidad?.nivel === 'baja' ? 'cronometro-turno--puntualidad-baja' : '',
    puntualidad?.nivel === 'media' ? 'cronometro-turno--puntualidad-media' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <aside className={claseAside} aria-live="polite">
      <div className="cronometro-turno__info">
        <span className="cronometro-turno__estado">En turno</span>
        <span className="cronometro-turno__tiempo">
          {formatearTiempoLaborado(tiempoMs)}
        </span>
        {renderPuntualidad(puntualidad)}
        {renderEstadoExtra({ horasTurno, estadoHorasExtra })}
        {renderEstadoDominical(estadoRecargoDominical)}
        {renderEstadoNocturno(estadoRecargoNocturno)}
      </div>
      <button
        type="button"
        className="cronometro-turno__btn"
        onClick={onFinalizar}
        disabled={finalizando}
      >
        {finalizando ? 'Finalizando…' : 'Terminar turno'}
      </button>
    </aside>
  )
}

export default CronometroTurnoWidget
