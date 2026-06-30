import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { colors } from '../variables/colors.jsx'
import { auth } from '../variables/firebase.jsx'
import { useUsuario } from '../contexts/UsuarioContext.jsx'
import { registrarUsuarioPublico } from '../services/userService.js'
import LoadingOverlay from '../components/LoadingOverlay.jsx'
import logo from '../assets/images/logos/logo.webp'
import CrearCuentaModal from '../components/CrearCuentaModal.jsx'
import BienvenidaModal from '../components/BienvenidaModal.jsx'
import RecordarSesionCheckbox from '../components/RecordarSesionCheckbox.jsx'
import EyeIcon from '../components/icons/EyeIcon.jsx'
import loginBg from '../assets/images/hero/bk_login.webp'
import {
  aplicarPersistenciaFirebase,
  guardarCredencialesRecordadas,
  guardarPreferenciaRecordarSesion,
  leerCredencialesRecordadas,
  leerPreferenciaRecordarSesion,
  limpiarCredencialesRecordadas,
} from '../utils/recordarSesion.js'
import './Login.css'

function obtenerPrimerNombre(nombre) {
  if (!nombre) return ''
  return nombre.trim().split(/\s+/)[0]
}

const ERRORES_FIREBASE = {
  'auth/invalid-credential': 'Documento o contraseña incorrectos',
  'auth/wrong-password': 'Documento o contraseña incorrectos',
  'auth/user-not-found': 'Documento o contraseña incorrectos',
  'auth/invalid-email': 'El documento no es válido',
  'auth/user-disabled': 'Esta cuenta ha sido deshabilitada',
  'auth/too-many-requests':
    'Intentaste iniciar sesion muchas veces, intenta mas tarde',
  'auth/network-request-failed':
    'Sin conexión. Verifica tu red e intenta de nuevo',
}

const tiposDocumento = [
  { value: 'CC', label: 'Cédula de ciudadanía' },
  { value: 'TI', label: 'Tarjeta de identidad' },
  { value: 'CE', label: 'Cédula de extranjería' },
  { value: 'PA', label: 'Pasaporte' },
]

function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useUsuario()
  const autoSignupOpenedRef = useRef(false)
  const credencialesGuardadas = leerCredencialesRecordadas('user')

  const [tipoDocumento, setTipoDocumento] = useState(
    credencialesGuardadas?.tipoDocumento || 'CC',
  )
  const [documento, setDocumento] = useState(credencialesGuardadas?.documento || '')
  const [password, setPassword] = useState('')
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [recordar, setRecordar] = useState(() => leerPreferenciaRecordarSesion('user'))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [signupOpen, setSignupOpen] = useState(false)
  const [signupSubmitting, setSignupSubmitting] = useState(false)
  const [signupError, setSignupError] = useState('')
  const [bienvenida, setBienvenida] = useState({ open: false, nombre: '' })

  const handleDocumentoChange = (event) => {
    const valor = event.target.value.replace(/\s/g, '')
    setDocumento(valor)
  }

  const handleRecordarChange = (valor) => {
    setRecordar(valor)
    guardarPreferenciaRecordarSesion('user', valor)
    if (!valor) {
      limpiarCredencialesRecordadas('user')
    }
  }

  const persistirCredencialesSiAplica = (datos) => {
    if (recordar) {
      guardarCredencialesRecordadas('user', datos)
      return
    }
    limpiarCredencialesRecordadas('user')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    const documentoLimpio = documento.trim()

    if (!documentoLimpio || !password) {
      setError('Por favor completa todos los campos')
      return
    }

    setLoading(true)

    try {
      await aplicarPersistenciaFirebase(auth, recordar)
      const email = `${documentoLimpio}@gmail.com`
      const credential = await signInWithEmailAndPassword(auth, email, password)
      const idToken = await credential.user.getIdToken()

      await login(idToken, {
        persistente: recordar,
        tipoDocumento,
        documento: documentoLimpio,
      })

      persistirCredencialesSiAplica({
        tipoDocumento,
        documento: documentoLimpio,
      })

      const destino = location.state?.redirectTo || '/'
      navigate(destino, { replace: true })
    } catch (err) {
      await signOut(auth).catch(() => {})

      const mensaje =
        ERRORES_FIREBASE[err.code] ||
        err.message ||
        'No se pudo iniciar sesión'
      setError(mensaje)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenSignup = () => {
    setSignupError('')
    setSignupOpen(true)
  }

  const handleCloseSignup = () => {
    if (signupSubmitting) return
    setSignupOpen(false)
  }

  const handleCrearCuenta = async (datos) => {
    setSignupError('')
    setSignupSubmitting(true)

    try {
      await registrarUsuarioPublico(datos)

      await aplicarPersistenciaFirebase(auth, recordar)
      const email = `${datos.documento}@gmail.com`
      const credential = await signInWithEmailAndPassword(
        auth,
        email,
        datos.password,
      )
      const idToken = await credential.user.getIdToken()

      await login(idToken, {
        persistente: recordar,
        tipoDocumento: datos.tipoDocumento,
        documento: datos.documento,
      })

      persistirCredencialesSiAplica({
        tipoDocumento: datos.tipoDocumento,
        documento: datos.documento,
      })

      setSignupOpen(false)
      setBienvenida({
        open: true,
        nombre: obtenerPrimerNombre(datos.nombre),
      })
    } catch (err) {
      await signOut(auth).catch(() => {})
      const mensaje =
        err.code === 'auth/email-already-in-use'
          ? 'Ya existe una cuenta con ese documento'
          : ERRORES_FIREBASE[err.code] ||
            err.message ||
            'No se pudo crear la cuenta'
      setSignupError(mensaje)
    } finally {
      setSignupSubmitting(false)
    }
  }

  const handleContinuarBienvenida = () => {
    setBienvenida({ open: false, nombre: '' })
    const destino = location.state?.redirectTo || '/'
    navigate(destino, { replace: true })
  }

  useEffect(() => {
    if (location.state?.openSignup && !autoSignupOpenedRef.current) {
      setSignupError('')
      setSignupOpen(true)
      autoSignupOpenedRef.current = true
    }
  }, [location.state])

  return (
    <main
      className="login-page"
      style={{ backgroundColor: colors.page_background }}
    >
      <div
        className="login-page__background"
        style={{ backgroundImage: `url(${loginBg})` }}
      />
      <div
        className="login-page__overlay"
        style={{ backgroundColor: colors.overlay_dark }}
      />

      <div className="login-card">
          <Link to="/" className="login-card__home-link" aria-label="Volver al inicio">
            <img src={logo} alt="Rangers Box" className="login-card__logo" />
          </Link>

          <h1 className="login-card__title">Iniciar sesión</h1>
          <p className="login-card__subtitle">
            Accede a tu cuenta de Rangers Box
          </p>

          <form className="login-form" onSubmit={handleSubmit}>
            {error && (
              <p className="login-form__error" role="alert">
                {error}
              </p>
            )}

            <div className="login-form__row">
              <label className="login-form__field login-form__field--tipo">
                <span className="login-form__label">Tipo</span>
                <select
                  className="login-form__input login-form__select"
                  value={tipoDocumento}
                  onChange={(e) => setTipoDocumento(e.target.value)}
                  disabled={loading}
                  required
                >
                  {tiposDocumento.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.value}
                    </option>
                  ))}
                </select>
              </label>

              <label className="login-form__field login-form__field--documento">
                <span className="login-form__label">Documento</span>
                <input
                  type="text"
                  className="login-form__input"
                  placeholder="Número del documento"
                  value={documento}
                  onChange={handleDocumentoChange}
                  inputMode="numeric"
                  autoComplete="username"
                  disabled={loading}
                  required
                />
              </label>
            </div>

            <label className="login-form__field">
              <span className="login-form__label">Contraseña</span>
              <div className="login-form__password-wrap">
                <input
                  type={mostrarPassword ? 'text' : 'password'}
                  className="login-form__input login-form__input--password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  className="login-form__password-toggle"
                  onClick={() => setMostrarPassword((prev) => !prev)}
                  disabled={loading}
                  aria-label={
                    mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                  }
                >
                  <EyeIcon
                    className="login-form__password-toggle-icon"
                    off={mostrarPassword}
                  />
                </button>
              </div>
            </label>

            <RecordarSesionCheckbox
              id="recordar-sesion-user"
              checked={recordar}
              onChange={handleRecordarChange}
              disabled={loading}
            />

            <button
              type="submit"
              className="login-form__submit"
              style={{ backgroundColor: colors.primary_orange }}
              disabled={loading}
            >
              {loading ? 'Iniciando…' : 'Iniciar sesión'}
            </button>

            <button
              type="button"
              className="login-form__signup-link"
              onClick={handleOpenSignup}
              disabled={loading}
            >
              Crear cuenta
            </button>
          </form>
        </div>

      <CrearCuentaModal
        open={signupOpen}
        onClose={handleCloseSignup}
        onSubmit={handleCrearCuenta}
        submitting={signupSubmitting}
        error={signupError}
      />

      <BienvenidaModal
        open={bienvenida.open}
        nombre={bienvenida.nombre}
        onContinue={handleContinuarBienvenida}
      />

      <LoadingOverlay
        visible={loading || signupSubmitting}
        label={signupSubmitting ? 'Creando tu cuenta' : 'Iniciando sesión'}
      />
    </main>
  )
}

export default Login
