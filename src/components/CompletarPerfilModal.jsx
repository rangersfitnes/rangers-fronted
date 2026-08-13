import { useEffect, useMemo, useState } from 'react'
import CampoFechaCalendario from './CampoFechaCalendario.jsx'
import { useToast } from './Toast.jsx'
import { completarPerfilUsuario } from '../services/userService.js'
import { camposFacturacionFaltantes } from '../utils/validacionUsuario.js'
import './CompletarPerfilModal.css'

function CompletarPerfilModal({ open, usuario, onCompletado }) {
  const toast = useToast()
  const faltantes = useMemo(
    () => camposFacturacionFaltantes(usuario || {}),
    [usuario],
  )

  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) {
      setFechaNacimiento('')
      setError('')
      setGuardando(false)
      return
    }

    setFechaNacimiento(usuario?.fechaNacimiento || '')
  }, [open, usuario])

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const handleGuardar = async (event) => {
    event.preventDefault()
    setError('')

    const payload = {}

    if (faltantes.fechaNacimiento) {
      if (!fechaNacimiento) {
        setError('Selecciona tu fecha de nacimiento')
        return
      }
      payload.fechaNacimiento = fechaNacimiento
    }

    if (Object.keys(payload).length === 0) {
      onCompletado?.(usuario)
      return
    }

    setGuardando(true)
    try {
      const actualizado = await completarPerfilUsuario(payload)
      toast.success('Datos de facturación actualizados')
      onCompletado?.(actualizado)
    } catch (err) {
      setError(err.message || 'No se pudo guardar la información')
    } finally {
      setGuardando(false)
    }
  }

  const puedeGuardar = !faltantes.fechaNacimiento || Boolean(fechaNacimiento)

  if (!open) return null

  return (
    <div
      className="completar-perfil-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="completar-perfil-title"
    >
      <div className="completar-perfil-card">
        <span className="completar-perfil-card__etiqueta">Acción necesaria</span>
        <h1 id="completar-perfil-title" className="completar-perfil-card__title">
          Completa tus datos
        </h1>
        <p className="completar-perfil-card__texto">
          {usuario?.nombre ? `${usuario.nombre}, ` : ''}
          para facturar necesitamos completar la información faltante de tu
          cuenta. No podrás continuar hasta guardarla.
        </p>

        <form className="completar-perfil-card__form" onSubmit={handleGuardar}>
          {faltantes.fechaNacimiento ? (
            <CampoFechaCalendario
              label="Fecha de nacimiento"
              value={fechaNacimiento}
              onChange={setFechaNacimiento}
              disabled={guardando}
            />
          ) : null}

          {error ? (
            <p className="completar-perfil-card__error" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            className="completar-perfil-card__cta"
            disabled={guardando || !puedeGuardar}
          >
            {guardando ? 'Guardando…' : 'Guardar y continuar'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default CompletarPerfilModal
