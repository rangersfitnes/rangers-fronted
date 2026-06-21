import { Link, Navigate, useNavigate } from 'react-router-dom'
import { colors } from '../variables/colors.jsx'
import { getAdminRole } from '../services/authService.js'
import { useAdminAuth } from '../contexts/AdminAuthContext.jsx'
import './Dashboard.css'

function Dashboard() {
  const navigate = useNavigate()
  const { logout } = useAdminAuth()
  const role = getAdminRole()

  const handleLogout = async () => {
    await logout()
    navigate('/admin', { replace: true })
  }

  if (role !== 'creador') {
    return <Navigate to="/admin/punto-fisico" replace />
  }

  return (
    <main
      className="dashboard-page"
      style={{ backgroundColor: colors.page_background }}
    >
      <div className="dashboard-page__content">
        <h1 className="dashboard-page__title">Panel de administración</h1>

        <div className="dashboard-page__actions">
          <Link to="/admin/punto-fisico" className="dashboard-page__btn">
            Punto fisico
          </Link>
          <Link
            to="/admin/administracion-general"
            className="dashboard-page__btn"
          >
            Administracion general
          </Link>
        </div>

        <button
          type="button"
          className="dashboard-page__logout"
          onClick={handleLogout}
        >
          Cerrar sesión
        </button>
      </div>
    </main>
  )
}

export default Dashboard
