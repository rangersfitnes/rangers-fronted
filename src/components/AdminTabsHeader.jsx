import { Link, useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../contexts/AdminAuthContext.jsx'
import logo from '../assets/images/logos/logo_header.webp'
import './AdminTabsHeader.css'

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
      className="admin-tabs-header__logout-icon"
    >
      <path d="M15 17l5-5-5-5" />
      <path d="M20 12H9" />
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    </svg>
  )
}

function AdminTabsHeader({ tabs, activeTab, onTabChange, ariaLabel }) {
  const navigate = useNavigate()
  const { logout } = useAdminAuth()

  const handleLogout = async () => {
    await logout()
    navigate('/admin', { replace: true })
  }

  return (
    <header className="admin-tabs-header">
      <Link
        to="/admin/dashboard"
        className="admin-tabs-header__home-link"
        aria-label="Volver al panel"
      >
        <img
          src={logo}
          alt="Rangers Box"
          className="admin-tabs-header__logo"
        />
      </Link>

      <nav
        className="admin-tabs-header__nav"
        aria-label={ariaLabel || 'Secciones'}
      >
        <ul className="admin-tabs-header__nav-list">
          {tabs.map((tab) => (
            <li key={tab.id}>
              <button
                type="button"
                className={`admin-tabs-header__nav-link${
                  activeTab === tab.id
                    ? ' admin-tabs-header__nav-link--active'
                    : ''
                }`}
                onClick={() => onTabChange(tab.id)}
              >
                {tab.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="admin-tabs-header__actions">
        <button
          type="button"
          className="admin-tabs-header__logout"
          onClick={handleLogout}
          aria-label="Cerrar sesión"
        >
          <IconoSalir />
          <span className="admin-tabs-header__logout-label">Cerrar sesión</span>
        </button>
      </div>
    </header>
  )
}

export default AdminTabsHeader
