import { useEffect, useRef, useState } from 'react'

export function useContadorAnimado(valor, duracionMs = 700) {
  const [mostrado, setMostrado] = useState(valor ?? 0)
  const prevRef = useRef(valor ?? 0)

  useEffect(() => {
    const destino = Number(valor) || 0
    const origen = prevRef.current

    if (origen === destino) {
      setMostrado(destino)
      return undefined
    }

    const inicio = performance.now()
    let frameId = 0

    const tick = (ahora) => {
      const progreso = Math.min(1, (ahora - inicio) / duracionMs)
      const ease = 1 - (1 - progreso) ** 3
      setMostrado(Math.round(origen + (destino - origen) * ease))

      if (progreso < 1) {
        frameId = requestAnimationFrame(tick)
      } else {
        prevRef.current = destino
        setMostrado(destino)
      }
    }

    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
  }, [valor, duracionMs])

  return mostrado
}
