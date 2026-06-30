export const FILTROS_USUARIO_WHATSAPP = {
  estadosPlan: [
    { id: 'todos', label: 'Todos los estados de plan' },
    { id: 'activo', label: 'Plan activo' },
    { id: 'vencido', label: 'Plan vencido' },
    { id: 'sin_plan', label: 'Sin plan' },
  ],
  tiposDocumento: [
    { id: 'todos', label: 'Todos los tipos de documento' },
    { id: 'CC', label: 'Cédula de ciudadanía (CC)' },
    { id: 'TI', label: 'Tarjeta de identidad (TI)' },
    { id: 'CE', label: 'Cédula de extranjería (CE)' },
    { id: 'PA', label: 'Pasaporte (PA)' },
  ],
  rolesEnPlan: [
    { id: 'todos', label: 'Cualquier rol en plan' },
    { id: 'titular', label: 'Titular de plan grupal' },
    { id: 'beneficiario', label: 'Beneficiario de plan grupal' },
    { id: 'sin_grupo', label: 'Sin grupo (plan individual)' },
  ],
}

export const FILTROS_INICIALES = {
  estadoPlan: 'todos',
  planId: '',
  tipoDocumento: 'todos',
  rolEnPlan: 'todos',
  documentosEspecificos: [''],
  soloConCelular: true,
}

export function filtrosParaApi(filtros) {
  const documentosEspecificos = [
    ...new Set(
      (filtros.documentosEspecificos || [])
        .map((doc) => String(doc || '').trim().replace(/\s/g, ''))
        .filter(Boolean),
    ),
  ]

  return {
    estadoPlan: filtros.estadoPlan,
    planId: filtros.planId || undefined,
    tipoDocumento: filtros.tipoDocumento,
    rolEnPlan: filtros.rolEnPlan,
    documentosEspecificos,
    soloConCelular: filtros.soloConCelular,
  }
}
