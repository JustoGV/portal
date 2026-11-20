import { redirect } from "next/navigation"
import type { ParametrosLista } from "@/lib/parametros"

/**
 * «Grupos» pasó a llamarse «Clientes» (D-032): la dirección vieja lleva a la nueva con los mismos filtros.
 * No lee datos; la página nueva hace su propio control de permiso.
 */
export default async function PaginaGruposVieja({ searchParams }: { searchParams: Promise<ParametrosLista> }) {
  const p = await searchParams
  const q = new URLSearchParams()
  for (const [k, v] of Object.entries(p)) for (const x of Array.isArray(v) ? v : v === undefined ? [] : [v]) q.append(k, x)
  const resto = q.toString()
  redirect(resto ? `/clientes?${resto}` : "/clientes")
}
