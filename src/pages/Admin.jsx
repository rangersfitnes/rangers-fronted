import { useState } from 'react'
import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { colors } from '../variables/colors.jsx'
import { auth } from '../variables/firebase.jsx'
import logo from '../assets/images/logos/logo.webp'
import LoadingOverlay from '../components/LoadingOverlay.jsx'
import {
  saveAdminRole,
  saveAdminToken,
  verifyAdminAccess,
} from '../services/authService.js'
import './Admin.css'

function Admin() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password)
      const idToken = await credential.user.getIdToken()
      const result = await verifyAdminAccess(idToken)

      saveAdminToken(result.token)
      saveAdminRole(result.rol)
      navigate('/admin/dashboard', { replace: true })
    } catch (err) {
      await signOut(auth).catch(() => {})

      const errorMessages = {
        'auth/invalid-credential': 'Correo o contraseña incorrectos',
        'auth/wrong-password': 'Correo o contraseña incorrectos',
        'auth/user-not-found': 'Correo o contraseña incorrectos',
        'auth/invalid-email': 'El correo no es válido',
        'auth/user-disabled': 'Esta cuenta ha sido deshabilitada',
        'auth/too-many-requests':
          'Intentaste iniciar sesion muchas veces, intenta mas tarde',
        'auth/network-request-failed':
          'Sin conexión. Verifica tu red e intenta de nuevo',
      }

      const message =
        errorMessages[err.code] || err.message || 'Error al iniciar sesión'

      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main
      className="admin-page"
      style={{ backgroundColor: colors.page_background }}
    >
      <div className="admin-card">
        <img src={logo} alt="Rangers Box" className="admin-card__logo" />
        <h1 className="admin-card__title">Administración</h1>
        <p className="admin-card__subtitle">
          Inicia sesión como administrador de Rangers Box
        </p>

        <form className="admin-form" onSubmit={handleSubmit}>
          {error && (
            <p className="admin-form__error" role="alert">
              {error}
            </p>
          )}

          <label className="admin-form__field">
            <span className="admin-form__label">Correo electrónico</span>
            <input
              type="email"
              className="admin-form__input"
              placeholder="admin@rangersbox.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={loading}
              required
            />
          </label>

          <label className="admin-form__field">
            <span className="admin-form__label">Contraseña</span>
            <input
              type="password"
              className="admin-form__input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={loading}
              required
            />
          </label>

          <button
            type="submit"
            className="admin-form__submit"
            style={{ backgroundColor: colors.primary_orange }}
            disabled={loading}
          >
            Iniciar sesión
          </button>
        </form>
      </div>

      <LoadingOverlay visible={loading} label="Verificando credenciales" />
    </main>
  )
}

export default Admin
