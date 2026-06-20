import { Link } from 'react-router-dom'
import logo from '../assets/images/logos/logo_header.webp'
import './AdminTabsHeader.css'

function AdminTabsHeader({ tabs, activeTab, onTabChange, ariaLabel }) {
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

      <div className="admin-tabs-header__actions" />
    </header>
  )
}

export default AdminTabsHeader
