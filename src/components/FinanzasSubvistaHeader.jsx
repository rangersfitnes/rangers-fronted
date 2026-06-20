export default function FinanzasSubvistaHeader({
  titulo,
  subtitulo,
  onVolver,
  volverA = 'Finanzas',
}) {
  return (
    <header className="ag-page__view-header ag-finanzas__sub-header">
      <button
        type="button"
        className="ag-action-btn ag-action-btn--ghost ag-finanzas__volver"
        onClick={onVolver}
      >
        ← Volver a {volverA}
      </button>
      <div>
        <h1 className="ag-page__title">{titulo}</h1>
        {subtitulo ? <p className="ag-page__subtitle">{subtitulo}</p> : null}
      </div>
    </header>
  )
}
