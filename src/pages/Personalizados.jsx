import { Link, Navigate, useNavigate } from 'react-router-dom'
import { colors } from '../variables/colors.jsx'
import { useAdminAuth } from '../contexts/AdminAuthContext.jsx'
import {
  esAdminColaborador,
  esCreadorStaff,
  esTrainerStaff,
  rolesStaffActuales,
} from '../utils/adminRoles.js'
import './Personalizados.css'

function Personalizados() {
  const navigate = useNavigate()
  const { logout, perfil, roles } = useAdminAuth()
  const rolesActuales = rolesStaffActuales(roles)
  const mostrarVolver =
    esAdminColaborador(rolesActuales) || esCreadorStaff(rolesActuales)

  if (!esTrainerStaff(rolesActuales)) {
    return <Navigate to="/admin/dashboard" replace />
  }

  const handleLogout = async () => {
    await logout()
    navigate('/admin', { replace: true })
  }

  return (
    <main
      className="personalizados-page"
      style={{ backgroundColor: colors.page_background }}
    >
      <header className="personalizados-page__top">
        <div className="personalizados-page__brand">
          <span className="personalizados-page__brand-name">Rangers Box</span>
          <span className="personalizados-page__brand-sub">Personalizados</span>
        </div>
        <div className="personalizados-page__top-actions">
          {mostrarVolver && (
            <Link to="/admin/dashboard" className="personalizados-page__link">
              Volver al menú
            </Link>
          )}
          <button
            type="button"
            className="personalizados-page__logout"
            onClick={handleLogout}
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <section className="personalizados-page__trainer-bar" aria-label="Datos del entrenador">
        <div>
          <p className="personalizados-page__eyebrow">Entrenador</p>
          <h1 className="personalizados-page__trainer-name">
            {perfil?.nombre || 'Entrenador'}
          </h1>
        </div>
        <dl className="personalizados-page__meta">
          <div>
            <dt>Cédula</dt>
            <dd>{perfil?.documento || '—'}</dd>
          </div>
          <div>
            <dt>Teléfono</dt>
            <dd>{perfil?.celular || '—'}</dd>
          </div>
          <div>
            <dt>Correo</dt>
            <dd>{perfil?.correo || '—'}</dd>
          </div>
        </dl>
      </section>

      <section className="personalizados-page__body">
        <p className="personalizados-page__empty">
          Pronto podrás gestionar rutinas y atletas personalizados desde aquí.
        </p>
      </section>
    </main>
  )
}

export default Personalizados
