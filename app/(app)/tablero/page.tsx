import type { Metadata } from "next"
import { Tablero } from "@/components/tablero/Tablero"
import { exigirPagina } from "@/dal/guard"
import { leerTablero, listarClientesTablero, listarPersonas, listarSistemas, persona } from "@/dal/tablero"
import "@/styles/proyectos.css"
import "@/styles/tablero.css"

export const metadata: Metadata = { title: "Tablero" }

/**
 * El tablero de trabajo (WU-07, D-038), versión «Franja» elegida por Mateo el 2026-11-18, guardado en la base
 * desde el 2026-11-19 (D-040). Todavía no está en la barra lateral.
 */
export default async function PaginaTablero() {
  const { usuario } = await exigirPagina("tablero.ver", "/tablero")
  const [inicial, personas, sistemas, clientes] = await Promise.all([leerTablero(), listarPersonas(), listarSistemas(), listarClientesTablero()])
  return (
    <main className="ui-pagina tb-pagina">
      <Tablero inicial={inicial} personas={personas} sistemas={sistemas} clientes={clientes} yo={persona(usuario.id, usuario.nombre)} />
    </main>
  )
}
