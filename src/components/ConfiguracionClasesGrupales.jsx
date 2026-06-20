import { useCallback, useEffect, useMemo, useState } from 'react'
import { useToast } from './Toast.jsx'
import LoadingOverlay from './LoadingOverlay.jsx'
import AgregarDiaClasesModal from './AgregarDiaClasesModal.jsx'
import HoraClaseModal from './HoraClaseModal.jsx'
import { DIAS_SEMANA } from '../services/horariosService.js'
import {
  SEDE_HORARIOS,
  guardarClasesGrupalesAdmin,
  obtenerClasesGrupalesAdmin,
} from '../services/clasesGrupalesService.js'
import './ConfiguracionClasesGrupales.css'

function generarIdClase() {
  return `clase-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function crearClasesVacias(cantidad) {
  const total = Math.min(24, Math.max(1, Number(cantidad) || 1))
  return Array.from({ length: total }, (_, i) => ({
    id: generarIdClase(),
    nombre: '',
    descripcion: '',
    horaInicio: '',
    orden: i,
  }))
}

function formatearHora12(hora24) {
  if (!hora24 || !/^\d{2}:\d{2}$/.test(hora24)) return 'Sin hora'
  const [hStr, mStr] = hora24.split(':')
  let h = Number(hStr)
  const m = mStr
  const periodo = h >= 12 ? 'p.m.' : 'a.m.'
  if (h === 0) h = 12
  else if (h > 12) h -= 12
  return `${h}:${m} ${periodo}`
}

function ConfiguracionClasesGrupales() {
  const toast = useToast()
  const [dias, setDias] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [modalAgregar, setModalAgregar] = useState(false)
  const [horaModal, setHoraModal] = useState(null)

  const diasOrdenados = useMemo(
    () => DIAS_SEMANA.filter((d) => dias[d.key]),
    [dias],
  )

  const diasDisponibles = useMemo(
    () => DIAS_SEMANA.filter((d) => !dias[d.key]),
    [dias],
  )

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const data = await obtenerClasesGrupalesAdmin(SEDE_HORARIOS)
      setDias(data.dias || {})
    } catch (err) {
      toast.error(err.message || 'No se pudo cargar el cronograma')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    cargar()
  }, [cargar])

  const actualizarClase = (diaKey, claseId, campo, valor) => {
    setDias((prev) => ({
      ...prev,
      [diaKey]: {
        ...prev[diaKey],
        clases: prev[diaKey].clases.map((c) =>
          c.id === claseId ? { ...c, [campo]: valor } : c,
        ),
      },
    }))
  }

  const quitarClase = (diaKey, claseId) => {
    setDias((prev) => {
      const clases = prev[diaKey].clases.filter((c) => c.id !== claseId)
      if (clases.length === 0) {
        const next = { ...prev }
        delete next[diaKey]
        return next
      }
      return {
        ...prev,
        [diaKey]: { ...prev[diaKey], clases },
      }
    })
  }

  const agregarClaseAlDia = (diaKey) => {
    setDias((prev) => ({
      ...prev,
      [diaKey]: {
        ...prev[diaKey],
        clases: [
          ...prev[diaKey].clases,
          {
            id: generarIdClase(),
            nombre: '',
            descripcion: '',
            horaInicio: '',
            orden: prev[diaKey].clases.length,
          },
        ],
      },
    }))
  }

  const quitarDia = (diaKey) => {
    setDias((prev) => {
      const next = { ...prev }
      delete next[diaKey]
      return next
    })
  }

  const handleAgregarDia = ({ dia, cantidad }) => {
    const meta = DIAS_SEMANA.find((d) => d.key === dia)
    if (!meta || dias[dia]) return

    setDias((prev) => ({
      ...prev,
      [dia]: {
        dia,
        diaLabel: meta.label,
        clases: crearClasesVacias(cantidad),
      },
    }))
    toast.success(`${meta.label} agregado con ${cantidad} clase(s)`)
  }

  const handleGuardar = async () => {
    setSaving(true)
    try {
      const data = await guardarClasesGrupalesAdmin(SEDE_HORARIOS, dias)
      setDias(data.dias || {})
      toast.success('Cronograma de clases guardado')
    } catch (err) {
      toast.error(err.message || 'No se pudo guardar el cronograma')
    } finally {
      setSaving(false)
    }
  }

  const claseHoraTarget = horaModal
    ? dias[horaModal.diaKey]?.clases?.find((c) => c.id === horaModal.claseId)
    : null

  return (
    <section className="ag-page__view pf-clases-grupales">
      <header className="ag-page__view-header ag-page__view-header--with-action">
        <div>
          <h1 className="ag-page__title">Clases grupales</h1>
        </div>
        <div className="pf-clases-grupales__header-actions">
          <button
            type="button"
            className="ag-action-btn ag-action-btn--ghost"
            onClick={() => setModalAgregar(true)}
            disabled={diasDisponibles.length === 0 || loading}
          >
            + Agregar día
          </button>
          <button
            type="button"
            className="ag-action-btn"
            onClick={handleGuardar}
            disabled={saving || loading}
          >
            Guardar cronograma
          </button>
        </div>
      </header>

      <div className="ag-panel pf-clases-grupales__panel">
        {diasOrdenados.length === 0 && !loading && (
          <p className="ag-panel__empty">
            Aún no hay días en el cronograma. Usa «Agregar día» para configurar las
            clases grupales de la semana.
          </p>
        )}

        {diasOrdenados.map((diaMeta) => {
          const bloque = dias[diaMeta.key]
          if (!bloque) return null

          return (
            <section key={diaMeta.key} className="pf-clases-grupales__dia">
              <header className="pf-clases-grupales__dia-head">
                <div>
                  <h2 className="pf-clases-grupales__dia-title">{diaMeta.label}</h2>
                  <p className="pf-clases-grupales__dia-meta">
                    {bloque.clases.length} clase(s) · documento{' '}
                    <span className="pf-clases-grupales__doc-id">{diaMeta.key}</span>
                  </p>
                </div>
                <div className="pf-clases-grupales__dia-actions">
                  <button
                    type="button"
                    className="ag-action-btn ag-action-btn--ghost pf-clases-grupales__btn-sm"
                    onClick={() => agregarClaseAlDia(diaMeta.key)}
                  >
                    + Clase
                  </button>
                  <button
                    type="button"
                    className="pf-clases-grupales__quitar-dia"
                    onClick={() => quitarDia(diaMeta.key)}
                  >
                    Quitar día
                  </button>
                </div>
              </header>

              <ul className="pf-clases-grupales__lista">
                {bloque.clases.map((clase, index) => (
                  <li key={clase.id} className="pf-clases-grupales__card">
                    <div className="pf-clases-grupales__card-top">
                      <span className="pf-clases-grupales__card-num">
                        Clase {index + 1}
                      </span>
                      <button
                        type="button"
                        className="pf-clases-grupales__quitar"
                        onClick={() => quitarClase(diaMeta.key, clase.id)}
                      >
                        Eliminar
                      </button>
                    </div>

                    <label className="pf-clases-grupales__campo">
                      <span>Nombre</span>
                      <input
                        type="text"
                        value={clase.nombre}
                        onChange={(e) =>
                          actualizarClase(
                            diaMeta.key,
                            clase.id,
                            'nombre',
                            e.target.value,
                          )
                        }
                        placeholder="Ej. Funcional AM"
                      />
                    </label>

                    <label className="pf-clases-grupales__campo">
                      <span>Descripción</span>
                      <textarea
                        value={clase.descripcion}
                        onChange={(e) =>
                          actualizarClase(
                            diaMeta.key,
                            clase.id,
                            'descripcion',
                            e.target.value,
                          )
                        }
                        placeholder="Detalle de la clase (opcional)"
                        rows={2}
                      />
                    </label>

                    <div className="pf-clases-grupales__hora-row">
                      <div className="pf-clases-grupales__hora-valor">
                        <span className="pf-clases-grupales__hora-label">
                          Hora de inicio
                        </span>
                        <strong>
                          {clase.horaInicio
                            ? formatearHora12(clase.horaInicio)
                            : 'Sin definir'}
                        </strong>
                        {clase.horaInicio ? (
                          <span className="pf-clases-grupales__hora-24">
                            {clase.horaInicio}
                          </span>
                        ) : null}
                      </div>
                      <button
                        type="button"
                        className="ag-action-btn ag-action-btn--ghost pf-clases-grupales__btn-sm"
                        onClick={() =>
                          setHoraModal({
                            diaKey: diaMeta.key,
                            claseId: clase.id,
                          })
                        }
                      >
                        Elegir hora
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )
        })}
      </div>

      <AgregarDiaClasesModal
        open={modalAgregar}
        onClose={() => setModalAgregar(false)}
        onSubmit={handleAgregarDia}
        diasDisponibles={diasDisponibles}
      />

      <HoraClaseModal
        open={Boolean(horaModal)}
        onClose={() => setHoraModal(null)}
        valorInicial={claseHoraTarget?.horaInicio ?? ''}
        nombreClase={claseHoraTarget?.nombre || 'Clase'}
        onConfirm={(hora) => {
          if (!horaModal) return
          actualizarClase(horaModal.diaKey, horaModal.claseId, 'horaInicio', hora)
        }}
      />

      <LoadingOverlay
        visible={loading || saving}
        label={saving ? 'Guardando cronograma' : 'Cargando cronograma'}
      />
    </section>
  )
}

export default ConfiguracionClasesGrupales
