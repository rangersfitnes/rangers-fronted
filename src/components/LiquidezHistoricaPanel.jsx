import { useState } from 'react'
import { useContadorAnimado } from '../hooks/useContadorAnimado.js'
import { formatearPrecioCuenta } from '../pages/cuenta/cuentaUtils.js'
import LiquidezDetalleModal from './LiquidezDetalleModal.jsx'
import './LiquidezHistoricaPanel.css'

function TarjetaContador({ label, valor, hint, variante, onClick, clickable }) {
  const valorAnimado = useContadorAnimado(valor)
  const Tag = clickable ? 'button' : 'div'

  return (
    <Tag
      type={clickable ? 'button' : undefined}
      className={`ag-liquidez__card ag-liquidez__card--${variante}${
        clickable ? ' ag-liquidez__card--clickable' : ''
      }`}
      onClick={clickable ? onClick : undefined}
      aria-label={clickable ? `${label}. Pulsa para ver desglose.` : undefined}
    >
      <span className="ag-liquidez__card-label">{label}</span>
      <span className="ag-liquidez__card-valor">{formatearPrecioCuenta(valorAnimado)}</span>
      <span className="ag-liquidez__card-hint">{hint}</span>
      {clickable ? (
        <span className="ag-liquidez__card-action">Ver desglose →</span>
      ) : null}
    </Tag>
  )
}

function LiquidezHistoricaPanel({ liquidez, loading, error, ultimaActualizacion }) {
  const [modalAbierto, setModalAbierto] = useState(false)

  const horaActualizacion = ultimaActualizacion
    ? new Intl.DateTimeFormat('es-CO', {
        timeZone: 'America/Bogota',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date(ultimaActualizacion))
    : null

  return (
    <>
      <section className="ag-liquidez" aria-live="polite">
        <header className="ag-liquidez__header">
          <div>
            <h2 className="ag-liquidez__title">
              <span className="ag-liquidez__live" aria-hidden="true" />
              Liquidez histórica
            </h2>
            <p className="ag-liquidez__subtitle">
              Totales acumulados de todos los movimientos registrados
              {horaActualizacion ? ` · Actualizado ${horaActualizacion}` : ''}
            </p>
          </div>
          {loading && !liquidez ? (
            <span className="ag-liquidez__estado">Calculando…</span>
          ) : null}
        </header>

        {error ? (
          <p className="pf-entrenamientos__error ag-liquidez__error" role="alert">
            {error}
          </p>
        ) : null}

        {liquidez ? (
          <div className="ag-liquidez__grid">
            <TarjetaContador
              label="Ingresos históricos"
              valor={liquidez.totalIngresos}
              hint={`${liquidez.movimientosIngreso ?? 0} movimiento(s)`}
              variante="ingreso"
            />
            <TarjetaContador
              label="Egresos históricos"
              valor={liquidez.totalEgresos}
              hint={`${liquidez.movimientosEgreso ?? 0} salida(s)`}
              variante="egreso"
            />
            <TarjetaContador
              label="Liquidez disponible"
              valor={liquidez.liquidezTotal}
              hint="Ingresos − egresos · Efectivo + banco"
              variante="total"
              clickable
              onClick={() => setModalAbierto(true)}
            />
          </div>
        ) : null}
      </section>

      <LiquidezDetalleModal
        open={modalAbierto}
        onClose={() => setModalAbierto(false)}
        liquidez={liquidez}
      />
    </>
  )
}

export default LiquidezHistoricaPanel
