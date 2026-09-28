import { useCallback, useEffect, useMemo, useState } from 'react'
import LoadingOverlay from '../components/LoadingOverlay.jsx'
import { useToast } from '../components/Toast.jsx'
import { obtenerInformeUsuarios } from '../services/usuariosService.js'
import {
  formatearFechaCuenta,
  formatearFechaHoraCuenta,
  formatearPrecioCuenta,
} from './cuenta/cuentaUtils.js'
import './PuntoFisico.css'
import './VistaUsuariosInformes.css'

const CARDS = [
  {
    id: 'total',
    etiqueta: 'Usuarios registrados',
    tono: '',
    getValor: (r) => String(r.total),
  },
  {
    id: 'activos',
    etiqueta: 'Con plan activo',
    tono: 'activo',
    getValor: (r) => String(r.activos),
    getDetalle: () => 'Titulares + beneficiarios',
  },
  {
    id: 'vencidos',
    etiqueta: 'Vencidos',
    tono: 'vencido',
    getValor: (r) => String(r.vencidos),
  },
  {
    id: 'sinPlan',
    etiqueta: 'Sin plan',
    tono: 'sin-plan',
    getValor: (r) => String(r.sinPlan),
  },
  {
    id: 'renovaron',
    etiqueta: 'Renovaron (2+ pagos)',
    tono: 'renovacion',
    getValor: (r) => String(r.renovaron),
    getDetalle: (r) =>
      `${r.renovaronActivos} activos · ${r.renovaronVencidos} vencidos`,
  },
  {
    id: 'primeraMembresiaActiva',
    etiqueta: 'Primera membresía activa',
    tono: 'una-vez',
    getValor: (r) => String(r.primeraMembresiaActiva ?? 0),
    getDetalle: () => '1 pago · plan vigente',
  },
  {
    id: 'pagaronUnaVez',
    etiqueta: 'Pagaron 1 vez y no volvieron',
    tono: 'vencido',
    getValor: (r) => String(r.pagaronUnaVez),
    getDetalle: () => '1 pago · plan vencido',
  },
  {
    id: 'sinActivaciones',
    etiqueta: 'Sin activaciones',
    tono: '',
    getValor: (r) => String(r.sinActivaciones),
    getDetalle: () => 'Sin plan y sin pagos',
  },
  {
    id: 'porcentajeRenovacion',
    etiqueta: '% renovación',
    tono: 'renovacion',
    getValor: (r) => `${r.porcentajeRenovacion}%`,
    getDetalle: (r) => {
      const base = r.baseRenovacion ?? r.renovaron + r.pagaronUnaVez
      return `${r.renovaron} renovaron de ${base} elegibles`
    },
    sinLista: true,
  },
]

const TITULOS_LISTA = {
  total: 'Todos los usuarios registrados',
  activos: 'Usuarios con plan activo',
  vencidos: 'Usuarios con plan vencido',
  sinPlan: 'Usuarios sin plan',
  renovaron: 'Titulares que renovaron (2 o más pagos)',
  primeraMembresiaActiva: 'Primera membresía aún vigente (1 pago)',
  pagaronUnaVez: 'Pagaron 1 vez, vencieron y no volvieron',
  sinActivaciones: 'Sin plan y sin pagos como titular',
  porcentajeRenovacion: 'Cómo se calcula el % de renovación',
}

function etiquetaEstado(estado) {
  if (estado === 'activo') return 'Activo'
  if (estado === 'vencido') return 'Vencido'
  return 'Sin plan'
}

function ResumenCard({
  etiqueta,
  valor,
  detalle = '',
  tono = '',
  explicacion = '',
  activa = false,
  accion = 'Ver lista →',
  onClick,
}) {
  return (
    <button
      type="button"
      className={`pf-usuarios-informe__card${
        tono ? ` pf-usuarios-informe__card--${tono}` : ''
      }${activa ? ' pf-usuarios-informe__card--activa' : ''}`}
      onClick={onClick}
      aria-pressed={activa}
      title={accion}
    >
      <span className="pf-usuarios-informe__card-label">{etiqueta}</span>
      <strong className="pf-usuarios-informe__card-valor">{valor}</strong>
      {detalle ? (
        <span className="pf-usuarios-informe__card-detalle">{detalle}</span>
      ) : null}
      {explicacion ? (
        <span className="pf-usuarios-informe__card-explica">{explicacion}</span>
      ) : null}
      <span className="pf-usuarios-informe__card-accion">{accion}</span>
    </button>
  )
}

function TablaUsuariosLista({ usuarios, mostrarVencimiento = false }) {
  if (!usuarios.length) {
    return (
      <p className="pf-usuarios-informe__vacio">
        No hay usuarios en esta categoría.
      </p>
    )
  }

  return (
    <div className="pf-usuarios-informe__tabla-wrap">
      <table className="pf-usuarios-informe__tabla">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Documento</th>
            <th>Celular</th>
            <th>Estado</th>
            <th>Plan</th>
            <th>Activaciones</th>
            <th>{mostrarVencimiento ? 'Venció' : 'Último pago'}</th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((usuario) => (
            <tr key={usuario.uid}>
              <td>
                {usuario.nombre || '—'}
                {usuario.esBeneficiario ? (
                  <span className="pf-usuarios-informe__badge">Beneficiario</span>
                ) : null}
              </td>
              <td>{usuario.documento || '—'}</td>
              <td>{usuario.celular || '—'}</td>
              <td>{etiquetaEstado(usuario.planEstado)}</td>
              <td>{usuario.planNombre || '—'}</td>
              <td>{usuario.activacionesPlanCount ?? '—'}</td>
              <td>
                {mostrarVencimiento
                  ? usuario.vencidoEn
                    ? formatearFechaCuenta(usuario.vencidoEn)
                    : usuario.vigencia
                      ? formatearFechaCuenta(usuario.vigencia)
                      : '—'
                  : usuario.ultimaActivacionEn
                    ? formatearFechaCuenta(usuario.ultimaActivacionEn)
                    : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function VistaUsuariosInformes({ onVolver }) {
  const toast = useToast()
  const [informe, setInforme] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [listaActiva, setListaActiva] = useState(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await obtenerInformeUsuarios()
      setInforme(data)
    } catch (err) {
      const mensaje = err.message || 'No se pudo cargar el informe'
      setError(mensaje)
      toast.error(mensaje)
      setInforme(null)
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    cargar()
  }, [cargar])

  const resumen = informe?.resumen
  const planPopular = informe?.planMasPopular
  const explicaciones = informe?.explicaciones || {}

  const usuariosLista = useMemo(() => {
    if (!listaActiva || !informe?.listas) return []
    return informe.listas[listaActiva] || []
  }, [informe, listaActiva])

  const toggleLista = (id) => {
    setListaActiva((prev) => (prev === id ? null : id))
  }

  return (
    <section className="pf-page__view pf-usuarios-informe">
      <header className="pf-page__view-header pf-page__view-header--with-action">
        <div>
          <button
            type="button"
            className="pf-action-btn pf-action-btn--ghost pf-usuarios-informe__volver"
            onClick={onVolver}
          >
            ← Volver a usuarios
          </button>
          <h1 className="pf-page__title">Informes de usuarios</h1>
          <p className="pf-page__subtitle">
            Toca una tarjeta para ver la lista de usuarios y la explicación del
            cálculo
          </p>
        </div>
        <div className="pf-page__view-actions">
          <button
            type="button"
            className="pf-action-btn pf-action-btn--ghost"
            onClick={cargar}
            disabled={loading}
          >
            Actualizar
          </button>
        </div>
      </header>

      {error ? (
        <p className="pf-entrenamientos__error" role="alert">
          {error}
        </p>
      ) : null}

      {informe?.generadoEn ? (
        <p className="pf-usuarios-informe__meta">
          Generado {formatearFechaHoraCuenta(informe.generadoEn)}
        </p>
      ) : null}

      {resumen ? (
        <div className="pf-usuarios-informe__resumen">
          {CARDS.map((card) => (
            <ResumenCard
              key={card.id}
              etiqueta={card.etiqueta}
              valor={card.getValor(resumen)}
              detalle={card.getDetalle?.(resumen) || ''}
              tono={card.tono}
              explicacion={explicaciones[card.id] || ''}
              activa={listaActiva === card.id}
              accion={card.sinLista ? 'Ver fórmula →' : 'Ver lista →'}
              onClick={() => toggleLista(card.id)}
            />
          ))}
        </div>
      ) : null}

      {listaActiva === 'porcentajeRenovacion' && resumen ? (
        <section
          className="pf-usuarios-informe__panel pf-usuarios-informe__panel--lista"
          aria-live="polite"
        >
          <div className="pf-usuarios-informe__lista-head">
            <div>
              <h2 className="pf-usuarios-informe__panel-title">
                {TITULOS_LISTA.porcentajeRenovacion}
              </h2>
              <p className="pf-usuarios-informe__panel-hint">
                {explicaciones.porcentajeRenovacion}
              </p>
            </div>
            <button
              type="button"
              className="pf-action-btn pf-action-btn--ghost"
              onClick={() => setListaActiva(null)}
            >
              Cerrar
            </button>
          </div>
          <div className="pf-usuarios-informe__formula">
            <p>
              <strong>{resumen.porcentajeRenovacion}%</strong>
              {' = '}
              {resumen.renovaron} renovaron
              {' ÷ '}
              {(resumen.baseRenovacion ??
                resumen.renovaron + resumen.pagaronUnaVez) || 0}{' '}
              elegibles
            </p>
            <ul>
              <li>
                <button
                  type="button"
                  className="pf-action-btn pf-action-btn--ghost"
                  onClick={() => setListaActiva('renovaron')}
                >
                  {resumen.renovaron} renovaron (2+ pagos)
                </button>
                <span>
                  — cuentan a favor. Pueden estar activos hoy; eso es correcto.
                </span>
              </li>
              <li>
                <button
                  type="button"
                  className="pf-action-btn pf-action-btn--ghost"
                  onClick={() => setListaActiva('pagaronUnaVez')}
                >
                  {resumen.pagaronUnaVez} pagaron 1 vez y no volvieron
                </button>
                <span> — plan vencido, no renovaron.</span>
              </li>
              <li>
                <button
                  type="button"
                  className="pf-action-btn pf-action-btn--ghost"
                  onClick={() => setListaActiva('primeraMembresiaActiva')}
                >
                  {resumen.primeraMembresiaActiva ?? 0} primera membresía activa
                </button>
                <span> — no entran en este %; aún no cerraron el ciclo.</span>
              </li>
            </ul>
          </div>
        </section>
      ) : null}

      {listaActiva && listaActiva !== 'porcentajeRenovacion' ? (
        <section
          className="pf-usuarios-informe__panel pf-usuarios-informe__panel--lista"
          aria-live="polite"
        >
          <div className="pf-usuarios-informe__lista-head">
            <div>
              <h2 className="pf-usuarios-informe__panel-title">
                {TITULOS_LISTA[listaActiva] || 'Lista de usuarios'}
              </h2>
              <p className="pf-usuarios-informe__panel-hint">
                {explicaciones[listaActiva] ||
                  'Usuarios que corresponden a esta métrica.'}
              </p>
              <p className="pf-usuarios-informe__lista-count">
                {usuariosLista.length} usuario
                {usuariosLista.length === 1 ? '' : 's'}
              </p>
            </div>
            <button
              type="button"
              className="pf-action-btn pf-action-btn--ghost"
              onClick={() => setListaActiva(null)}
            >
              Cerrar lista
            </button>
          </div>
          <TablaUsuariosLista
            usuarios={usuariosLista}
            mostrarVencimiento={
              listaActiva === 'vencidos' || listaActiva === 'pagaronUnaVez'
            }
          />
        </section>
      ) : null}

      {planPopular ? (
        <section className="pf-usuarios-informe__destacado">
          <p className="pf-usuarios-informe__destacado-label">
            Plan más popular
          </p>
          <h2 className="pf-usuarios-informe__destacado-titulo">
            {planPopular.planNombre || 'Sin nombre'}
          </h2>
          <p className="pf-usuarios-informe__destacado-detalle">
            Se elige el plan con más activaciones confirmadas en el historial de
            pagos de titulares
            {planPopular.activaciones != null
              ? ` (${planPopular.activaciones} activación${planPopular.activaciones === 1 ? '' : 'es'})`
              : ''}
            {planPopular.ingresos > 0
              ? ` · ${formatearPrecioCuenta(planPopular.ingresos)} sumando montoPagado/montoEsperado`
              : ''}
            . Si no hay pagos, se usa el plan con más miembros activos ahora.
          </p>
        </section>
      ) : null}

      <div className="pf-usuarios-informe__grid">
        <section className="pf-usuarios-informe__panel">
          <h2 className="pf-usuarios-informe__panel-title">
            Planes que más pagan los usuarios
          </h2>
          <p className="pf-usuarios-informe__panel-hint">
            Cuenta cada pago confirmado tipo activación-plan del titular (no
            beneficiarios). Ingresos = suma de montoPagado o, si falta,
            montoEsperado.
          </p>
          {!loading && (informe?.planesMasPagados?.length ?? 0) === 0 ? (
            <p className="pf-usuarios-informe__vacio">
              Aún no hay pagos de planes registrados.
            </p>
          ) : (
            <div className="pf-usuarios-informe__tabla-wrap">
              <table className="pf-usuarios-informe__tabla">
                <thead>
                  <tr>
                    <th>Plan</th>
                    <th>Activaciones</th>
                    <th>Ingresos</th>
                  </tr>
                </thead>
                <tbody>
                  {(informe?.planesMasPagados ?? []).map((plan) => (
                    <tr key={plan.planId || plan.planNombre}>
                      <td>{plan.planNombre}</td>
                      <td>{plan.activaciones}</td>
                      <td>{formatearPrecioCuenta(plan.ingresos)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="pf-usuarios-informe__panel">
          <h2 className="pf-usuarios-informe__panel-title">
            Planes con más miembros activos
          </h2>
          <p className="pf-usuarios-informe__panel-hint">
            Titulares con membresía vigente ahora (beneficiarios no suman como
            “pago” del plan).
          </p>
          {!loading && (informe?.planesMasActivos?.length ?? 0) === 0 ? (
            <p className="pf-usuarios-informe__vacio">
              No hay planes activos en este momento.
            </p>
          ) : (
            <div className="pf-usuarios-informe__tabla-wrap">
              <table className="pf-usuarios-informe__tabla">
                <thead>
                  <tr>
                    <th>Plan</th>
                    <th>Activos</th>
                  </tr>
                </thead>
                <tbody>
                  {(informe?.planesMasActivos ?? []).map((plan) => (
                    <tr key={plan.planId}>
                      <td>{plan.planNombre}</td>
                      <td>{plan.usuariosActivos}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <section className="pf-usuarios-informe__panel">
        <h2 className="pf-usuarios-informe__panel-title">
          Quienes más han renovado
        </h2>
        <p className="pf-usuarios-informe__panel-hint">
          Top titulares con activacionesPlanCount ≥ 2, ordenados por cantidad de
          activaciones y último pago.
        </p>
        {!loading && (informe?.topRenovadores?.length ?? 0) === 0 ? (
          <p className="pf-usuarios-informe__vacio">
            Todavía no hay usuarios con renovaciones registradas.
          </p>
        ) : (
          <div className="pf-usuarios-informe__tabla-wrap">
            <table className="pf-usuarios-informe__tabla">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Documento</th>
                  <th>Estado</th>
                  <th>Plan</th>
                  <th>Activaciones</th>
                  <th>Último pago</th>
                </tr>
              </thead>
              <tbody>
                {(informe?.topRenovadores ?? []).map((usuario) => (
                  <tr key={usuario.uid}>
                    <td>{usuario.nombre || '—'}</td>
                    <td>{usuario.documento || '—'}</td>
                    <td>{etiquetaEstado(usuario.planEstado)}</td>
                    <td>{usuario.planNombre || '—'}</td>
                    <td>{usuario.activacionesPlanCount}</td>
                    <td>
                      {usuario.ultimaActivacionEn
                        ? formatearFechaCuenta(usuario.ultimaActivacionEn)
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="pf-usuarios-informe__panel">
        <h2 className="pf-usuarios-informe__panel-title">
          Vencidos más recientes
        </h2>
        <p className="pf-usuarios-informe__panel-hint">
          Usuarios en estado vencido ordenados por fecha de desactivación
          (vencidoEn) o vigencia del último plan.
        </p>
        {!loading && (informe?.vencidosRecientes?.length ?? 0) === 0 ? (
          <p className="pf-usuarios-informe__vacio">
            No hay usuarios con plan vencido.
          </p>
        ) : (
          <div className="pf-usuarios-informe__tabla-wrap">
            <table className="pf-usuarios-informe__tabla">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Documento</th>
                  <th>Último plan</th>
                  <th>Activaciones</th>
                  <th>Venció</th>
                </tr>
              </thead>
              <tbody>
                {(informe?.vencidosRecientes ?? []).map((usuario) => (
                  <tr key={usuario.uid}>
                    <td>{usuario.nombre || '—'}</td>
                    <td>{usuario.documento || '—'}</td>
                    <td>{usuario.planNombre || '—'}</td>
                    <td>{usuario.activacionesPlanCount || '—'}</td>
                    <td>
                      {usuario.vencidoEn
                        ? formatearFechaCuenta(usuario.vencidoEn)
                        : usuario.vigencia
                          ? formatearFechaCuenta(usuario.vigencia)
                          : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <LoadingOverlay visible={loading} label="Generando informe" />
    </section>
  )
}

export default VistaUsuariosInformes
