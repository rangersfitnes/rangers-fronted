import { useState } from 'react'
import GestionHumanaColaboradores from './GestionHumanaColaboradores.jsx'
import GestionHumanaEsquemasPago from './GestionHumanaEsquemasPago.jsx'
import './AdministracionGeneral.css'

const GESTION_HUMANA_CARDS = [
  {
    id: 'esquemas-pago',
    titulo: 'Esquemas de pagos',
    descripcion: 'Define plantillas y reglas de pago para el equipo del box.',
    icono: '💼',
  },
  {
    id: 'colaboradores',
    titulo: 'Colaboradores',
    descripcion: 'Administra el personal, roles y datos de contacto.',
    icono: '👤',
  },
]

function VistaGestionHumanaHub({ onSeleccionar }) {
  return (
    <section className="ag-page__view">
      <header className="ag-page__view-header">
        <h1 className="ag-page__title">Gestión humana</h1>
        <p className="ag-page__subtitle">
          Accesos rápidos para nómina, colaboradores y esquemas de pago
        </p>
      </header>

      <div className="ag-finanzas__grid">
        {GESTION_HUMANA_CARDS.map((card) => (
          <button
            key={card.id}
            type="button"
            className="ag-finanzas__card"
            onClick={() => onSeleccionar(card.id)}
          >
            <span className="ag-finanzas__card-icon" aria-hidden="true">
              {card.icono}
            </span>
            <span className="ag-finanzas__card-title">{card.titulo}</span>
            <span className="ag-finanzas__card-desc">{card.descripcion}</span>
          </button>
        ))}
      </div>
    </section>
  )
}

function VistaGestionHumana() {
  const [seccion, setSeccion] = useState(null)

  const volver = () => setSeccion(null)

  if (seccion === 'esquemas-pago') {
    return <GestionHumanaEsquemasPago onVolver={volver} />
  }

  if (seccion === 'colaboradores') {
    return <GestionHumanaColaboradores onVolver={volver} />
  }

  return <VistaGestionHumanaHub onSeleccionar={setSeccion} />
}

export default VistaGestionHumana
