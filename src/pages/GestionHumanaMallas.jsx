import './AdministracionGeneral.css'
import './GestionHumanaMallas.css'

const DIAS_SEMANA = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
]

const FASES = [
  {
    titulo: 'Fase 1 — Malla semanal',
    items: [
      'Tabla Lun–Dom por colaborador con bloques de entrada y salida.',
      'Selector de semana y filtro por sede.',
      'Copiar semana anterior y marcar días libres.',
    ],
  },
  {
    titulo: 'Fase 2 — Plantilla base',
    items: [
      'Horario recurrente por colaborador (se repite cada semana).',
      'Ajustes puntuales sobre una semana sin perder la plantilla.',
    ],
  },
  {
    titulo: 'Fase 3 — Plan vs real',
    items: [
      'Comparar malla con turnos del cronometraje.',
      'Alertas de ausencia, llegada tarde o jornada más larga de lo planeado.',
    ],
  },
]

function GestionHumanaMallas({ onVolver }) {
  return (
    <section className="ag-page__view">
      <header className="ag-page__view-header ag-page__view-header--with-action ag-finanzas__sub-header">
        <div className="ag-finanzas__sub-header-main">
          <button
            type="button"
            className="ag-action-btn ag-action-btn--ghost ag-finanzas__volver"
            onClick={onVolver}
          >
            ← Volver a Gestión humana
          </button>
          <div>
            <h1 className="ag-page__title">Mallas</h1>
            <p className="ag-page__subtitle">
              Horarios semanales planificados del personal
            </p>
          </div>
        </div>
      </header>

      <div className="ag-mallas__intro ag-panel">
        <p className="ag-mallas__intro-lead">
          Las <strong>mallas</strong> registran cuándo <em>debería</em> trabajar
          cada colaborador. Son distintas de los horarios de apertura del box y de
          los turnos reales del cronómetro (que miden lo efectivamente laborado).
        </p>
      </div>

      <div className="ag-mallas__grid">
        <section className="ag-mallas__panel ag-panel">
          <h2 className="ag-mallas__panel-title">Propuesta de control</h2>
          <ul className="ag-mallas__lista">
            <li>
              <strong>Vista matriz:</strong> filas = colaboradores, columnas =
              días de la semana. Cada celda puede tener uno o más bloques
              (ej. 06:00–14:00).
            </li>
            <li>
              <strong>Alcance por semana:</strong> cada malla se identifica con
              la fecha de inicio (lunes) y la sede. Permite planificar semana a
              semana sin sobrescribir el historial.
            </li>
            <li>
              <strong>Estados por celda:</strong> labora, libre, vacaciones o
              permiso. Días libres quedan explícitos y no se confunden con
              olvidos.
            </li>
            <li>
              <strong>Total planificado:</strong> suma de horas por colaborador y
              por sede, cruzada con las horas del esquema de pago.
            </li>
            <li>
              <strong>Integración futura:</strong> cruce malla ↔ cronometraje para
              detectar incumplimientos antes de liquidar nómina.
            </li>
          </ul>
        </section>

        <section className="ag-mallas__panel ag-panel">
          <h2 className="ag-mallas__panel-title">Modelo en Firestore (propuesto)</h2>
          <pre className="ag-mallas__codigo">
{`nominas/mallas/items/{mallaId}
  sede: "alta-suiza"
  semanaInicio: "2026-06-16"   // lunes ISO
  colaboradorUid: "..."
  colaboradorNombre: "..."
  bloques: {
    lunes:    [{ inicio: "06:00", fin: "14:00", tipo: "labora" }],
    martes:   [{ inicio: "06:00", fin: "14:00", tipo: "labora" }],
    miercoles: [],
    ...
  }
  totalHorasPlanificadas: 16
  actualizadoEn, actualizadoPorUid`}
          </pre>
          <p className="ag-mallas__nota">
            Un documento por colaborador y semana. Alternativa: un solo documento
            por semana+sede con un mapa de colaboradores si prefieres cargar toda
            la sede de una vez.
          </p>
        </section>
      </div>

      <section className="ag-mallas__preview ag-panel">
        <h2 className="ag-mallas__panel-title">Vista previa de la tabla</h2>
        <p className="ag-mallas__preview-desc">
          Ejemplo de cómo se vería la grilla semanal (implementación pendiente):
        </p>
        <div className="ag-finanzas__tabla-wrap">
          <table className="ag-finanzas__tabla ag-mallas__tabla">
            <thead>
              <tr>
                <th>Colaborador</th>
                {DIAS_SEMANA.map((dia) => (
                  <th key={dia}>{dia}</th>
                ))}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Ana García</td>
                <td>
                  <span className="ag-mallas__bloque">06:00–14:00</span>
                </td>
                <td>
                  <span className="ag-mallas__bloque">06:00–14:00</span>
                </td>
                <td>
                  <span className="ag-mallas__bloque ag-mallas__bloque--libre">
                    Libre
                  </span>
                </td>
                <td>
                  <span className="ag-mallas__bloque">06:00–14:00</span>
                </td>
                <td>
                  <span className="ag-mallas__bloque">06:00–14:00</span>
                </td>
                <td>
                  <span className="ag-mallas__bloque ag-mallas__bloque--libre">
                    Libre
                  </span>
                </td>
                <td>
                  <span className="ag-mallas__bloque ag-mallas__bloque--libre">
                    Libre
                  </span>
                </td>
                <td className="ag-mallas__total">32 h</td>
              </tr>
              <tr>
                <td>Carlos Ruiz</td>
                <td colSpan={7}>
                  <span className="ag-mallas__placeholder">
                    Sin malla asignada esta semana
                  </span>
                </td>
                <td className="ag-mallas__total">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="ag-mallas__fases">
        {FASES.map((fase) => (
          <article key={fase.titulo} className="ag-mallas__fase ag-panel">
            <h3 className="ag-mallas__fase-title">{fase.titulo}</h3>
            <ul className="ag-mallas__lista">
              {fase.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <div className="ag-mallas__siguiente ag-panel ag-mallas__panel--destacado">
        <h2 className="ag-mallas__panel-title">Siguiente paso</h2>
        <p className="ag-panel__empty">
          Cuando confirmes este enfoque, implementamos la Fase 1: editor de malla
          semanal con guardado en Firestore, selector de semana y vista por sede.
        </p>
      </div>
    </section>
  )
}

export default GestionHumanaMallas
