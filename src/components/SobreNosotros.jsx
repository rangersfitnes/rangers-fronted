import { colors } from '../variables/colors.jsx'
import './SobreNosotros.css'

const VALORES = [
  'Disciplina',
  'Esfuerzo',
  'Respeto',
  'Comunidad',
  'Superación constante',
  'Rendimiento',
]

function SobreNosotros() {
  return (
    <section id="sobre-nosotros" className="sobre-nosotros" aria-labelledby="sobre-nosotros-title">
      <div className="sobre-nosotros__inner">
        <header className="sobre-nosotros__header">
          <h2 id="sobre-nosotros-title" className="sobre-nosotros__title">
            Sobre nosotros
          </h2>
          <p className="sobre-nosotros__welcome">Bienvenido a Rangers Box</p>
        </header>

        <div className="sobre-nosotros__prose">
          <p>
            Rangers Box nace con una misión clara: ayudar a las personas a desarrollar
            fuerza, resistencia, disciplina y carácter a través del entrenamiento.
          </p>
          <p>
            No somos un gimnasio convencional. Somos un espacio diseñado para quienes
            buscan superar sus límites, mejorar su rendimiento físico y construir una
            mejor versión de sí mismos cada día.
          </p>
          <p>
            Nuestra metodología combina diferentes disciplinas como OCR (Obstacle
            Course Racing), calistenia, entrenamiento funcional, musculación y
            preparación física general, permitiendo que cada persona entrene de acuerdo
            con sus objetivos, nivel de experiencia y necesidades.
          </p>
          <p>
            Creemos que no existe un único camino hacia el progreso. Por eso ofrecemos
            una combinación de entrenamiento guiado, clases grupales y planificación
            personalizada, brindando a cada atleta las herramientas necesarias para
            avanzar a su propio ritmo.
          </p>
          <p>
            En Rangers Box encontrarás una comunidad comprometida con el esfuerzo, la
            constancia y la superación personal. Un lugar donde el trabajo duro, el
            respeto y la disciplina son parte fundamental de nuestra cultura.
          </p>
          <p>
            Ya sea que busques mejorar tu condición física, prepararte para competencias
            OCR, desarrollar fuerza, aprender calistenia o simplemente llevar una vida
            más activa y saludable, aquí encontrarás el acompañamiento y el entorno
            adecuado para lograrlo.
          </p>
        </div>

        <blockquote className="sobre-nosotros__quote">
          <p>
            Porque entendemos que el verdadero entrenamiento va más allá del físico.
          </p>
          <p>Se trata de aprender a resistir cuando las cosas se ponen difíciles.</p>
          <p>De mantener la disciplina cuando la motivación desaparece.</p>
          <p>De avanzar cuando otros deciden detenerse.</p>
        </blockquote>

        <div className="sobre-nosotros__pilares">
          <article className="sobre-nosotros__card">
            <h3 className="sobre-nosotros__card-title">Nuestra misión</h3>
            <p>
              Formar personas más fuertes física y mentalmente a través de una
              metodología de entrenamiento integral basada en el rendimiento, la
              disciplina y la superación constante.
            </p>
          </article>

          <article className="sobre-nosotros__card">
            <h3 className="sobre-nosotros__card-title">Nuestra visión</h3>
            <p>
              Convertirnos en un referente del entrenamiento híbrido y el desarrollo
              atlético, formando una comunidad reconocida por su compromiso, rendimiento
              y mentalidad de crecimiento.
            </p>
          </article>

          <article className="sobre-nosotros__card">
            <h3 className="sobre-nosotros__card-title">Nuestros valores</h3>
            <ul className="sobre-nosotros__valores">
              {VALORES.map((valor) => (
                <li key={valor}>{valor}</li>
              ))}
            </ul>
          </article>
        </div>

        <footer className="sobre-nosotros__lema">
          <span className="sobre-nosotros__lema-label">Nuestro lema</span>
          <p
            className="sobre-nosotros__lema-texto"
            style={{ color: colors.primary_orange }}
          >
            Hechos para resistir. Entrenados para vencer.
          </p>
        </footer>
      </div>
    </section>
  )
}

export default SobreNosotros
