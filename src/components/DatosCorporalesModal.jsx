import { useEffect, useMemo, useState } from 'react'
import Modal from './Modal.jsx'
import LoadingOverlay from './LoadingOverlay.jsx'
import { useUsuario } from '../contexts/UsuarioContext.jsx'
import { actualizarMiPerfil } from '../services/userService.js'
import {
  calcularEdadDesdeFechaNacimiento,
  calcularImc,
  etiquetaImc,
} from '../utils/datosCorporales.js'
import './CalcularCaloriasModal.css'

function DatosCorporalesModal({ open, onClose, onGuardado }) {
  const { usuario, actualizarUsuario } = useUsuario()
  const edadDesdeNacimiento = useMemo(
    () => calcularEdadDesdeFechaNacimiento(usuario?.fechaNacimiento),
    [usuario?.fechaNacimiento],
  )
  const tieneFechaNacimiento = Boolean(
    String(usuario?.fechaNacimiento || '').trim(),
  )

  const [pesoKg, setPesoKg] = useState('')
  const [alturaCm, setAlturaCm] = useState('')
  const [edadManual, setEdadManual] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setPesoKg(usuario?.pesoKg != null ? String(usuario.pesoKg) : '')
    setAlturaCm(usuario?.alturaCm != null ? String(usuario.alturaCm) : '')
    setEdadManual(
      edadDesdeNacimiento != null
        ? String(edadDesdeNacimiento)
        : usuario?.edadManual != null
          ? String(usuario.edadManual)
          : '',
    )
    setError('')
    setLoading(false)
  }, [open, usuario, edadDesdeNacimiento])

  const imcPreview = calcularImc(pesoKg, alturaCm)

  const handleGuardar = async () => {
    const peso = Number(pesoKg)
    const altura = Number(alturaCm)
    const edad = Number(edadManual)

    if (!Number.isFinite(peso) || peso < 25 || peso > 300) {
      setError('Ingresa un peso válido entre 25 y 300 kg')
      return
    }
    if (!Number.isFinite(altura) || altura < 100 || altura > 250) {
      setError('Ingresa una altura válida entre 100 y 250 cm')
      return
    }
    if (!tieneFechaNacimiento || edadDesdeNacimiento == null) {
      if (!Number.isFinite(edad) || edad < 5 || edad > 120) {
        setError('Ingresa una edad válida entre 5 y 120 años')
        return
      }
    }

    setLoading(true)
    setError('')
    try {
      const payload = {
        pesoKg: peso,
        alturaCm: altura,
      }
      if (!tieneFechaNacimiento || edadDesdeNacimiento == null) {
        payload.edadManual = edad
      }

      const actualizado = await actualizarMiPerfil(payload)
      if (actualizado) {
        actualizarUsuario(actualizado)
      } else {
        actualizarUsuario({
          pesoKg: Math.round(peso * 10) / 10,
          alturaCm: Math.round(altura),
          ...(payload.edadManual != null ? { edadManual: payload.edadManual } : {}),
        })
      }
      onGuardado?.()
      onClose?.()
    } catch (err) {
      setError(err.message || 'No se pudieron guardar los datos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onClose}
      title="Mis datos corporales"
      className="calcular-calorias-modal"
      footer={
        <>
          <button
            type="button"
            className="calcular-calorias__btn calcular-calorias__btn--ghost"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="calcular-calorias__btn calcular-calorias__btn--primary"
            onClick={handleGuardar}
            disabled={loading}
          >
            {loading ? 'Guardando…' : 'Guardar'}
          </button>
        </>
      }
    >
      <p className="calcular-calorias__intro">
        Estos datos permiten personalizar el cálculo de calorías y el resumen
        de cada alimento.
      </p>

      <div className="datos-corporales__grid">
        <label className="datos-corporales__campo">
          <span>Peso (kg)</span>
          <input
            type="number"
            inputMode="decimal"
            min="25"
            max="300"
            step="0.1"
            value={pesoKg}
            onChange={(e) => setPesoKg(e.target.value)}
            disabled={loading}
            placeholder="Ej. 72"
          />
        </label>

        <label className="datos-corporales__campo">
          <span>Altura (cm)</span>
          <input
            type="number"
            inputMode="numeric"
            min="100"
            max="250"
            step="1"
            value={alturaCm}
            onChange={(e) => setAlturaCm(e.target.value)}
            disabled={loading}
            placeholder="Ej. 175"
          />
        </label>

        <label className="datos-corporales__campo">
          <span>Edad (años)</span>
          <input
            type="number"
            inputMode="numeric"
            min="5"
            max="120"
            step="1"
            value={edadManual}
            onChange={(e) => setEdadManual(e.target.value)}
            disabled={loading || Boolean(edadDesdeNacimiento)}
            placeholder="Ej. 28"
          />
          {edadDesdeNacimiento != null && (
            <small>
              Calculada automáticamente desde tu fecha de nacimiento.
            </small>
          )}
        </label>
      </div>

      {imcPreview != null && (
        <p className="datos-corporales__imc">
          IMC estimado: <strong>{imcPreview}</strong> ({etiquetaImc(imcPreview)})
        </p>
      )}

      {error && (
        <p className="calcular-calorias__error" role="alert">
          {error}
        </p>
      )}

      <LoadingOverlay visible={loading} label="Guardando datos" />
    </Modal>
  )
}

export default DatosCorporalesModal
