export const DIAS_SEMANA = [
  { value: 'lunes', label: 'Lunes' },
  { value: 'martes', label: 'Martes' },
  { value: 'miercoles', label: 'Miércoles' },
  { value: 'jueves', label: 'Jueves' },
  { value: 'viernes', label: 'Viernes' },
  { value: 'sabado', label: 'Sábado' },
  { value: 'domingo', label: 'Domingo' },
]

const DIA_SEMANA_COLOMBIA = {
  monday: 'lunes',
  tuesday: 'martes',
  wednesday: 'miercoles',
  thursday: 'jueves',
  friday: 'viernes',
  saturday: 'sabado',
  sunday: 'domingo',
}

export function diaSemanaHoyColombia() {
  const en = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Bogota',
    weekday: 'long',
  })
    .format(new Date())
    .toLowerCase()

  return DIA_SEMANA_COLOMBIA[en] ?? 'lunes'
}

export function etiquetaDiaSemana(valor) {
  return DIAS_SEMANA.find((dia) => dia.value === valor)?.label ?? valor
}
