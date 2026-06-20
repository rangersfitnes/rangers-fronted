import { useEffect } from 'react'
import { colors } from '../variables/colors.jsx'
import SobreNosotros from '../components/SobreNosotros.jsx'
import sobreBg from '../assets/images/hero/bk_home_user.webp'
import './SobreNosotrosPage.css'

function SobreNosotrosPage() {
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <main
      className="sobre-page"
      style={{ backgroundColor: colors.page_background }}
    >
      <div
        className="sobre-page__background"
        style={{ backgroundImage: `url(${sobreBg})` }}
      />
      <div
        className="sobre-page__overlay"
        style={{ backgroundColor: colors.overlay_dark }}
      />

      <div className="sobre-page__content">
        <SobreNosotros />
      </div>
    </main>
  )
}

export default SobreNosotrosPage
