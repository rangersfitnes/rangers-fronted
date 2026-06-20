import { useEffect, useMemo, useState } from 'react'
import Modal from './Modal.jsx'
import { optimizarImagenEvento } from '../utils/optimizarImagenEvento.js'
import './CrearPlanModal.css'
import './EventoFormModal.css'

const estadoInicial = {
  nombre: '',
  descripcion: '',
  accionUrl: '',
  pos: '',
}

function EventoFormModal({
  open,
  onClose,
  onSubmit,
  submitting,
  error,
  evento = null,
}) {
  const esEdicion = Boolean(evento)
  const [form, setForm] = useState(estadoInicial)
  const [imagenFile, setImagenFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [imagenActual, setImagenActual] = useState('')
  const [imagenProcesando, setImagenProcesando] = useState(false)
  const [imagenError, setImagenError] = useState('')

  useEffect(() => {
    if (!open) {
      setForm(estadoInicial)
      setImagenFile(null)
      setPreviewUrl('')
      setImagenActual('')
      setImagenProcesando(false)
      setImagenError('')
      return
    }

    if (evento) {
      setForm({
        nombre: evento.nombre || evento.id || '',
        descripcion: evento.descripcion || '',
        accionUrl: evento.accionUrl || '',
        pos:
          evento.pos === null || evento.pos === undefined
            ? ''
            : String(evento.pos),
      })
      setImagenActual(evento.imagen || '')
      setImagenFile(null)
      setPreviewUrl('')
      return
    }

    setForm(estadoInicial)
    setImagenActual('')
    setImagenFile(null)
    setPreviewUrl('')
  }, [open, evento])

  useEffect(() => {
    if (!imagenFile) {
      setPreviewUrl('')
      return undefined
    }

    const url = URL.createObjectURL(imagenFile)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [imagenFile])

  const previewActivo = useMemo(() => {
    if (previewUrl) return previewUrl
    if (esEdicion && !imagenFile && imagenActual) return imagenActual
    return ''
  }, [previewUrl, esEdicion, imagenFile, imagenActual])

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handlePosChange = (event) => {
    const soloDigitos = event.target.value.replace(/\D/g, '')
    setForm((prev) => ({ ...prev, pos: soloDigitos }))
  }

  const handleImagenChange = async (event) => {
    const file = event.target.files?.[0] || null
    setImagenError('')

    if (!file) {
      setImagenFile(null)
      return
    }

    setImagenProcesando(true)
    try {
      const optimizada = await optimizarImagenEvento(file)
      setImagenFile(optimizada)
    } catch (err) {
      setImagenFile(null)
      event.target.value = ''
      setImagenError(
        err.message || 'No se pudo preparar la imagen para subir',
      )
    } finally {
      setImagenProcesando(false)
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    onSubmit?.({
      id: evento?.id,
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim(),
      accionUrl: form.accionUrl.trim(),
      pos: form.pos === '' ? 0 : Number(form.pos),
      imagen: imagenFile,
    })
  }

  return (
    <Modal
      open={open}
      onClose={submitting ? undefined : onClose}
      title={esEdicion ? 'Editar evento' : 'Crear evento'}
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
            form="evento-form"
            className="crear-plan__btn crear-plan__btn--primary"
            disabled={submitting || imagenProcesando}
          >
            {submitting
              ? 'Guardando…'
              : imagenProcesando
                ? 'Procesando imagen…'
                : esEdicion
                  ? 'Guardar cambios'
                  : 'Crear evento'}
          </button>
        </>
      }
    >
      <form id="evento-form" className="crear-plan__form" onSubmit={handleSubmit}>
        {error && <p className="crear-plan__error">{error}</p>}

        <label className="crear-plan__field">
          <span className="crear-plan__label">Nombre del evento</span>
          <input
            type="text"
            className="crear-plan__input"
            value={form.nombre}
            onChange={handleChange('nombre')}
            placeholder="Ej. Torneo híbrido"
            required
            readOnly={esEdicion}
            disabled={esEdicion}
          />
          {esEdicion ? (
            <span className="evento-form__hint">
              El identificador del evento no se puede cambiar.
            </span>
          ) : null}
        </label>

        <label className="crear-plan__field">
          <span className="crear-plan__label">Descripción</span>
          <textarea
            className="crear-plan__input crear-plan__textarea"
            value={form.descripcion}
            onChange={handleChange('descripcion')}
            placeholder="Detalle del evento o banner"
            rows={4}
            required
          />
        </label>

        <label className="crear-plan__field">
          <span className="crear-plan__label">URL de acción</span>
          <input
            type="url"
            className="crear-plan__input"
            value={form.accionUrl}
            onChange={handleChange('accionUrl')}
            placeholder="https://ejemplo.com/inscripcion"
            required
          />
        </label>

        <label className="crear-plan__field">
          <span className="crear-plan__label">Posición en carrusel</span>
          <input
            type="text"
            inputMode="numeric"
            className="crear-plan__input"
            value={form.pos}
            onChange={handlePosChange}
            placeholder="0"
            required
          />
        </label>

        <div className="evento-form__imagen">
          <label className="crear-plan__field">
            <span className="crear-plan__label">Imagen del banner</span>
            <input
              type="file"
              className="evento-form__file"
              accept="image/png,image/jpeg,image/webp,image/jpg,image/heic,image/heif"
              onChange={handleImagenChange}
              disabled={submitting || imagenProcesando}
              required={!esEdicion}
            />
          </label>

          {imagenError ? (
            <p className="crear-plan__error" role="alert">
              {imagenError}
            </p>
          ) : null}

          {imagenProcesando ? (
            <p className="evento-form__preview-hint">
              Optimizando imagen para subir…
            </p>
          ) : null}

          {previewActivo ? (
            <div className="evento-form__preview-wrap">
              <img
                src={previewActivo}
                alt="Vista previa del banner"
                className="evento-form__preview"
              />
            </div>
          ) : (
            <p className="evento-form__preview-hint">
              JPG, PNG o WebP (máx. 8 MB). Las fotos grandes se comprimen
              automáticamente antes de subir.
            </p>
          )}

          {esEdicion ? (
            <p className="evento-form__hint">
              Deja el archivo vacío para conservar la imagen actual.
            </p>
          ) : null}
        </div>
      </form>
    </Modal>
  )
}

export default EventoFormModal
