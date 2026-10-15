import { useEffect, useState } from 'react'
import Modal from './Modal.jsx'
import {
  obtenerEstadoWhatsApp,
  reiniciarWhatsApp,
} from '../services/whatsappService.js'
import './WhatsAppConexionModal.css'

function WhatsAppConexionModal({ open, onClose, onConectado }) {
  const [estado, setEstado] = useState({
    conectado: false,
    haySesionGuardada: false,
    qrImagen: null,
    qrGeneradoEn: null,
  })
  const [cargando, setCargando] = useState(false)
  const [reiniciando, setReiniciando] = useState(false)
  const [error, setError] = useState('')
  const [ahora, setAhora] = useState(() => Date.now())

  useEffect(() => {
    if (!open) {
      setEstado({
        conectado: false,
        haySesionGuardada: false,
        qrImagen: null,
        qrGeneradoEn: null,
      })
      setError('')
      setReiniciando(false)
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
        setAhora(Date.now())

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
    // El QR de WhatsApp caduca ~20–40s; refrescar seguido para no mostrar uno viejo.
    const intervalo = window.setInterval(consultar, 2000)
    const reloj = window.setInterval(() => setAhora(Date.now()), 1000)

    return () => {
      activo = false
      controller.abort()
      window.clearInterval(intervalo)
      window.clearInterval(reloj)
    }
  }, [open, onConectado])

  const handleNuevoQr = async () => {
    setReiniciando(true)
    setError('')
    try {
      const data = await reiniciarWhatsApp({ borrarSesion: true })
      setEstado(data)
      setAhora(Date.now())
      if (data.conectado) onConectado?.()
    } catch (err) {
      setError(err.message || 'No se pudo generar un QR nuevo')
    } finally {
      setReiniciando(false)
    }
  }

  const edadQrSeg =
    estado.qrGeneradoEn && !estado.conectado
      ? Math.max(0, Math.floor((ahora - Number(estado.qrGeneradoEn)) / 1000))
      : null

  return (
    <Modal
      open={open}
      onClose={reiniciando ? undefined : onClose}
      title="Conectar WhatsApp"
      footer={
        <div className="whatsapp-conexion__actions">
          {!estado.conectado ? (
            <button
              type="button"
              className="whatsapp-conexion__btn whatsapp-conexion__btn--ghost"
              onClick={handleNuevoQr}
              disabled={reiniciando}
            >
              {reiniciando ? 'Generando…' : 'Nuevo QR'}
            </button>
          ) : null}
          <button
            type="button"
            className="whatsapp-conexion__btn"
            onClick={onClose}
            disabled={reiniciando}
          >
            Cerrar
          </button>
        </div>
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
              En el teléfono: WhatsApp → Menú o Ajustes → Dispositivos
              vinculados → Vincular un dispositivo. Apunta a la pantalla (sin
              zoom ni captura de otra foto). Si no lee, pulsa «Nuevo QR».
            </p>

            {error ? (
              <p className="whatsapp-conexion__error" role="alert">
                {error}
              </p>
            ) : null}

            {estado.qrImagen ? (
              <div className="whatsapp-conexion__qr-wrap">
                <img
                  key={estado.qrGeneradoEn || estado.qrImagen.slice(0, 48)}
                  src={estado.qrImagen}
                  alt="Código QR para conectar WhatsApp"
                  className="whatsapp-conexion__qr"
                  width={280}
                  height={280}
                  draggable={false}
                />
                {edadQrSeg != null ? (
                  <p className="whatsapp-conexion__meta">
                    {edadQrSeg < 40
                      ? `Código actual · ${edadQrSeg}s`
                      : 'Código por vencer · espera el siguiente o pulsa Nuevo QR'}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="whatsapp-conexion__loading">
                {reiniciando || cargando
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
