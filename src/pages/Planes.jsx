import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { colors } from '../variables/colors.jsx'
import PlanCard from '../components/PlanCard.jsx'
import LoadingOverlay from '../components/LoadingOverlay.jsx'
import { obtenerPlanesPublicos } from '../services/planesService.js'
import planesBg from '../assets/images/hero/bk_home_user.webp'
import './Planes.css'

function Planes() {
  const [planes, setPlanes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const carouselRef = useRef(null)
  const [scroll, setScroll] = useState({ ratio: 0, scrollable: false })

  useEffect(() => {
    const controller = new AbortController()

    const cargar = async () => {
      setLoading(true)
      setError('')

      try {
        const data = await obtenerPlanesPublicos({ signal: controller.signal })
        const ordenados = [...data].sort((a, b) => {
          const posA = Number.isFinite(a.pos) ? a.pos : Number.MAX_SAFE_INTEGER
          const posB = Number.isFinite(b.pos) ? b.pos : Number.MAX_SAFE_INTEGER
          return posA - posB
        })
        setPlanes(ordenados)
      } catch (err) {
        if (err?.name === 'AbortError') return
        setError(err.message || 'No se pudieron cargar los planes')
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }

    cargar()

    return () => controller.abort()
  }, [])

  const actualizarScroll = () => {
    const el = carouselRef.current
    if (!el) return

    const maxScroll = el.scrollWidth - el.clientWidth
    const ratio = maxScroll > 0 ? el.scrollLeft / maxScroll : 0

    setScroll({
      ratio: Math.min(1, Math.max(0, ratio)),
      scrollable: maxScroll > 0,
    })
  }

  useLayoutEffect(() => {
    actualizarScroll()
  }, [planes, loading])

  useEffect(() => {
    const el = carouselRef.current
    if (!el) return

    const handleScroll = () => actualizarScroll()
    const handleResize = () => actualizarScroll()

    el.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleResize)

    return () => {
      el.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  const totalDots = planes.length
  const activeIndex =
    totalDots > 1 ? Math.round(scroll.ratio * (totalDots - 1)) : 0
  const mostrarIndicador = scroll.scrollable && totalDots > 1 && !loading

  return (
    <main
      className="planes-page"
      style={{ backgroundColor: colors.page_background }}
    >
      <div
        className="planes-page__background"
        style={{ backgroundImage: `url(${planesBg})` }}
      />
      <div
        className="planes-page__overlay"
        style={{ backgroundColor: colors.overlay_dark }}
      />

      <div className="planes-page__content">
        <section className="planes-page__hero">
          <h1 className="planes-page__title">
            Elige el plan que <span>te lleva al siguiente nivel</span>
          </h1>
        </section>

        <section
          className="planes-page__carousel-wrapper"
          aria-label="Planes disponibles"
        >
          <div
            className={`planes-page__dots${
              mostrarIndicador ? ' planes-page__dots--visible' : ''
            }`}
            aria-hidden="true"
          >
            {Array.from({ length: totalDots }).map((_, idx) => (
              <span
                key={idx}
                className={`planes-page__dot${
                  idx === activeIndex ? ' planes-page__dot--active' : ''
                }`}
              />
            ))}
          </div>

          <div className="planes-page__carousel" ref={carouselRef}>
            {!loading &&
              !error &&
              planes.map((plan) => <PlanCard key={plan.id} plan={plan} />)}
          </div>

          {!loading && !error && planes.length === 0 && (
            <p className="planes-page__empty">
              Aún no hay planes disponibles. Vuelve pronto.
            </p>
          )}

          {!loading && error && (
            <p className="planes-page__error">{error}</p>
          )}
        </section>
      </div>

      <LoadingOverlay visible={loading} label="Cargando planes" />
    </main>
  )
}

export default Planes
