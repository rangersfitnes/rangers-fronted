import { useState } from 'react'
import './HorariosToggle.css'
import './UbicacionToggle.css'

const DIRECCION_LINEA_1 = 'Cra 20 # 73-10'
const DIRECCION_LINEA_2 = 'Alta Suiza, Manizales'
const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  `${DIRECCION_LINEA_1}, ${DIRECCION_LINEA_2}`,
)}`

function IconoUbicacion() {
  return (
    <svg
      className="horarios-toggle__icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function UbicacionToggle() {
  const [abierto, setAbierto] = useState(false)

  return (
    <div id="ubicacion" className="horarios-toggle ubicacion-toggle">
      <div
        className={`horarios-toggle__card${
          abierto ? ' horarios-toggle__card--open' : ''
        }`}
      >
        <button
          type="button"
          className="horarios-toggle__btn"
          onClick={() => setAbierto((prev) => !prev)}
          aria-expanded={abierto}
          aria-controls="ubicacion-panel"
        >
          <span className="horarios-toggle__btn-left">
            <IconoUbicacion />
            <span className="horarios-toggle__label">Ubicación</span>
          </span>
          <svg
            className={`horarios-toggle__chevron${
              abierto ? ' horarios-toggle__chevron--up' : ''
            }`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        <div
          id="ubicacion-panel"
          className={`horarios-toggle__panel${
            abierto ? ' horarios-toggle__panel--open' : ''
          }`}
          aria-hidden={!abierto}
        >
          <div className="horarios-toggle__panel-inner">
            <div className="ubicacion-toggle__content">
              <p className="ubicacion-toggle__sede">Rangers Box · Alta Suiza</p>
              <address className="ubicacion-toggle__direccion">
                {DIRECCION_LINEA_1}
                <br />
                {DIRECCION_LINEA_2}
              </address>
              <a
                href={MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="ubicacion-toggle__maps"
              >
                Ver en Google Maps
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UbicacionToggle
