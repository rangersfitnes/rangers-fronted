import { Link, Navigate, useNavigate } from 'react-router-dom'
import { colors } from '../variables/colors.jsx'
import { useAdminAuth } from '../contexts/AdminAuthContext.jsx'
import {
  esAdminColaborador,
  esCreadorStaff,
  esTrainerStaff,
  rolesStaffActuales,
} from '../utils/adminRoles.js'
import './Dashboard.css'

function Dashboard() {
  const navigate = useNavigate()
  const { logout, roles } = useAdminAuth()
  const rolesActuales = rolesStaffActuales(roles)

  const handleLogout = async () => {
    await logout()
    navigate('/admin', { replace: true })
  }

  const creador = esCreadorStaff(rolesActuales)
  const colaborador = esAdminColaborador(rolesActuales)
  const trainer = esTrainerStaff(rolesActuales)

  if (creador) {
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

  if (colaborador && trainer) {
    return (
      <main
        className="dashboard-page"
        style={{ backgroundColor: colors.page_background }}
      >
        <div className="dashboard-page__content">
          <h1 className="dashboard-page__title">Tu acceso</h1>
          <p className="dashboard-page__subtitle">
            Eres colaborador del box y también entrenador de personalizados.
          </p>

          <div className="dashboard-page__actions">
            <Link to="/admin/punto-fisico" className="dashboard-page__btn">
              Punto fisico
            </Link>
            <Link to="/admin/personalizados" className="dashboard-page__btn">
              Personalizados
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

  if (trainer) {
    return <Navigate to="/admin/personalizados" replace />
  }

  if (colaborador) {
    return <Navigate to="/admin/punto-fisico" replace />
  }

  return <Navigate to="/admin" replace />
}

export default Dashboard
