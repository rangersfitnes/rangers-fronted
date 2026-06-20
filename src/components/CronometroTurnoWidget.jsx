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

function CronometroTurnoWidget({ tiempoMs, onFinalizar, finalizando }) {
  return (
    <aside className="cronometro-turno" aria-live="polite">
      <div className="cronometro-turno__info">
        <span className="cronometro-turno__estado">En turno</span>
        <span className="cronometro-turno__tiempo">
          {formatearTiempoLaborado(tiempoMs)}
        </span>
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
