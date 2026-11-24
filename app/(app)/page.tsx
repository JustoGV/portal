import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { VersionCuadros } from "@/components/inicio/VersionCuadros"
import { exigirPagina } from "@/dal/guard"
import { leerInicio } from "@/dal/inicio"
import { inicio as t } from "@/i18n/es/inicio"
import type { ParametrosLista } from "@/lib/parametros"
import { tienePermiso } from "@/lib/permisos"
import "@/styles/inicio.css"

export const metadata: Metadata = { title: t.titulo }

// Hasta el 2026-11-23 Servicios vivía en «/»: un link guardado con sus filtros sigue llevando a la tabla.
const DE_SERVICIOS = ["q", "cliente", "estado", "orden", "dir", "pagina", "por"]

/**
 * Inicio (D-045): «¿qué está pendiente hoy en la consultora y de quién?». Versión C · Cuadros, la que eligió
 * Mateo. Toda cuenta activa llega; los gastos se leen solo si la cuenta puede verlos.
 */
export default async function PaginaInicio({ searchParams }: { searchParams: Promise<ParametrosLista> }) {
  const p = await searchParams
  if (Object.keys(p).some((k) => DE_SERVICIOS.includes(k))) {
    const q = new URLSearchParams()
    for (const [k, v] of Object.entries(p)) for (const x of Array.isArray(v) ? v : v === undefined ? [] : [v]) q.append(k, x)
    redirect(`/servicios?${q.toString()}`)
  }
  const { usuario } = await exigirPagina("proyectos.ver", "/")
  const d = await leerInicio(tienePermiso(usuario, "gastos.ver"))
  return (
    <main className="ui-pagina in-pagina">
      <VersionCuadros d={d} />
    </main>
  )
}
