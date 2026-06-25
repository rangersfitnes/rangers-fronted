import { useEffect, useState } from 'react'
import CampoFechaCalendario from './CampoFechaCalendario.jsx'
import { useToast } from './Toast.jsx'
import { completarPerfilUsuario } from '../services/userService.js'
import './CompletarPerfilModal.css'

function CompletarPerfilModal({ open, nombre, onCompletado }) {
  const toast = useToast()
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) {
      setFechaNacimiento('')
      setError('')
      setGuardando(false)
    }
  }, [open])

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

    if (!fechaNacimiento) {
      setError('Selecciona tu fecha de nacimiento')
      return
    }

    setGuardando(true)
    try {
      const usuario = await completarPerfilUsuario({ fechaNacimiento })
      toast.success('Perfil actualizado')
      onCompletado?.(usuario)
    } catch (err) {
      setError(err.message || 'No se pudo guardar la información')
    } finally {
      setGuardando(false)
    }
  }

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
          Completa tu perfil
        </h1>
        <p className="completar-perfil-card__texto">
          {nombre ? `${nombre}, ` : ''}
          necesitamos tu fecha de nacimiento para mantener tu información al día en
          Rangers Box.
        </p>

        <form className="completar-perfil-card__form" onSubmit={handleGuardar}>
          <CampoFechaCalendario
            label="Fecha de nacimiento"
            value={fechaNacimiento}
            onChange={setFechaNacimiento}
            disabled={guardando}
          />

          {error ? (
            <p className="completar-perfil-card__error" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            className="completar-perfil-card__cta"
            disabled={guardando || !fechaNacimiento}
          >
            {guardando ? 'Guardando…' : 'Guardar y continuar'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default CompletarPerfilModal
