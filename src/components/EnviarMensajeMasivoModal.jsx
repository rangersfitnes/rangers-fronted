import { useEffect, useMemo, useState } from 'react'
import Modal from './Modal.jsx'
import {
  FILTROS_INICIALES,
  FILTROS_USUARIO_WHATSAPP,
  filtrosParaApi,
} from '../constants/filtrosUsuarioWhatsApp.js'
import { obtenerPlanes } from '../services/planesService.js'
import { obtenerPlantillas } from '../services/plantillasService.js'
import {
  iniciarEnvioMasivoWhatsApp,
  obtenerEstadoEnvioMasivoWhatsApp,
  previewDestinatariosWhatsApp,
  previewPlantillaWhatsApp,
} from '../services/whatsappService.js'
import './CrearPlanModal.css'
import './EnviarMensajeMasivoModal.css'

function EnviarMensajeMasivoModal({ open, onClose, onWhatsAppDesconectado }) {
  const [paso, setPaso] = useState(1)
  const [filtros, setFiltros] = useState(FILTROS_INICIALES)
  const [planes, setPlanes] = useState([])
  const [plantillas, setPlantillas] = useState([])
  const [plantillaId, setPlantillaId] = useState('')
  const [totalDestinatarios, setTotalDestinatarios] = useState(null)
  const [muestra, setMuestra] = useState([])
  const [mensajeEjemplo, setMensajeEjemplo] = useState('')
  const [ejemploUsuario, setEjemploUsuario] = useState(null)
  const [job, setJob] = useState(null)
  const [cargandoPreview, setCargandoPreview] = useState(false)
  const [cargandoPlantilla, setCargandoPlantilla] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const filtrosApi = useMemo(() => filtrosParaApi(filtros), [filtros])

  useEffect(() => {
    if (!open) {
      setPaso(1)
      setFiltros(FILTROS_INICIALES)
      setPlantillaId('')
      setTotalDestinatarios(null)
      setMuestra([])
      setMensajeEjemplo('')
      setEjemploUsuario(null)
      setJob(null)
      setError('')
      return undefined
    }

    const controller = new AbortController()

    const cargarCatalogos = async () => {
      try {
        const [listaPlanes, listaPlantillas] = await Promise.all([
          obtenerPlanes({ signal: controller.signal }),
          obtenerPlantillas({ signal: controller.signal }),
        ])
        setPlanes(listaPlanes)
        setPlantillas(listaPlantillas)
      } catch (err) {
        if (err?.name === 'AbortError') return
        setError(err.message || 'No se pudieron cargar planes o plantillas')
      }
    }

    cargarCatalogos()

    return () => controller.abort()
  }, [open])

  useEffect(() => {
    if (!open || !job?.id || job.estado === 'completado' || job.estado === 'error') {
      return undefined
    }

    const controller = new AbortController()
    const intervalo = window.setInterval(async () => {
      try {
        const estado = await obtenerEstadoEnvioMasivoWhatsApp(job.id, {
          signal: controller.signal,
        })
        setJob(estado)
      } catch (err) {
        if (err?.name === 'AbortError') return
      }
    }, 2000)

    return () => {
      controller.abort()
      window.clearInterval(intervalo)
    }
  }, [open, job?.id, job?.estado])

  const handleFiltroChange = (campo) => (event) => {
    const valor =
      event.target.type === 'checkbox'
        ? event.target.checked
        : event.target.value

    setFiltros((prev) => ({ ...prev, [campo]: valor }))
    setTotalDestinatarios(null)
    setMuestra([])
  }

  const handlePreviewFiltros = async () => {
    setError('')
    setCargandoPreview(true)

    try {
      const resultado = await previewDestinatariosWhatsApp({ filtros: filtrosApi })
      setTotalDestinatarios(resultado.total)
      setMuestra(resultado.muestra)
    } catch (err) {
      if (err.code === 'WHATSAPP_SESSION_CLOSED') {
        onWhatsAppDesconectado?.()
        return
      }
      setError(err.message || 'No se pudo calcular el filtro')
    } finally {
      setCargandoPreview(false)
    }
  }

  const handleSiguiente = async () => {
    setError('')
    setCargandoPreview(true)

    try {
      const resultado = await previewDestinatariosWhatsApp({ filtros: filtrosApi })
      setTotalDestinatarios(resultado.total)
      setMuestra(resultado.muestra)

      if (resultado.total === 0) {
        setError('No hay usuarios que coincidan con los filtros seleccionados')
        return
      }

      setPaso(2)
    } catch (err) {
      if (err.code === 'WHATSAPP_SESSION_CLOSED') {
        onWhatsAppDesconectado?.()
        return
      }
      setError(err.message || 'No se pudo calcular el filtro')
    } finally {
      setCargandoPreview(false)
    }
  }

  useEffect(() => {
    if (!open || paso !== 2 || !plantillaId) {
      return undefined
    }

    const controller = new AbortController()

    const cargarPreviewPlantilla = async () => {
      setCargandoPlantilla(true)
      setError('')

      try {
        const resultado = await previewPlantillaWhatsApp({
          plantillaId,
          filtros: filtrosApi,
          signal: controller.signal,
        })
        setMensajeEjemplo(resultado.mensajeEjemplo)
        setEjemploUsuario(resultado.ejemploUsuario)
        setTotalDestinatarios(resultado.total)
      } catch (err) {
        if (err?.name === 'AbortError') return
        if (err.code === 'WHATSAPP_SESSION_CLOSED') {
          onWhatsAppDesconectado?.()
          return
        }
        setError(err.message || 'No se pudo cargar la vista previa de la plantilla')
      } finally {
        if (!controller.signal.aborted) setCargandoPlantilla(false)
      }
    }

    cargarPreviewPlantilla()

    return () => controller.abort()
  }, [open, paso, plantillaId, filtrosApi, onWhatsAppDesconectado])

  const handleDocumentoEspecificoChange = (indice) => (event) => {
    const valor = event.target.value.replace(/\s/g, '')
    setFiltros((prev) => {
      const documentosEspecificos = [...prev.documentosEspecificos]
      documentosEspecificos[indice] = valor
      return { ...prev, documentosEspecificos }
    })
    setTotalDestinatarios(null)
    setMuestra([])
  }

  const handleAgregarDocumento = () => {
    setFiltros((prev) => ({
      ...prev,
      documentosEspecificos: [...prev.documentosEspecificos, ''],
    }))
    setTotalDestinatarios(null)
    setMuestra([])
  }

  const handleQuitarDocumento = (indice) => {
    setFiltros((prev) => {
      const documentosEspecificos = prev.documentosEspecificos.filter(
        (_, i) => i !== indice,
      )
      return {
        ...prev,
        documentosEspecificos: documentosEspecificos.length
          ? documentosEspecificos
          : [''],
      }
    })
    setTotalDestinatarios(null)
    setMuestra([])
  }

  const handleEnviarMasivo = async () => {
    if (!plantillaId) {
      setError('Selecciona una plantilla')
      return
    }

    setError('')
    setEnviando(true)

    try {
      const resultado = await iniciarEnvioMasivoWhatsApp({
        plantillaId,
        filtros: filtrosApi,
      })

      const estadoInicial = await obtenerEstadoEnvioMasivoWhatsApp(resultado.jobId)
      setJob(estadoInicial)
      setPaso(3)
    } catch (err) {
      if (err.code === 'WHATSAPP_SESSION_CLOSED') {
        onWhatsAppDesconectado?.()
        return
      }
      setError(err.message || 'No se pudo iniciar el envío masivo')
    } finally {
      setEnviando(false)
    }
  }

  const progreso =
    job?.total > 0 ? Math.round((job.procesados / job.total) * 100) : 0

  const bloqueado = cargandoPreview || cargandoPlantilla || enviando

  const titulo =
    paso === 1
      ? 'Envío masivo · Filtros'
      : paso === 2
        ? 'Envío masivo · Plantilla'
        : 'Envío masivo · Progreso'

  return (
    <Modal
      open={open}
      onClose={bloqueado || paso === 3 ? undefined : onClose}
      title={titulo}
      className="envio-masivo-modal"
      footer={
        paso === 1 ? (
          <>
            <button
              type="button"
              className="crear-plan__btn crear-plan__btn--ghost"
              onClick={onClose}
              disabled={bloqueado}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="crear-plan__btn crear-plan__btn--ghost"
              onClick={handlePreviewFiltros}
              disabled={bloqueado}
            >
              {cargandoPreview ? 'Calculando…' : 'Calcular destinatarios'}
            </button>
            <button
              type="button"
              className="crear-plan__btn crear-plan__btn--primary"
              onClick={handleSiguiente}
              disabled={bloqueado}
            >
              Siguiente
            </button>
          </>
        ) : paso === 2 ? (
          <>
            <button
              type="button"
              className="crear-plan__btn crear-plan__btn--ghost"
              onClick={() => setPaso(1)}
              disabled={bloqueado}
            >
              Atrás
            </button>
            <button
              type="button"
              className="crear-plan__btn crear-plan__btn--primary"
              onClick={handleEnviarMasivo}
              disabled={bloqueado || !plantillaId || totalDestinatarios === 0}
            >
              {enviando
                ? 'Iniciando…'
                : `Enviar a ${totalDestinatarios ?? 0} usuarios`}
            </button>
          </>
        ) : (
          <button
            type="button"
            className="crear-plan__btn crear-plan__btn--primary"
            onClick={onClose}
            disabled={job?.estado !== 'completado' && job?.estado !== 'error'}
          >
            {job?.estado === 'completado' || job?.estado === 'error'
              ? 'Cerrar'
              : 'Enviando…'}
          </button>
        )
      }
    >
      <div className="envio-masivo">
        {error ? (
          <p className="crear-plan__error" role="alert">
            {error}
          </p>
        ) : null}

        {paso === 1 ? (
          <div className="envio-masivo__paso">
            <div className="envio-masivo__grid">
              <label className="crear-plan__field">
                <span className="crear-plan__label">Estado del plan</span>
                <select
                  className="crear-plan__input crear-plan__select"
                  value={filtros.estadoPlan}
                  onChange={handleFiltroChange('estadoPlan')}
                  disabled={bloqueado}
                >
                  {FILTROS_USUARIO_WHATSAPP.estadosPlan.map((opcion) => (
                    <option key={opcion.id} value={opcion.id}>
                      {opcion.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="crear-plan__field">
                <span className="crear-plan__label">Plan específico</span>
                <select
                  className="crear-plan__input crear-plan__select"
                  value={filtros.planId}
                  onChange={handleFiltroChange('planId')}
                  disabled={bloqueado}
                >
                  <option value="">Cualquier plan</option>
                  {planes.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.nombre || plan.id}
                    </option>
                  ))}
                </select>
              </label>

              <label className="crear-plan__field">
                <span className="crear-plan__label">Tipo de documento</span>
                <select
                  className="crear-plan__input crear-plan__select"
                  value={filtros.tipoDocumento}
                  onChange={handleFiltroChange('tipoDocumento')}
                  disabled={bloqueado}
                >
                  {FILTROS_USUARIO_WHATSAPP.tiposDocumento.map((opcion) => (
                    <option key={opcion.id} value={opcion.id}>
                      {opcion.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="crear-plan__field">
                <span className="crear-plan__label">Rol en plan grupal</span>
                <select
                  className="crear-plan__input crear-plan__select"
                  value={filtros.rolEnPlan}
                  onChange={handleFiltroChange('rolEnPlan')}
                  disabled={bloqueado}
                >
                  {FILTROS_USUARIO_WHATSAPP.rolesEnPlan.map((opcion) => (
                    <option key={opcion.id} value={opcion.id}>
                      {opcion.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="envio-masivo__documentos">
              <span className="crear-plan__label">Documentos específicos (opcional)</span>
              <p className="envio-masivo__documentos-hint">
                Agrega uno o más números de documento para enviar a personas
                concretas. Se combinan con los filtros anteriores.
              </p>
              {filtros.documentosEspecificos.map((documento, indice) => (
                <div key={`documento-${indice}`} className="envio-masivo__documento-row">
                  <input
                    type="text"
                    className="crear-plan__input"
                    value={documento}
                    onChange={handleDocumentoEspecificoChange(indice)}
                    placeholder="Ej. 1234567890"
                    disabled={bloqueado}
                  />
                  {filtros.documentosEspecificos.length > 1 ? (
                    <button
                      type="button"
                      className="envio-masivo__documento-remove"
                      onClick={() => handleQuitarDocumento(indice)}
                      disabled={bloqueado}
                      aria-label="Quitar documento"
                    >
                      ×
                    </button>
                  ) : null}
                  {indice === filtros.documentosEspecificos.length - 1 ? (
                    <button
                      type="button"
                      className="envio-masivo__documento-add"
                      onClick={handleAgregarDocumento}
                      disabled={bloqueado}
                    >
                      Agregar
                    </button>
                  ) : null}
                </div>
              ))}
            </div>

            <label className="envio-masivo__checkbox">
              <input
                type="checkbox"
                checked={filtros.soloConCelular}
                onChange={handleFiltroChange('soloConCelular')}
                disabled={bloqueado}
              />
              <span>Solo usuarios con celular registrado</span>
            </label>

            {totalDestinatarios != null ? (
              <div className="envio-masivo__resumen">
                <strong>{totalDestinatarios}</strong>{' '}
                {totalDestinatarios === 1 ? 'usuario' : 'usuarios'} coinciden
                con el filtro.
              </div>
            ) : null}

            {muestra.length ? (
              <div className="envio-masivo__muestra">
                <span className="crear-plan__label">Muestra</span>
                <ul>
                  {muestra.map((usuario) => (
                    <li key={usuario.uid}>
                      {usuario.nombre || 'Sin nombre'} · {usuario.documento || '—'} ·{' '}
                      {usuario.celular || 'Sin celular'}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        {paso === 2 ? (
          <div className="envio-masivo__paso">
            <p className="envio-masivo__resumen">
              Se enviará un mensaje cada <strong>3 segundos</strong> a{' '}
              <strong>{totalDestinatarios ?? 0}</strong> usuarios.
            </p>

            <label className="crear-plan__field">
              <span className="crear-plan__label">Plantilla</span>
              <select
                className="crear-plan__input crear-plan__select"
                value={plantillaId}
                onChange={(event) => setPlantillaId(event.target.value)}
                disabled={bloqueado}
                required
              >
                <option value="">Selecciona una plantilla</option>
                {plantillas.map((plantilla) => (
                  <option key={plantilla.id} value={plantilla.id}>
                    {plantilla.nombre}
                  </option>
                ))}
              </select>
            </label>

            {plantillas.length === 0 ? (
              <p className="crear-plan__hint">
                No hay plantillas guardadas. Crea una desde el botón Plantillas.
              </p>
            ) : null}

            {cargandoPlantilla ? (
              <p className="crear-plan__hint">Generando vista previa…</p>
            ) : null}

            {plantillaId && mensajeEjemplo ? (
              <div className="envio-masivo__preview">
                <span className="crear-plan__label">Vista previa del mensaje</span>
                {ejemploUsuario ? (
                  <p className="envio-masivo__preview-usuario">
                    Ejemplo con: {ejemploUsuario.nombre || 'Usuario'} (
                    {ejemploUsuario.celular || 'sin celular'})
                  </p>
                ) : null}
                <pre className="envio-masivo__preview-texto">{mensajeEjemplo}</pre>
              </div>
            ) : null}
          </div>
        ) : null}

        {paso === 3 && job ? (
          <div className="envio-masivo__paso">
            <div className="envio-masivo__progreso">
              <div className="envio-masivo__progreso-bar">
                <div
                  className="envio-masivo__progreso-fill"
                  style={{ width: `${progreso}%` }}
                />
              </div>
              <p>
                {job.procesados} de {job.total} procesados · {job.enviados} enviados ·{' '}
                {job.fallidos} fallidos
              </p>
            </div>

            {job.actual ? (
              <p className="envio-masivo__actual">
                Enviando a {job.actual.nombre || 'usuario'} ({job.actual.celular})
              </p>
            ) : null}

            {job.estado === 'completado' ? (
              <p className="envio-masivo__success">
                Envío completado. {job.enviados} mensajes enviados correctamente.
              </p>
            ) : null}

            {job.estado === 'error' ? (
              <p className="crear-plan__error">El envío masivo falló.</p>
            ) : null}

            {job.errores?.length ? (
              <div className="envio-masivo__errores">
                <span className="crear-plan__label">Errores recientes</span>
                <ul>
                  {job.errores.slice(-5).map((item, index) => (
                    <li key={`${item.uid || index}-${item.error}`}>
                      {item.nombre || item.uid || 'Usuario'}: {item.error}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </Modal>
  )
}

export default EnviarMensajeMasivoModal
