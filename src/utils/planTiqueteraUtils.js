export function usuarioPuedeComprarPlan(usuario) {
  const planActivo = usuario?.planesActivos?.[0] ?? null
  if (!planActivo) return true
  if (planActivo.puedeRenovar) return true
  if (
    planActivo.tipo === 'tiquetera' &&
    Number(planActivo.entradasRestantes) === 0
  ) {
    return true
  }
  return false
}

export function usuarioTienePlanConAcceso(usuario) {
  const planActivo = usuario?.planesActivos?.[0] ?? null
  if (!planActivo) return false
  if (planActivo.accesoActivo === false) return false
  if (planActivo.puedeRenovar) return false
  return true
}
