import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../variables/firebase.jsx'
import logo from '../assets/images/logos/logo_header.webp'
import UserIcon from './icons/UserIcon.jsx'
import ChevronRightIcon from './icons/ChevronRightIcon.jsx'
import { useActiveSection } from '../hooks/useActiveSection.js'
import { useUsuario } from '../contexts/UsuarioContext.jsx'
import {
  actualizarFotoPerfil,
  eliminarFotoPerfil,
} from '../services/userService.js'
import { useToast } from './Toast.jsx'
import LoadingOverlay from './LoadingOverlay.jsx'
import './Header.css'

const navItems = [
  { label: 'Inicio', sectionId: 'inicio', to: { pathname: '/', hash: '#inicio' } },
  {
    label: 'Sobre nosotros',
    sectionId: 'sobre-nosotros',
    to: '/sobre-nosotros',
    hasDropdown: true,
  },
  {
    label: 'Clases',
    sectionId: 'clases',
    to: '/clases',
    hasDropdown: true,
  },
  { label: 'Ver planes', sectionId: 'planes', to: '/planes' },
]

function obtenerSoloNombres(nombreCompleto) {
  if (!nombreCompleto) return ''
  const partes = nombreCompleto.trim().split(/\s+/)
  const cantidadNombres = partes.length >= 4 ? 2 : 1
  return partes.slice(0, cantidadNombres).join(' ')
}

const accountActions = [
  { label: 'Información del perfil', to: '/cuenta/perfil' },
  { label: 'Actividad', to: '/cuenta/actividad' },
  { label: 'Asistencias', to: '/cuenta/asistencias' },
]

function IconoSalir() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="header__profile-menu-logout-icon"
    >
      <path d="M15 17l5-5-5-5" />
      <path d="M20 12H9" />
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    </svg>
  )
}

function HeaderUserMenu({
  usuario,
  fotoCargando,
  onLogout,
  onSeleccionarArchivo,
  onEliminarFoto,
}) {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const wrapRef = useRef(null)
  const tieneFoto = Boolean(usuario?.profileImage)

  const cerrarMenu = useCallback(() => setMenuAbierto(false), [])

  useEffect(() => {
    if (!menuAbierto) return

    const handleClickOutside = (event) => {
      if (!wrapRef.current?.contains(event.target)) cerrarMenu()
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') cerrarMenu()
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [menuAbierto, cerrarMenu])

  return (
    <div className="header__user-wrap" ref={wrapRef}>
      <button
        type="button"
        className="header__user-btn"
        onClick={() => setMenuAbierto((prev) => !prev)}
        aria-label={`Mi cuenta — ${usuario.nombre}`}
        aria-expanded={menuAbierto}
        aria-haspopup="menu"
        title={usuario.nombre}
      >
        <span className="header__user-avatar">
          {tieneFoto ? (
            <img
              src={usuario.profileImage}
              alt=""
              className="header__user-avatar-img"
            />
          ) : (
            <UserIcon className="header__user-avatar-placeholder" />
          )}
        </span>
        <span className="header__user-name">
          {obtenerSoloNombres(usuario.nombre)}
        </span>
      </button>

      {menuAbierto && (
        <div
          className="header__profile-menu"
          role="menu"
          aria-label="Opciones de cuenta"
        >
          <div className="header__profile-menu-head">
            <span className="header__profile-menu-eyebrow">Atleta</span>
            <span className="header__profile-menu-name" title={usuario.nombre}>
              {obtenerSoloNombres(usuario.nombre)}
            </span>
          </div>

          <ul className="header__profile-menu-actions">
            {accountActions.map((action) => (
              <li key={action.to}>
                <Link
                  to={action.to}
                  role="menuitem"
                  className="header__profile-menu-link"
                  onClick={cerrarMenu}
                >
                  <span>{action.label}</span>
                  <ChevronRightIcon className="header__profile-menu-link-arrow" />
                </Link>
              </li>
            ))}
          </ul>

          {tieneFoto ? (
            <div className="header__profile-menu-foto">
              <button
                type="button"
                role="menuitem"
                className="header__profile-menu-item"
                onClick={() => {
                  cerrarMenu()
                  onSeleccionarArchivo()
                }}
                disabled={fotoCargando}
              >
                Cambiar foto
              </button>
              <button
                type="button"
                role="menuitem"
                className="header__profile-menu-item header__profile-menu-item--danger"
                onClick={() => {
                  cerrarMenu()
                  onEliminarFoto()
                }}
                disabled={fotoCargando}
              >
                Eliminar foto
              </button>
            </div>
          ) : (
            <button
              type="button"
              role="menuitem"
              className="header__profile-menu-item"
              onClick={() => {
                cerrarMenu()
                onSeleccionarArchivo()
              }}
              disabled={fotoCargando}
            >
              Subir foto de perfil
            </button>
          )}

          <button
            type="button"
            role="menuitem"
            className="header__profile-menu-logout"
            onClick={() => {
              cerrarMenu()
              onLogout()
            }}
          >
            <IconoSalir />
            <span>Cerrar sesión</span>
          </button>
        </div>
      )}
    </div>
  )
}

function Header({ inScroll = false }) {
  const [fotoCargando, setFotoCargando] = useState(false)
  const fileInputRef = useRef(null)
  const activeSection = useActiveSection()
  const { usuario, logout, actualizarUsuario } = useUsuario()
  const toast = useToast()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await signOut(auth).catch(() => {})
    logout()
    navigate('/', { replace: true })
  }

  const abrirSelectorArchivo = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFotoChange = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setFotoCargando(true)
    try {
      const url = await actualizarFotoPerfil(file)
      actualizarUsuario({ profileImage: url })
      toast.success('Foto de perfil actualizada')
    } catch (err) {
      toast.error(err.message || 'No se pudo actualizar la foto')
    } finally {
      setFotoCargando(false)
    }
  }

  const handleEliminarFoto = useCallback(async () => {
    if (fotoCargando || !usuario?.profileImage) return
    setFotoCargando(true)
    try {
      await eliminarFotoPerfil()
      actualizarUsuario({ profileImage: null })
      toast.success('Foto de perfil eliminada')
    } catch (err) {
      toast.error(err.message || 'No se pudo eliminar la foto')
    } finally {
      setFotoCargando(false)
    }
  }, [actualizarUsuario, fotoCargando, toast, usuario?.profileImage])

  const isItemActive = (item) => activeSection === item.sectionId

  const getNavClassName = (item, baseClass) =>
    `${baseClass}${isItemActive(item) ? ` ${baseClass}--active` : ''}`

  const renderNavItem = (item, linkClass) => {
    const className = getNavClassName(item, linkClass)
    const content = (
      <>
        {item.label}
        {item.hasDropdown && (
          <span className="header__nav-chevron" aria-hidden="true">
            ▾
          </span>
        )}
      </>
    )

    if (item.to === '/planes' || item.to === '/clases') {
      return (
        <NavLink
          to={item.to}
          className={({ isActive }) =>
            `${linkClass}${isActive ? ` ${linkClass}--active` : ''}`
          }
        >
          {content}
        </NavLink>
      )
    }

    return (
      <Link to={item.to} className={className}>
        {content}
      </Link>
    )
  }

  return (
    <>
    <div
      className={`site-header-chrome${
        inScroll ? ' site-header-chrome--in-scroll' : ' site-header-chrome--fixed'
      }`}
    >
      <header className="header site-header-chrome__bar">
        <Link to="/" className="header__home-link" aria-label="Ir al inicio">
          <img src={logo} alt="Rangers Box" className="header__logo" />
        </Link>

        <nav className="header__nav" aria-label="Navegación principal">
          <ul className="header__nav-list">
            {navItems.map((item) => (
              <li key={item.label}>
                {renderNavItem(item, 'header__nav-link')}
              </li>
            ))}
          </ul>
        </nav>

        <div className="header__actions">
          {usuario ? (
            <HeaderUserMenu
              usuario={usuario}
              fotoCargando={fotoCargando}
              onLogout={handleLogout}
              onSeleccionarArchivo={abrirSelectorArchivo}
              onEliminarFoto={handleEliminarFoto}
            />
          ) : (
            <Link
              to="/login"
              className="header__login-btn"
              aria-label="Iniciar sesión"
            >
              <UserIcon className="header__login-icon" />
            </Link>
          )}
        </div>
      </header>

      <nav className="site-header-chrome__nav" aria-label="Accesos rápidos">
        <ul className="site-header-chrome__nav-list">
          {navItems.map((item) => (
            <li key={item.label} className="site-header-chrome__nav-item">
              {renderNavItem(item, 'header__quick-link')}
            </li>
          ))}
        </ul>
      </nav>
    </div>

    {usuario && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="header__drawer-file-input"
          onChange={handleFotoChange}
        />
      )}

    <LoadingOverlay visible={fotoCargando} label="Actualizando foto" />
    </>
  )
}

export default Header
