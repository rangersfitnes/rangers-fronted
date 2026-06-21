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

function CronometroTurnoWidget({
  tiempoMs,
  horasTurno = 0,
  estadoHorasExtra,
  onFinalizar,
  finalizando,
}) {
  return (
    <aside className="cronometro-turno" aria-live="polite">
      <div className="cronometro-turno__info">
        <span className="cronometro-turno__estado">En turno</span>
        <span className="cronometro-turno__tiempo">
          {formatearTiempoLaborado(tiempoMs)}
        </span>
        {renderEstadoExtra({ horasTurno, estadoHorasExtra })}
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
