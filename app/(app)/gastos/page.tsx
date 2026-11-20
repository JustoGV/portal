import type { Metadata } from "next"
import { Suspense } from "react"
import { CifrasGastos } from "@/components/gastos/CifrasGastos"
import { BotonNuevoGasto, EditorGasto } from "@/components/gastos/EditorGasto"
import { TablaGastos } from "@/components/gastos/TablaGastos"
import { Banda } from "@/components/ui/Banda"
import { LimiteError } from "@/components/ui/LimiteError"
import { Llegada } from "@/components/ui/Llegada"
import { NavegacionLista } from "@/components/ui/NavegacionLista"
import { cifrasGastos, listarGastos, listarPagadores, type FiltroGastos, type VistaGastos } from "@/dal/gastos"
import { exigirPagina } from "@/dal/guard"
import { gastos as t } from "@/i18n/es/gastos"
import { navegacion as tn } from "@/i18n/es/navegacion"
import { conParametros, leerPagina, leerPorPagina, type ParametrosLista } from "@/lib/parametros"
import { pegar } from "@/lib/texto"
import "@/styles/proyectos.css"
import "@/styles/gastos.css"

export const metadata: Metadata = { title: t.titulo }

const leerVista = (p: ParametrosLista): VistaGastos => (p.ver === "semana" ? "semana" : p.ver === "archivados" ? "archivados" : "activos")

/**
 * «¿Cuánto pagamos por mes y qué vence ahora?» (D-043). Primero el guard, después las lecturas en paralelo,
 * cada bloque en su Suspense. De arriba abajo, como Servicios: la banda con las cifras y la tabla.
 */
export default async function PaginaGastos({ searchParams }: { searchParams: Promise<ParametrosLista> }) {
  const { usuario } = await exigirPagina("gastos.ver", "/gastos")
  const p = await searchParams
  const f: FiltroGastos = { vista: leerVista(p), pagina: leerPagina(p), por: leerPorPagina(p) }
  const actuales = { ver: f.vista === "activos" ? null : f.vista, por: f.por !== 10 ? String(f.por) : null }
  const lista = listarGastos(f)
  const cifras = cifrasGastos()
  const pagadores = listarPagadores()

  return (
    <EditorGasto pagadores={pagadores} yo={usuario.id}>
      <NavegacionLista>
        <Llegada como="main" className="ui-pagina">
          <Banda
            sobre={tn.administracion}
            titulo={
              <>
                {t.titulo}
                <LimiteError>
                  <Suspense fallback={null}>
                    <Contador cifras={cifras} />
                  </Suspense>
                </LimiteError>
              </>
            }
            bajada={pegar(t.bajada)}
            accion={<BotonNuevoGasto />}
          >
            <LimiteError>
              <Suspense fallback={<CifrasEsqueleto />}>
                <Cifras cifras={cifras} vista={f.vista} actuales={actuales} />
              </Suspense>
            </LimiteError>
          </Banda>
          <div data-llega="" style={{ "--llega-i": 2 } as React.CSSProperties}>
            <LimiteError>
              <Suspense fallback={<TablaEsqueleto />}>
                <Tabla lista={lista} f={f} actuales={actuales} />
              </Suspense>
            </LimiteError>
          </div>
        </Llegada>
      </NavegacionLista>
    </EditorGasto>
  )
}

type Actuales = Record<string, string | null>

async function Contador({ cifras }: { cifras: ReturnType<typeof cifrasGastos> }) {
  const c = await cifras
  return <span className="pr-titulo__cuenta">{t.contador(c.activos)}</span>
}

async function Cifras({ cifras, vista, actuales }: { cifras: ReturnType<typeof cifrasGastos>; vista: VistaGastos; actuales: Actuales }) {
  const c = await cifras
  const base = { ...actuales, pagina: null }
  return (
    <CifrasGastos
      cifras={c}
      vista={vista}
      hrefs={{
        activos: conParametros("/gastos", base, { ver: null }),
        semana: conParametros("/gastos", base, { ver: "semana" }),
        archivados: conParametros("/gastos", base, { ver: "archivados" }),
      }}
    />
  )
}

async function Tabla({ lista, f, actuales }: { lista: ReturnType<typeof listarGastos>; f: FiltroGastos; actuales: Actuales }) {
  const { filas, total } = await lista
  return <TablaGastos filas={filas} total={total} pagina={f.pagina} porPagina={f.por} actuales={actuales} vista={f.vista} />
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

/** Filas quietas con el alto final de la tabla, así nada salta cuando llegan los gastos. */
function TablaEsqueleto() {
  return (
    <div className="pr-esqueleto" aria-hidden="true">
      {[58, 44, 66, 50].map((ancho, i) => (
        <div key={i} className="pr-esqueleto__fila">
          <span className="ui-skeleton" style={{ width: `${Math.round(ancho * 0.5)}%`, height: "1.25rem" }} />
          <span className="ui-skeleton" style={{ width: `${ancho}%`, height: "0.875rem" }} />
        </div>
      ))}
    </div>
  )
}
