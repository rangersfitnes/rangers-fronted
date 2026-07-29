import { useEffect, useMemo, useState } from 'react'
import Modal from './Modal.jsx'
import {
  DIAS_SEMANA_ESQUEMA,
  calcularValorHoraExtra,
} from '../utils/esquemaPagoUtils.js'
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
  horaInicioNocturna: '19',
  horaFinNocturna: '6',
  porcentajeHoraExtra: '',
  porcentajeRecargoDominical: '',
  porcentajeRecargoNocturno: '',
}

function estadoInicialJornadas() {
  return Object.fromEntries(
    DIAS_SEMANA_ESQUEMA.map((dia) => [
      dia.id,
      { activo: false, horasTurno: '', valorTurno: '' },
    ]),
  )
}

function parseHorasInput(valor) {
  const limpio = String(valor || '').trim().replace(',', '.')
  const numero = Number(limpio)
  return Number.isFinite(numero) ? numero : NaN
}

function parseHoraDiaInput(valor) {
  const numero = Math.round(Number(String(valor || '').trim()))
  return Number.isFinite(numero) ? numero : NaN
}

function parsePorcentajeInput(valor) {
  const limpio = String(valor || '').trim().replace(',', '.')
  const numero = Number(limpio)
  return Number.isFinite(numero) ? numero : NaN
}

function opcionesHoraDia() {
  return Array.from({ length: 24 }, (_, hora) => ({
    value: String(hora),
    label: `${String(hora).padStart(2, '0')}:00`,
  }))
}

function jornadasToForm(jornadasPorDia = {}) {
  const base = estadoInicialJornadas()
  for (const dia of DIAS_SEMANA_ESQUEMA) {
    const config = jornadasPorDia?.[dia.id]
    if (!config) continue
    base[dia.id] = {
      activo: true,
      horasTurno: String(config.horasTurno ?? ''),
      valorTurno: String(config.valorTurno ?? ''),
    }
  }
  return base
}

function jornadasFromForm(jornadasForm) {
  const resultado = {}
  for (const dia of DIAS_SEMANA_ESQUEMA) {
    const config = jornadasForm[dia.id]
    if (!config?.activo) continue
    resultado[dia.id] = {
      horasTurno: parseHorasInput(config.horasTurno),
      valorTurno: parseMonedaCOP(config.valorTurno),
    }
  }
  return resultado
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
  if (!esquema) {
    return { form: estadoInicial, jornadas: estadoInicialJornadas() }
  }
  return {
    form: {
      nombre: esquema.nombre ?? '',
      valorPorHora: String(esquema.valorPorHora ?? ''),
      horasTurno: String(esquema.horasTurno ?? ''),
      valorTurno: String(esquema.valorTurno ?? ''),
      horaInicioNocturna: String(esquema.horaInicioNocturna ?? 19),
      horaFinNocturna: String(esquema.horaFinNocturna ?? 6),
      porcentajeHoraExtra: String(esquema.porcentajeHoraExtra ?? ''),
      porcentajeRecargoDominical: String(esquema.porcentajeRecargoDominical ?? ''),
      porcentajeRecargoNocturno: String(esquema.porcentajeRecargoNocturno ?? ''),
    },
    jornadas: jornadasToForm(esquema.jornadasPorDia),
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
  const [jornadas, setJornadas] = useState(estadoInicialJornadas)
  const editando = Boolean(esquema?.id)

  useEffect(() => {
    if (!open) return
    const inicial = esquemaToForm(esquema)
    setForm(inicial.form)
    setJornadas(inicial.jornadas)
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

  const handleToggleDia = (diaId) => (event) => {
    const activo = event.target.checked
    setJornadas((prev) => ({
      ...prev,
      [diaId]: {
        ...prev[diaId],
        activo,
        horasTurno: activo ? prev[diaId].horasTurno || form.horasTurno : '',
        valorTurno: activo ? prev[diaId].valorTurno || form.valorTurno : '',
      },
    }))
  }

  const handleJornadaCampo = (diaId, campo) => (event) => {
    const value =
      campo === 'valorTurno'
        ? event.target.value.replace(/\D/g, '')
        : event.target.value
    setJornadas((prev) => ({
      ...prev,
      [diaId]: { ...prev[diaId], [campo]: value },
    }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    onSubmit?.({
      nombre: form.nombre.trim(),
      valorPorHora: parseMonedaCOP(form.valorPorHora),
      horasTurno: parseHorasInput(form.horasTurno),
      valorTurno: parseMonedaCOP(form.valorTurno),
      jornadasPorDia: jornadasFromForm(jornadas),
      horaInicioNocturna: parseHoraDiaInput(form.horaInicioNocturna),
      horaFinNocturna: parseHoraDiaInput(form.horaFinNocturna),
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
      className="esquema-pago-form-modal"
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

        <section className="ag-esquema-pago__jornadas" aria-label="Jornadas por día">
          <h3 className="ag-esquema-pago__jornadas-title">
            Jornadas por día (opcional)
          </h3>
          <p className="ag-esquema-pago__hint">
            Personaliza horas y valor de turno para días específicos. Los días
            sin marcar usan la jornada general.
          </p>

          <div className="ag-esquema-pago__jornadas-lista">
            {DIAS_SEMANA_ESQUEMA.map((dia) => {
              const config = jornadas[dia.id]
              return (
                <div key={dia.id} className="ag-esquema-pago__jornada-dia">
                  <label className="ag-esquema-pago__jornada-check">
                    <input
                      type="checkbox"
                      checked={Boolean(config?.activo)}
                      onChange={handleToggleDia(dia.id)}
                      disabled={submitting}
                    />
                    <span>{dia.label}</span>
                  </label>

                  {config?.activo ? (
                    <div className="ag-esquema-pago__jornada-campos">
                      <label className="crear-plan__field">
                        <span className="crear-plan__label">Horas</span>
                        <input
                          type="text"
                          className="crear-plan__input"
                          value={config.horasTurno}
                          onChange={handleJornadaCampo(dia.id, 'horasTurno')}
                          placeholder={form.horasTurno || 'Ej. 5'}
                          inputMode="numeric"
                          disabled={submitting}
                          required
                        />
                      </label>
                      <label className="crear-plan__field">
                        <span className="crear-plan__label">Valor turno</span>
                        <input
                          type="text"
                          className="crear-plan__input"
                          value={formatearMonedaCOPInput(config.valorTurno)}
                          onChange={handleJornadaCampo(dia.id, 'valorTurno')}
                          placeholder={formatearPrecioCuenta(
                            parseMonedaCOP(form.valorTurno) || 0,
                          )}
                          inputMode="numeric"
                          disabled={submitting}
                          required
                        />
                      </label>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </section>

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
          hint="Se aplica a las horas laboradas dentro de la franja nocturna del esquema."
        />

        <div className="crear-plan__row">
          <label className="crear-plan__field">
            <span className="crear-plan__label">Inicio franja nocturna *</span>
            <select
              className="crear-plan__input"
              value={form.horaInicioNocturna}
              onChange={handleChange('horaInicioNocturna')}
              disabled={submitting}
              required
            >
              {opcionesHoraDia().map((opcion) => (
                <option key={`inicio-${opcion.value}`} value={opcion.value}>
                  {opcion.label}
                </option>
              ))}
            </select>
          </label>

          <label className="crear-plan__field">
            <span className="crear-plan__label">Fin franja nocturna *</span>
            <select
              className="crear-plan__input"
              value={form.horaFinNocturna}
              onChange={handleChange('horaFinNocturna')}
              disabled={submitting}
              required
            >
              {opcionesHoraDia().map((opcion) => (
                <option key={`fin-${opcion.value}`} value={opcion.value}>
                  {opcion.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="ag-esquema-pago__hint">
          Por defecto 19:00 a 06:00. Si el fin es menor que el inicio, la franja
          cruza medianoche.
        </p>
      </form>
    </Modal>
  )
}

export default EsquemaPagoFormModal
