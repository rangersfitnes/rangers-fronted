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
  {
    id: 'vencimiento',
    nombre: 'Vencimiento',
    descripcion:
      'Se envía automáticamente a las 9:00 a. m. (Colombia) cuando el plan de un usuario vence.',
    contenidoPorDefecto: `⚔️ MISIÓN FINALIZADA

Hola, {nombre}.

Tu plan {plan} ha llegado a su fecha de vencimiento ({fecha_fin}).

Gracias por entrenar con nosotros. Renueva tu plan para seguir construyendo fuerza, resistencia y disciplina en Rangers Box.

Te esperamos de vuelta en el box.

HECHOS PARA RESISTIR. ENTRENADOS PARA VENCER. 🧡🖤`,
    variables: [
      {
        clave: 'nombre',
        etiqueta: 'Nombre',
        descripcion: 'Nombre del titular o beneficiario',
      },
      {
        clave: 'plan',
        etiqueta: 'Plan',
        descripcion: 'Nombre del plan vencido',
      },
      {
        clave: 'fecha_inicio',
        etiqueta: 'Inicio del plan',
        descripcion: 'Fecha de inicio del plan vencido',
      },
      {
        clave: 'fecha_fin',
        etiqueta: 'Vencimiento',
        descripcion: 'Fecha de vencimiento del plan',
        tipo: 'fijo',
      },
    ],
  },
  {
    id: 'entrenamiento-proximo-dia',
    nombre: 'Entrenamiento del próximo día',
    descripcion:
      'Se envía todos los días a las 7:00 p. m. (Colombia) al grupo Rangers box 🔥🔥 con el cronograma de clases del día siguiente (clases grupales).',
    contenidoPorDefecto: `🔥 *RANGERS BOX | CLASES DE MAÑANA* 🔥

¡Rangers! 💪 Mañana tenemos:

{horario}

Prepárate para entrenar, superar tus límites y seguir construyendo tu mejor versión. 🧡

💡 *¿Quieres entrenar algo diferente?*
No hay problema. Puedes utilizar los *espacios y elementos disponibles del Box* para realizar tu propio entrenamiento, siempre respetando las zonas y el material que estén disponibles.

¡Nos vemos mañana, Rangers! 🦾🔥

*RANGERS BOX*
_Entrena. Supera. Evoluciona._`,
    variables: [
      {
        clave: 'horario',
        etiqueta: 'Clase(s) del día',
        descripcion:
          'Bloque fijo con nombre, hora y enfoque de cada clase (una encima de otra si hay 2+). Sale del cronograma de clases grupales.',
        tipo: 'fijo',
      },
      {
        clave: 'dia_label',
        etiqueta: 'Día',
        descripcion: 'Nombre del día siguiente (ej. Lunes). Opcional.',
        tipo: 'fijo',
      },
      {
        clave: 'fecha',
        etiqueta: 'Fecha',
        descripcion: 'Fecha del día siguiente. Opcional.',
        tipo: 'fijo',
      },
      {
        clave: 'dia',
        etiqueta: 'Clave del día',
        descripcion: 'Clave interna del día (ej. lunes). Opcional.',
        tipo: 'fijo',
      },
      {
        clave: 'clases_count',
        etiqueta: 'Cantidad de clases',
        descripcion: 'Número de clases programadas. Opcional.',
        tipo: 'fijo',
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
