import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { colors } from '../variables/colors.jsx'
import { auth } from '../variables/firebase.jsx'
import logo from '../assets/images/logos/logo.webp'
import LoadingOverlay from '../components/LoadingOverlay.jsx'
import { registrarEntrenador } from '../services/entrenadoresService.js'
import {
  clearAdminSession,
  verifyAdminAccess,
} from '../services/authService.js'
import { clearUserToken } from '../services/userService.js'
import { useAdminAuth } from '../contexts/AdminAuthContext.jsx'
import './SoyEntrenador.css'

const FORM_INICIAL = {
  nombre: '',
  documento: '',
  celular: '',
  correo: '',
}

function SoyEntrenador() {
  const navigate = useNavigate()
  const { establecerSesion } = useAdminAuth()
  const [form, setForm] = useState(FORM_INICIAL)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const actualizar = (campo) => (event) => {
    setForm((prev) => ({ ...prev, [campo]: event.target.value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    const nombre = form.nombre.trim()
    const documento = form.documento.trim()
    const celular = form.celular.trim()
    const correo = form.correo.trim().toLowerCase()

    try {
      const data = await registrarEntrenador({
        nombre,
        documento,
        celular,
        correo,
      })
      const entrenador = data.entrenador

      clearUserToken()
      clearAdminSession()

      try {
        const credential = await signInWithEmailAndPassword(
          auth,
          entrenador.correo || correo,
          documento,
        )
        const idToken = await credential.user.getIdToken()
        const result = await verifyAdminAccess(idToken)

        establecerSesion(result.token || idToken, result.rol, {
          persistente: true,
          roles: result.roles,
          perfil: result.perfil,
        })

        navigate('/admin/dashboard', { replace: true })
      } catch {
        await signOut(auth).catch(() => {})
        navigate('/admin', {
          replace: true,
          state: {
            aviso:
              data.mensaje ||
              'Cuenta lista. Inicia sesión con tu correo y tu contraseña.',
          },
        })
      }
    } catch (err) {
      await signOut(auth).catch(() => {})
      setError(err.message || 'No se pudo completar el registro')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main
      className="soy-entrenador"
      style={{ backgroundColor: colors.page_background }}
    >
      <LoadingOverlay visible={loading} label="Creando cuenta" />

      <div className="soy-entrenador__wrap">
        <Link to="/" className="soy-entrenador__back">
          ← Volver al inicio
        </Link>

        <div className="soy-entrenador__hero">
          <img src={logo} alt="Rangers Box" className="soy-entrenador__logo" />
          <h1 className="soy-entrenador__title">Soy entrenador</h1>
          <p className="soy-entrenador__lead">
            Usa la plataforma de Rangers Box para gestionar entrenamientos
            personalizados. Tus atletas podrán aprovechar herramientas como el
            cálculo de calorías, y tú podrás subir y modificar rutinas de
            entrenamiento para cada personalizado.
          </p>
        </div>

        <ul className="soy-entrenador__beneficios">
          <li>Gestiona atletas y planes de entrenamiento personalizados</li>
          <li>Sube y actualiza rutinas cuando lo necesites</li>
          <li>
            Tus usuarios acceden a herramientas del box, como calcular calorías
            por foto
          </li>
          <li>Un panel limpio pensado para tu trabajo como entrenador</li>
        </ul>

        <form className="soy-entrenador__form" onSubmit={handleSubmit}>
          <h2 className="soy-entrenador__form-title">Registro de entrenador</h2>

          {error && (
            <p className="soy-entrenador__error" role="alert">
              {error}
            </p>
          )}

          <label className="soy-entrenador__field">
            <span>Nombre completo</span>
            <input
              type="text"
              value={form.nombre}
              onChange={actualizar('nombre')}
              autoComplete="name"
              required
              disabled={loading}
              placeholder="Tu nombre"
            />
          </label>

          <label className="soy-entrenador__field">
            <span>Cédula</span>
            <input
              type="text"
              inputMode="numeric"
              value={form.documento}
              onChange={actualizar('documento')}
              autoComplete="off"
              required
              disabled={loading}
              placeholder="Número de documento"
            />
          </label>

          <label className="soy-entrenador__field">
            <span>Teléfono</span>
            <input
              type="tel"
              inputMode="tel"
              value={form.celular}
              onChange={actualizar('celular')}
              autoComplete="tel"
              required
              disabled={loading}
              placeholder="3001234567"
            />
          </label>

          <label className="soy-entrenador__field">
            <span>Correo electrónico</span>
            <input
              type="email"
              value={form.correo}
              onChange={actualizar('correo')}
              autoComplete="email"
              required
              disabled={loading}
              placeholder="tu@correo.com"
            />
          </label>

          <p className="soy-entrenador__hint">
            Tu contraseña inicial será tu cédula. Luego podrás iniciar sesión en
            el panel con tu correo.
          </p>

          <button
            type="submit"
            className="soy-entrenador__submit"
            disabled={loading}
          >
            Crear cuenta de entrenador
          </button>

          <p className="soy-entrenador__login">
            ¿Ya tienes cuenta?{' '}
            <Link to="/admin">Inicia sesión aquí</Link>
          </p>
        </form>
      </div>
    </main>
  )
}

export default SoyEntrenador
