import { useCallback, useState } from 'react'
import ConfirmModal from './ConfirmModal.jsx'
import { eliminarMovimiento } from '../services/cierreDiarioService.js'
import { useToast } from './Toast.jsx'

export function useEliminarMovimiento({ onEliminado }) {
  const toast = useToast()
  const [target, setTarget] = useState(null)
  const [eliminando, setEliminando] = useState(false)

  const solicitarEliminar = useCallback((mov) => {
    if (!mov?.fuente || !mov?.documentoFirestoreId) {
      toast.error('Este movimiento no se puede eliminar')
      return
    }
    setTarget(mov)
  }, [toast])

  const cancelarEliminar = useCallback(() => {
    if (eliminando) return
    setTarget(null)
  }, [eliminando])

  const confirmarEliminar = useCallback(async () => {
    if (!target) return
    setEliminando(true)
    try {
      await eliminarMovimiento({
        fuente: target.fuente,
        documentoId: target.documentoFirestoreId,
        titularUid: target.titularUid ?? undefined,
      })
      toast.success('Movimiento eliminado')
      setTarget(null)
      await onEliminado?.()
    } catch (err) {
      toast.error(err.message || 'No se pudo eliminar el movimiento')
    } finally {
      setEliminando(false)
    }
  }, [target, toast, onEliminado])

  const modalEliminar = (
    <ConfirmModal
      open={Boolean(target)}
      onClose={cancelarEliminar}
      onConfirm={confirmarEliminar}
      title="Eliminar movimiento"
      message={
        target
          ? target.categoria === 'traspaso' || target.descripcion?.includes?.('Traspaso')
            ? `¿Eliminar el traspaso "${target.descripcion || 'entre cuentas'}"? Se borrarán ambos lados (origen y destino) y se actualizará el disponible.`
            : `¿Eliminar "${target.descripcion || 'este movimiento'}"? Se borrará de Firestore y ya no aparecerá en los reportes.`
          : ''
      }
      confirmLabel="Eliminar"
      variant="danger"
      loading={eliminando}
    />
  )

  return {
    solicitarEliminar,
    modalEliminar,
    eliminando,
  }
}

export function BotonEliminarMovimiento({ mov, onEliminar, disabled = false }) {
  if (!mov?.fuente || !mov?.documentoFirestoreId) return null

  return (
    <button
      type="button"
      className="pf-movimiento__eliminar"
      onClick={() => onEliminar(mov)}
      disabled={disabled}
      aria-label="Eliminar movimiento"
      title="Eliminar movimiento"
    >
      Eliminar
    </button>
  )
}
