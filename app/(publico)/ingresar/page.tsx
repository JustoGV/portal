import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { AvisoEscenario, Escenario } from "@/components/ingreso/Escenario"
import { hayCuentas } from "@/dal/cuentas"
import { sesion, usuarioPorAuthId } from "@/dal/sesion"
import { ingreso as t } from "@/i18n/es/ingreso"
import { destinoSeguro } from "@/lib/destino"
import { FormIngreso } from "./FormIngreso"
import "@/styles/ingreso.css"

export const metadata: Metadata = { title: t.titulo }

export default async function PaginaIngresar({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const p = await searchParams
  const volver = destinoSeguro(typeof p.volver === "string" ? p.volver : null)
  const motivo = p.motivo === "expirado" ? "expirado" : p.motivo === "inactiva" ? "inactiva" : p.motivo === "creada" ? "creada" : null

  // Sin ninguna cuenta todavía, primero se crea la primera (D-015).
  if (!(await hayCuentas())) redirect("/configurar")

  // Con sesión completa no tiene sentido ver el login.
  const s = await sesion()
  if (s && !motivo) {
    const u = await usuarioPorAuthId(s.user.id)
    if (u?.activo) redirect(u.debeCambiarClave ? "/primer-ingreso" : volver)
  }

  const aviso =
    motivo === "inactiva" ? (
      <AvisoEscenario tono="warn" icono="alerta">
        {t.inactiva}
      </AvisoEscenario>
    ) : motivo === "creada" ? (
      <AvisoEscenario tono="ok" icono="tilde">
        {t.creada}
      </AvisoEscenario>
    ) : motivo === "expirado" ? (
      <AvisoEscenario tono="info" icono="reloj">
        {t.expirado}
      </AvisoEscenario>
    ) : null

  return (
    <Escenario titulo={t.titulo} aviso={aviso}>
      <FormIngreso volver={volver} />
    </Escenario>
  )
}
