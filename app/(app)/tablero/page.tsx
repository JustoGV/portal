import type { Metadata } from "next"
import { Tablero } from "@/components/tablero/Tablero"
import { listarGruposActivos } from "@/dal/grupos"
import { exigirPagina } from "@/dal/guard"
import "@/styles/proyectos.css"
import "@/styles/tablero.css"

export const metadata: Metadata = { title: "Tablero" }

/**
 * El tablero de trabajo (WU-07, D-038), versión «Franja» elegida por Mateo el 2026-11-18. Todavía con datos de
 * muestra y sin base: pide el permiso base mientras no exista el del tablero, y no está en la barra.
 */
export default async function PaginaTablero() {
  const { usuario } = await exigirPagina("proyectos.ver", "/tablero")
  const clientes = (await listarGruposActivos()).map((g) => g.nombre)
  // Quién escribe en la conversación: la cuenta de la sesión (PROTOTIPO: los comentarios no se guardan).
  const nombre = usuario.nombre.split(" ")[0] || "Vos"
  const yo = { nombre, iniciales: nombre.slice(0, 1).toUpperCase(), tono: "marca" as const }
  return (
    <main className="ui-pagina tb-pagina">
      <Tablero clientes={clientes} yo={yo} />
    </main>
  )
}
