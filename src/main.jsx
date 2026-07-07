import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { ToastProvider } from './components/Toast.jsx'
import { AdminAuthProvider } from './contexts/AdminAuthContext.jsx'
import { UsuarioProvider } from './contexts/UsuarioContext.jsx'
import { inicializarPersistenciaActiva } from './utils/recordarSesion.js'
import { iniciarRenovacionAutomaticaToken } from './utils/firebaseTokenRefresh.js'
import logo from './assets/images/logos/logo.webp'

iniciarRenovacionAutomaticaToken()

const favicon = document.createElement('link')
favicon.rel = 'icon'
favicon.type = 'image/webp'
favicon.href = logo
document.head.appendChild(favicon)

const root = createRoot(document.getElementById('root'))

inicializarPersistenciaActiva()
  .catch((err) => {
    console.warn('[auth] No se pudo inicializar persistencia:', err.message)
  })
  .finally(() => {
    root.render(
      <StrictMode>
        <BrowserRouter>
          <ToastProvider>
            <UsuarioProvider>
              <AdminAuthProvider>
                <App />
              </AdminAuthProvider>
            </UsuarioProvider>
          </ToastProvider>
        </BrowserRouter>
      </StrictMode>,
    )
  })
