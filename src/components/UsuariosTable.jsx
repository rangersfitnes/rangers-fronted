import UserIcon from './icons/UserIcon.jsx'
import { formatearPrecioCuenta } from '../pages/cuenta/cuentaUtils.js'
import './UsuariosTable.css'

const TIPO_LABEL = {
  CC: 'CC',
  TI: 'TI',
  CE: 'CE',
  PA: 'PA',
}

function formatearFecha(ms) {
  if (!ms) return '—'
  return new Date(ms).toLocaleDateString('es-CO', {
    timeZone: 'America/Bogota',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatearPagoUsuario(usuario) {
  const monto = usuario.valorPagadoActivacion
  if (monto == null || !Number.isFinite(Number(monto))) return '—'
  return formatearPrecioCuenta(monto)
}

function tituloPagoUsuario(usuario) {
  const partes = []
  if (usuario.metodoPagoActivacion) {
    partes.push(`Método: ${usuario.metodoPagoActivacion}`)
  }
  if (usuario.origenPago) {
    partes.push(`Origen: ${usuario.origenPago}`)
  }
  if (usuario.rolEnPlan === 'beneficiario') {
    partes.push('Pago registrado en el titular del plan')
  }
  return partes.length ? partes.join(' · ') : undefined
}

function UsuarioAvatar({ profileImage, nombre, small = false }) {
  const clase = small
    ? 'usuarios-table__avatar usuarios-table__avatar--sm'
    : 'usuarios-table__avatar'

  return (
    <span
      className={clase}
      title={nombre || undefined}
      aria-hidden={profileImage ? undefined : true}
    >
      {profileImage ? (
        <img src={profileImage} alt="" className="usuarios-table__avatar-img" />
      ) : (
        <UserIcon className="usuarios-table__avatar-icon" />
      )}
    </span>
  )
}

function PlanGrupoCelda({ planGrupo, rolEnPlan }) {
  if (!planGrupo?.miembros?.length) {
    return <span className="usuarios-table__grupo-empty">—</span>
  }

  const etiquetaMiembro =
    planGrupo.tipo === 'titular' ? 'Titular' : 'Beneficiario'

  return (
    <div className="usuarios-table__grupo">
      {rolEnPlan && (
        <span className={`usuarios-table__grupo-rol usuarios-table__grupo-rol--${rolEnPlan}`}>
          {rolEnPlan === 'titular' ? 'Titular' : 'Beneficiario'}
        </span>
      )}
      <ul className="usuarios-table__grupo-list">
        {planGrupo.miembros.map((m) => (
          <li key={m.uid || m.documento} className="usuarios-table__grupo-item">
            <UsuarioAvatar
              profileImage={m.profileImage}
              nombre={m.nombre}
              small
            />
            <span className="usuarios-table__grupo-item-label">
              {etiquetaMiembro}:
            </span>
            <span className="usuarios-table__grupo-item-nombre">
              {m.nombre || 'Sin nombre'}
            </span>
            {m.documento && (
              <span className="usuarios-table__grupo-item-doc">{m.documento}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function UsuariosTable({ usuarios, onRowClick }) {
  const handleClick = (event, usuario) => {
    onRowClick?.(usuario, { x: event.clientX, y: event.clientY })
  }

  return (
    <div className="usuarios-table-wrapper">
      <table className="usuarios-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Nombre</th>
            <th>Tipo</th>
            <th>Documento</th>
            <th>Celular</th>
            <th>Plan</th>
            <th>Método pago</th>
            <th>Valor pagado</th>
            <th>Grupo del plan</th>
            <th>Inicio</th>
            <th>Vigencia</th>
            <th>Vigencia admin.</th>
            <th>Creado</th>
          </tr>
        </thead>
        <tbody>
          {usuarios.map((u) => {
            const planEstado = u.planEstado ?? (u.plan ? 'activo' : 'sin_plan')
            const planLabel =
              planEstado === 'vencido'
                ? 'Plan vencido'
                : planEstado === 'activo'
                  ? u.planNombre || u.plan
                  : 'Inactivo'

            return (
              <tr
                key={u.uid}
                className="usuarios-table__row"
                onClick={(e) => handleClick(e, u)}
              >
                <td className="usuarios-table__id">{u.id ?? '—'}</td>
                <td className="usuarios-table__nombre">
                  <span className="usuarios-table__nombre-wrap">
                    <UsuarioAvatar
                      profileImage={u.profileImage}
                      nombre={u.nombre}
                    />
                    <span>{u.nombre || '—'}</span>
                  </span>
                </td>
                <td>{TIPO_LABEL[u.tipoDocumento] || u.tipoDocumento || '—'}</td>
                <td className="usuarios-table__doc">{u.documento || '—'}</td>
                <td className="usuarios-table__cel">{u.celular || '—'}</td>
                <td>
                  <span
                    className={`usuarios-table__badge usuarios-table__badge--${
                      planEstado === 'activo'
                        ? 'activo'
                        : planEstado === 'vencido'
                          ? 'vencido'
                          : 'inactivo'
                    }`}
                    title={
                      planEstado === 'activo'
                        ? `Plan: ${planLabel}`
                        : planEstado === 'vencido'
                          ? `Plan vencido${u.vigencia ? ` · ${formatearFecha(u.vigencia)}` : ''}`
                          : 'Sin plan activo'
                    }
                  >
                    {planLabel}
                  </span>
                </td>
                <td className="usuarios-table__pago-metodo">
                  {u.metodoPagoActivacion || '—'}
                </td>
                <td className="usuarios-table__pago-monto" title={tituloPagoUsuario(u)}>
                  {formatearPagoUsuario(u)}
                </td>
                <td className="usuarios-table__grupo-cell">
                  <PlanGrupoCelda
                    planGrupo={u.planGrupo}
                    rolEnPlan={u.rolEnPlan}
                  />
                </td>
                <td>
                  <span className="usuarios-table__fecha-cell">
                    {planEstado === 'sin_plan' ? '—' : formatearFecha(u.fechaInicio)}
                  </span>
                </td>
                <td>
                  <span className="usuarios-table__fecha-cell">
                    {planEstado === 'sin_plan' ? '—' : formatearFecha(u.vigencia)}
                  </span>
                </td>
                <td>
                  {planEstado === 'activo' && u.vigenciaModificada ? (
                    <span
                      className="usuarios-table__vigencia-modificada"
                      title={
                        u.ultimaModificacionVigencia?.causal
                          ? `Causal: ${u.ultimaModificacionVigencia.causal}`
                          : 'Vigencia modificada administrativamente'
                      }
                    >
                      Modificada
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td>{formatearFecha(u.fechaCreacion)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default UsuariosTable
