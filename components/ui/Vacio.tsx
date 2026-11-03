import type { ReactNode } from "react"
import { Icono } from "@/components/iconos/Icono"
import type { NombreIcono } from "@/components/iconos/trazos"

/** Vacío centrado, sin recuadro punteado (docs/reglas/03 §5). */
export function Vacio({ icono, titulo, texto, accion }: { icono: NombreIcono; titulo: string; texto?: string; accion?: ReactNode }) {
  return (
    <div className="ui-vacio">
      <Icono nombre={icono} tamano={48} className="ui-vacio__icono" />
      <p className="ui-vacio__titulo">{titulo}</p>
      {texto && <p>{texto}</p>}
      {accion && <div className="ui-vacio__accion">{accion}</div>}
    </div>
  )
}
