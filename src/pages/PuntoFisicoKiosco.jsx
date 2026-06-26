import { useCallback, useEffect, useRef, useState } from 'react'
import { colors } from '../variables/colors.jsx'
import VistaControlAcceso from './PuntoFisicoControlAcceso.jsx'
import './PuntoFisico.css'

function PuntoFisicoKiosco() {
  const pageRef = useRef(null)
  const [fullscreen, setFullscreen] = useState(false)

  const sincronizarFullscreen = useCallback(() => {
    setFullscreen(
      Boolean(
        document.fullscreenElement || document.webkitFullscreenElement,
      ),
    )
  }, [])

  const entrarFullscreen = useCallback(async () => {
    const el = pageRef.current
    if (!el) return

    const activo = Boolean(
      document.fullscreenElement || document.webkitFullscreenElement,
    )
    if (activo) return

    try {
      if (el.requestFullscreen) await el.requestFullscreen()
      else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen()
      else setFullscreen(true)
    } catch {
      setFullscreen(true)
    }
  }, [])

  const toggleFullscreen = useCallback(async () => {
    const el = pageRef.current
    if (!el) return

    const activo = Boolean(
      document.fullscreenElement || document.webkitFullscreenElement,
    )

    try {
      if (!activo) {
        if (el.requestFullscreen) await el.requestFullscreen()
        else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen()
        else setFullscreen(true)
      } else if (document.exitFullscreen) await document.exitFullscreen()
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen()
      else setFullscreen(false)
    } catch {
      setFullscreen((prev) => !prev)
    }
  }, [])

  useEffect(() => {
    entrarFullscreen()

    document.addEventListener('fullscreenchange', sincronizarFullscreen)
    document.addEventListener('webkitfullscreenchange', sincronizarFullscreen)
    return () => {
      document.removeEventListener('fullscreenchange', sincronizarFullscreen)
      document.removeEventListener(
        'webkitfullscreenchange',
        sincronizarFullscreen,
      )
    }
  }, [entrarFullscreen, sincronizarFullscreen])

  const enFullscreen = fullscreen

  return (
    <div
      ref={pageRef}
      className={`pf-page pf-page--kiosco${
        enFullscreen ? ' pf-page--fullscreen' : ''
      }`}
      style={{ backgroundColor: colors.page_background }}
    >
      <main className="pf-page__main pf-page__main--control-acceso">
        <VistaControlAcceso
          fullscreen
          modoKiosco
          onToggleFullscreen={toggleFullscreen}
        />
      </main>
    </div>
  )
}

export default PuntoFisicoKiosco
