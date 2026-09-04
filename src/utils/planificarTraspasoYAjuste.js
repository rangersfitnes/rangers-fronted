export const CUENTAS_TRASPASO_AJUSTE = [
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'transferencia', label: 'Transferencia' },
  { id: 'wompi', label: 'Wompi' },
]

export const MOTIVO_AJUSTE_AUTOMATICO = 'Ajuste automático'

/**
 * Calcula traspasos entre cuentas y ajustes residuales para que
 * los saldos del sistema coincidan con los montos reales digitados.
 *
 * delta = real - sistema
 * - delta < 0 → sobra en sistema (sale dinero de esa cuenta)
 * - delta > 0 → falta en sistema (entra dinero a esa cuenta)
 * desfase = suma(deltas) = total real − total sistema
 */
export function planificarTraspasoYAjuste({ saldosSistema = {}, saldosReales = {} } = {}) {
  const ids = CUENTAS_TRASPASO_AJUSTE.map((c) => c.id)
  const deltas = {}
  const restante = {}

  for (const id of ids) {
    const sistema = Math.round(Number(saldosSistema[id]) || 0)
    const real = Math.round(Number(saldosReales[id]) || 0)
    const delta = real - sistema
    deltas[id] = delta
    restante[id] = delta
  }

  const desfase = ids.reduce((suma, id) => suma + deltas[id], 0)
  const traspasos = []

  while (true) {
    const desde = ids.find((id) => restante[id] < 0)
    const hacia = ids.find((id) => restante[id] > 0)
    if (!desde || !hacia) break

    const monto = Math.min(-restante[desde], restante[hacia])
    if (monto <= 0) break

    traspasos.push({ desde, hacia, monto })
    restante[desde] += monto
    restante[hacia] -= monto
  }

  const ajustes = []
  for (const id of ids) {
    const valor = restante[id]
    if (valor === 0) continue
    if (valor > 0) {
      ajustes.push({
        cuenta: id,
        monto: valor,
        direccion: 'aumentar',
        motivo: MOTIVO_AJUSTE_AUTOMATICO,
      })
    } else {
      ajustes.push({
        cuenta: id,
        monto: -valor,
        direccion: 'disminuir',
        motivo: MOTIVO_AJUSTE_AUTOMATICO,
      })
    }
  }

  return {
    deltas,
    desfase,
    traspasos,
    ajustes,
    sinCambios: traspasos.length === 0 && ajustes.length === 0,
  }
}
