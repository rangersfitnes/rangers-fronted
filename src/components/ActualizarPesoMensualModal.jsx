import { useEffect, useState } from 'react'
import {
  obtenerHistorialPeso,
  registrarPesoMensual,
} from '../services/userService.js'
import './ActualizarPesoMensualModal.css'

function formatearMes(mes) {
  if (!mes || !/^\d{4}-\d{2}$/.test(mes)) return mes || '—'
  const [y, m] = mes.split('-').map(Number)
  const fecha = new Date(y, m - 1, 1)
  return fecha.toLocaleDateString('es-CO', {
    month: 'long',
    year: 'numeric',
  })
}

function formatearFechaRegistro(ms) {
  if (!ms) return '—'
  return new Date(ms).toLocaleDateString('es-CO', {
    timeZone: 'America/Bogota',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function clavePosponerPeso(usuario) {
  const uid = usuario?.id || 'anon'
  const mes = usuario?.mesPesoActual || 'mes'
  return `rb_peso_posponer_${uid}_${mes}`
}

export function pesoPospuestoEstaSesion(usuario) {
  if (!usuario?.id) return false
  try {
    return sessionStorage.getItem(clavePosponerPeso(usuario)) === '1'
  } catch {
    return false
  }
}

function marcarPesoPospuesto(usuario) {
  try {
    sessionStorage.setItem(clavePosponerPeso(usuario), '1')
  } catch {
    /* ignore */
  }
}

function ActualizarPesoMensualModal({ open, usuario, onActualizado, onPosponer }) {
  const [pesoKg, setPesoKg] = useState('')
  const [historial, setHistorial] = useState([])
  const [loading, setLoading] = useState(false)
  const [cargandoHist, setCargandoHist] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) {
      setError('')
      setLoading(false)
      return
    }
    setPesoKg(usuario?.pesoKg != null ? String(usuario.pesoKg) : '')
    setError('')
    document.body.style.overflow = 'hidden'

    const controller = new AbortController()
    setCargandoHist(true)
    obtenerHistorialPeso({ limite: 8, signal: controller.signal })
      .then((lista) => {
        if (!controller.signal.aborted) setHistorial(lista)
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return
        console.warn('[peso] historial:', err.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setCargandoHist(false)
      })

    return () => {
      controller.abort()
      document.body.style.overflow = ''
    }
  }, [open, usuario?.pesoKg, usuario?.id])

  if (!open) return null

  const handleGuardar = async (event) => {
    event.preventDefault()
    const peso = Number(pesoKg)
    if (!Number.isFinite(peso) || peso < 25 || peso > 300) {
      setError('Ingresa un peso válido entre 25 y 300 kg')
      return
    }

    setLoading(true)
    setError('')
    try {
      const actualizado = await registrarPesoMensual(peso, { origen: 'mensual' })
      onActualizado?.(actualizado)
    } catch (err) {
      setError(err.message || 'No se pudo guardar el peso')
      setLoading(false)
    }
  }

  const handlePosponer = () => {
    marcarPesoPospuesto(usuario)
    onPosponer?.()
  }

  return (
    <div
      className="actualizar-peso-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="actualizar-peso-title"
    >
      <div className="actualizar-peso-card">
        <p className="actualizar-peso-card__etiqueta">Seguimiento mensual</p>
        <h2 id="actualizar-peso-title" className="actualizar-peso-card__title">
          Actualiza tu peso
        </h2>
        <p className="actualizar-peso-card__texto">
          Una vez al mes te pedimos tu peso actual para personalizar mejor tu
          entrenamiento y el análisis de calorías.
          {usuario?.mesPesoActual
            ? ` Mes: ${formatearMes(usuario.mesPesoActual)}.`
            : ''}
        </p>

        {usuario?.pesoKg != null && (
          <p className="actualizar-peso-card__actual">
            Último registro: <strong>{usuario.pesoKg} kg</strong>
          </p>
        )}

        <form className="actualizar-peso-card__form" onSubmit={handleGuardar}>
          <label className="actualizar-peso-card__field">
            <span className="actualizar-peso-card__label">Peso actual (kg)</span>
            <input
              type="number"
              className="actualizar-peso-card__input"
              inputMode="decimal"
              min="25"
              max="300"
              step="0.1"
              value={pesoKg}
              onChange={(e) => setPesoKg(e.target.value)}
              disabled={loading}
              placeholder="Ej. 72.5"
              autoFocus
              required
            />
          </label>

          {error && (
            <p className="actualizar-peso-card__error" role="alert">
              {error}
            </p>
          )}

          <div className="actualizar-peso-card__acciones">
            <button
              type="button"
              className="actualizar-peso-card__btn actualizar-peso-card__btn--ghost"
              onClick={handlePosponer}
              disabled={loading}
            >
              Actualizar después
            </button>
            <button
              type="submit"
              className="actualizar-peso-card__btn actualizar-peso-card__btn--primary"
              disabled={loading}
            >
              {loading ? 'Guardando…' : 'Guardar peso'}
            </button>
          </div>
        </form>

        <div className="actualizar-peso-card__historial">
          <h3>Historial de peso</h3>
          {cargandoHist ? (
            <p className="actualizar-peso-card__hist-vacio">Cargando…</p>
          ) : historial.length === 0 ? (
            <p className="actualizar-peso-card__hist-vacio">
              Aún no hay registros. Este será el primero.
            </p>
          ) : (
            <ul>
              {historial.map((item) => (
                <li key={item.id}>
                  <span>{item.pesoKg} kg</span>
                  <span>
                    {formatearMes(item.mes)} ·{' '}
                    {formatearFechaRegistro(item.registradoEn)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export default ActualizarPesoMensualModal
