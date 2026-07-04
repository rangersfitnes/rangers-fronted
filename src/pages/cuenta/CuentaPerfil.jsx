import { useCallback, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useUsuario } from '../../contexts/UsuarioContext.jsx'
import {
  actualizarFotoPerfil,
  actualizarMiPerfil,
  eliminarFotoPerfil,
} from '../../services/userService.js'
import EditarPerfilPersonalModal from '../../components/EditarPerfilPersonalModal.jsx'
import { useToast } from '../../components/Toast.jsx'
import {
  formatearFechaCuenta,
  formatearFechaNacimiento,
  inicialesNombre,
} from './cuentaUtils.js'
import './Cuenta.css'

function CuentaPerfil() {
  const toast = useToast()
  const { usuario, actualizarUsuario } = useUsuario()
  const fileInputRef = useRef(null)
  const planActivo = usuario?.planesActivos?.[0] ?? null

  const [editarAbierto, setEditarAbierto] = useState(false)
  const [guardandoDatos, setGuardandoDatos] = useState(false)
  const [errorEdicion, setErrorEdicion] = useState('')
  const [fotoCargando, setFotoCargando] = useState(false)

  const documento =
    [usuario?.tipoDocumento, usuario?.documento].filter(Boolean).join(' ') ||
    '—'

  const abrirSelectorFoto = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFotoChange = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setFotoCargando(true)
    try {
      const url = await actualizarFotoPerfil(file)
      actualizarUsuario({ profileImage: url })
      toast.success('Foto de perfil actualizada')
    } catch (err) {
      toast.error(err.message || 'No se pudo actualizar la foto')
    } finally {
      setFotoCargando(false)
    }
  }

  const handleEliminarFoto = async () => {
    if (fotoCargando || !usuario?.profileImage) return

    setFotoCargando(true)
    try {
      await eliminarFotoPerfil()
      actualizarUsuario({ profileImage: null })
      toast.success('Foto de perfil eliminada')
    } catch (err) {
      toast.error(err.message || 'No se pudo eliminar la foto')
    } finally {
      setFotoCargando(false)
    }
  }

  const handleAbrirEdicion = () => {
    setErrorEdicion('')
    setEditarAbierto(true)
  }

  const handleCerrarEdicion = () => {
    if (guardandoDatos) return
    setEditarAbierto(false)
    setErrorEdicion('')
  }

  const handleGuardarDatos = async (datos) => {
    setErrorEdicion('')
    setGuardandoDatos(true)

    try {
      const actualizado = await actualizarMiPerfil(datos)
      actualizarUsuario(actualizado)
      setEditarAbierto(false)
      toast.success('Información actualizada')
    } catch (err) {
      setErrorEdicion(err.message || 'No se pudo guardar la información')
    } finally {
      setGuardandoDatos(false)
    }
  }

  const tieneFoto = Boolean(usuario?.profileImage)

  return (
    <main className="cuenta-page">
      <div className="cuenta-page__inner">
        <h1 className="cuenta-page__title">Perfil</h1>
        <p className="cuenta-page__subtitle">
          Tus datos de cuenta en Rangers Box.
        </p>

        <section className="cuenta-perfil-foto" aria-label="Foto de perfil">
          <div className="cuenta-perfil-foto__avatar-wrap">
            <span className="cuenta-perfil-foto__avatar">
              {tieneFoto ? (
                <img
                  src={usuario.profileImage}
                  alt=""
                  className="cuenta-perfil-foto__avatar-img"
                />
              ) : (
                <span className="cuenta-perfil-foto__avatar-iniciales">
                  {inicialesNombre(usuario?.nombre)}
                </span>
              )}
            </span>
          </div>

          <div className="cuenta-perfil-foto__info">
            <h2 className="cuenta-perfil-foto__title">Foto de perfil</h2>
            <p className="cuenta-perfil-foto__hint">
              Sube una imagen para personalizar tu cuenta.
            </p>
            <div className="cuenta-perfil-foto__actions">
              <button
                type="button"
                className="cuenta-perfil-foto__btn cuenta-perfil-foto__btn--primary"
                onClick={abrirSelectorFoto}
                disabled={fotoCargando}
              >
                {fotoCargando
                  ? 'Procesando…'
                  : tieneFoto
                    ? 'Cambiar foto'
                    : 'Subir foto'}
              </button>
              {tieneFoto ? (
                <button
                  type="button"
                  className="cuenta-perfil-foto__btn cuenta-perfil-foto__btn--ghost"
                  onClick={handleEliminarFoto}
                  disabled={fotoCargando}
                >
                  Eliminar
                </button>
              ) : null}
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="cuenta-perfil-foto__input"
            onChange={handleFotoChange}
            disabled={fotoCargando}
            tabIndex={-1}
            aria-hidden="true"
          />
        </section>

        <div className="cuenta-page__card">
          <div className="cuenta-page__card-head">
            <h2 className="cuenta-page__card-title">Datos personales</h2>
            <button
              type="button"
              className="cuenta-page__edit-btn"
              onClick={handleAbrirEdicion}
              disabled={guardandoDatos}
            >
              Editar
            </button>
          </div>

          <div className="cuenta-page__row">
            <span className="cuenta-page__row-label">Nombre</span>
            <span className="cuenta-page__row-value">
              {usuario?.nombre || '—'}
            </span>
          </div>
          <div className="cuenta-page__row">
            <span className="cuenta-page__row-label">Documento</span>
            <span className="cuenta-page__row-value">{documento}</span>
          </div>
          <div className="cuenta-page__row">
            <span className="cuenta-page__row-label">Celular</span>
            <span className="cuenta-page__row-value">
              {usuario?.celular || '—'}
            </span>
          </div>
          <div className="cuenta-page__row">
            <span className="cuenta-page__row-label">Fecha de nacimiento</span>
            <span className="cuenta-page__row-value">
              {formatearFechaNacimiento(usuario?.fechaNacimiento)}
            </span>
          </div>
          <div className="cuenta-page__row">
            <span className="cuenta-page__row-label">Miembro desde</span>
            <span className="cuenta-page__row-value">
              {formatearFechaCuenta(usuario?.fechaCreacion)}
            </span>
          </div>

          {planActivo ? (
            <>
              <div className="cuenta-page__divider" aria-hidden="true" />
              <div className="cuenta-page__row">
                <span className="cuenta-page__row-label">Plan activo</span>
                <span className="cuenta-page__row-value">
                  {planActivo.nombre || planActivo.id}
                </span>
              </div>
              <div className="cuenta-page__row">
                <span className="cuenta-page__row-label">Vigencia</span>
                <span className="cuenta-page__row-value">
                  {formatearFechaCuenta(planActivo.vigencia)}
                </span>
              </div>
            </>
          ) : usuario?.planVencido ? (
            <>
              <div className="cuenta-page__divider" aria-hidden="true" />
              <div className="cuenta-page__row">
                <span className="cuenta-page__row-label">Estado del plan</span>
                <span className="cuenta-page__row-value cuenta-page__row-value--vencido">
                  Plan vencido
                </span>
              </div>
              <div className="cuenta-page__row">
                <span className="cuenta-page__row-label">Último plan</span>
                <span className="cuenta-page__row-value">
                  {usuario.planVencido.planNombre || usuario.planVencido.planId}
                </span>
              </div>
              <div className="cuenta-page__row">
                <span className="cuenta-page__row-label">Venció el</span>
                <span className="cuenta-page__row-value">
                  {formatearFechaCuenta(usuario.planVencido.vigencia)}
                </span>
              </div>
            </>
          ) : null}
        </div>

        <p className="cuenta-page__subtitle" style={{ marginTop: '1.5rem' }}>
          <Link to="/" style={{ color: '#f97316' }}>
            Volver al inicio
          </Link>
        </p>
      </div>

      <EditarPerfilPersonalModal
        open={editarAbierto}
        onClose={handleCerrarEdicion}
        onSubmit={handleGuardarDatos}
        submitting={guardandoDatos}
        error={errorEdicion}
        usuario={usuario}
      />
    </main>
  )
}

export default CuentaPerfil
