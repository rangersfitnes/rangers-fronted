import { useCallback, useEffect, useState } from 'react'
import TurnosActivosPanel from '../components/TurnosActivosPanel.jsx'
import GestionHumanaColaboradores from './GestionHumanaColaboradores.jsx'
import GestionHumanaEsquemasPago from './GestionHumanaEsquemasPago.jsx'
import GestionHumanaHorasExtra from './GestionHumanaHorasExtra.jsx'
import GestionHumanaLiquidarNominas from './GestionHumanaLiquidarNominas.jsx'
import GestionHumanaMallas from './GestionHumanaMallas.jsx'
import { contarHorasExtraPendientes } from '../services/horasExtraService.js'
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
  {
    id: 'mallas',
    titulo: 'Mallas',
    descripcion:
      'Planifica los horarios semanales de cada colaborador por sede.',
    icono: '📅',
  },
  {
    id: 'horas-extra',
    titulo: 'Aprobar horas extra',
    descripcion:
      'Revisa y aprueba las horas extra generadas por el cronometraje.',
    icono: '⏱',
    notificacion: true,
  },
  {
    id: 'liquidar-nominas',
    titulo: 'Liquidar nóminas',
    descripcion:
      'Consulta registros aprobados y prepara la liquidación de nómina.',
    icono: '💰',
  },
]

function VistaGestionHumanaHub({ onSeleccionar, pendientesHorasExtra }) {
  return (
    <section className="ag-page__view">
      <header className="ag-page__view-header">
        <h1 className="ag-page__title">Gestión humana</h1>
        <p className="ag-page__subtitle">
          Accesos rápidos para nómina, colaboradores y esquemas de pago
        </p>
      </header>

      <TurnosActivosPanel />

      <div className="ag-finanzas__grid">
        {GESTION_HUMANA_CARDS.map((card) => {
          const pendientes =
            card.notificacion && pendientesHorasExtra > 0
              ? pendientesHorasExtra
              : 0

          return (
            <button
              key={card.id}
              type="button"
              className={`ag-finanzas__card${
                pendientes > 0 ? ' ag-finanzas__card--alerta' : ''
              }`}
              onClick={() => onSeleccionar(card.id)}
            >
              <span className="ag-finanzas__card-top">
                <span className="ag-finanzas__card-icon" aria-hidden="true">
                  {card.icono}
                </span>
                {pendientes > 0 ? (
                  <span
                    className="ag-finanzas__card-badge"
                    aria-label={`${pendientes} horas extra pendientes`}
                  >
                    {pendientes}
                  </span>
                ) : null}
              </span>
              <span className="ag-finanzas__card-title">{card.titulo}</span>
              <span className="ag-finanzas__card-desc">{card.descripcion}</span>
              {pendientes > 0 ? (
                <span className="ag-finanzas__card-alerta">
                  {pendientes} solicitud{pendientes === 1 ? '' : 'es'} por aprobar
                </span>
              ) : null}
            </button>
          )
        })}
      </div>
    </section>
  )
}

function VistaGestionHumana() {
  const [seccion, setSeccion] = useState(null)
  const [pendientesHorasExtra, setPendientesHorasExtra] = useState(0)

  const cargarPendientes = useCallback(async () => {
    try {
      const total = await contarHorasExtraPendientes()
      setPendientesHorasExtra(total)
    } catch {
      setPendientesHorasExtra(0)
    }
  }, [])

  useEffect(() => {
    cargarPendientes()
  }, [cargarPendientes, seccion])

  const volver = () => setSeccion(null)

  if (seccion === 'esquemas-pago') {
    return <GestionHumanaEsquemasPago onVolver={volver} />
  }

  if (seccion === 'colaboradores') {
    return <GestionHumanaColaboradores onVolver={volver} />
  }

  if (seccion === 'mallas') {
    return <GestionHumanaMallas onVolver={volver} />
  }

  if (seccion === 'horas-extra') {
    return (
      <GestionHumanaHorasExtra
        onVolver={volver}
        onAprobadasChange={cargarPendientes}
      />
    )
  }

  if (seccion === 'liquidar-nominas') {
    return <GestionHumanaLiquidarNominas onVolver={volver} />
  }

  return (
    <VistaGestionHumanaHub
      onSeleccionar={setSeccion}
      pendientesHorasExtra={pendientesHorasExtra}
    />
  )
}

export default VistaGestionHumana
