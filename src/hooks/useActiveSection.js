import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

const HOME_SECTIONS = ['inicio', 'clases-hoy', 'ubicacion']

export function useActiveSection() {
  const { pathname, hash } = useLocation()
  const [activeSection, setActiveSection] = useState('inicio')

  useEffect(() => {
    if (pathname === '/planes') {
      setActiveSection('planes')
      return
    }

    if (pathname === '/sobre-nosotros') {
      setActiveSection('sobre-nosotros')
      return
    }

    if (pathname === '/clases') {
      setActiveSection('clases')
      return
    }

    if (
      pathname.startsWith('/admin') ||
      pathname === '/login' ||
      pathname.startsWith('/payment-plan')
    ) {
      setActiveSection(null)
      return
    }

    if (pathname !== '/') {
      setActiveSection(null)
      return
    }

    const sectionElements = HOME_SECTIONS.map((id) =>
      document.getElementById(id),
    ).filter(Boolean)

    if (sectionElements.length === 0) return

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)

        if (visible.length > 0) {
          setActiveSection(visible[0].target.id)
        }
      },
      {
        rootMargin: '-30% 0px -55% 0px',
        threshold: [0, 0.15, 0.35, 0.55, 0.75, 1],
      },
    )

    sectionElements.forEach((section) => observer.observe(section))

    return () => observer.disconnect()
  }, [pathname])

  useEffect(() => {
    if (pathname !== '/' || !hash) return

    const sectionId = hash.replace('#', '')
    const element = document.getElementById(sectionId)
    if (element) {
      setActiveSection(sectionId)
      element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [pathname, hash])

  return activeSection
}
