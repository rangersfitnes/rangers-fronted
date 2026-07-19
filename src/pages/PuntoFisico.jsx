import { useCallback, useEffect, useRef, useState } from 'react'
import { colors } from '../variables/colors.jsx'
import AdminTabsHeader from '../components/AdminTabsHeader.jsx'
import { useToast } from '../components/Toast.jsx'
import { abrirKioscoAcceso } from '../utils/abrirKioscoAcceso.js'
import VistaPagoClases from './PuntoFisicoPagoClases.jsx'
import VistaCierreDiario from './PuntoFisicoCierreDiario.jsx'
import VistaControlAcceso from './PuntoFisicoControlAcceso.jsx'
import VistaMiPerfil from './PuntoFisicoMiPerfil.jsx'
import VistaUsuariosAdmin from './VistaUsuariosAdmin.jsx'
import './PuntoFisico.css'

const tabs = [
  { id: 'control-acceso', label: 'Control de acceso' },
  { id: 'pago-clases', label: 'Pago del día' },
  { id: 'cierre-diario', label: 'Cierre diario' },
  { id: 'mi-perfil', label: 'Mi perfil' },
  { id: 'usuarios', label: 'Usuarios' },
]

function PuntoFisico() {
  const toast = useToast()
  const [activeTab, setActiveTab] = useState('control-acceso')
  const [fullscreen, setFullscreen] = useState(false)
  const pageRef = useRef(null)

  useEffect(() => {
    const sincronizarFullscreen = () => {
      const activo = Boolean(
        document.fullscreenElement || document.webkitFullscreenElement,
      )
      setFullscreen(activo)
    }

    document.addEventListener('fullscreenchange', sincronizarFullscreen)
    document.addEventListener('webkitfullscreenchange', sincronizarFullscreen)
    return () => {
      document.removeEventListener('fullscreenchange', sincronizarFullscreen)
      document.removeEventListener('webkitfullscreenchange', sincronizarFullscreen)
    }
  }, [])

  useEffect(() => {
    if (activeTab !== 'control-acceso') {
      const el =
        document.fullscreenElement || document.webkitFullscreenElement
      if (el) {
        if (document.exitFullscreen) document.exitFullscreen().catch(() => {})
        else if (document.webkitExitFullscreen) {
          document.webkitExitFullscreen()
        }
      }
      setFullscreen(false)
    }
  }, [activeTab])

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

  const abrirPantallaExterna = useCallback(async () => {
    const resultado = await abrirKioscoAcceso()
    if (!resultado.ok) {
      toast.error(
        resultado.reason === 'blocked'
          ? 'Permite ventanas emergentes para abrir la pantalla externa.'
          : 'No se pudo abrir la pantalla de acceso externa.',
      )
    }
  }, [toast])

  const enControlAcceso = activeTab === 'control-acceso'
  const ocultarTabs = enControlAcceso && fullscreen

  return (
    <div
      ref={pageRef}
      className={`pf-page${fullscreen ? ' pf-page--fullscreen' : ''}`}
      style={{ backgroundColor: colors.page_background }}
    >
      {!ocultarTabs ? (
        <AdminTabsHeader
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          ariaLabel="Secciones del punto físico"
        />
      ) : null}

      <main
        className={`pf-page__main${
          enControlAcceso ? ' pf-page__main--control-acceso' : ''
        }`}
      >
        {enControlAcceso ? (
          <>
            {!fullscreen ? (
              <div className="pf-control-acceso__admin-bar">
                <button
                  type="button"
                  className="pf-control-acceso__hdmi-btn"
                  onClick={abrirPantallaExterna}
                >
                  <svg
                    className="pf-control-acceso__hdmi-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <rect x="2" y="4" width="20" height="14" rx="2" />
                    <path d="M8 22h8M12 18v4" />
                  </svg>
                  Pantalla externa (HDMI)
                </button>
              </div>
            ) : null}
            <VistaControlAcceso
              fullscreen={fullscreen}
              onToggleFullscreen={toggleFullscreen}
            />
          </>
        ) : null}
        {activeTab === 'pago-clases' && <VistaPagoClases />}
        {activeTab === 'cierre-diario' && <VistaCierreDiario />}
        {activeTab === 'mi-perfil' && <VistaMiPerfil />}
        {activeTab === 'usuarios' && <VistaUsuariosAdmin />}
      </main>
    </div>
  )
}

export default PuntoFisico
