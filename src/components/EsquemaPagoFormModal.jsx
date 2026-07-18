import { useEffect, useMemo, useState } from 'react'
import Modal from './Modal.jsx'
import { calcularValorHoraExtra } from '../utils/esquemaPagoUtils.js'
import {
  formatearMonedaCOPInput,
  formatearPrecioCuenta,
  parseMonedaCOP,
} from '../pages/cuenta/cuentaUtils.js'
import './CrearPlanModal.css'

const estadoInicial = {
  nombre: '',
  valorPorHora: '',
  horasTurno: '',
  valorTurno: '',
  porcentajeHoraExtra: '',
  porcentajeRecargoDominical: '',
  porcentajeRecargoNocturno: '',
}

function parseHorasInput(valor) {
  const limpio = String(valor || '').trim().replace(',', '.')
  const numero = Number(limpio)
  return Number.isFinite(numero) ? numero : NaN
}

function parsePorcentajeInput(valor) {
  const limpio = String(valor || '').trim().replace(',', '.')
  const numero = Number(limpio)
  return Number.isFinite(numero) ? numero : NaN
}

function CampoPorcentajeConCalculo({
  label,
  value,
  onChange,
  placeholder,
  preview,
  ariaLabel,
  submitting,
  required,
  hint,
}) {
  return (
    <label className="crear-plan__field">
      <span className="crear-plan__label">{label}</span>
      <div className="crear-plan__row ag-esquema-pago__pct-row">
        <input
          type="text"
          className="crear-plan__input"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          inputMode="decimal"
          disabled={submitting}
          required={required}
        />
        <div
          className="ag-esquema-pago__calc"
          aria-live="polite"
          aria-label={ariaLabel}
        >
          <span className="ag-esquema-pago__calc-label">Valor hora</span>
          <span className="ag-esquema-pago__calc-value">
            {preview ? formatearPrecioCuenta(preview.total) : '—'}
          </span>
        </div>
      </div>
      <span className="ag-esquema-pago__hint">
        {hint || 'Porcentaje sobre la hora ordinaria.'}
        {preview
          ? ` Incremento: +${formatearPrecioCuenta(preview.incremento)}`
          : ''}
      </span>
    </label>
  )
}

function esquemaToForm(esquema) {
  if (!esquema) return estadoInicial
  return {
    nombre: esquema.nombre ?? '',
    valorPorHora: String(esquema.valorPorHora ?? ''),
    horasTurno: String(esquema.horasTurno ?? ''),
    valorTurno: String(esquema.valorTurno ?? ''),
    porcentajeHoraExtra: String(esquema.porcentajeHoraExtra ?? ''),
    porcentajeRecargoDominical: String(esquema.porcentajeRecargoDominical ?? ''),
    porcentajeRecargoNocturno: String(esquema.porcentajeRecargoNocturno ?? ''),
  }
}

function EsquemaPagoFormModal({
  open,
  onClose,
  onSubmit,
  submitting,
  error,
  esquema = null,
}) {
  const [form, setForm] = useState(estadoInicial)
  const editando = Boolean(esquema?.id)

  useEffect(() => {
    if (open) setForm(esquemaToForm(esquema))
  }, [open, esquema])

  const valorPorHora = parseMonedaCOP(form.valorPorHora)
  const pctHoraExtra = parsePorcentajeInput(form.porcentajeHoraExtra)
  const pctDominical = parsePorcentajeInput(form.porcentajeRecargoDominical)
  const pctNocturno = parsePorcentajeInput(form.porcentajeRecargoNocturno)

  const previewHoraExtra = useMemo(() => {
    if (!Number.isFinite(valorPorHora) || valorPorHora <= 0) return null
    if (!Number.isFinite(pctHoraExtra) || pctHoraExtra < 0) return null
    return calcularValorHoraExtra(valorPorHora, pctHoraExtra)
  }, [valorPorHora, pctHoraExtra])

  const previewDominical = useMemo(() => {
    if (!Number.isFinite(valorPorHora) || valorPorHora <= 0) return null
    if (!Number.isFinite(pctDominical) || pctDominical < 0) return null
    return calcularValorHoraExtra(valorPorHora, pctDominical)
  }, [valorPorHora, pctDominical])

  const previewNocturno = useMemo(() => {
    if (!Number.isFinite(valorPorHora) || valorPorHora <= 0) return null
    if (!Number.isFinite(pctNocturno) || pctNocturno < 0) return null
    return calcularValorHoraExtra(valorPorHora, pctNocturno)
  }, [valorPorHora, pctNocturno])

  const handleChange = (campo) => (event) => {
    setForm((prev) => ({ ...prev, [campo]: event.target.value }))
  }

  const handleMonedaChange = (campo) => (event) => {
    const digits = event.target.value.replace(/\D/g, '')
    setForm((prev) => ({ ...prev, [campo]: digits }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    onSubmit?.({
      nombre: form.nombre.trim(),
      valorPorHora: parseMonedaCOP(form.valorPorHora),
      horasTurno: parseHorasInput(form.horasTurno),
      valorTurno: parseMonedaCOP(form.valorTurno),
      porcentajeHoraExtra: parsePorcentajeInput(form.porcentajeHoraExtra),
      porcentajeRecargoDominical: parsePorcentajeInput(
        form.porcentajeRecargoDominical,
      ),
      porcentajeRecargoNocturno: parsePorcentajeInput(
        form.porcentajeRecargoNocturno,
      ),
    })
  }

  const footer = (
    <>
      <button
        type="button"
        className="modal__btn modal__btn--ghost"
        onClick={onClose}
        disabled={submitting}
      >
        Cancelar
      </button>
      <button
        type="submit"
        form="esquema-pago-form"
        className="modal__btn modal__btn--primary"
        disabled={submitting}
      >
        {submitting ? 'Guardando…' : editando ? 'Guardar cambios' : 'Guardar esquema'}
      </button>
    </>
  )

  return (
    <Modal
      open={open}
      onClose={submitting ? undefined : onClose}
      title={editando ? 'Editar esquema de pago' : 'Agregar esquema de pago'}
      footer={footer}
    >
      <form id="esquema-pago-form" className="crear-plan__form" onSubmit={handleSubmit}>
        {error ? <p className="crear-plan__error">{error}</p> : null}

        <label className="crear-plan__field">
          <span className="crear-plan__label">Nombre del esquema *</span>
          <input
            type="text"
            className="crear-plan__input"
            value={form.nombre}
            onChange={handleChange('nombre')}
            placeholder="Ej. Entrenador tiempo completo"
            disabled={submitting}
            required
          />
        </label>

        <label className="crear-plan__field">
          <span className="crear-plan__label">Valor hora ordinaria *</span>
          <input
            type="text"
            className="crear-plan__input"
            value={formatearMonedaCOPInput(form.valorPorHora)}
            onChange={handleMonedaChange('valorPorHora')}
            placeholder={formatearPrecioCuenta(15000)}
            inputMode="numeric"
            disabled={submitting}
            required
          />
        </label>

        <div className="crear-plan__row">
          <label className="crear-plan__field">
            <span className="crear-plan__label">Horas del turno *</span>
            <input
              type="text"
              className="crear-plan__input"
              value={form.horasTurno}
              onChange={handleChange('horasTurno')}
              placeholder="Ej. 8"
              inputMode="numeric"
              disabled={submitting}
              required
            />
          </label>

          <label className="crear-plan__field">
            <span className="crear-plan__label">Valor por turno *</span>
            <input
              type="text"
              className="crear-plan__input"
              value={formatearMonedaCOPInput(form.valorTurno)}
              onChange={handleMonedaChange('valorTurno')}
              placeholder={formatearPrecioCuenta(120000)}
              inputMode="numeric"
              disabled={submitting}
              required
            />
          </label>
        </div>

        <CampoPorcentajeConCalculo
          label="Hora extra (%) *"
          value={form.porcentajeHoraExtra}
          onChange={handleChange('porcentajeHoraExtra')}
          placeholder="Ej. 25"
          preview={previewHoraExtra}
          ariaLabel="Valor hora extra calculado"
          submitting={submitting}
          required
        />

        <CampoPorcentajeConCalculo
          label="Recargo dominical / festivo (%) *"
          value={form.porcentajeRecargoDominical}
          onChange={handleChange('porcentajeRecargoDominical')}
          placeholder="Ej. 75"
          preview={previewDominical}
          ariaLabel="Valor hora con recargo dominical calculado"
          submitting={submitting}
          required
          hint="Se aplica a horas ordinarias en domingo o festivo oficial de Colombia."
        />

        <CampoPorcentajeConCalculo
          label="Recargo nocturno (%) *"
          value={form.porcentajeRecargoNocturno}
          onChange={handleChange('porcentajeRecargoNocturno')}
          placeholder="Ej. 35"
          preview={previewNocturno}
          ariaLabel="Valor hora con recargo nocturno calculado"
          submitting={submitting}
          required
        />
      </form>
    </Modal>
  )
}

export default EsquemaPagoFormModal
