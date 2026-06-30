import { useCallback, useEffect, useMemo, useState } from 'react'
import ConfirmModal from '../components/ConfirmModal.jsx'
import LoadingOverlay from '../components/LoadingOverlay.jsx'
import MallaCeldaModal from '../components/MallaCeldaModal.jsx'
import { useToast } from '../components/Toast.jsx'
import { obtenerColaboradores } from '../services/colaboradoresService.js'
import {
  DIAS_SEMANA,
  SEDE_HORARIOS,
  SEDES,
} from '../services/horariosService.js'
import {
  aplicarPlantillasSemana,
  copiarSemanaAnteriorMallas,
  guardarMallasSemana,
  guardarPlantillasSede,
  obtenerMallasSemana,
  obtenerPlantillasSede,
} from '../services/mallasService.js'
import {
  calcularTotalHorasPlanificadas,
  claseBloqueCelda,
  construirEstadoEdicionDesdeMallas,
  construirEstadoEdicionDesdePlantillaBase,
  construirSlotsPlantillaParaGuardar,
  crearBloquesVacios,
  formatearEtiquetaSemana,
  formatearHorasTotal,
  hoyColombia,
  mallaTieneContenido,
  normalizarBloquesEdicion,
  obtenerLunesSemana,
  restarDiasFecha,
  sumarDiasFecha,
  textoBloqueCelda,
} from '../utils/mallasUtils.js'
import './AdministracionGeneral.css'
import './GestionHumanaMallas.css'

function etiquetaSede(sedeId) {
  return SEDES.find((sede) => sede.id === sedeId)?.nombre ?? sedeId ?? '—'
}

function GestionHumanaMallas({ onVolver }) {
  const toast = useToast()
  const [vista, setVista] = useState('semana')
  const [sede, setSede] = useState(SEDE_HORARIOS)
  const [semanaInicio, setSemanaInicio] = useState(() =>
    obtenerLunesSemana(hoyColombia()),
  )
  const [colaboradores, setColaboradores] = useState([])
  const [edicionSemana, setEdicionSemana] = useState({})
  const [edicionPlantilla, setEdicionPlantilla] = useState({})
  const [numeroColaboradoresPlantilla, setNumeroColaboradoresPlantilla] =
    useState(0)
  const [numeroColaboradoresInput, setNumeroColaboradoresInput] = useState('0')
  const [plantillaSlots, setPlantillaSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [copiando, setCopiando] = useState(false)
  const [aplicandoPlantillas, setAplicandoPlantillas] = useState(false)
  const [dirtySemana, setDirtySemana] = useState(false)
  const [dirtyPlantilla, setDirtyPlantilla] = useState(false)
  const [celdaEditando, setCeldaEditando] = useState(null)
  const [confirmCopiar, setConfirmCopiar] = useState(false)
  const [confirmAplicarPlantillas, setConfirmAplicarPlantillas] = useState(null)

  const esVistaSemana = vista === 'semana'
  const edicion = esVistaSemana ? edicionSemana : edicionPlantilla
  const dirty = esVistaSemana ? dirtySemana : dirtyPlantilla
  const setEdicion = esVistaSemana ? setEdicionSemana : setEdicionPlantilla
  const setDirty = esVistaSemana ? setDirtySemana : setDirtyPlantilla

  const colaboradoresSede = useMemo(
    () =>
      colaboradores
        .filter((c) => c.sede === sede)
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    [colaboradores, sede],
  )

  const filasPlantilla = useMemo(
    () =>
      Array.from({ length: numeroColaboradoresPlantilla }, (_, slotIndex) => {
        const slot =
          plantillaSlots.find((item) => Number(item?.slotIndex) === slotIndex) ??
          plantillaSlots[slotIndex]
        return {
          filaKey: String(slotIndex),
          slotIndex,
          etiqueta: `Puesto ${slotIndex + 1}`,
          colaboradorNombre: slot?.colaboradorNombre || null,
        }
      }),
    [numeroColaboradoresPlantilla, plantillaSlots],
  )

  const cargarSemana = useCallback(async () => {
    const mallasData = await obtenerMallasSemana({ sede, semanaInicio })
    setEdicionSemana(construirEstadoEdicionDesdeMallas(mallasData.mallas))
    setDirtySemana(false)
    return mallasData
  }, [sede, semanaInicio])

  const cargarPlantillas = useCallback(async () => {
    const plantillasData = await obtenerPlantillasSede({ sede })
    const numero = plantillasData.numeroColaboradores ?? 0
    const slots = plantillasData.slots ?? []

    setNumeroColaboradoresPlantilla(numero)
    setNumeroColaboradoresInput(String(numero))
    setPlantillaSlots(slots)
    setEdicionPlantilla(
      construirEstadoEdicionDesdePlantillaBase(slots, numero),
    )
    setDirtyPlantilla(false)
    return plantillasData
  }, [sede])

  const cargar = useCallback(async () => {
    setLoading(true)
    try {
      const listaColaboradores = await obtenerColaboradores()
      setColaboradores(listaColaboradores)

      const [resultadoSemana, resultadoPlantillas] = await Promise.allSettled([
        cargarSemana(),
        cargarPlantillas(),
      ])

      if (resultadoSemana.status === 'rejected') {
        throw resultadoSemana.reason
      }

      if (resultadoPlantillas.status === 'rejected') {
        setEdicionPlantilla({})
        setNumeroColaboradoresPlantilla(0)
        setNumeroColaboradoresInput('0')
        setPlantillaSlots([])
        toast.error(
          resultadoPlantillas.reason?.message ||
            'No se pudieron cargar las plantillas base',
        )
      }
    } catch (err) {
      toast.error(err.message || 'No se pudieron cargar las mallas')
      setColaboradores([])
      setEdicionSemana({})
      setEdicionPlantilla({})
      setNumeroColaboradoresPlantilla(0)
      setNumeroColaboradoresInput('0')
      setPlantillaSlots([])
    } finally {
      setLoading(false)
    }
  }, [cargarSemana, cargarPlantillas, toast])

  useEffect(() => {
    cargar()
  }, [cargar])

  const obtenerBloquesFila = (filaKey) =>
    edicion[filaKey] ? normalizarBloquesEdicion(edicion[filaKey]) : crearBloquesVacios()

  const actualizarCelda = (filaKey, diaKey, bloquesDia) => {
    setEdicion((prev) => ({
      ...prev,
      [filaKey]: {
        ...(prev[filaKey] ? normalizarBloquesEdicion(prev[filaKey]) : crearBloquesVacios()),
        [diaKey]: bloquesDia,
      },
    }))
    setDirty(true)
  }

  const generarFilasPlantilla = () => {
    const numero = Math.max(
      0,
      Math.min(50, Number.parseInt(numeroColaboradoresInput, 10) || 0),
    )

    if (numero === numeroColaboradoresPlantilla) {
      setNumeroColaboradoresInput(String(numero))
      return
    }

    if (
      numero < numeroColaboradoresPlantilla &&
      !window.confirm(
        `Se eliminarán ${numeroColaboradoresPlantilla - numero} fila(s) de la plantilla. ¿Continuar?`,
      )
    ) {
      setNumeroColaboradoresInput(String(numeroColaboradoresPlantilla))
      return
    }

    setNumeroColaboradoresPlantilla(numero)
    setNumeroColaboradoresInput(String(numero))
    setEdicionPlantilla((prev) => {
      const siguiente = {}
      for (let i = 0; i < numero; i += 1) {
        const key = String(i)
        siguiente[key] = prev[key]
          ? normalizarBloquesEdicion(prev[key])
          : crearBloquesVacios()
      }
      return siguiente
    })
    setPlantillaSlots((prev) =>
      Array.from({ length: numero }, (_, slotIndex) => {
        const existente =
          prev.find((slot) => Number(slot?.slotIndex) === slotIndex) ??
          prev[slotIndex]
        return {
          slotIndex,
          colaboradorUid: existente?.colaboradorUid ?? null,
          colaboradorNombre: existente?.colaboradorNombre ?? null,
        }
      }),
    )
    setDirtyPlantilla(true)
  }

  const confirmarDescartarCambios = () => {
    if (!dirty) return true
    return window.confirm('Hay cambios sin guardar. ¿Descartarlos?')
  }

  const cambiarVista = (nuevaVista) => {
    if (nuevaVista === vista) return
    if (!confirmarDescartarCambios()) return
    setVista(nuevaVista)
  }

  const cambiarSemana = (nuevaSemana) => {
    const lunes = obtenerLunesSemana(nuevaSemana)
    if (lunes === semanaInicio) return
    if (dirtySemana && !window.confirm('Hay cambios sin guardar. ¿Descartarlos?')) {
      return
    }
    setSemanaInicio(lunes)
  }

  const cambiarSede = (nuevaSede) => {
    if (nuevaSede === sede) return
    if (
      (dirtySemana || dirtyPlantilla) &&
      !window.confirm('Hay cambios sin guardar. ¿Descartarlos?')
    ) {
      return
    }
    setSede(nuevaSede)
  }

  const handleGuardar = async () => {
    setSaving(true)
    try {
      const items = colaboradoresSede.map((colaborador) => ({
        colaboradorUid: colaborador.uid,
        colaboradorNombre: colaborador.nombre,
        bloques: obtenerBloquesFila(colaborador.uid),
      }))

      if (esVistaSemana) {
        const resultado = await guardarMallasSemana({
          sede,
          semanaInicio,
          items,
        })
        setEdicionSemana(construirEstadoEdicionDesdeMallas(resultado.mallas))
        setDirtySemana(false)
        toast.success('Malla semanal guardada')
      } else {
        const slots = construirSlotsPlantillaParaGuardar(
          numeroColaboradoresPlantilla,
          edicionPlantilla,
          plantillaSlots,
        )
        const resultado = await guardarPlantillasSede({
          sede,
          numeroColaboradores: numeroColaboradoresPlantilla,
          slots,
        })
        setNumeroColaboradoresPlantilla(resultado.numeroColaboradores ?? 0)
        setNumeroColaboradoresInput(
          String(resultado.numeroColaboradores ?? 0),
        )
        setPlantillaSlots(resultado.slots ?? [])
        setEdicionPlantilla(
          construirEstadoEdicionDesdePlantillaBase(
            resultado.slots,
            resultado.numeroColaboradores,
          ),
        )
        setDirtyPlantilla(false)
        toast.success('Plantilla base guardada')
      }
    } catch (err) {
      toast.error(err.message || 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  const handleCopiarSemanaAnterior = async () => {
    setConfirmCopiar(false)
    setCopiando(true)
    try {
      const resultado = await copiarSemanaAnteriorMallas({ sede, semanaInicio })
      setEdicionSemana(construirEstadoEdicionDesdeMallas(resultado.mallas))
      setDirtySemana(false)
      toast.success('Se copió la malla de la semana anterior')
    } catch (err) {
      toast.error(err.message || 'No se pudo copiar la semana anterior')
    } finally {
      setCopiando(false)
    }
  }

  const handleAplicarPlantillas = async (sobrescribir) => {
    setConfirmAplicarPlantillas(null)
    setAplicandoPlantillas(true)
    try {
      const resultado = await aplicarPlantillasSemana({
        sede,
        semanaInicio,
        sobrescribir,
      })
      setEdicionSemana(construirEstadoEdicionDesdeMallas(resultado.mallas))
      setDirtySemana(false)
      toast.success(
        sobrescribir
          ? `Semana reemplazada con plantillas (${resultado.aplicadas} colaborador(es))`
          : `Plantillas aplicadas en celdas vacías (${resultado.aplicadas} colaborador(es))`,
      )
    } catch (err) {
      toast.error(err.message || 'No se pudieron aplicar las plantillas')
    } finally {
      setAplicandoPlantillas(false)
    }
  }

  const renderCelda = (filaKey, diaKey) => {
    const bloques = obtenerBloquesFila(filaKey)[diaKey] || []

    if (bloques.length === 0) {
      return <span className="ag-mallas__placeholder">Sin asignar</span>
    }

    return bloques.map((bloque, idx) => {
      const texto = textoBloqueCelda(bloque)
      if (!texto) return null
      return (
        <span
          key={`${diaKey}-${idx}`}
          className={`ag-mallas__bloque ${claseBloqueCelda(bloque)}`}
        >
          {texto}
        </span>
      )
    })
  }

  const ocupado = loading || saving || copiando || aplicandoPlantillas

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
              {esVistaSemana
                ? 'Planificación semanal por sede'
                : 'Horario recurrente de referencia'}
            </p>
          </div>
        </div>
        <div className="ag-mallas__acciones-header">
          {esVistaSemana && (
            <>
              <button
                type="button"
                className="ag-action-btn ag-action-btn--ghost"
                disabled={ocupado}
                onClick={() => setConfirmCopiar(true)}
              >
                Copiar semana anterior
              </button>
              <button
                type="button"
                className="ag-action-btn ag-action-btn--ghost"
                disabled={ocupado}
                onClick={() => setConfirmAplicarPlantillas('vacios')}
              >
                Aplicar plantillas
              </button>
              <button
                type="button"
                className="ag-action-btn ag-action-btn--ghost"
                disabled={ocupado}
                onClick={() => setConfirmAplicarPlantillas('reemplazar')}
              >
                Reemplazar con plantillas
              </button>
            </>
          )}
          <button
            type="button"
            className="ag-action-btn ag-action-btn--primary"
            disabled={ocupado || !dirty}
            onClick={handleGuardar}
          >
            {saving
              ? 'Guardando…'
              : esVistaSemana
                ? 'Guardar malla'
                : 'Guardar plantilla'}
          </button>
        </div>
      </header>

      <div className="ag-mallas__tabs" role="tablist" aria-label="Vista de mallas">
        <button
          type="button"
          role="tab"
          aria-selected={esVistaSemana}
          className={`ag-mallas__tab${esVistaSemana ? ' ag-mallas__tab--activa' : ''}`}
          onClick={() => cambiarVista('semana')}
        >
          Malla semanal
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={!esVistaSemana}
          className={`ag-mallas__tab${!esVistaSemana ? ' ag-mallas__tab--activa' : ''}`}
          onClick={() => cambiarVista('plantilla')}
        >
          Plantilla base
        </button>
      </div>

      <div className="ag-mallas__toolbar ag-panel">
        <label className="ag-mallas__filtro">
          <span>Sede</span>
          <select
            value={sede}
            disabled={ocupado}
            onChange={(e) => cambiarSede(e.target.value)}
          >
            {SEDES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nombre}
              </option>
            ))}
          </select>
        </label>

        {esVistaSemana ? (
          <>
            <div className="ag-mallas__semana">
              <button
                type="button"
                className="ag-mallas__semana-nav"
                disabled={ocupado}
                onClick={() => cambiarSemana(restarDiasFecha(semanaInicio, 7))}
                aria-label="Semana anterior"
              >
                ←
              </button>
              <div className="ag-mallas__semana-info">
                <strong>{formatearEtiquetaSemana(semanaInicio)}</strong>
                <span>Lunes {semanaInicio}</span>
              </div>
              <button
                type="button"
                className="ag-mallas__semana-nav"
                disabled={ocupado}
                onClick={() => cambiarSemana(sumarDiasFecha(semanaInicio, 7))}
                aria-label="Semana siguiente"
              >
                →
              </button>
            </div>

            <label className="ag-mallas__filtro ag-mallas__filtro--fecha">
              <span>Ir a semana</span>
              <input
                type="date"
                value={semanaInicio}
                disabled={ocupado}
                onChange={(e) => {
                  if (e.target.value) cambiarSemana(e.target.value)
                }}
              />
            </label>
          </>
        ) : (
          <div className="ag-mallas__plantilla-config">
            <label className="ag-mallas__filtro ag-mallas__filtro--numero">
              <span>Número de colaboradores</span>
              <input
                type="number"
                min={0}
                max={50}
                value={numeroColaboradoresInput}
                disabled={ocupado}
                onChange={(e) => setNumeroColaboradoresInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') generarFilasPlantilla()
                }}
              />
            </label>
            <button
              type="button"
              className="ag-action-btn ag-action-btn--ghost"
              disabled={ocupado}
              onClick={generarFilasPlantilla}
            >
              Generar filas
            </button>
            <p className="ag-mallas__plantilla-ayuda">
              Define cuántos puestos necesitas y organiza el horario de cada fila.
              La asignación a colaboradores se hará en un paso posterior.
            </p>
          </div>
        )}
      </div>

      {dirty && (
        <p className="ag-mallas__aviso-dirty">
          Cambios sin guardar en{' '}
          {esVistaSemana
            ? `la semana del ${formatearEtiquetaSemana(semanaInicio)}`
            : 'la plantilla base'}
          .
        </p>
      )}

      {ocupado && <LoadingOverlay visible label="Cargando" />}

      <div className="ag-finanzas__tabla-wrap ag-mallas__tabla-wrap">
        {esVistaSemana ? (
          colaboradoresSede.length === 0 && !loading ? (
            <p className="ag-panel__empty">
              No hay colaboradores registrados en {etiquetaSede(sede)}.
            </p>
          ) : (
            <table className="ag-finanzas__tabla ag-mallas__tabla">
              <thead>
                <tr>
                  <th>Colaborador</th>
                  {DIAS_SEMANA.map((dia) => (
                    <th key={dia.key}>{dia.label}</th>
                  ))}
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {colaboradoresSede.map((colaborador) => {
                  const bloques = obtenerBloquesFila(colaborador.uid)
                  const total = calcularTotalHorasPlanificadas(bloques)
                  const sinContenido = !mallaTieneContenido(bloques)

                  return (
                    <tr key={colaborador.uid}>
                      <td className="ag-mallas__col-nombre">
                        <strong>{colaborador.nombre}</strong>
                        {sinContenido && (
                          <span className="ag-mallas__sin-malla">
                            Sin malla esta semana
                          </span>
                        )}
                      </td>
                      {DIAS_SEMANA.map((dia) => (
                        <td key={dia.key}>
                          <button
                            type="button"
                            className="ag-mallas__celda-btn"
                            disabled={ocupado}
                            onClick={() =>
                              setCeldaEditando({
                                filaKey: colaborador.uid,
                                nombre: colaborador.nombre,
                                diaKey: dia.key,
                                diaLabel: dia.label,
                                bloques: bloques[dia.key] || [],
                              })
                            }
                          >
                            {renderCelda(colaborador.uid, dia.key)}
                          </button>
                        </td>
                      ))}
                      <td className="ag-mallas__total">
                        {formatearHorasTotal(total)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )
        ) : filasPlantilla.length === 0 && !loading ? (
          <p className="ag-panel__empty">
            Indica el número de colaboradores y pulsa «Generar filas» para crear la
            plantilla en {etiquetaSede(sede)}.
          </p>
        ) : (
          <table className="ag-finanzas__tabla ag-mallas__tabla">
            <thead>
              <tr>
                <th>Puesto</th>
                {DIAS_SEMANA.map((dia) => (
                  <th key={dia.key}>{dia.label}</th>
                ))}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {filasPlantilla.map((fila) => {
                const bloques = obtenerBloquesFila(fila.filaKey)
                const total = calcularTotalHorasPlanificadas(bloques)
                const sinContenido = !mallaTieneContenido(bloques)

                return (
                  <tr key={fila.filaKey}>
                    <td className="ag-mallas__col-nombre">
                      <strong>{fila.etiqueta}</strong>
                      <span className="ag-mallas__sin-malla ag-mallas__sin-asignar">
                        {fila.colaboradorNombre || 'Sin colaborador asignado'}
                      </span>
                      {sinContenido && (
                        <span className="ag-mallas__sin-malla">Sin horario</span>
                      )}
                    </td>
                    {DIAS_SEMANA.map((dia) => (
                      <td key={dia.key}>
                        <button
                          type="button"
                          className="ag-mallas__celda-btn"
                          disabled={ocupado}
                          onClick={() =>
                            setCeldaEditando({
                              filaKey: fila.filaKey,
                              nombre: fila.etiqueta,
                              diaKey: dia.key,
                              diaLabel: dia.label,
                              bloques: bloques[dia.key] || [],
                            })
                          }
                        >
                          {renderCelda(fila.filaKey, dia.key)}
                        </button>
                      </td>
                    ))}
                    <td className="ag-mallas__total">
                      {formatearHorasTotal(total)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <MallaCeldaModal
        open={Boolean(celdaEditando)}
        celdaId={
          celdaEditando
            ? `${celdaEditando.filaKey}-${celdaEditando.diaKey}`
            : ''
        }
        colaboradorNombre={celdaEditando?.nombre ?? ''}
        diaLabel={celdaEditando?.diaLabel ?? ''}
        bloquesIniciales={celdaEditando?.bloques ?? []}
        onClose={() => setCeldaEditando(null)}
        onGuardar={(bloquesDia) => {
          if (!celdaEditando) return
          actualizarCelda(celdaEditando.filaKey, celdaEditando.diaKey, bloquesDia)
        }}
      />

      <ConfirmModal
        open={confirmCopiar}
        title="Copiar semana anterior"
        message={`Se reemplazará la malla de ${formatearEtiquetaSemana(semanaInicio)} en ${etiquetaSede(sede)} con los datos de la semana previa.`}
        confirmLabel="Copiar"
        onConfirm={handleCopiarSemanaAnterior}
        onClose={() => setConfirmCopiar(false)}
      />

      <ConfirmModal
        open={confirmAplicarPlantillas === 'vacios'}
        title="Aplicar plantillas"
        message={`Se completarán solo las celdas vacías de ${formatearEtiquetaSemana(semanaInicio)} con las plantillas base de ${etiquetaSede(sede)}. Los ajustes ya guardados en la semana se conservan.`}
        confirmLabel="Aplicar"
        onConfirm={() => handleAplicarPlantillas(false)}
        onClose={() => setConfirmAplicarPlantillas(null)}
      />

      <ConfirmModal
        open={confirmAplicarPlantillas === 'reemplazar'}
        title="Reemplazar con plantillas"
        variant="danger"
        message={`Se reemplazará toda la malla de ${formatearEtiquetaSemana(semanaInicio)} con las plantillas base. Esta acción sobrescribe los horarios planificados de la semana.`}
        confirmLabel="Reemplazar"
        onConfirm={() => handleAplicarPlantillas(true)}
        onClose={() => setConfirmAplicarPlantillas(null)}
      />
    </section>
  )
}

export default GestionHumanaMallas
