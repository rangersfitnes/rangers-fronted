import { useCallback, useEffect, useState } from 'react'
import { obtenerLiquidezHistorica } from '../services/reportesFinancierosService.js'

const INTERVALO_LIQUIDEZ_MS = 20_000

export function useLiquidezHistorica({ activo = true, intervaloMs = INTERVALO_LIQUIDEZ_MS } = {}) {
  const [liquidez, setLiquidez] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null)

  const cargarLiquidez = useCallback(async (signal) => {
    try {
      const data = await obtenerLiquidezHistorica({ signal })
      setLiquidez(data)
      setError('')
      setUltimaActualizacion(Date.now())
    } catch (err) {
      if (err?.name === 'AbortError') return
      setError(err.message || 'No se pudo cargar la liquidez histórica')
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!activo) return undefined

    const controller = new AbortController()
    setLoading(true)
    cargarLiquidez(controller.signal)

    const recarga = window.setInterval(
      () => cargarLiquidez(controller.signal),
      intervaloMs,
    )

    return () => {
      controller.abort()
      window.clearInterval(recarga)
    }
  }, [activo, cargarLiquidez, intervaloMs])

  return { liquidez, loading, error, ultimaActualizacion, recargar: cargarLiquidez }
}
