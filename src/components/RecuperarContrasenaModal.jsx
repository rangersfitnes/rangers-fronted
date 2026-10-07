import { useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import LoadingOverlay from './LoadingOverlay.jsx'
import {
  confirmarRecuperacionContrasena,
  solicitarCodigoRecuperacion,
} from '../services/recuperarContrasenaService.js'
import './RecuperarContrasenaModal.css'

const TIPOS = [
  { value: 'CC', label: 'CC' },
  { value: 'TI', label: 'TI' },
  { value: 'CE', label: 'CE' },
  { value: 'PA', label: 'PA' },
]

function RecuperarContrasenaModal({
  open,
  onClose,
  tipoDocumentoInicial = 'CC',
  documentoInicial = '',
}) {
  const [paso, setPaso] = useState(1)
  const [tipoDocumento, setTipoDocumento] = useState('CC')
  const [documento, setDocumento] = useState('')
  const [codigo, setCodigo] = useState('')
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [celularEnmascarado, setCelularEnmascarado] = useState('')
  const [error, setError] = useState('')
  const [exito, setExito] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setPaso(1)
    setTipoDocumento(tipoDocumentoInicial || 'CC')
    setDocumento(documentoInicial || '')
    setCodigo('')
    setPassword('')
    setConfirmar('')
    setCelularEnmascarado('')
    setError('')
    setExito('')
    setLoading(false)
  }, [open, tipoDocumentoInicial, documentoInicial])

  const handleSolicitar = async (event) => {
    event.preventDefault()
    setError('')
    setExito('')
    const documentoLimpio = documento.trim().replace(/\s/g, '')
    if (!documentoLimpio) {
      setError('Ingresa tu número de documento')
      return
    }

    setLoading(true)
    try {
      const data = await solicitarCodigoRecuperacion({
        tipoDocumento,
        documento: documentoLimpio,
      })
      setDocumento(documentoLimpio)
      setCelularEnmascarado(data.celularEnmascarado || '')
      setPaso(2)
      setExito(
        data.mensaje ||
          `Código enviado al WhatsApp ${data.celularEnmascarado || ''}`,
      )
    } catch (err) {
      setError(err.message || 'No se pudo enviar el código')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmar = async (event) => {
    event.preventDefault()
    setError('')
    setExito('')

    if (!/^\d{6}$/.test(String(codigo).trim())) {
      setError('Ingresa el código de 6 dígitos')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (password !== confirmar) {
      setError('Las contraseñas no coinciden')
      return
    }

    setLoading(true)
    try {
      const data = await confirmarRecuperacionContrasena({
        tipoDocumento,
        documento,
        codigo: codigo.trim(),
        password,
      })
      setPaso(3)
      setExito(data.mensaje || 'Contraseña actualizada')
    } catch (err) {
      setError(err.message || 'No se pudo cambiar la contraseña')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onClose}
      title="Recuperar contraseña"
      className="recuperar-password-modal"
      footer={
        paso === 3 ? (
          <button
            type="button"
            className="recuperar-password__btn recuperar-password__btn--primary"
            onClick={onClose}
          >
            Ir a iniciar sesión
          </button>
        ) : null
      }
    >
      {paso === 1 && (
        <form className="recuperar-password__form" onSubmit={handleSolicitar}>
          <p className="recuperar-password__intro">
            Ingresa el documento de tu cuenta. Te enviaremos un código de
            verificación al WhatsApp registrado.
          </p>

          <div className="recuperar-password__row">
            <label className="recuperar-password__field recuperar-password__field--tipo">
              <span>Tipo</span>
              <select
                value={tipoDocumento}
                onChange={(e) => setTipoDocumento(e.target.value)}
                disabled={loading}
              >
                {TIPOS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="recuperar-password__field">
              <span>Documento</span>
              <input
                type="text"
                inputMode="numeric"
                value={documento}
                onChange={(e) =>
                  setDocumento(e.target.value.replace(/\s/g, ''))
                }
                disabled={loading}
                placeholder="Número de cédula"
                required
              />
            </label>
          </div>

          {error && (
            <p className="recuperar-password__error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="recuperar-password__btn recuperar-password__btn--primary"
            disabled={loading}
          >
            {loading ? 'Enviando…' : 'Enviar código por WhatsApp'}
          </button>
        </form>
      )}

      {paso === 2 && (
        <form className="recuperar-password__form" onSubmit={handleConfirmar}>
          <p className="recuperar-password__intro">
            Enviamos un código al WhatsApp{' '}
            <strong>{celularEnmascarado || 'registrado'}</strong>. Ingresa el
            código y tu nueva contraseña.
          </p>

          <label className="recuperar-password__field">
            <span>Código de verificación</span>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={codigo}
              onChange={(e) =>
                setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))
              }
              disabled={loading}
              placeholder="6 dígitos"
              required
            />
          </label>

          <label className="recuperar-password__field">
            <span>Nueva contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              minLength={6}
              autoComplete="new-password"
              placeholder="Mínimo 6 caracteres"
              required
            />
          </label>

          <label className="recuperar-password__field">
            <span>Confirmar contraseña</span>
            <input
              type="password"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              disabled={loading}
              minLength={6}
              autoComplete="new-password"
              placeholder="Repite la contraseña"
              required
            />
          </label>

          {exito && !error && (
            <p className="recuperar-password__ok" role="status">
              {exito}
            </p>
          )}
          {error && (
            <p className="recuperar-password__error" role="alert">
              {error}
            </p>
          )}

          <div className="recuperar-password__acciones">
            <button
              type="button"
              className="recuperar-password__btn recuperar-password__btn--ghost"
              onClick={handleSolicitar}
              disabled={loading}
            >
              Reenviar código
            </button>
            <button
              type="submit"
              className="recuperar-password__btn recuperar-password__btn--primary"
              disabled={loading}
            >
              {loading ? 'Guardando…' : 'Cambiar contraseña'}
            </button>
          </div>
        </form>
      )}

      {paso === 3 && (
        <div className="recuperar-password__exito">
          <p>{exito || 'Tu contraseña fue actualizada correctamente.'}</p>
          <p className="recuperar-password__intro">
            Ya puedes iniciar sesión con tu documento y la nueva contraseña.
          </p>
        </div>
      )}

      <LoadingOverlay
        visible={loading}
        label={paso === 1 ? 'Enviando código' : 'Actualizando contraseña'}
      />
    </Modal>
  )
}

export default RecuperarContrasenaModal
