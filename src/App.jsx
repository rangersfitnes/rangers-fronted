import { Route, Routes, useLocation } from 'react-router-dom'
import './App.css'
import { colors } from './variables/colors.jsx'
import Header from './components/Header.jsx'
import LoadingOverlay from './components/LoadingOverlay.jsx'
import ProtectedAdminRoute from './components/ProtectedAdminRoute.jsx'
import ProtectedCuentaRoute from './components/ProtectedCuentaRoute.jsx'
import { useUsuario } from './contexts/UsuarioContext.jsx'
import Home from './pages/Home.jsx'
import SobreNosotrosPage from './pages/SobreNosotrosPage.jsx'
import ClasesPage from './pages/ClasesPage.jsx'
import Planes from './pages/Planes.jsx'
import Login from './pages/Login.jsx'
import PaymentPlan from './pages/PaymentPlan.jsx'
import Admin from './pages/Admin.jsx'
import Dashboard from './pages/Dashboard.jsx'
import PuntoFisico from './pages/PuntoFisico.jsx'
import AdministracionGeneral from './pages/AdministracionGeneral.jsx'
import CuentaPerfil from './pages/cuenta/CuentaPerfil.jsx'
import CuentaAsistencias from './pages/cuenta/CuentaAsistencias.jsx'
import CuentaRutinas from './pages/cuenta/CuentaRutinas.jsx'
import CuentaActividad from './pages/cuenta/CuentaActividad.jsx'

function App() {
  const { pathname } = useLocation()
  const { loading: usuarioLoading, usuario } = useUsuario()
  const isAdminArea = pathname.startsWith('/admin')
  const isLoginArea = pathname === '/login'
  const isPaymentArea = pathname.startsWith('/payment-plan')
  const isHome = pathname === '/'
  const hideChrome = isAdminArea || isLoginArea || isPaymentArea
  const showHomeAuthHeader = isHome && Boolean(usuario)

  if (usuarioLoading) {
    return (
      <div
        className="app"
        style={{ backgroundColor: colors.page_background, minHeight: '100vh' }}
      >
        <LoadingOverlay visible label="Cargando" />
      </div>
    )
  }

  return (
    <div
      className="app"
      style={{ backgroundColor: colors.page_background }}
    >
      {!hideChrome && !isHome && <Header />}
      {showHomeAuthHeader && <Header />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/sobre-nosotros" element={<SobreNosotrosPage />} />
        <Route path="/clases" element={<ClasesPage />} />
        <Route path="/planes" element={<Planes />} />
        <Route path="/login" element={<Login />} />
        <Route path="/payment-plan/:planId" element={<PaymentPlan />} />
        <Route
          path="/cuenta/perfil"
          element={
            <ProtectedCuentaRoute>
              <CuentaPerfil />
            </ProtectedCuentaRoute>
          }
        />
        <Route
          path="/cuenta/actividad"
          element={
            <ProtectedCuentaRoute>
              <CuentaActividad />
            </ProtectedCuentaRoute>
          }
        />
        <Route
          path="/cuenta/asistencias"
          element={
            <ProtectedCuentaRoute>
              <CuentaAsistencias />
            </ProtectedCuentaRoute>
          }
        />
        <Route
          path="/cuenta/rutinas"
          element={
            <ProtectedCuentaRoute>
              <CuentaRutinas />
            </ProtectedCuentaRoute>
          }
        />
        <Route path="/admin" element={<Admin />} />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedAdminRoute>
              <Dashboard />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/admin/punto-fisico"
          element={
            <ProtectedAdminRoute>
              <PuntoFisico />
            </ProtectedAdminRoute>
          }
        />
        <Route
          path="/admin/administracion-general"
          element={
            <ProtectedAdminRoute>
              <AdministracionGeneral />
            </ProtectedAdminRoute>
          }
        />
      </Routes>
    </div>
  )
}

export default App
