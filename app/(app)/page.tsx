import type { Metadata } from "next"
import { Suspense } from "react"
import { BotonNuevoProyecto } from "@/components/proyectos/BotonNuevoProyecto"
import { BusquedaProyectos } from "@/components/proyectos/BusquedaProyectos"
import { EditorProyecto } from "@/components/proyectos/EditorProyecto"
import { ListaProyectos } from "@/components/proyectos/ListaProyectos"
import { LimiteError } from "@/components/ui/LimiteError"
import { Llegada } from "@/components/ui/Llegada"
import { NavegacionLista } from "@/components/ui/NavegacionLista"
import { Segmentos } from "@/components/ui/Segmentos"
import { listarGruposActivos } from "@/dal/grupos"
import { exigirPagina } from "@/dal/guard"
import { contarProyectos, listarProyectos, type FiltroProyectos } from "@/dal/proyectos"
import { proyectos as t } from "@/i18n/es/proyectos"
import { conParametros, leerBusqueda, leerEstado, leerPagina, leerPorPagina, leerUuid, type ParametrosLista } from "@/lib/parametros"
import "@/styles/proyectos.css"

export const metadata: Metadata = { title: t.titulo }

/**
 * "¿Dónde está el proyecto que busco?" (docs/ARQUITECTURA.md §3). Primero el guard, después todas las
 * lecturas en paralelo, cada bloque en su Suspense (docs/reglas/09 §2.3).
 */
export default async function PaginaProyectos({ searchParams }: { searchParams: Promise<ParametrosLista> }) {
  await exigirPagina("proyectos.ver", "/")
  const p = await searchParams
  const f: FiltroProyectos = { q: leerBusqueda(p), grupo: leerUuid(p.grupo), estado: leerEstado(p), pagina: leerPagina(p), por: leerPorPagina(p) }
  const actuales = {
    q: f.q || null,
    grupo: f.grupo,
    estado: f.estado === "archivados" ? "archivados" : null,
    por: f.por !== 25 ? String(f.por) : null,
  }
  const lista = listarProyectos(f)
  const cuentas = contarProyectos(f.q, f.estado)
  const grupos = listarGruposActivos()

  return (
    <EditorProyecto grupos={grupos}>
      <NavegacionLista>
        <Llegada como="main" className="ui-pagina">
          <header className="ui-pagina__cabecera" data-llega="" style={{ "--llega-i": 0 } as React.CSSProperties}>
            <div>
              <h1 className="ui-pagina__titulo">{t.titulo}</h1>
              <p className="ui-pagina__bajada">{t.bajada}</p>
            </div>
            <BotonNuevoProyecto />
          </header>
          <div className="ui-herramientas" data-llega="" style={{ "--llega-i": 1 } as React.CSSProperties}>
            <div className="ui-herramientas__busqueda">
              <BusquedaProyectos q={f.q} actuales={actuales} />
            </div>
            <LimiteError>
              <Suspense fallback={<FiltrosEsqueleto />}>
                <Filtros cuentas={cuentas} f={f} actuales={actuales} />
              </Suspense>
            </LimiteError>
          </div>
          <div data-llega="" style={{ "--llega-i": 2 } as React.CSSProperties}>
            <LimiteError>
              <Suspense fallback={<TablaEsqueleto />}>
                <Tabla lista={lista} f={f} actuales={actuales} />
              </Suspense>
            </LimiteError>
          </div>
        </Llegada>
      </NavegacionLista>
    </EditorProyecto>
  )
}

type Actuales = Record<string, string | null>

async function Filtros({ cuentas, f, actuales }: { cuentas: ReturnType<typeof contarProyectos>; f: FiltroProyectos; actuales: Actuales }) {
  const c = await cuentas
  const base = { ...actuales, pagina: null }
  // Solo se muestran los filtros que tienen algo (docs/reglas/07 §4).
  const verEstado = c.archivados > 0 || f.estado === "archivados"
  const grupos = c.porGrupo
  const verGrupos = grupos.length > 0 || f.grupo !== null
  if (!verEstado && !verGrupos) return null
  return (
    <div className="ui-herramientas__filtros">
      {verEstado && (
        <Segmentos
          etiqueta={t.estado}
          actual={f.estado}
          opciones={[
            { valor: "activos", texto: t.activos, cuenta: c.activos, href: conParametros("/", base, { estado: null, grupo: null }) },
            { valor: "archivados", texto: t.archivados, cuenta: c.archivados, href: conParametros("/", base, { estado: "archivados", grupo: null }) },
          ]}
        />
      )}
      {verGrupos && (
        <Segmentos
          etiqueta={t.grupo}
          actual={f.grupo ?? "todos"}
          opciones={[
            { valor: "todos", texto: t.todos, href: conParametros("/", base, { grupo: null }) },
            ...grupos.map((g) => ({ valor: g.id, texto: g.nombre, cuenta: g.cuenta, href: conParametros("/", base, { grupo: g.id }) })),
          ]}
        />
      )}
    </div>
  )
}

async function Tabla({ lista, f, actuales }: { lista: ReturnType<typeof listarProyectos>; f: FiltroProyectos; actuales: Actuales }) {
  const { filas, total } = await lista
  return (
    <ListaProyectos
      // Cambiar de filtro remonta la tabla y repite la entrada; buscar o paginar, no (docs/reglas/07 §2).
      key={`${f.estado}|${f.grupo ?? ""}|${f.por}`}
      filas={filas}
      total={total}
      pagina={f.pagina}
      porPagina={f.por}
      actuales={actuales}
      filtrando={!!f.q || !!f.grupo}
      archivados={f.estado === "archivados"}
    />
  )
}

function FiltrosEsqueleto() {
  return (
    <div className="pr-filtros-esqueleto" aria-hidden="true">
      <span className="ui-skeleton" style={{ width: "13rem", height: "2.75rem" }} />
    </div>
  )
}

function TablaEsqueleto() {
  return <div className="ui-skeleton" style={{ height: "28rem", borderRadius: "var(--sys-radio-l)" }} aria-hidden="true" />
}
