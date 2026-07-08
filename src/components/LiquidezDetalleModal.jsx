import Modal from './Modal.jsx'
import { formatearPrecioCuenta } from '../pages/cuenta/cuentaUtils.js'
import './LiquidezHistoricaPanel.css'

function FilaDesglose({ label, valor, tipo = 'neutral' }) {
  const clase =
    tipo === 'ingreso'
      ? 'ag-liquidez-modal__valor--ingreso'
      : tipo === 'egreso'
        ? 'ag-liquidez-modal__valor--egreso'
        : ''

  return (
    <div className="ag-liquidez-modal__fila">
      <span className="ag-liquidez-modal__label">{label}</span>
      <span className={`ag-liquidez-modal__valor ${clase}`.trim()}>
        {formatearPrecioCuenta(valor)}
      </span>
    </div>
  )
}

function LiquidezDetalleModal({ open, onClose, liquidez }) {
  if (!liquidez) return null

  const { efectivo, transferencia, wompi, banco, otro, liquidezTotal } = liquidez
  const transferenciaData = transferencia ?? {
    ingresos: banco?.ingresosTransferencia ?? 0,
    egresos: banco?.egresosTransferencia ?? 0,
    disponible:
      (banco?.ingresosTransferencia ?? 0) - (banco?.egresosTransferencia ?? 0),
  }
  const wompiData = wompi ?? {
    ingresos: banco?.ingresosWompi ?? 0,
    egresos: banco?.egresosWompi ?? 0,
    disponible: (banco?.ingresosWompi ?? 0) - (banco?.egresosWompi ?? 0),
  }
  const muestraOtro = (otro?.ingresos ?? 0) > 0 || (otro?.egresos ?? 0) > 0

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Desglose de liquidez"
      className="modal--liquidez"
      footer={
        <button type="button" className="modal__btn" onClick={onClose}>
          Cerrar
        </button>
      }
    >
      <div className="ag-liquidez-modal">
        <div className="ag-liquidez-modal__total">
          <span className="ag-liquidez-modal__total-label">Total disponible</span>
          <span className="ag-liquidez-modal__total-valor">
            {formatearPrecioCuenta(liquidezTotal)}
          </span>
          <p className="ag-liquidez-modal__total-hint">
            Suma histórica de ingresos menos egresos registrados.
          </p>
        </div>

        <section className="ag-liquidez-modal__bloque">
          <h3 className="ag-liquidez-modal__bloque-title">Efectivo en caja</h3>
          <FilaDesglose
            label="Ingresos en efectivo"
            valor={efectivo.ingresos}
            tipo="ingreso"
          />
          <FilaDesglose
            label="Egresos en efectivo"
            valor={efectivo.egresos}
            tipo="egreso"
          />
          <FilaDesglose
            label="Debería haber en efectivo"
            valor={efectivo.disponible}
          />
        </section>

        <section className="ag-liquidez-modal__bloque">
          <h3 className="ag-liquidez-modal__bloque-title">Transferencia</h3>
          <FilaDesglose
            label="Ingresos por transferencia"
            valor={transferenciaData.ingresos}
            tipo="ingreso"
          />
          <FilaDesglose
            label="Egresos por transferencia"
            valor={transferenciaData.egresos}
            tipo="egreso"
          />
          <FilaDesglose
            label="Debería haber por transferencia"
            valor={transferenciaData.disponible}
          />
        </section>

        <section className="ag-liquidez-modal__bloque">
          <h3 className="ag-liquidez-modal__bloque-title">Wompi</h3>
          <FilaDesglose
            label="Ingresos por Wompi"
            valor={wompiData.ingresos}
            tipo="ingreso"
          />
          <FilaDesglose
            label="Egresos por Wompi"
            valor={wompiData.egresos}
            tipo="egreso"
          />
          <FilaDesglose
            label="Debería haber en Wompi"
            valor={wompiData.disponible}
          />
        </section>

        {muestraOtro ? (
          <section className="ag-liquidez-modal__bloque ag-liquidez-modal__bloque--otro">
            <h3 className="ag-liquidez-modal__bloque-title">Otros medios</h3>
            <FilaDesglose label="Ingresos" valor={otro.ingresos} tipo="ingreso" />
            <FilaDesglose label="Egresos" valor={otro.egresos} tipo="egreso" />
            <FilaDesglose label="Saldo" valor={otro.disponible} />
          </section>
        ) : null}
      </div>
    </Modal>
  )
}

export default LiquidezDetalleModal
