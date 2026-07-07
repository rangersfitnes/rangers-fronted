import { useCallback, useEffect, useState } from 'react'
import addIcon from '../assets/images/icons/add.svg'
import ActivarPlanModal from '../components/ActivarPlanModal.jsx'
import AnadirCronogramaModal from '../components/AnadirCronogramaModal.jsx'
import ConfirmModal from '../components/ConfirmModal.jsx'
import LoadingOverlay from '../components/LoadingOverlay.jsx'
import UserIcon from '../components/icons/UserIcon.jsx'
import { useToast } from '../components/Toast.jsx'
import { DIAS_SEMANA } from '../constants/diasSemana.js'
import { formatearFechaCuenta } from './cuenta/cuentaUtils.js'
import {
  eliminarEntrenamientoUsuarioAdmin,
  guardarEntrenamientoUsuarioAdmin,
  obtenerEntrenamientosUsuario,
} from '../services/entrenamientosAdminService.js'
import {
  activarPlanUsuario,
  eliminarPlanUsuario,
  obtenerUsuarios,
} from '../services/usuariosService.js'
import trashIcon from '../assets/images/icons/trash.svg'

const tienePlanActivo = (u) =>
  u?.planEstado === 'activo' && !u?.puedeRenovarPlan
const puedeActivarPlan = (u) =>
  u?.planEstado !== 'activo' || Boolean(u?.puedeRenovarPlan)
const planEstaVencido = (u) => u?.planEstado === 'vencido'

const ABREV_DIA = {
  lunes: 'Lun',
  martes: 'Mar',
  miercoles: 'Mié',
  jueves: 'Jue',
  viernes: 'Vie',
  sabado: 'Sáb',
  domingo: 'Dom',
}

function UsuarioDetalleGestion({ usuario: usuarioProp, onVolver, onEditar, onEliminar }) {
  const toast = useToast()
  const [usuario, setUsuario] = useState(usuarioProp)
  const [entrenamientos, setEntrenamientos] = useState([])
  const [cargandoEntrenamientos, setCargandoEntrenamientos] = useState(false)
  const [error, setError] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [entrenamientoEditar, setEntrenamientoEditar] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [errorModal, setErrorModal] = useState('')
  const [eliminarDia, setEliminarDia] = useState(null)
  const [eliminando, setEliminando] = useState(false)
  const [activarPlanOpen, setActivarPlanOpen] = useState(false)
  const [eliminarPlanOpen, setEliminarPlanOpen] = useState(false)
  const [planSubmitting, setPlanSubmitting] = useState(false)
  const [planActionLoading, setPlanActionLoading] = useState(false)
  const [errorPlan, setErrorPlan] = useState('')

  useEffect(() => {
    setUsuario(usuarioProp)
  }, [usuarioProp])

  const diasReservados = entrenamientos.map((e) => e.dia)
  const diasReservadosSet = new Set(diasReservados)
  const puedeAnadir = diasReservados.length < 7

  const cargarEntrenamientos = useCallback(async (uid, signal) => {
    setCargandoEntrenamientos(true)
    try {
      const lista = await obtenerEntrenamientosUsuario(uid, { signal })
      setEntrenamientos(lista)
    } catch (err) {
      if (err?.name === 'AbortError') return
      setEntrenamientos([])
      setError(err.message || 'No se pudieron cargar los entrenamientos')
    } finally {
      if (!signal?.aborted) setCargandoEntrenamientos(false)
    }
  }, [])

  useEffect(() => {
    if (!usuario?.uid) return
    const controller = new AbortController()
    setError('')
    cargarEntrenamientos(usuario.uid, controller.signal)
    return () => controller.abort()
  }, [usuario?.uid, cargarEntrenamientos])

  const recargarUsuario = useCallback(async () => {
    if (!usuario?.documento) return
    try {
      const res = await obtenerUsuarios({ documento: usuario.documento })
      if (res.usuarios?.[0]) setUsuario(res.usuarios[0])
    } catch (err) {
      setError(err.message || 'No se pudo actualizar los datos del usuario')
    }
  }, [usuario?.documento])

  const handleCloseActivarPlan = () => {
    if (planSubmitting) return
    setErrorPlan('')
    setActivarPlanOpen(false)
  }

  const handleActivarPlan = async ({
    planId,
    acompanantes = [],
    metodoPago,
  }) => {
    if (!usuario) return
    setErrorPlan('')
    setPlanSubmitting(true)

    try {
      const res = await activarPlanUsuario(
        usuario.uid,
        planId,
        acompanantes,
        metodoPago,
      )
      const totalAtletas = 1 + (res?.acompanantes?.length ?? 0)
      toast.success(
        totalAtletas > 1
          ? `Plan activado para ${totalAtletas} atletas (titular: ${usuario.nombre})`
          : `Plan activado para "${usuario.nombre}"`,
      )
      setActivarPlanOpen(false)
      await recargarUsuario()
    } catch (err) {
      setErrorPlan(err.message || 'No se pudo activar el plan')
    } finally {
      setPlanSubmitting(false)
    }
  }

  const handleConfirmEliminarPlan = async () => {
    if (!usuario) return
    setPlanActionLoading(true)

    try {
      const res = await eliminarPlanUsuario(usuario.uid)
      const total = res?.eliminados ?? 1
      const esGrupo =
        total > 1 ||
        Boolean(usuario.planGrupo?.miembros?.length) ||
        usuario.rolEnPlan === 'beneficiario' ||
        usuario.rolEnPlan === 'titular'

      toast.success(
        esGrupo
          ? `Plan eliminado del grupo completo (${total} usuario(s)).`
          : `Plan eliminado para "${usuario.nombre}"`,
      )
      setEliminarPlanOpen(false)
      await recargarUsuario()
    } catch (err) {
      setError(err.message || 'No se pudo eliminar el plan del usuario')
    } finally {
      setPlanActionLoading(false)
    }
  }

  const cerrarModal = () => {
    setModalAbierto(false)
    setEntrenamientoEditar(null)
    setErrorModal('')
  }

  const abrirModalNuevo = () => {
    setEntrenamientoEditar(null)
    setErrorModal('')
    setModalAbierto(true)
  }

  const abrirEdicion = (item) => {
    setEntrenamientoEditar({
      dia: item.dia,
      titulo: item.titulo,
      actividad: item.actividad,
    })
    setErrorModal('')
    setModalAbierto(true)
  }

  const handleGuardar = async (datos) => {
    if (!usuario?.uid) return
    setGuardando(true)
    setErrorModal('')
    try {
      const guardado = await guardarEntrenamientoUsuarioAdmin(usuario.uid, datos)
      const diaAnterior = datos.diaAnterior
      setEntrenamientos((prev) => {
        const sinReemplazados = prev.filter(
          (e) => e.dia !== guardado.dia && e.dia !== diaAnterior,
        )
        const orden = {
          lunes: 0,
          martes: 1,
          miercoles: 2,
          jueves: 3,
          viernes: 4,
          sabado: 5,
          domingo: 6,
        }
        return [...sinReemplazados, guardado].sort(
          (a, b) => (orden[a.dia] ?? 99) - (orden[b.dia] ?? 99),
        )
      })
      cerrarModal()
    } catch (err) {
      setErrorModal(err.message || 'No se pudo guardar')
    } finally {
      setGuardando(false)
    }
  }

  const handleConfirmEliminar = async () => {
    if (!usuario?.uid || !eliminarDia) return
    setEliminando(true)
    try {
      await eliminarEntrenamientoUsuarioAdmin(usuario.uid, eliminarDia)
      setEntrenamientos((prev) => prev.filter((e) => e.dia !== eliminarDia))
      setEliminarDia(null)
    } catch (err) {
      setError(err.message || 'No se pudo eliminar')
    } finally {
      setEliminando(false)
    }
  }

  const planActivo = tienePlanActivo(usuario)
    ? usuario.planNombre || usuario.plan
    : planEstaVencido(usuario)
      ? 'Plan vencido'
      : null
  const loadingVisible =
    cargandoEntrenamientos ||
    guardando ||
    eliminando ||
    planSubmitting ||
    planActionLoading

  if (!usuario) return null

  return (
    <section className="pf-page__view">
      <header className="pf-page__view-header pf-usuario-detalle__header">
        <button
          type="button"
          className="pf-action-btn pf-action-btn--ghost pf-usuario-detalle__volver"
          onClick={onVolver}
          disabled={loadingVisible}
        >
          ← Volver a la lista
        </button>
        <div>
          <h1 className="pf-page__title">{usuario.nombre || 'Usuario'}</h1>
          <p className="pf-page__subtitle">
            Plan, datos del miembro y cronograma de entrenamiento
          </p>
        </div>
      </header>

      {error && (
        <p className="pf-entrenamientos__error" role="alert">
          {error}
        </p>
      )}

      <section className="pf-entrenamientos__perfil" aria-label="Datos del usuario">
        <div className="pf-entrenamientos__perfil-head">
          <div className="pf-entrenamientos__perfil-identidad">
            <div className="pf-entrenamientos__avatar">
              {usuario.profileImage ? (
                <img src={usuario.profileImage} alt="" />
              ) : (
                <UserIcon className="pf-entrenamientos__avatar-icon" />
              )}
            </div>
            <div>
              <h2 className="pf-entrenamientos__nombre">{usuario.nombre || '—'}</h2>
              <p className="pf-entrenamientos__doc">
                {usuario.tipoDocumento} {usuario.documento}
              </p>
            </div>
          </div>
          <div className="pf-entrenamientos__perfil-actions">
            <button
              type="button"
              className="pf-action-btn pf-action-btn--ghost"
              onClick={() => onEditar?.(usuario)}
              disabled={loadingVisible}
            >
              Editar usuario
            </button>
            <button
              type="button"
              className="pf-action-btn pf-action-btn--ghost pf-action-btn--danger"
              onClick={() => onEliminar?.(usuario)}
              disabled={loadingVisible}
            >
              Eliminar usuario
            </button>
            {puedeActivarPlan(usuario) ? (
              <button
                type="button"
                className="pf-action-btn"
                onClick={() => {
                  setErrorPlan('')
                  setActivarPlanOpen(true)
                }}
                disabled={loadingVisible}
              >
                {usuario.puedeRenovarPlan ? 'Renovar tiquetera' : 'Activar plan'}
              </button>
            ) : null}
            {usuario.planEstado === 'activo' ? (
              <button
                type="button"
                className="pf-action-btn pf-action-btn--ghost"
                onClick={() => setEliminarPlanOpen(true)}
                disabled={loadingVisible}
              >
                Eliminar plan
              </button>
            ) : null}
          </div>
        </div>

        <dl className="pf-entrenamientos__datos">
          <div>
            <dt>ID interno</dt>
            <dd>{usuario.id ?? '—'}</dd>
          </div>
          <div>
            <dt>Celular</dt>
            <dd>{usuario.celular || '—'}</dd>
          </div>
          <div>
            <dt>Plan activo</dt>
            <dd>{planActivo || 'Sin plan'}</dd>
          </div>
          <div>
            <dt>Inicio plan</dt>
            <dd>{formatearFechaCuenta(usuario.fechaInicio)}</dd>
          </div>
          <div>
            <dt>Vigencia</dt>
            <dd>{formatearFechaCuenta(usuario.vigencia)}</dd>
          </div>
          <div>
            <dt>Miembro desde</dt>
            <dd>{formatearFechaCuenta(usuario.fechaCreacion)}</dd>
          </div>
          <div>
            <dt>Rol en plan</dt>
            <dd>
              {usuario.rolEnPlan
                ? usuario.rolEnPlan === 'titular'
                  ? 'Titular'
                  : 'Beneficiario'
                : '—'}
            </dd>
          </div>
        </dl>

        {usuario.planGrupo?.miembros?.length > 0 && (
          <div className="pf-entrenamientos__grupo">
            <h3 className="pf-entrenamientos__grupo-title">Grupo del plan</h3>
            <ul>
              {usuario.planGrupo.miembros.map((m) => (
                <li key={m.uid || m.documento}>
                  {m.nombre || '—'} · {m.documento || '—'}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="pf-entrenamientos__planes">
        <header className="pf-entrenamientos__planes-header">
          <div>
            <h2 className="pf-entrenamientos__planes-title">Planes de entrenamiento</h2>
            <p className="pf-entrenamientos__planes-meta">
              {entrenamientos.length} / 7 días programados
            </p>
          </div>
          {puedeAnadir && (
            <button
              type="button"
              className="pf-action-btn pf-entrenamientos__add-btn"
              onClick={abrirModalNuevo}
              disabled={loadingVisible}
            >
              <img src={addIcon} alt="" className="pf-entrenamientos__add-icon" />
              Añadir día
            </button>
          )}
        </header>

        <div className="pf-entrenamientos__week" aria-hidden="true">
          {DIAS_SEMANA.map((d) => (
            <span
              key={d.value}
              className={`pf-entrenamientos__pill${
                diasReservadosSet.has(d.value)
                  ? ' pf-entrenamientos__pill--active'
                  : ''
              }`}
            >
              {ABREV_DIA[d.value]}
            </span>
          ))}
        </div>

        {!cargandoEntrenamientos && entrenamientos.length === 0 && (
          <p className="pf-panel__empty">
            Este atleta aún no tiene días de entrenamiento. Usa «Añadir día» para
            crear su cronograma.
          </p>
        )}

        {entrenamientos.length > 0 && (
          <ul className="pf-entrenamientos__lista">
            {entrenamientos.map((item) => (
              <li key={item.dia} className="pf-entrenamientos__card-wrap">
                <button
                  type="button"
                  className="pf-entrenamientos__card"
                  onClick={() => abrirEdicion(item)}
                >
                  <span className="pf-entrenamientos__card-dia">
                    {item.diaLabel || item.dia}
                  </span>
                  <span className="pf-entrenamientos__card-titulo">
                    {item.titulo}
                  </span>
                  <p className="pf-entrenamientos__card-actividad">
                    {item.actividad}
                  </p>
                </button>
                <button
                  type="button"
                  className="pf-entrenamientos__card-delete"
                  aria-label={`Eliminar entrenamiento del ${item.diaLabel}`}
                  onClick={() => setEliminarDia(item.dia)}
                  disabled={loadingVisible}
                >
                  <img src={trashIcon} alt="" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {!puedeAnadir && entrenamientos.length === 7 && (
          <p className="pf-entrenamientos__completo">
            Semana completa — todos los días tienen entrenamiento
          </p>
        )}
      </section>

      <AnadirCronogramaModal
        open={modalAbierto}
        onClose={cerrarModal}
        onSubmit={handleGuardar}
        submitting={guardando}
        error={errorModal}
        diasReservados={diasReservados}
        entrenamientoEditar={entrenamientoEditar}
      />

      <ActivarPlanModal
        open={activarPlanOpen}
        onClose={handleCloseActivarPlan}
        onSubmit={handleActivarPlan}
        submitting={planSubmitting}
        error={errorPlan}
        usuario={usuario}
      />

      <ConfirmModal
        open={Boolean(eliminarDia)}
        onClose={() => setEliminarDia(null)}
        onConfirm={handleConfirmEliminar}
        title="Eliminar día de entrenamiento"
        message="¿Quitar este día del cronograma del atleta?"
        confirmLabel="Eliminar"
        variant="danger"
        loading={eliminando}
      />

      <ConfirmModal
        open={eliminarPlanOpen}
        onClose={() => setEliminarPlanOpen(false)}
        onConfirm={handleConfirmEliminarPlan}
        title="Eliminar plan"
        message={
          usuario
            ? usuario.planGrupo?.miembros?.length > 0 ||
              usuario.rolEnPlan === 'beneficiario' ||
              usuario.rolEnPlan === 'titular'
              ? `¿Eliminar el plan de "${usuario.nombre}"? Se quitará el plan a todo el grupo (titular y todos los beneficiarios) vinculado a este plan.`
              : `¿Seguro que quieres eliminar el plan asignado a "${usuario.nombre}"? Se borrarán plan, fecha de inicio y vigencia.`
            : ''
        }
        confirmLabel="Eliminar plan"
        variant="danger"
        loading={planActionLoading}
      />

      <LoadingOverlay
        visible={loadingVisible}
        label={
          planSubmitting
            ? 'Activando plan'
            : planActionLoading
              ? 'Eliminando plan'
              : guardando
                ? 'Guardando entrenamiento'
                : eliminando
                  ? 'Eliminando'
                  : 'Cargando entrenamientos'
        }
      />
    </section>
  )
}

export default UsuarioDetalleGestion
