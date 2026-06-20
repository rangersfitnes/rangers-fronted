import { useState } from 'react'
import FinanzasSubvistaHeader from '../components/FinanzasSubvistaHeader.jsx'
import VistaReportesFinancieros from './AdministracionGeneralReportesFinancieros.jsx'
import FinanzasResumenIngresosEgresos from './FinanzasResumenIngresosEgresos.jsx'
import FinanzasRegistrarSalidas from './FinanzasRegistrarSalidas.jsx'
import './AdministracionGeneral.css'

const FINANZAS_CARDS = [
  {
    id: 'reportes',
    titulo: 'Histórico de ingresos',
    descripcion: 'Consulta ingresos por fecha, elimina movimientos y exporta PDF o Excel.',
    icono: '📊',
  },
  {
    id: 'salidas',
    titulo: 'Registrar salidas',
    descripcion: 'Registra egresos, gastos operativos y pagos salientes del box.',
    icono: '↘',
  },
  {
    id: 'nominas',
    titulo: 'Liquidar nóminas',
    descripcion: 'Calcula y registra pagos de nómina al equipo.',
    icono: '👥',
  },
  {
    id: 'resumen',
    titulo: 'Ingresos y egresos',
    descripcion: 'Detalle de ingresos y egresos por periodo con exportación PDF o Excel.',
    icono: '⚖',
  },
]

function FinanzasPlaceholder({ titulo, subtitulo, onVolver, mensaje }) {
  return (
    <section className="ag-page__view">
      <FinanzasSubvistaHeader titulo={titulo} subtitulo={subtitulo} onVolver={onVolver} />
      <div className="ag-panel">
        <p className="ag-panel__empty">{mensaje}</p>
      </div>
    </section>
  )
}

function VistaFinanzasHub({ onSeleccionar }) {
  return (
    <section className="ag-page__view">
      <header className="ag-page__view-header">
        <h1 className="ag-page__title">Finanzas</h1>
        <p className="ag-page__subtitle">
          Accesos rápidos para ingresos, egresos y control del box
        </p>
      </header>

      <div className="ag-finanzas__grid">
        {FINANZAS_CARDS.map((card) => (
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

function VistaFinanzas() {
  const [seccion, setSeccion] = useState(null)

  const volver = () => setSeccion(null)

  if (seccion === 'reportes') {
    return <VistaReportesFinancieros onVolver={volver} />
  }

  if (seccion === 'salidas') {
    return <FinanzasRegistrarSalidas onVolver={volver} />
  }

  if (seccion === 'nominas') {
    return (
      <FinanzasPlaceholder
        titulo="Liquidar nóminas"
        subtitulo="Pagos al equipo"
        onVolver={volver}
        mensaje="Próximamente podrás liquidar y registrar nóminas del personal desde aquí."
      />
    )
  }

  if (seccion === 'resumen') {
    return <FinanzasResumenIngresosEgresos onVolver={volver} />
  }

  return <VistaFinanzasHub onSeleccionar={setSeccion} />
}

export default VistaFinanzas
