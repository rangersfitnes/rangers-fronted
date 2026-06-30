export const VARIABLES_PLANTILLA_USUARIO = [
  { clave: 'nombre', etiqueta: 'Nombre', descripcion: 'Nombre completo del usuario' },
  {
    clave: 'tipoDocumento',
    etiqueta: 'Tipo de documento',
    descripcion: 'CC, TI, CE o PA',
  },
  { clave: 'documento', etiqueta: 'Documento', descripcion: 'Número de documento' },
  { clave: 'celular', etiqueta: 'Celular', descripcion: 'Número de celular' },
  {
    clave: 'fechaNacimiento',
    etiqueta: 'Fecha de nacimiento',
    descripcion: 'Fecha de nacimiento registrada',
  },
  { clave: 'plan', etiqueta: 'Plan (ID)', descripcion: 'Identificador del plan activo' },
  {
    clave: 'planNombre',
    etiqueta: 'Nombre del plan',
    descripcion: 'Nombre legible del plan activo',
  },
  {
    clave: 'fechaInicio',
    etiqueta: 'Inicio del plan',
    descripcion: 'Fecha de inicio del plan activo',
  },
  {
    clave: 'vigencia',
    etiqueta: 'Vigencia del plan',
    descripcion: 'Fecha de vencimiento del plan activo',
  },
  {
    clave: 'fechaCreacion',
    etiqueta: 'Fecha de registro',
    descripcion: 'Fecha en que se creó el usuario',
  },
  { clave: 'id', etiqueta: 'ID interno', descripcion: 'ID numérico del usuario' },
]

export function variablePlantilla(clave) {
  return `{${clave}}`
}
