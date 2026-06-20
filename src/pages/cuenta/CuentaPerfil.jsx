import { Link } from 'react-router-dom'
import { useUsuario } from '../../contexts/UsuarioContext.jsx'
import { formatearFechaCuenta } from './cuentaUtils.js'
import './Cuenta.css'

function CuentaPerfil() {
  const { usuario } = useUsuario()
  const planActivo = usuario?.planesActivos?.[0] ?? null

  const documento =
    [usuario?.tipoDocumento, usuario?.documento].filter(Boolean).join(' ') ||
    '—'

  return (
    <main className="cuenta-page">
      <div className="cuenta-page__inner">
        <h1 className="cuenta-page__title">Información del perfil</h1>
        <p className="cuenta-page__subtitle">
          Tus datos de cuenta en Rangers Box.
        </p>

        <div className="cuenta-page__card">
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
    </main>
  )
}

export default CuentaPerfil
