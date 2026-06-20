import { Link } from 'react-router-dom'
import './Cuenta.css'

function CuentaAsistencias() {
  return (
    <main className="cuenta-page">
      <div className="cuenta-page__inner">
        <h1 className="cuenta-page__title">Asistencias</h1>
        <p className="cuenta-page__subtitle">
          Aquí verás el historial de tus asistencias al box.
        </p>
        <div className="cuenta-page__card">
          <p className="cuenta-page__empty">
            Esta sección estará disponible pronto.
          </p>
        </div>
        <p className="cuenta-page__subtitle" style={{ marginTop: '1.5rem' }}>
          <Link to="/" style={{ color: '#f97316' }}>
            Volver al inicio
          </Link>
        </p>
      </div>
    </main>
  )
}

export default CuentaAsistencias
