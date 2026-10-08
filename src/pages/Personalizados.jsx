import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { colors } from '../variables/colors.jsx'
import { useAdminAuth } from '../contexts/AdminAuthContext.jsx'
import Modal from '../components/Modal.jsx'
import LoadingOverlay from '../components/LoadingOverlay.jsx'
import {
  esAdminColaborador,
  esCreadorStaff,
  esTrainerStaff,
  rolesStaffActuales,
} from '../utils/adminRoles.js'
import {
  buscarAtletasPersonalizados,
  enviarSolicitudPersonalizado,
  listarMisAtletasPersonalizados,
} from '../services/personalizadosService.js'
import './Personalizados.css'

function Personalizados() {
  const navigate = useNavigate()
  const { logout, perfil, roles } = useAdminAuth()
  const rolesActuales = rolesStaffActuales(roles)
  const esTrainer = esTrainerStaff(rolesActuales)
  const mostrarVolver =
    esAdminColaborador(rolesActuales) || esCreadorStaff(rolesActuales)

  const [atletas, setAtletas] = useState([])
  const [cargandoLista, setCargandoLista] = useState(true)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [termino, setTermino] = useState('')
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [enviandoUid, setEnviandoUid] = useState('')
  const [errorBusqueda, setErrorBusqueda] = useState('')
  const [aviso, setAviso] = useState('')
  const busquedaRef = useRef(0)

  useEffect(() => {
    if (!esTrainer) return undefined
    const controller = new AbortController()
    const cargar = async () => {
      setCargandoLista(true)
      try {
        const lista = await listarMisAtletasPersonalizados({
          signal: controller.signal,
        })
        if (!controller.signal.aborted) setAtletas(lista)
      } catch (err) {
        if (err?.name === 'AbortError') return
        console.warn('[personalizados] lista:', err.message)
      } finally {
        if (!controller.signal.aborted) setCargandoLista(false)
      }
    }
    cargar()
    return () => controller.abort()
  }, [esTrainer])

  if (!esTrainer) {
    return <Navigate to="/admin/dashboard" replace />
  }

  const handleLogout = async () => {
    await logout()
    navigate('/admin', { replace: true })
  }

  const cerrarModal = () => {
    if (enviandoUid) return
    setModalAbierto(false)
    setTermino('')
    setResultados([])
    setErrorBusqueda('')
    setAviso('')
  }

  const handleBuscar = async (event) => {
    event?.preventDefault()
    const q = termino.trim()
    if (q.length < 2) {
      setErrorBusqueda('Escribe al menos 2 caracteres')
      return
    }

    const ticket = ++busquedaRef.current
    setBuscando(true)
    setErrorBusqueda('')
    setAviso('')
    try {
      const tipo = /^\d+$/.test(q) ? 'documento' : 'nombre'
      const lista = await buscarAtletasPersonalizados({ q, tipo })
      if (ticket !== busquedaRef.current) return
      setResultados(lista)
      if (lista.length === 0) {
        setErrorBusqueda('No se encontraron usuarios con ese criterio')
      }
    } catch (err) {
      if (ticket !== busquedaRef.current) return
      setResultados([])
      setErrorBusqueda(err.message || 'No se pudo buscar')
    } finally {
      if (ticket === busquedaRef.current) setBuscando(false)
    }
  }

  const handleSolicitar = async (atleta) => {
    if (!atleta?.uid || enviandoUid) return
    setEnviandoUid(atleta.uid)
    setErrorBusqueda('')
    setAviso('')
    try {
      const data = await enviarSolicitudPersonalizado(atleta.uid)
      setAviso(
        data.mensaje ||
          `Solicitud enviada a ${atleta.nombre}. La verá al iniciar sesión.`,
      )
      setResultados((prev) => prev.filter((item) => item.uid !== atleta.uid))
    } catch (err) {
      setErrorBusqueda(err.message || 'No se pudo enviar la solicitud')
    } finally {
      setEnviandoUid('')
    }
  }

  return (
    <main
      className="personalizados-page"
      style={{ backgroundColor: colors.page_background }}
    >
      <header className="personalizados-page__top">
        <div className="personalizados-page__brand">
          <span className="personalizados-page__brand-name">Rangers Box</span>
          <span className="personalizados-page__brand-sub">Personalizados</span>
        </div>
        <div className="personalizados-page__top-actions">
          {mostrarVolver && (
            <Link to="/admin/dashboard" className="personalizados-page__link">
              Volver al menú
            </Link>
          )}
          <button
            type="button"
            className="personalizados-page__logout"
            onClick={handleLogout}
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <section
        className="personalizados-page__trainer-bar"
        aria-label="Datos del entrenador"
      >
        <div>
          <p className="personalizados-page__eyebrow">Entrenador</p>
          <h1 className="personalizados-page__trainer-name">
            {perfil?.nombre || 'Entrenador'}
          </h1>
        </div>
        <dl className="personalizados-page__meta">
          <div>
            <dt>Cédula</dt>
            <dd>{perfil?.documento || '—'}</dd>
          </div>
          <div>
            <dt>Teléfono</dt>
            <dd>{perfil?.celular || '—'}</dd>
          </div>
          <div>
            <dt>Correo</dt>
            <dd>{perfil?.correo || '—'}</dd>
          </div>
        </dl>
      </section>

      <section className="personalizados-page__body personalizados-page__body--filled">
        <div className="personalizados-page__toolbar">
          <div>
            <h2 className="personalizados-page__section-title">Tus atletas</h2>
            <p className="personalizados-page__section-hint">
              Busca por nombre o documento y envía una solicitud. El atleta
              confirmará al iniciar sesión.
            </p>
          </div>
          <button
            type="button"
            className="personalizados-page__btn-add"
            onClick={() => setModalAbierto(true)}
          >
            Agregar atleta
          </button>
        </div>

        {cargandoLista ? (
          <p className="personalizados-page__empty">Cargando atletas…</p>
        ) : atletas.length === 0 ? (
          <p className="personalizados-page__empty">
            Aún no tienes atletas vinculados. Usa “Agregar atleta” para enviar
            la primera solicitud.
          </p>
        ) : (
          <ul className="personalizados-page__atletas">
            {atletas.map((item) => (
              <li key={item.uid} className="personalizados-page__atleta">
                <div>
                  <p className="personalizados-page__atleta-nombre">
                    {item.nombre || 'Atleta'}
                  </p>
                  <p className="personalizados-page__atleta-meta">
                    {item.tipoDocumento || 'CC'} {item.documento || '—'}
                    {item.celular ? ` · ${item.celular}` : ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <Modal
        open={modalAbierto}
        onClose={cerrarModal}
        title="Agregar atleta"
        className="personalizados-agregar-modal"
        footer={
          <button
            type="button"
            className="personalizados-page__btn-ghost"
            onClick={cerrarModal}
            disabled={Boolean(enviandoUid)}
          >
            Cerrar
          </button>
        }
      >
        <form className="personalizados-buscar" onSubmit={handleBuscar}>
          <label className="personalizados-buscar__field">
            <span>Nombre o documento</span>
            <input
              type="search"
              value={termino}
              onChange={(e) => setTermino(e.target.value)}
              placeholder="Ej. Juan Pérez o 1234567890"
              disabled={buscando || Boolean(enviandoUid)}
              autoFocus
            />
          </label>
          <button
            type="submit"
            className="personalizados-page__btn-add personalizados-buscar__submit"
            disabled={buscando || Boolean(enviandoUid)}
          >
            {buscando ? 'Buscando…' : 'Buscar'}
          </button>
        </form>

        {aviso && (
          <p className="personalizados-buscar__aviso" role="status">
            {aviso}
          </p>
        )}
        {errorBusqueda && (
          <p className="personalizados-buscar__error" role="alert">
            {errorBusqueda}
          </p>
        )}

        {resultados.length > 0 && (
          <ul className="personalizados-buscar__lista">
            {resultados.map((item) => (
              <li key={item.uid} className="personalizados-buscar__item">
                <div>
                  <p className="personalizados-buscar__nombre">
                    {item.nombre || 'Usuario'}
                  </p>
                  <p className="personalizados-buscar__meta">
                    {item.tipoDocumento || 'CC'} {item.documento || '—'}
                  </p>
                </div>
                <button
                  type="button"
                  className="personalizados-page__btn-add personalizados-buscar__enviar"
                  onClick={() => handleSolicitar(item)}
                  disabled={Boolean(enviandoUid)}
                >
                  {enviandoUid === item.uid ? 'Enviando…' : 'Solicitar'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <LoadingOverlay
        visible={Boolean(enviandoUid)}
        label="Enviando solicitud"
      />
    </main>
  )
}

export default Personalizados
