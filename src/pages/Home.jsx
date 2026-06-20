import Hero from '../components/Hero.jsx'
import { useUsuario } from '../contexts/UsuarioContext.jsx'
import './Home.css'

function Home() {
  const { usuario } = useUsuario()

  return (
    <div className={`home${usuario ? ' home--auth' : ''}`}>
      <Hero />
    </div>
  )
}

export default Home
