import type { Metadata } from "next"
import { Suspense } from "react"
import { BotonNuevaCuenta, VistaUsuarios } from "@/components/usuarios/VistaUsuarios"
import { FormInactividad } from "@/components/usuarios/FormInactividad"
import { LimiteError } from "@/components/ui/LimiteError"
import { Llegada } from "@/components/ui/Llegada"
import { leerConfiguracion } from "@/dal/configuracion"
import { listarUsuarios } from "@/dal/cuentas"
import { exigirPagina } from "@/dal/guard"
import { usuarios as t } from "@/i18n/es/usuarios"
import "@/styles/usuarios.css"

export const metadata: Metadata = { title: t.titulo }

/** "¿Quién tiene acceso y está activo?" */
export default async function PaginaUsuarios() {
  const { usuario } = await exigirPagina("usuarios.gestionar", "/usuarios")
  const lista = listarUsuarios(usuario.id)
  const config = leerConfiguracion()

  return (
    <Llegada como="main" className="ui-pagina">
      <header className="ui-pagina__cabecera" data-llega="" style={{ "--llega-i": 0 } as React.CSSProperties}>
        <div>
          <h1 className="ui-pagina__titulo">{t.titulo}</h1>
          <p className="ui-pagina__bajada">{t.bajada}</p>
        </div>
        <BotonNuevaCuenta />
      </header>
      <div data-llega="" style={{ "--llega-i": 1 } as React.CSSProperties}>
        <LimiteError>
          <Suspense fallback={<div className="ui-skeleton" style={{ height: "12rem", borderRadius: "var(--sys-radio-l)" }} aria-hidden="true" />}>
            <Tabla lista={lista} />
          </Suspense>
        </LimiteError>
      </div>
      <section className="ui-seccion" data-llega="" style={{ "--llega-i": 2 } as React.CSSProperties}>
        <h2 className="ui-seccion__titulo">{t.inactividadTitulo}</h2>
        <p className="ui-seccion__bajada">{t.inactividadBajada}</p>
        <LimiteError>
          <Suspense fallback={<div className="ui-skeleton" style={{ height: "5rem", maxWidth: "32rem" }} aria-hidden="true" />}>
            <Inactividad config={config} />
          </Suspense>
        </LimiteError>
      </section>
    </Llegada>
  )
}

async function Tabla({ lista }: { lista: ReturnType<typeof listarUsuarios> }) {
  return <VistaUsuarios filas={await lista} />
}

async function Inactividad({ config }: { config: ReturnType<typeof leerConfiguracion> }) {
  const c = await config
  return <FormInactividad minutos={c.inactividadMinutos} />
}
