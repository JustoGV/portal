import type { Metadata } from "next"
import { Suspense } from "react"
import { BarraClientes, PaginasClientes } from "@/components/grupos/BarraClientes"
import { CifrasGrupos } from "@/components/grupos/CifrasGrupos"
import { BotonNuevoGrupo, EditorGrupo } from "@/components/grupos/EditorGrupo"
import { GrillaGrupos } from "@/components/grupos/GrillaGrupos"
import { LimiteError } from "@/components/ui/LimiteError"
import { Llegada } from "@/components/ui/Llegada"
import { NavegacionLista } from "@/components/ui/NavegacionLista"
import { cifrasGrupos, listarGrupos, listarServiciosElegibles, type FiltroGrupos } from "@/dal/grupos"
import { exigirPagina } from "@/dal/guard"
import { grupos as t } from "@/i18n/es/grupos"
import { conParametros, leerBusqueda, leerOrdenGrupos, leerPagina, leerSiNo, leerVistaGrupos, POR_PAGINA_CLIENTES, SIN_GRUPO, type ParametrosLista } from "@/lib/parametros"
import { pegar } from "@/lib/texto"
import "@/styles/proyectos.css"
import "@/styles/grupos.css"

export const metadata: Metadata = { title: t.titulo }

/**
 * Los clientes y sus servicios (WU-06 pantalla 4). En la pantalla son «Clientes» y por dentro siguen siendo
 * grupos (D-032), con el permiso `grupos.gestionar`. Primero el guard, después todas las lecturas en
 * paralelo, cada bloque en su Suspense (docs/reglas/09 §2.3). De arriba abajo: título con su contador y el
 * alta, las cuatro cifras, la barra de filtros (D-033), la grilla de a 12 y sus páginas.
 */
export default async function PaginaClientes({ searchParams }: { searchParams: Promise<ParametrosLista> }) {
  await exigirPagina("grupos.gestionar", "/clientes")
  const p = await searchParams
  // «Vacíos» es lo mismo que el filtro «Sin servicios»: la dirección vieja ?ver=vacios se lee así.
  const vista = leerVistaGrupos(p)
  const f: FiltroGrupos = {
    q: leerBusqueda(p),
    ver: vista === "archivados" ? "archivados" : "activos",
    orden: leerOrdenGrupos(p),
    responsable: leerSiNo(p.responsable),
    servicios: vista === "vacios" ? "sin" : leerSiNo(p.servicios),
    pagina: leerPagina(p),
  }
  const actuales = {
    q: f.q || null,
    ver: f.ver === "archivados" ? "archivados" : null,
    orden: f.orden !== "nombre" ? f.orden : null,
    responsable: f.responsable,
    servicios: f.servicios,
  }
  const lista = listarGrupos(f)
  const cifras = cifrasGrupos()
  const servicios = listarServiciosElegibles()

  return (
    <EditorGrupo servicios={servicios}>
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
            <BotonNuevoGrupo />
          </header>
          <div data-llega="" style={{ "--llega-i": 1 } as React.CSSProperties}>
            <LimiteError>
              <Suspense fallback={<CifrasEsqueleto />}>
                <Cifras cifras={cifras} f={f} actuales={actuales} />
              </Suspense>
            </LimiteError>
          </div>
          <div data-llega="" style={{ "--llega-i": 2 } as React.CSSProperties}>
            <BarraClientes
              q={f.q}
              responsable={f.responsable}
              servicios={f.servicios}
              orden={f.orden}
              actuales={actuales}
              cuenta={
                <Suspense fallback={null}>
                  <Cuenta lista={lista} pagina={f.pagina} />
                </Suspense>
              }
            />
          </div>
          <div data-llega="" style={{ "--llega-i": 3 } as React.CSSProperties}>
            <LimiteError>
              <Suspense fallback={<GrillaEsqueleto />}>
                <Grilla lista={lista} f={f} actuales={actuales} />
              </Suspense>
            </LimiteError>
          </div>
        </Llegada>
      </NavegacionLista>
    </EditorGrupo>
  )
}

type Actuales = Record<string, string | null>

/** El contador al lado del título: los clientes activos. */
async function Contador({ cifras }: { cifras: ReturnType<typeof cifrasGrupos> }) {
  const c = await cifras
  return <span className="pr-titulo__cuenta">{t.contador(c.activos)}</span>
}

async function Cuenta({ lista, pagina }: { lista: ReturnType<typeof listarGrupos>; pagina: number }) {
  const { total } = await lista
  const desde = total === 0 ? 0 : (pagina - 1) * POR_PAGINA_CLIENTES + 1
  return t.contadorPagina(desde, Math.min(total, pagina * POR_PAGINA_CLIENTES), total)
}

async function Cifras({ cifras, f, actuales }: { cifras: ReturnType<typeof cifrasGrupos>; f: FiltroGrupos; actuales: Actuales }) {
  const c = await cifras
  // Cada cifra cambia qué carpetas se ven; la búsqueda, el responsable y el orden se conservan.
  const vista = f.ver === "archivados" ? "archivados" : f.servicios === "sin" ? "vacios" : "activos"
  return (
    <CifrasGrupos
      cifras={c}
      vista={vista}
      hrefs={{
        activos: conParametros("/clientes", actuales, {
          ver: null,
          servicios: null,
          pagina: null,
        }),
        vacios: conParametros("/clientes", actuales, {
          ver: null,
          servicios: "sin",
          pagina: null,
        }),
        archivados: conParametros("/clientes", actuales, {
          ver: "archivados",
          pagina: null,
        }),
      }}
      hrefSinGrupo={`/?cliente=${SIN_GRUPO}`}
    />
  )
}

async function Grilla({ lista, f, actuales }: { lista: ReturnType<typeof listarGrupos>; f: FiltroGrupos; actuales: Actuales }) {
  const { filas, total } = await lista
  const filtrando = !!f.q || !!f.responsable || f.servicios === "con"
  // Sin key: la grilla no se remonta al filtrar, así las carpetas se reacomodan en vez de volver a entrar.
  return (
    <>
      <GrillaGrupos
        filas={filas}
        vista={f.ver === "archivados" ? "archivados" : f.servicios === "sin" ? "vacios" : "activos"}
        filtrando={filtrando}
        hrefLimpiar={conParametros("/clientes", actuales, {
          q: null,
          responsable: null,
          servicios: null,
          pagina: null,
        })}
      />
      <PaginasClientes actuales={actuales} total={total} pagina={f.pagina} />
    </>
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

/** Carpetas quietas con el alto final (05 §13), así nada salta cuando llegan los clientes. */
function GrillaEsqueleto() {
  return (
    <div className="gr-grilla" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <span key={i} className="ui-skeleton gr-tarjeta-esqueleto" />
      ))}
    </div>
  )
}
