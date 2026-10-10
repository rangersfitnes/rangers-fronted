import { useEffect, useMemo, useState } from 'react'
import Modal from './Modal.jsx'
import './CrearPlanModal.css'

const VACIO = {
  elemento: '',
  valor: '',
  cantidad: '1',
}

function parseNumero(valor) {
  const n = Number(String(valor ?? '').replace(/,/g, '.').trim())
  return Number.isFinite(n) ? n : NaN
}

function formatearPesos(valor) {
  const n = Number(valor) || 0
  return `$${n.toLocaleString('es-CO')}`
}

function InventarioFormModal({
  open,
  onClose,
  onSubmit,
  submitting = false,
  error = '',
  initialValues = null,
}) {
  const [form, setForm] = useState(VACIO)

  useEffect(() => {
    if (!open) return
    if (initialValues) {
      setForm({
        elemento: initialValues.elemento || '',
        valor:
          initialValues.valorUnitario != null
            ? String(initialValues.valorUnitario)
            : '',
        cantidad:
          initialValues.cantidad != null
            ? String(initialValues.cantidad)
            : '1',
      })
    } else {
      setForm(VACIO)
    }
  }, [open, initialValues])

  const totalLinea = useMemo(() => {
    const valor = parseNumero(form.valor)
    const cantidad = parseNumero(form.cantidad)
    if (!Number.isFinite(valor) || !Number.isFinite(cantidad)) return null
    if (valor < 0 || cantidad < 1) return null
    return valor * cantidad
  }, [form.valor, form.cantidad])

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    onSubmit?.({
      elemento: form.elemento.trim(),
      valor: parseNumero(form.valor),
      cantidad: parseNumero(form.cantidad),
    })
  }

  const editando = Boolean(initialValues?.id)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editando ? 'Editar elemento' : 'Agregar al inventario'}
      footer={
        <>
          <button
            type="button"
            className="ag-action-btn ag-action-btn--ghost"
            onClick={onClose}
            disabled={submitting}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="inventario-form"
            className="ag-action-btn"
            disabled={submitting}
          >
            {submitting ? 'Guardando…' : editando ? 'Guardar' : 'Agregar'}
          </button>
        </>
      }
    >
      <form id="inventario-form" className="crear-plan__form" onSubmit={handleSubmit}>
        {error ? (
          <p className="crear-plan__error" role="alert">
            {error}
          </p>
        ) : null}

        <label className="crear-plan__field">
          <span className="crear-plan__label">Elemento</span>
          <input
            className="crear-plan__input"
            type="text"
            maxLength={120}
            value={form.elemento}
            onChange={handleChange('elemento')}
            placeholder="Ej. Mancuerna 5 kilos"
            required
            autoFocus
          />
        </label>

        <label className="crear-plan__field">
          <span className="crear-plan__label">Valor (por unidad)</span>
          <input
            className="crear-plan__input"
            type="number"
            min="0"
            step="1"
            inputMode="decimal"
            value={form.valor}
            onChange={handleChange('valor')}
            placeholder="Ej. 2000"
            required
          />
        </label>

        <label className="crear-plan__field">
          <span className="crear-plan__label">Cantidad</span>
          <input
            className="crear-plan__input"
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            value={form.cantidad}
            onChange={handleChange('cantidad')}
            placeholder="Ej. 4"
            required
          />
        </label>

        <p className="crear-plan__hint" style={{ margin: 0, color: '#a3a3a3' }}>
          Total del elemento:{' '}
          <strong style={{ color: '#fdba74' }}>
            {totalLinea == null ? '—' : formatearPesos(totalLinea)}
          </strong>
          {totalLinea != null
            ? ' (valor × cantidad)'
            : ''}
        </p>
      </form>
    </Modal>
  )
}

export default InventarioFormModal
