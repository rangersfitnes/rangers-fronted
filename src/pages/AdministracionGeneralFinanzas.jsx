import { useCallback, useState } from 'react'
import LiquidezHistoricaPanel from '../components/LiquidezHistoricaPanel.jsx'
import { useToast } from '../components/Toast.jsx'
import { useLiquidezHistorica } from '../hooks/useLiquidezHistorica.js'
import { obtenerReporteFinanciero } from '../services/reportesFinancierosService.js'
import { exportarEstadoFinancieroExcel } from '../utils/exportReporteFinanciero.js'
import VistaReportesFinancieros from './AdministracionGeneralReportesFinancieros.jsx'
import FinanzasResumenIngresosEgresos from './FinanzasResumenIngresosEgresos.jsx'
import FinanzasRegistrarSalidas from './FinanzasRegistrarSalidas.jsx'
import FinanzasTraspasos from './FinanzasTraspasos.jsx'
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
    id: 'traspasos',
    titulo: 'Traspasos entre cuentas',
    descripcion:
      'Mueve dinero entre efectivo, transferencia y Wompi sin alterar la liquidez total.',
    icono: '⇄',
  },
  {
    id: 'resumen',
    titulo: 'Ingresos y egresos',
    descripcion: 'Detalle de ingresos y egresos por periodo con exportación PDF o Excel.',
    icono: '⚖',
  },
]

function VistaFinanzasHub({
  onSeleccionar,
  liquidez,
  loadingLiquidez,
  errorLiquidez,
  ultimaActualizacionLiquidez,
  onExportarEstadoFinanciero,
  exportandoEstadoFinanciero,
}) {
  return (
    <section className="ag-page__view">
      <header className="ag-page__view-header">
        <h1 className="ag-page__title">Finanzas</h1>
        <p className="ag-page__subtitle">
          Accesos rápidos para ingresos, egresos y control del box
        </p>
      </header>

      <LiquidezHistoricaPanel
        liquidez={liquidez}
        loading={loadingLiquidez}
        error={errorLiquidez}
        ultimaActualizacion={ultimaActualizacionLiquidez}
        onExportarExcel={onExportarEstadoFinanciero}
        exportandoExcel={exportandoEstadoFinanciero}
      />

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
  const toast = useToast()
  const [seccion, setSeccion] = useState(null)
  const [exportandoEstadoFinanciero, setExportandoEstadoFinanciero] = useState(false)
  const {
    liquidez,
    loading: loadingLiquidez,
    error: errorLiquidez,
    ultimaActualizacion: ultimaActualizacionLiquidez,
  } = useLiquidezHistorica({ activo: seccion === null })

  const volver = () => setSeccion(null)

  const handleExportarEstadoFinanciero = useCallback(async () => {
    setExportandoEstadoFinanciero(true)
    try {
      const reporte = await obtenerReporteFinanciero({ todoHistorial: true })
      exportarEstadoFinancieroExcel({ reporte, liquidez })
      toast.success(
        `Excel exportado con ${combinarConteoMovimientos(reporte)} movimiento(s)`,
      )
    } catch (err) {
      toast.error(err.message || 'No se pudo exportar el estado financiero')
    } finally {
      setExportandoEstadoFinanciero(false)
    }
  }, [liquidez, toast])

  if (seccion === 'reportes') {
    return <VistaReportesFinancieros onVolver={volver} />
  }

  if (seccion === 'salidas') {
    return <FinanzasRegistrarSalidas onVolver={volver} />
  }

  if (seccion === 'traspasos') {
    return <FinanzasTraspasos onVolver={volver} />
  }

  if (seccion === 'resumen') {
    return <FinanzasResumenIngresosEgresos onVolver={volver} />
  }

  return (
    <VistaFinanzasHub
      onSeleccionar={setSeccion}
      liquidez={liquidez}
      loadingLiquidez={loadingLiquidez}
      errorLiquidez={errorLiquidez}
      ultimaActualizacionLiquidez={ultimaActualizacionLiquidez}
      onExportarEstadoFinanciero={handleExportarEstadoFinanciero}
      exportandoEstadoFinanciero={exportandoEstadoFinanciero}
    />
  )
}

function combinarConteoMovimientos(reporte) {
  return (reporte?.movimientos?.length ?? 0) + (reporte?.egresos?.length ?? 0)
}

export default VistaFinanzas
