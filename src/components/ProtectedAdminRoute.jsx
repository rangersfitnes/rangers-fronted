import { Navigate, useLocation } from 'react-router-dom'
import { ColaboradorTurnoProvider } from '../contexts/ColaboradorTurnoContext.jsx'
import { getAdminToken } from '../services/authService.js'

function ProtectedAdminRoute({ children }) {
  const location = useLocation()
  const token = getAdminToken()

  if (!token) {
    return <Navigate to="/admin" replace state={{ from: location }} />
  }

  return <ColaboradorTurnoProvider>{children}</ColaboradorTurnoProvider>
}

export default ProtectedAdminRoute
