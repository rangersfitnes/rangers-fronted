import './EntrenamientoLibreAviso.css'

function EntrenamientoLibreAviso() {
  return (
    <aside
      className="entrenamiento-libre-aviso"
      aria-labelledby="entrenamiento-libre-aviso-title"
    >
      <h2
        id="entrenamiento-libre-aviso-title"
        className="entrenamiento-libre-aviso__titulo"
      >
        Entrenamiento libre disponible
      </h2>
      <p className="entrenamiento-libre-aviso__texto">
        Las clases grupales son opcionales. Puedes entrenar libremente dentro del
        horario de funcionamiento del box y seguir tu propio plan de
        entrenamiento.
      </p>
    </aside>
  )
}

export default EntrenamientoLibreAviso
