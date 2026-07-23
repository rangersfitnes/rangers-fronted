import { useEffect, useMemo, useState } from 'react'
import CampoFechaCalendario from './CampoFechaCalendario.jsx'
import { useToast } from './Toast.jsx'
import { completarPerfilUsuario } from '../services/userService.js'
import {
  camposFacturacionFaltantes,
  esCorreoValido,
  normalizarCorreo,
  normalizarDireccion,
} from '../utils/validacionUsuario.js'
import './CompletarPerfilModal.css'

function CompletarPerfilModal({ open, usuario, onCompletado }) {
  const toast = useToast()
  const faltantes = useMemo(
    () => camposFacturacionFaltantes(usuario || {}),
    [usuario],
  )

  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [correo, setCorreo] = useState('')
  const [direccion, setDireccion] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) {
      setFechaNacimiento('')
      setCorreo('')
      setDireccion('')
      setError('')
      setGuardando(false)
      return
    }

    setFechaNacimiento(usuario?.fechaNacimiento || '')
    setCorreo(usuario?.correo || '')
    setDireccion(usuario?.direccion || '')
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

    if (faltantes.correo) {
      const correoLimpio = normalizarCorreo(correo)
      if (!esCorreoValido(correoLimpio)) {
        setError('Ingresa un correo electrónico válido')
        return
      }
      payload.correo = correoLimpio
    }

    if (faltantes.direccion) {
      const direccionLimpia = normalizarDireccion(direccion)
      if (direccionLimpia.length < 5) {
        setError('Ingresa tu dirección completa')
        return
      }
      payload.direccion = direccionLimpia
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

  const puedeGuardar =
    (!faltantes.fechaNacimiento || Boolean(fechaNacimiento)) &&
    (!faltantes.correo || esCorreoValido(correo)) &&
    (!faltantes.direccion || normalizarDireccion(direccion).length >= 5)

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

          {faltantes.correo ? (
            <label className="completar-perfil-card__field">
              <span className="completar-perfil-card__label">
                Correo electrónico
              </span>
              <input
                type="email"
                className="completar-perfil-card__input"
                placeholder="Ej. usuario@correo.com"
                value={correo}
                onChange={(event) => setCorreo(event.target.value)}
                autoComplete="email"
                disabled={guardando}
                required
              />
            </label>
          ) : null}

          {faltantes.direccion ? (
            <label className="completar-perfil-card__field">
              <span className="completar-perfil-card__label">Dirección</span>
              <input
                type="text"
                className="completar-perfil-card__input"
                placeholder="Ej. Calle 10 # 5-20, Manizales"
                value={direccion}
                onChange={(event) => setDireccion(event.target.value)}
                autoComplete="street-address"
                disabled={guardando}
                required
              />
            </label>
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
