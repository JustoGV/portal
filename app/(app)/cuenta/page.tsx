import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { VistaCuenta } from "@/components/cuenta/VistaCuenta"
import { miCuenta } from "@/dal/cuentas"
import { exigirPagina } from "@/dal/guard"
import { cuenta as t } from "@/i18n/es/cuenta"
import "@/styles/usuarios.css"
import "@/styles/cuenta.css"

export const metadata: Metadata = { title: t.titulo }

/**
 * «¿Quién soy en el portal y dónde estoy conectado?» (WU-06 pantalla 6, D-035). La entrada es el pie de la
 * barra (D-024). Toda cuenta activa llega: el guard pide el permiso base y la cuenta que se muestra es la de
 * la sesión, nunca una que venga en la URL. La composición es la elegida por Mateo el 2026-11-18 (D-036).
 */
export default async function PaginaCuenta() {
  const { usuario, sesion } = await exigirPagina("proyectos.ver", "/cuenta")
  const c = await miCuenta(usuario.id, sesion.session.id)
  if (!c) redirect("/ingresar?motivo=expirado")

  // La banda azul arriba y la tarjeta con secciones (D-036).
  return (
    <main className="ui-pagina cu-pagina">
      <VistaCuenta c={c} />
    </main>
  )
}
