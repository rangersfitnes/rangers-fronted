import { useCallback, useEffect, useMemo, useState } from 'react'
import { useToast } from './Toast.jsx'
import LoadingOverlay from './LoadingOverlay.jsx'
import {
  DIAS_SEMANA,
  SEDE_HORARIOS,
  guardarHorariosAdmin,
  obtenerHorariosAdmin,
} from '../services/horariosService.js'
import './ConfiguracionHorarios.css'

function esCerrado(bloque) {
  const texto = `${bloque?.inicio ?? ''} ${bloque?.cierre ?? ''}`.toLowerCase()
  return texto.includes('cerrado')
}

function ConfiguracionHorarios() {
  const toast = useToast()
  const [horarios, setHorarios] = useState({})
  const [anotacion, setAnotacion] = useState('')
  const [diaNuevo, setDiaNuevo] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const diasOrdenados = useMemo(
    () => DIAS_SEMANA.filter((d) => horarios[d.key]),
    [horarios],
  )

  const diasDisponibles = useMemo(
    () => DIAS_SEMANA.filter((d) => !horarios[d.key]),
    [horarios],
  )

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const data = await obtenerHorariosAdmin(SEDE_HORARIOS)
      setHorarios(data.horarios || {})
      setAnotacion(data.anotacion || '')
    } catch (err) {
      toast.error(err.message || 'No se pudieron cargar los horarios')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    cargar()
  }, [cargar])

  const actualizarDia = (key, campo, valor) => {
    setHorarios((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [campo]: valor,
      },
    }))
  }

  const marcarCerrado = (key, cerrado) => {
    setHorarios((prev) => ({
      ...prev,
      [key]: cerrado
        ? { inicio: '', cierre: 'Cerrado' }
        : { inicio: prev[key]?.inicio === 'Cerrado' ? '' : prev[key]?.inicio ?? '', cierre: '' },
    }))
  }

  const agregarDia = () => {
    if (!diaNuevo || horarios[diaNuevo]) return
    setHorarios((prev) => ({
      ...prev,
      [diaNuevo]: { inicio: '', cierre: '' },
    }))
    setDiaNuevo('')
  }

  const quitarDia = (key) => {
    setHorarios((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }

  const handleGuardar = async () => {
    setSaving(true)
    try {
      const data = await guardarHorariosAdmin(
        SEDE_HORARIOS,
        horarios,
        anotacion,
      )
      setHorarios(data.horarios || {})
      setAnotacion(data.anotacion || '')
      toast.success('Horarios guardados correctamente')
    } catch (err) {
      toast.error(err.message || 'No se pudieron guardar los horarios')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="ag-page__view pf-horarios">
      <header className="ag-page__view-header ag-page__view-header--with-action">
        <div>
          <h1 className="ag-page__title">Horarios de atención</h1>
          <p className="ag-page__subtitle">
            Configura los horarios por día para la sede Alta Suiza. Solo se
            muestran en el inicio los días que agregues aquí.
          </p>
        </div>
        <button
          type="button"
          className="ag-action-btn"
          onClick={handleGuardar}
          disabled={saving || loading}
        >
          Guardar horarios
        </button>
      </header>

      <div className="ag-panel pf-horarios__panel">
        {diasOrdenados.length === 0 && !loading && (
          <p className="ag-panel__empty">
            Aún no hay días configurados. Agrega al menos un día de la semana.
          </p>
        )}

        <ul className="pf-horarios__lista">
          {diasOrdenados.map((dia) => {
            const bloque = horarios[dia.key]
            const cerrado = esCerrado(bloque)

            return (
              <li key={dia.key} className="pf-horarios__fila">
                <div className="pf-horarios__fila-top">
                  <span className="pf-horarios__dia-nombre">{dia.label}</span>
                  <button
                    type="button"
                    className="pf-horarios__quitar"
                    onClick={() => quitarDia(dia.key)}
                  >
                    Quitar día
                  </button>
                </div>

                <label className="pf-horarios__cerrado">
                  <input
                    type="checkbox"
                    checked={cerrado}
                    onChange={(e) => marcarCerrado(dia.key, e.target.checked)}
                  />
                  <span>Cerrado</span>
                </label>

                {!cerrado && (
                  <div className="pf-horarios__campos">
                    <label className="pf-horarios__campo">
                      <span>Inicio</span>
                      <input
                        type="text"
                        value={bloque?.inicio ?? ''}
                        onChange={(e) =>
                          actualizarDia(dia.key, 'inicio', e.target.value)
                        }
                        placeholder="5:30 a.m."
                      />
                    </label>
                    <label className="pf-horarios__campo">
                      <span>Cierre</span>
                      <input
                        type="text"
                        value={bloque?.cierre ?? ''}
                        onChange={(e) =>
                          actualizarDia(dia.key, 'cierre', e.target.value)
                        }
                        placeholder="9:00 p.m."
                      />
                    </label>
                  </div>
                )}
              </li>
            )
          })}
        </ul>

        {diasDisponibles.length > 0 && (
          <div className="pf-horarios__agregar">
            <label className="pf-horarios__campo pf-horarios__campo--select">
              <span>Agregar día</span>
              <select
                value={diaNuevo}
                onChange={(e) => setDiaNuevo(e.target.value)}
              >
                <option value="">Seleccionar…</option>
                {diasDisponibles.map((d) => (
                  <option key={d.key} value={d.key}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="ag-action-btn ag-action-btn--ghost"
              onClick={agregarDia}
              disabled={!diaNuevo}
            >
              Agregar
            </button>
          </div>
        )}
      </div>

      <div className="ag-panel pf-horarios__anotacion-panel">
        <label className="pf-horarios__campo pf-horarios__campo--anotacion">
          <span>Anotación</span>
          <textarea
            value={anotacion}
            onChange={(e) => setAnotacion(e.target.value)}
            placeholder="Mensaje visible para los visitantes (opcional)"
            rows={4}
          />
        </label>
      </div>

      <LoadingOverlay visible={loading || saving} label={saving ? 'Guardando' : 'Cargando'} />
    </section>
  )
}

export default ConfiguracionHorarios
