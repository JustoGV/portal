import { comun } from "@/i18n/es/comun"

/** Solo CSS: en una carga completa React no hidrata este fallback (docs/reglas/05 §13). */
export default function Cargando() {
  return (
    <div className="ui-cargando" role="status">
      <span className="ui-cargando__barra" aria-hidden="true" />
      <span>{comun.abriendo}</span>
    </div>
  )
}
