import type { Metadata } from "next"
import { Suspense } from "react"
import { BotonNuevoGrupo, VistaGrupos } from "@/components/grupos/VistaGrupos"
import { LimiteError } from "@/components/ui/LimiteError"
import { Llegada } from "@/components/ui/Llegada"
import { NavegacionLista } from "@/components/ui/NavegacionLista"
import { Segmentos } from "@/components/ui/Segmentos"
import { contarGrupos, listarGrupos } from "@/dal/grupos"
import { exigirPagina } from "@/dal/guard"
import { grupos as t } from "@/i18n/es/grupos"
import { leerEstado, type ParametrosLista } from "@/lib/parametros"

export const metadata: Metadata = { title: t.titulo }

/** "¿Cómo están ordenados mis proyectos?" */
export default async function PaginaGrupos({ searchParams }: { searchParams: Promise<ParametrosLista> }) {
  await exigirPagina("grupos.gestionar", "/grupos")
  const estado = leerEstado(await searchParams)
  const lista = listarGrupos(estado)
  const cuentas = contarGrupos()

  return (
    <NavegacionLista>
      <Llegada como="main" className="ui-pagina">
        <header className="ui-pagina__cabecera" data-llega="" style={{ "--llega-i": 0 } as React.CSSProperties}>
          <div>
            <h1 className="ui-pagina__titulo">{t.titulo}</h1>
            <p className="ui-pagina__bajada">{t.bajada}</p>
          </div>
          <BotonNuevoGrupo />
        </header>
        <div className="ui-herramientas" data-llega="" style={{ "--llega-i": 1 } as React.CSSProperties}>
          <LimiteError>
            <Suspense fallback={null}>
              <Filtro cuentas={cuentas} estado={estado} />
            </Suspense>
          </LimiteError>
        </div>
        <div data-llega="" style={{ "--llega-i": 2 } as React.CSSProperties}>
          <LimiteError>
            <Suspense fallback={<div className="ui-skeleton" style={{ height: "20rem", borderRadius: "var(--sys-radio-l)" }} aria-hidden="true" />}>
              <Tabla lista={lista} estado={estado} />
            </Suspense>
          </LimiteError>
        </div>
      </Llegada>
    </NavegacionLista>
  )
}

async function Filtro({ cuentas, estado }: { cuentas: ReturnType<typeof contarGrupos>; estado: "activos" | "archivados" }) {
  const c = await cuentas
  if (c.archivados === 0 && estado === "activos") return null
  return (
    <Segmentos
      etiqueta={t.estado}
      actual={estado}
      opciones={[
        { valor: "activos", texto: t.activos, cuenta: c.activos, href: "/grupos" },
        { valor: "archivados", texto: t.archivados, cuenta: c.archivados, href: "/grupos?estado=archivados" },
      ]}
    />
  )
}

async function Tabla({ lista, estado }: { lista: ReturnType<typeof listarGrupos>; estado: "activos" | "archivados" }) {
  const filas = await lista
  return <VistaGrupos key={estado} filas={filas} archivados={estado === "archivados"} />
}
