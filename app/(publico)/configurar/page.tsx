import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { connection } from "next/server"
import { Escenario } from "@/components/ingreso/Escenario"
import { Proveedores } from "@/components/ui/Proveedores"
import { hayCuentas } from "@/dal/cuentas"
import { primeraCuenta as t } from "@/i18n/es/ingreso"
import { FormPrimeraCuenta } from "./FormPrimeraCuenta"
import "@/styles/ingreso.css"

export const metadata: Metadata = { title: t.titulo }

/** Solo existe mientras la base no tiene ninguna cuenta (D-015). Con una, es el login. */
export default async function PaginaConfigurar() {
  await connection()
  if (await hayCuentas()) redirect("/ingresar")

  return (
    <Escenario titulo={t.titulo} bajada={t.bajada}>
      <Proveedores>
        <FormPrimeraCuenta />
      </Proveedores>
    </Escenario>
  )
}
