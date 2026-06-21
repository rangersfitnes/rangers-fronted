import { Navigate, useLocation } from 'react-router-dom'
import LoadingOverlay from './LoadingOverlay.jsx'
import { ColaboradorTurnoProvider } from '../contexts/ColaboradorTurnoContext.jsx'
import { useAdminAuth } from '../contexts/AdminAuthContext.jsx'

function ProtectedAdminRoute({ children }) {
  const location = useLocation()
  const { autenticado, initializing } = useAdminAuth()

  if (initializing) {
    return <LoadingOverlay visible label="Verificando sesión" />
  }

  if (!autenticado) {
    return <Navigate to="/admin" replace state={{ from: location }} />
  }

  return <ColaboradorTurnoProvider>{children}</ColaboradorTurnoProvider>
}

export default ProtectedAdminRoute
