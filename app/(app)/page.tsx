import type { Metadata } from "next"
import { Suspense } from "react"
import { BotonNuevoProyecto } from "@/components/proyectos/BotonNuevoProyecto"
import { BusquedaProyectos } from "@/components/proyectos/BusquedaProyectos"
import { CifrasProyectos } from "@/components/proyectos/CifrasProyectos"
import { EditorProyecto } from "@/components/proyectos/EditorProyecto"
import { TablaProyectos } from "@/components/proyectos/TablaProyectos"
import { FiltroMenu } from "@/components/ui/FiltroMenu"
import { LimiteError } from "@/components/ui/LimiteError"
import { Llegada } from "@/components/ui/Llegada"
import { NavegacionLista } from "@/components/ui/NavegacionLista"
import { listarGruposActivos } from "@/dal/grupos"
import { exigirPagina } from "@/dal/guard"
import { cifrasProyectos, contarProyectos, listarProyectos, type FiltroProyectos } from "@/dal/proyectos"
import { proyectos as t } from "@/i18n/es/proyectos"
import { pegar } from "@/lib/texto"
import { conParametros, leerBusqueda, leerEstado, leerGrupo, leerOrden, leerPagina, leerPorPagina, SIN_GRUPO, type ParametrosLista } from "@/lib/parametros"
import "@/styles/proyectos.css"

export const metadata: Metadata = { title: t.titulo }

/**
 * "¿Dónde está el servicio que busco?" (docs/ARQUITECTURA.md §3). Primero el guard, después todas las
 * lecturas en paralelo, cada bloque en su Suspense (docs/reglas/09 §2.3). De arriba abajo (D-030): título
 * con su contador y el alta, las cuatro cifras que filtran, la barra de búsqueda y filtros, y la tabla.
 */
export default async function PaginaProyectos({ searchParams }: { searchParams: Promise<ParametrosLista> }) {
  await exigirPagina("proyectos.ver", "/")
  const p = await searchParams
  const { orden, dir } = leerOrden(p)
  const f: FiltroProyectos = { q: leerBusqueda(p), grupo: leerGrupo(p.grupo), estado: leerEstado(p), pagina: leerPagina(p), por: leerPorPagina(p), orden, dir }
  const actuales = {
    q: f.q || null,
    grupo: f.grupo,
    estado: f.estado === "archivados" ? "archivados" : null,
    por: f.por !== 25 ? String(f.por) : null,
    orden: orden !== "nombre" ? orden : dir === "desc" ? orden : null,
    dir: dir === "desc" ? "desc" : null,
  }
  const lista = listarProyectos(f)
  const cuentas = contarProyectos(f.q, f.estado)
  const cifras = cifrasProyectos()
  const grupos = listarGruposActivos()

  return (
    <EditorProyecto grupos={grupos}>
      <NavegacionLista>
        <Llegada como="main" className="ui-pagina">
          <header className="ui-pagina__cabecera" data-llega="" style={{ "--llega-i": 0 } as React.CSSProperties}>
            <div>
              <h1 className="ui-pagina__titulo pr-titulo">
                {t.titulo}
                <LimiteError>
                  <Suspense fallback={null}>
                    <Contador cifras={cifras} />
                  </Suspense>
                </LimiteError>
              </h1>
              <p className="ui-pagina__bajada">{pegar(t.bajada)}</p>
            </div>
            <BotonNuevoProyecto />
          </header>
          <div data-llega="" style={{ "--llega-i": 1 } as React.CSSProperties}>
            <LimiteError>
              <Suspense fallback={<CifrasEsqueleto />}>
                <Cifras cifras={cifras} f={f} actuales={actuales} />
              </Suspense>
            </LimiteError>
          </div>
          <div className="ui-herramientas" data-llega="" style={{ "--llega-i": 2 } as React.CSSProperties}>
            <div className="ui-herramientas__busqueda">
              <BusquedaProyectos q={f.q} actuales={actuales} />
            </div>
            <LimiteError>
              <Suspense fallback={<FiltrosEsqueleto />}>
                <Filtros cuentas={cuentas} f={f} actuales={actuales} />
              </Suspense>
            </LimiteError>
          </div>
          <div data-llega="" style={{ "--llega-i": 3 } as React.CSSProperties}>
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

/** El contador al lado del título: los servicios activos. */
async function Contador({ cifras }: { cifras: ReturnType<typeof cifrasProyectos> }) {
  const c = await cifras
  return <span className="pr-titulo__cuenta">{t.contador(c.activos)}</span>
}

async function Cifras({ cifras, f, actuales }: { cifras: ReturnType<typeof cifrasProyectos>; f: FiltroProyectos; actuales: Actuales }) {
  const c = await cifras
  // Cada cifra es un filtro entero: deja la búsqueda y el orden, y fija estado y grupo.
  const base = { ...actuales, pagina: null }
  const vista = f.estado === "archivados" ? (f.grupo ? null : "archivados") : f.grupo === SIN_GRUPO ? "sinGrupo" : f.grupo ? null : "activos"
  return (
    <CifrasProyectos
      cifras={c}
      vista={vista}
      hrefs={{
        activos: conParametros("/", base, { estado: null, grupo: null }),
        sinGrupo: conParametros("/", base, { estado: null, grupo: SIN_GRUPO }),
        archivados: conParametros("/", base, { estado: "archivados", grupo: null }),
      }}
    />
  )
}

async function Filtros({ cuentas, f, actuales }: { cuentas: ReturnType<typeof contarProyectos>; f: FiltroProyectos; actuales: Actuales }) {
  const c = await cuentas
  const base = { ...actuales, pagina: null }
  // Solo se muestran los filtros que tienen algo (docs/reglas/07 §4): sin grupos, no hay filtro de grupo.
  if (c.porGrupo.length === 0 && f.grupo === null) return null
  const enEstado = f.estado === "archivados" ? c.archivados : c.activos
  return (
    <div className="ui-herramientas__filtros">
      <FiltroMenu
        etiqueta={t.grupo}
        actual={f.grupo ?? "todos"}
        opciones={[
          { valor: "todos", texto: t.filtroTodos, cuenta: enEstado, href: conParametros("/", base, { grupo: null }) },
          ...c.porGrupo.map((g) => ({ valor: g.id, texto: g.nombre, cuenta: g.cuenta, href: conParametros("/", base, { grupo: g.id }) })),
          { valor: SIN_GRUPO, texto: t.sinGrupo, href: conParametros("/", base, { grupo: SIN_GRUPO }) },
        ]}
      />
    </div>
  )
}

async function Tabla({ lista, f, actuales }: { lista: ReturnType<typeof listarProyectos>; f: FiltroProyectos; actuales: Actuales }) {
  const { filas, total } = await lista
  return (
    <TablaProyectos
      // Sin key: la tabla no se remonta al filtrar, así las filas se reacomodan (Flip) en vez de volver a entrar.
      filas={filas}
      total={total}
      pagina={f.pagina}
      porPagina={f.por}
      actuales={actuales}
      filtrando={!!f.q || !!f.grupo}
      archivados={f.estado === "archivados"}
      orden={f.orden ?? "nombre"}
      dir={f.dir ?? "asc"}
    />
  )
}

function CifrasEsqueleto() {
  return (
    <div className="pr-cifras" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className="ui-skeleton pr-cifra-esqueleto" />
      ))}
    </div>
  )
}

function FiltrosEsqueleto() {
  return (
    <div className="pr-filtros-esqueleto" aria-hidden="true">
      <span className="ui-skeleton" style={{ width: "13rem", height: "2.75rem" }} />
    </div>
  )
}

/** Filas quietas con el alto final de la tabla (05 §13), así nada salta cuando llegan los servicios. */
function TablaEsqueleto() {
  return (
    <div className="pr-esqueleto" aria-hidden="true">
      {[62, 48, 70, 55, 66, 44].map((ancho, i) => (
        <div key={i} className="pr-esqueleto__fila">
          <span className="ui-skeleton" style={{ width: `${Math.round(ancho * 0.5)}%`, height: "1.25rem" }} />
          <span className="ui-skeleton" style={{ width: `${ancho}%`, height: "0.875rem" }} />
        </div>
      ))}
    </div>
  )
}
