import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Escenario } from "@/components/ingreso/Escenario"
import { Proveedores } from "@/components/ui/Proveedores"
import { sesion, usuarioPorAuthId } from "@/dal/sesion"
import { primerIngreso as t } from "@/i18n/es/ingreso"
import { FlujoPrimerIngreso } from "./FlujoPrimerIngreso"
import "@/styles/ingreso.css"

export const metadata: Metadata = { title: t.titulo }

/** Contraseña propia antes de ver cualquier otra cosa (docs/reglas/10 §2.6). Sin segundo factor: D-013. */
export default async function PaginaPrimerIngreso() {
  const s = await sesion()
  if (!s) redirect("/ingresar")
  const u = await usuarioPorAuthId(s.user.id)
  if (!u || !u.activo) redirect("/ingresar?motivo=inactiva")
  if (!u.debeCambiarClave) redirect("/")

  return (
    <Escenario titulo={t.titulo} bajada={t.bajada}>
      <Proveedores>
        <FlujoPrimerIngreso />
      </Proveedores>
    </Escenario>
  )
}
