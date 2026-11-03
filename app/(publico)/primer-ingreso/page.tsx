import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { Icono } from "@/components/iconos/Icono"
import { Llegada } from "@/components/ui/Llegada"
import { Proveedores } from "@/components/ui/Proveedores"
import { sesion, usuarioPorAuthId } from "@/dal/sesion"
import { primerIngreso as t } from "@/i18n/es/ingreso"
import { NOMBRE_VISIBLE } from "@/lib/marca"
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
    <main className="in-pagina">
      <Llegada className="in-tarjeta in-tarjeta--ancha">
        <div className="in-marca">
          <span className="in-marca__logo" aria-hidden="true">
            <Icono nombre="carpeta" />
          </span>
          {NOMBRE_VISIBLE}
        </div>
        <h1 className="in-titulo">{t.titulo}</h1>
        <p className="in-bajada">{t.bajada}</p>
        <Proveedores>
          <FlujoPrimerIngreso />
        </Proveedores>
      </Llegada>
    </main>
  )
}
