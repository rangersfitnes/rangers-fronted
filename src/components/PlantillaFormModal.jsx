import { useEffect, useRef, useState } from 'react'
import Modal from './Modal.jsx'
import {
  VARIABLES_PLANTILLA_USUARIO,
  variablePlantilla,
} from '../constants/plantillaVariables.js'
import {
  PLANTILLAS_AUTOMATICAS,
  plantillaAutomaticaEsPersonalizada,
  resolverContenidoPlantillaAutomatica,
} from '../constants/plantillasAutomaticas.js'
import {
  obtenerPlantillas,
  obtenerPlantillasAutomaticas,
} from '../services/plantillasService.js'
import './CrearPlanModal.css'
import './PlantillaFormModal.css'

const estadoInicial = {
  nombre: '',
  contenido: '',
}

function PlantillaFormModal({
  open,
  onClose,
  onSubmit,
  onSubmitAutomatica,
  submitting,
  error,
}) {
  const [pestaña, setPestaña] = useState('manuales')
  const [form, setForm] = useState(estadoInicial)
  const [plantillas, setPlantillas] = useState([])
  const [plantillasAutomaticas, setPlantillasAutomaticas] = useState([])
  const [automaticaSeleccionada, setAutomaticaSeleccionada] = useState(
    PLANTILLAS_AUTOMATICAS[0]?.id ?? '',
  )
  const [contenidoAutomatico, setContenidoAutomatico] = useState('')
  const [cargandoLista, setCargandoLista] = useState(false)
  const contenidoRef = useRef(null)

  useEffect(() => {
    if (!open) {
      setPestaña('manuales')
      setForm(estadoInicial)
      setPlantillas([])
      setPlantillasAutomaticas([])
      setAutomaticaSeleccionada(PLANTILLAS_AUTOMATICAS[0]?.id ?? '')
      setContenidoAutomatico('')
      return undefined
    }

    const controller = new AbortController()

    const cargar = async () => {
      setCargandoLista(true)
      try {
        const [lista, automaticas] = await Promise.all([
          obtenerPlantillas({ signal: controller.signal }),
          obtenerPlantillasAutomaticas({ signal: controller.signal }),
        ])

        if (controller.signal.aborted) return

        setPlantillas(lista)
        setPlantillasAutomaticas(automaticas)

        const idInicial = PLANTILLAS_AUTOMATICAS[0]?.id ?? ''
        if (idInicial) {
          setAutomaticaSeleccionada(idInicial)
          setContenidoAutomatico(
            resolverContenidoPlantillaAutomatica(idInicial, automaticas),
          )
        }
      } catch {
        if (!controller.signal.aborted) {
          setPlantillas([])
          setPlantillasAutomaticas([])
        }
      } finally {
        if (!controller.signal.aborted) setCargandoLista(false)
      }
    }

    cargar()

    return () => controller.abort()
  }, [open])

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const insertarVariable = (clave) => {
    const token = variablePlantilla(clave)
    const textarea = contenidoRef.current
    const contenidoBase =
      pestaña === 'automaticas' ? contenidoAutomatico : form.contenido

    if (!textarea) {
      if (pestaña === 'automaticas') {
        setContenidoAutomatico(`${contenidoBase}${token}`)
      } else {
        setForm((prev) => ({
          ...prev,
          contenido: `${prev.contenido}${token}`,
        }))
      }
      return
    }

    const inicio = textarea.selectionStart ?? contenidoBase.length
    const fin = textarea.selectionEnd ?? contenidoBase.length
    const contenido = `${contenidoBase.slice(0, inicio)}${token}${contenidoBase.slice(fin)}`

    if (pestaña === 'automaticas') {
      setContenidoAutomatico(contenido)
    } else {
      setForm((prev) => ({ ...prev, contenido }))
    }

    requestAnimationFrame(() => {
      textarea.focus()
      const cursor = inicio + token.length
      textarea.setSelectionRange(cursor, cursor)
    })
  }

  const handleSeleccionarAutomatica = (id) => {
    setAutomaticaSeleccionada(id)
    setContenidoAutomatico(
      resolverContenidoPlantillaAutomatica(id, plantillasAutomaticas),
    )
  }

  const handleCambiarPestaña = (nuevaPestaña) => {
    setPestaña(nuevaPestaña)

    if (nuevaPestaña === 'automaticas' && automaticaSeleccionada) {
      setContenidoAutomatico(
        resolverContenidoPlantillaAutomatica(
          automaticaSeleccionada,
          plantillasAutomaticas,
        ),
      )
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    if (pestaña === 'automaticas') {
      onSubmitAutomatica?.({
        id: automaticaSeleccionada,
        contenido: contenidoAutomatico.trim(),
        esActualizacion: automaticaPersonalizada,
      })
      return
    }

    onSubmit?.({
      nombre: form.nombre.trim(),
      contenido: form.contenido.trim(),
    })
  }

  const metaAutomatica =
    PLANTILLAS_AUTOMATICAS.find((item) => item.id === automaticaSeleccionada) ??
    PLANTILLAS_AUTOMATICAS[0]

  const variablesVisibles =
    pestaña === 'automaticas'
      ? metaAutomatica?.variables ?? []
      : VARIABLES_PLANTILLA_USUARIO

  const esAutomaticas = pestaña === 'automaticas'
  const automaticaPersonalizada = plantillaAutomaticaEsPersonalizada(
    automaticaSeleccionada,
    plantillasAutomaticas,
  )

  const textoBotonAutomatica = automaticaPersonalizada
    ? 'Actualizar plantilla'
    : 'Guardar plantilla'

  const textoBotonEnviando = automaticaPersonalizada
    ? 'Actualizando…'
    : 'Guardando…'

  return (
    <Modal
      open={open}
      onClose={submitting ? undefined : onClose}
      title="Plantillas de mensaje"
      className="plantilla-modal"
      footer={
        <>
          <button
            type="button"
            className="crear-plan__btn crear-plan__btn--ghost"
            onClick={onClose}
            disabled={submitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="plantilla-form"
            className="crear-plan__btn crear-plan__btn--primary"
            disabled={submitting || (esAutomaticas && cargandoLista)}
          >
            {submitting
              ? esAutomaticas
                ? textoBotonEnviando
                : 'Guardando…'
              : esAutomaticas
                ? textoBotonAutomatica
                : 'Guardar plantilla'}
          </button>
        </>
      }
    >
      <div className="plantilla-form__tabs" role="tablist" aria-label="Tipo de plantilla">
        <button
          type="button"
          role="tab"
          aria-selected={pestaña === 'manuales'}
          className={`plantilla-form__tab${
            pestaña === 'manuales' ? ' plantilla-form__tab--activa' : ''
          }`}
          onClick={() => handleCambiarPestaña('manuales')}
          disabled={submitting}
        >
          Manuales
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={pestaña === 'automaticas'}
          className={`plantilla-form__tab${
            pestaña === 'automaticas' ? ' plantilla-form__tab--activa' : ''
          }`}
          onClick={() => handleCambiarPestaña('automaticas')}
          disabled={submitting}
        >
          Automáticas
        </button>
      </div>

      <form id="plantilla-form" className="crear-plan__form" onSubmit={handleSubmit}>
        {error ? (
          <p className="crear-plan__error" role="alert">
            {error}
          </p>
        ) : null}

        {esAutomaticas ? (
          <>
            <p className="plantilla-form__variables-hint">
              Estas plantillas se envían solas por WhatsApp en eventos del sistema.
              Puedes editarlas sin afectar las plantillas manuales de envío masivo.
            </p>

            {cargandoLista ? (
              <p className="plantilla-form__lista-hint">Cargando plantillas automáticas…</p>
            ) : (
              <div className="plantilla-form__automaticas-selector">
                {PLANTILLAS_AUTOMATICAS.map((meta) => {
                  const remota = plantillasAutomaticas.find(
                    (item) => item.id === meta.id,
                  )

                  return (
                    <button
                      key={meta.id}
                      type="button"
                      className={`plantilla-form__automatica-btn${
                        automaticaSeleccionada === meta.id
                          ? ' plantilla-form__automatica-btn--activa'
                          : ''
                      }`}
                      onClick={() => handleSeleccionarAutomatica(meta.id)}
                      disabled={submitting}
                    >
                      <strong>{meta.nombre}</strong>
                      <span>{meta.descripcion}</span>
                      {remota?.esPersonalizada ? (
                        <em className="plantilla-form__automatica-badge">Personalizada</em>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            )}

            <label className="crear-plan__field">
              <span className="crear-plan__label">
                Contenido del mensaje
                {metaAutomatica ? ` — ${metaAutomatica.nombre}` : ''}
              </span>
              <textarea
                ref={contenidoRef}
                className="crear-plan__input crear-plan__textarea plantilla-form__contenido plantilla-form__contenido--automatica"
                value={contenidoAutomatico}
                onChange={(event) => setContenidoAutomatico(event.target.value)}
                placeholder="Selecciona una plantilla para ver su contenido…"
                rows={12}
                required
                disabled={submitting || cargandoLista || !automaticaSeleccionada}
              />
            </label>
          </>
        ) : (
          <label className="crear-plan__field">
            <span className="crear-plan__label">Nombre de la plantilla</span>
            <input
              type="text"
              className="crear-plan__input"
              value={form.nombre}
              onChange={handleChange('nombre')}
              placeholder="Ej. Recordatorio de vigencia"
              required
              disabled={submitting}
            />
          </label>
        )}

        <div className="plantilla-form__variables">
          <span className="crear-plan__label">Variables disponibles</span>
          <p className="plantilla-form__variables-hint">
            Haz clic en una variable para insertarla en el mensaje. Se reemplazarán
            con los datos de cada usuario al enviar.
          </p>
          <ul className="plantilla-form__variables-list">
            {variablesVisibles.map((variable) => (
              <li key={variable.clave}>
                <button
                  type="button"
                  className="plantilla-form__variable-btn"
                  onClick={() => insertarVariable(variable.clave)}
                  disabled={submitting || (esAutomaticas && cargandoLista)}
                  title={variable.descripcion}
                >
                  <code>{variablePlantilla(variable.clave)}</code>
                  <span>{variable.etiqueta}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <label className={`crear-plan__field${esAutomaticas ? ' plantilla-form__field--oculto' : ''}`}>
          <span className="crear-plan__label">Contenido del mensaje</span>
          <textarea
            ref={esAutomaticas ? undefined : contenidoRef}
            className="crear-plan__input crear-plan__textarea plantilla-form__contenido"
            value={form.contenido}
            onChange={handleChange('contenido')}
            placeholder="Hola {nombre}, tu plan {planNombre} vence el {vigencia}."
            rows={8}
            required={!esAutomaticas}
            disabled={submitting}
            aria-hidden={esAutomaticas}
            tabIndex={esAutomaticas ? -1 : 0}
          />
        </label>

        {!esAutomaticas ? (
          <div className="plantilla-form__guardadas">
            <span className="crear-plan__label">Plantillas guardadas</span>
            {cargandoLista ? (
              <p className="plantilla-form__lista-hint">Cargando plantillas…</p>
            ) : plantillas.length ? (
              <ul className="plantilla-form__lista">
                {plantillas.map((plantilla) => (
                  <li key={plantilla.id} className="plantilla-form__lista-item">
                    <strong>{plantilla.nombre}</strong>
                    <p>{plantilla.contenido}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="plantilla-form__lista-hint">
                Aún no hay plantillas guardadas en Firestore.
              </p>
            )}
          </div>
        ) : null}
      </form>
    </Modal>
  )
}

export default PlantillaFormModal
