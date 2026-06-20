import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import './Toast.css'

const ToastContext = createContext(null)

const DURACION_DEFAULT_MS = 4000

let counter = 0
const generarId = () => {
  counter += 1
  return `${Date.now()}-${counter}`
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const show = useCallback(
    (message, { type = 'info', duration = DURACION_DEFAULT_MS } = {}) => {
      const id = generarId()
      setToasts((prev) => [...prev, { id, message, type }])

      if (duration > 0) {
        setTimeout(() => dismiss(id), duration)
      }

      return id
    },
    [dismiss],
  )

  const success = useCallback(
    (message, options) => show(message, { ...options, type: 'success' }),
    [show],
  )

  const error = useCallback(
    (message, options) => show(message, { ...options, type: 'error' }),
    [show],
  )

  const info = useCallback(
    (message, options) => show(message, { ...options, type: 'info' }),
    [show],
  )

  const value = useMemo(
    () => ({ show, success, error, info, dismiss }),
    [show, success, error, info, dismiss],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-container" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={() => dismiss(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onClose }) {
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    setLeaving(false)
  }, [toast.id])

  const handleClose = () => {
    setLeaving(true)
    setTimeout(onClose, 200)
  }

  return (
    <div
      className={`toast toast--${toast.type}${leaving ? ' toast--leaving' : ''}`}
      role={toast.type === 'error' ? 'alert' : 'status'}
      onClick={handleClose}
    >
      <span className="toast__message">{toast.message}</span>
      <button
        type="button"
        className="toast__close"
        aria-label="Cerrar notificación"
        onClick={(e) => {
          e.stopPropagation()
          handleClose()
        }}
      >
        ×
      </button>
    </div>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) {
    throw new Error('useToast debe usarse dentro de <ToastProvider>')
  }
  return ctx
}
