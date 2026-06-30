export const PLANTILLAS_AUTOMATICAS = [
  {
    id: 'registro-usuario',
    nombre: 'Usuario nuevo',
    descripcion:
      'Se envía automáticamente cuando alguien crea su cuenta en la web.',
    contenidoPorDefecto: `⚔️ ¡BIENVENIDO A RANGERS BOX!

Hola, {nombre}.

Tu cuenta ha sido creada correctamente y ya haces parte de nuestra comunidad.

Desde este momento puedes iniciar sesión en nuestra plataforma para conocer nuestros planes, gestionar tu cuenta y comenzar tu camino junto a nosotros.

Estamos listos para acompañarte en cada entrenamiento.

HECHOS PARA RESISTIR. ENTRENADOS PARA VENCER. 🧡🖤`,
    variables: [
      {
        clave: 'nombre',
        etiqueta: 'Nombre',
        descripcion: 'Nombre completo del usuario',
      },
    ],
  },
  {
    id: 'activacion-plan',
    nombre: 'Activación de plan',
    descripcion:
      'Se envía al titular y beneficiarios cuando se activa un plan.',
    contenidoPorDefecto: `⚔️ MISIÓN CONFIRMADA

Hola, {nombre}.

Tu plan {plan} ha sido activado correctamente y ya haces parte de Rangers Box.

A partir de hoy comienza un nuevo reto. Cada entrenamiento será una oportunidad para desarrollar fuerza, resistencia y disciplina.

📅 Inicio de tu plan: {fecha_inicio}
📅 Vencimiento: {fecha_fin}

Te esperamos en el box.

HECHOS PARA RESISTIR. ENTRENADOS PARA VENCER. 🧡🖤.`,
    variables: [
      {
        clave: 'nombre',
        etiqueta: 'Nombre',
        descripcion: 'Nombre del titular o beneficiario',
      },
      {
        clave: 'plan',
        etiqueta: 'Plan',
        descripcion: 'Nombre del plan activado',
      },
      {
        clave: 'fecha_inicio',
        etiqueta: 'Inicio del plan',
        descripcion: 'Fecha de inicio del plan',
      },
      {
        clave: 'fecha_fin',
        etiqueta: 'Vencimiento',
        descripcion: 'Fecha de vencimiento del plan',
      },
    ],
  },
]

export function obtenerPlantillaAutomaticaMeta(id) {
  return PLANTILLAS_AUTOMATICAS.find((item) => item.id === id) ?? null
}

export function resolverContenidoPlantillaAutomatica(id, plantillasRemotas = []) {
  const remota = plantillasRemotas.find((item) => item.id === id)
  if (remota?.contenido) return remota.contenido

  const meta = obtenerPlantillaAutomaticaMeta(id)
  return meta?.contenidoPorDefecto ?? ''
}

export function plantillaAutomaticaEsPersonalizada(id, plantillasRemotas = []) {
  const remota = plantillasRemotas.find((item) => item.id === id)
  return Boolean(remota?.esPersonalizada)
}
