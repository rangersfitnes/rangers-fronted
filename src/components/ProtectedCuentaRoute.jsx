import { Navigate, useLocation } from 'react-router-dom'
import LoadingOverlay from './LoadingOverlay.jsx'
import { useUsuario } from '../contexts/UsuarioContext.jsx'

function ProtectedCuentaRoute({ children }) {
  const location = useLocation()
  const { usuario, loading } = useUsuario()

  if (loading) return <LoadingOverlay visible label="Cargando" />

  if (!usuario) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ redirectTo: location.pathname }}
      />
    )
  }

  return children
}

export default ProtectedCuentaRoute
