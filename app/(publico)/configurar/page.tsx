import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { connection } from "next/server"
import { Icono } from "@/components/iconos/Icono"
import { Llegada } from "@/components/ui/Llegada"
import { Proveedores } from "@/components/ui/Proveedores"
import { hayCuentas } from "@/dal/cuentas"
import { primeraCuenta as t } from "@/i18n/es/ingreso"
import { NOMBRE_VISIBLE } from "@/lib/marca"
import { FormPrimeraCuenta } from "./FormPrimeraCuenta"
import "@/styles/ingreso.css"

export const metadata: Metadata = { title: t.titulo }

/** Solo existe mientras la base no tiene ninguna cuenta (D-015). Con una, es el login. */
export default async function PaginaConfigurar() {
  await connection()
  if (await hayCuentas()) redirect("/ingresar")

  return (
    <main className="in-pagina">
      <Llegada className="in-tarjeta">
        <div className="in-marca" data-llega="" style={{ "--llega-i": 0 } as React.CSSProperties}>
          <span className="in-marca__logo" aria-hidden="true">
            <Icono nombre="carpeta" />
          </span>
          {NOMBRE_VISIBLE}
        </div>
        <h1 className="in-titulo">{t.titulo}</h1>
        <p className="in-bajada">{t.bajada}</p>
        <Proveedores>
          <FormPrimeraCuenta />
        </Proveedores>
      </Llegada>
    </main>
  )
}
