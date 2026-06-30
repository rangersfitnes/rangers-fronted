import { useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import { obtenerEstadoWhatsApp } from '../services/whatsappService.js'
import './WhatsAppConexionModal.css'

function WhatsAppConexionModal({ open, onClose, onConectado }) {
  const [estado, setEstado] = useState({
    conectado: false,
    haySesionGuardada: false,
    qrImagen: null,
  })
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) {
      setEstado({
        conectado: false,
        haySesionGuardada: false,
        qrImagen: null,
      })
      setError('')
      return undefined
    }

    let activo = true
    const controller = new AbortController()

    const consultar = async () => {
      try {
        const data = await obtenerEstadoWhatsApp({ signal: controller.signal })
        if (!activo) return

        setEstado(data)
        setError('')

        if (data.conectado) {
          onConectado?.()
        }
      } catch (err) {
        if (err?.name === 'AbortError' || !activo) return
        setError(err.message || 'No se pudo consultar el estado de WhatsApp')
      } finally {
        if (activo) setCargando(false)
      }
    }

    setCargando(true)
    consultar()
    const intervalo = window.setInterval(consultar, 2500)

    return () => {
      activo = false
      controller.abort()
      window.clearInterval(intervalo)
    }
  }, [open, onConectado])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Conectar WhatsApp"
      footer={
        <button type="button" className="whatsapp-conexion__btn" onClick={onClose}>
          Cerrar
        </button>
      }
    >
      <div className="whatsapp-conexion">
        {estado.conectado ? (
          <p className="whatsapp-conexion__success">
            WhatsApp conectado correctamente en el servidor.
          </p>
        ) : (
          <>
            <p className="whatsapp-conexion__hint">
              {estado.haySesionGuardada
                ? 'La sesión expiró o se cerró. Escanea el código QR para reconectar.'
                : 'No hay sesión de WhatsApp guardada. Escanea el código QR con tu teléfono.'}
            </p>
            <p className="whatsapp-conexion__pasos">
              WhatsApp → Dispositivos vinculados → Vincular dispositivo
            </p>

            {error ? (
              <p className="whatsapp-conexion__error" role="alert">
                {error}
              </p>
            ) : null}

            {estado.qrImagen ? (
              <div className="whatsapp-conexion__qr-wrap">
                <img
                  src={estado.qrImagen}
                  alt="Código QR para conectar WhatsApp"
                  className="whatsapp-conexion__qr"
                />
              </div>
            ) : (
              <p className="whatsapp-conexion__loading">
                {cargando
                  ? 'Generando código QR…'
                  : 'Esperando código QR del servidor…'}
              </p>
            )}
          </>
        )}
      </div>
    </Modal>
  )
}

export default WhatsAppConexionModal
