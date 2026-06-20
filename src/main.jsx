import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { ToastProvider } from './components/Toast.jsx'
import { UsuarioProvider } from './contexts/UsuarioContext.jsx'
import logo from './assets/images/logos/logo.webp'


const favicon = document.createElement('link')
favicon.rel = 'icon'
favicon.type = 'image/webp'
favicon.href = logo
document.head.appendChild(favicon)

// === Bloqueo de zoom (iOS Safari, Android Chrome, Desktop) ===
// iOS Safari ignora maximum-scale/user-scalable=no desde iOS 10,
// por eso se complementa con event listeners.

const bloquearGesto = (event) => event.preventDefault()

document.addEventListener('gesturestart', bloquearGesto, { passive: false })
document.addEventListener('gesturechange', bloquearGesto, { passive: false })
document.addEventListener('gestureend', bloquearGesto, { passive: false })

document.addEventListener(
  'touchmove',
  (event) => {
    if (event.touches.length > 1) event.preventDefault()
  },
  { passive: false },
)

let ultimoTap = 0
document.addEventListener(
  'touchend',
  (event) => {
    const ahora = Date.now()
    if (ahora - ultimoTap <= 300) {
      event.preventDefault()
    }
    ultimoTap = ahora
  },
  { passive: false },
)

document.addEventListener(
  'wheel',
  (event) => {
    if (event.ctrlKey) event.preventDefault()
  },
  { passive: false },
)

document.addEventListener('keydown', (event) => {
  if (
    (event.ctrlKey || event.metaKey) &&
    ['+', '-', '=', '0'].includes(event.key)
  ) {
    event.preventDefault()
  }
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <UsuarioProvider>
          <App />
        </UsuarioProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>,
)
