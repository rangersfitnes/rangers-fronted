import { useEffect, useState } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import './App.css'
import { colors } from './variables/colors.jsx'
import Header from './components/Header.jsx'
import LoadingOverlay from './components/LoadingOverlay.jsx'
import CompletarPerfilModal from './components/CompletarPerfilModal.jsx'
import SolicitudEntrenadorModal from './components/SolicitudEntrenadorModal.jsx'
import ActualizarPesoMensualModal, {
  pesoPospuestoEstaSesion,
} from './components/ActualizarPesoMensualModal.jsx'
import ProtectedAdminRoute from './components/ProtectedAdminRoute.jsx'
import ProtectedCuentaRoute from './components/ProtectedCuentaRoute.jsx'
import { useUsuario } from './contexts/UsuarioContext.jsx'
import { esUsuarioCliente } from './utils/usuarioRol.js'
import Home from './pages/Home.jsx'
import SobreNosotrosPage from './pages/SobreNosotrosPage.jsx'
import ClasesPage from './pages/ClasesPage.jsx'
import Planes from './pages/Planes.jsx'
import Login from './pages/Login.jsx'
import PaymentPlan from './pages/PaymentPlan.jsx'
import Admin from './pages/Admin.jsx'
import Dashboard from './pages/Dashboard.jsx'
import PuntoFisico from './pages/PuntoFisico.jsx'
import PuntoFisicoKiosco from './pages/PuntoFisicoKiosco.jsx'
import AdministracionGeneral from './pages/AdministracionGeneral.jsx'
import Personalizados from './pages/Personalizados.jsx'
import SoyEntrenador from './pages/SoyEntrenador.jsx'
import CuentaPerfil from './pages/cuenta/CuentaPerfil.jsx'
import CuentaAsistencias from './pages/cuenta/CuentaAsistencias.jsx'
import CuentaRutinas from './pages/cuenta/CuentaRutinas.jsx'
import CuentaActividad from './pages/cuenta/CuentaActividad.jsx'

function App() {
  const { pathname } = useLocation()
  const { loading: usuarioLoading, usuario, actualizarUsuario } = useUsuario()
  const [pesoPospuestoLocal, setPesoPospuestoLocal] = useState(false)

  useEffect(() => {
    // Nueva sesión de usuario: reevalúa el posponer de esta pestaña
    setPesoPospuestoLocal(pesoPospuestoEstaSesion(usuario))
  }, [usuario?.id, usuario?.mesPesoActual, usuario?.requiereActualizacionPeso])

  const isAdminArea = pathname.startsWith('/admin')
  const isLoginArea = pathname === '/login'
  const isPaymentArea = pathname.startsWith('/payment-plan')
  const isTrainerSignup = pathname === '/soy-entrenador'
  const isHome = pathname === '/'
  const hideChrome =
    isAdminArea || isLoginArea || isPaymentArea || isTrainerSignup
  const showHomeAuthHeader = isHome && Boolean(usuario)
  const mostrarCompletarPerfil = Boolean(
    usuario?.perfilIncompleto && esUsuarioCliente(usuario),
  )
  const solicitudEntrenadorPendiente =
    esUsuarioCliente(usuario) &&
    !mostrarCompletarPerfil &&
    Array.isArray(usuario?.solicitudesEntrenadorPendientes) &&
    usuario.solicitudesEntrenadorPendientes.length > 0
      ? usuario.solicitudesEntrenadorPendientes[0]
      : null
  const mostrarActualizarPeso =
    esUsuarioCliente(usuario) &&
    !mostrarCompletarPerfil &&
    !solicitudEntrenadorPendiente &&
    Boolean(usuario?.requiereActualizacionPeso) &&
    !pesoPospuestoLocal &&
    !pesoPospuestoEstaSesion(usuario)

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
        <Route path="/soy-entrenador" element={<SoyEntrenador />} />
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
          path="/admin/punto-fisico/kiosco"
          element={
            <ProtectedAdminRoute>
              <PuntoFisicoKiosco />
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
        <Route
          path="/admin/personalizados"
          element={
            <ProtectedAdminRoute>
              <Personalizados />
            </ProtectedAdminRoute>
          }
        />
      </Routes>
      <CompletarPerfilModal
        open={mostrarCompletarPerfil}
        usuario={usuario}
        onCompletado={(datos) => actualizarUsuario(datos)}
      />
      <SolicitudEntrenadorModal
        open={Boolean(solicitudEntrenadorPendiente)}
        solicitud={solicitudEntrenadorPendiente}
        onRespondida={(solicitudRespondida) => {
          const restantes = (
            usuario?.solicitudesEntrenadorPendientes || []
          ).filter((item) => item.id !== solicitudRespondida?.id)
          actualizarUsuario({
            ...usuario,
            solicitudesEntrenadorPendientes: restantes,
          })
        }}
      />
      <ActualizarPesoMensualModal
        open={mostrarActualizarPeso}
        usuario={usuario}
        onActualizado={(datos) => {
          actualizarUsuario(datos)
          setPesoPospuestoLocal(false)
        }}
        onPosponer={() => setPesoPospuestoLocal(true)}
      />
    </div>
  )
}

export default App
