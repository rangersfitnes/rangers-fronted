import { useEffect, useState } from 'react'
import { fechaDiaColombia } from '../utils/planVigenciaUtils.js'

/**
 * Devuelve la fecha ISO (YYYY-MM-DD) del día actual en Colombia y se actualiza
 * cuando cambia el día, para recalcular días de vigencia sin recargar a mano.
 */
export function useDiaColombia({ pollMs = 60_000 } = {}) {
  const [dia, setDia] = useState(() => fechaDiaColombia())

  useEffect(() => {
    const actualizar = () => {
      const hoy = fechaDiaColombia()
      setDia((prev) => (prev === hoy ? prev : hoy))
    }

    actualizar()
    const id = setInterval(actualizar, pollMs)

    const onFocus = () => actualizar()
    const onVisibility = () => {
      if (document.visibilityState === 'visible') actualizar()
    }

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      clearInterval(id)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [pollMs])

  return dia
}
