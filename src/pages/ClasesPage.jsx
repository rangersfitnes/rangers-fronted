import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { colors } from '../variables/colors.jsx'
import ClasesSemana from '../components/ClasesSemana.jsx'
import EntrenamientoLibreModal from '../components/EntrenamientoLibreModal.jsx'
import clasesBg from '../assets/images/hero/bk_home_user.webp'
import './ClasesPage.css'

function ClasesPage() {
  const { pathname } = useLocation()
  const [modalAbierto, setModalAbierto] = useState(true)

  useEffect(() => {
    window.scrollTo(0, 0)
    setModalAbierto(true)
  }, [pathname])

  return (
    <main
      className="clases-page"
      style={{ backgroundColor: colors.page_background }}
    >
      <div
        className="clases-page__background"
        style={{ backgroundImage: `url(${clasesBg})` }}
      />
      <div
        className="clases-page__overlay"
        style={{ backgroundColor: colors.overlay_dark }}
      />

      <div className="clases-page__content">
        <ClasesSemana />
      </div>

      <EntrenamientoLibreModal
        open={modalAbierto}
        onClose={() => setModalAbierto(false)}
      />
    </main>
  )
}

export default ClasesPage
