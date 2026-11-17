import type { Metadata } from "next"
import { Suspense } from "react"
import { LimiteError } from "@/components/ui/LimiteError"
import { Llegada } from "@/components/ui/Llegada"
import { NavegacionLista } from "@/components/ui/NavegacionLista"
import { BarraUsuarios, PaginasUsuarios } from "@/components/usuarios/BarraUsuarios"
import { CifrasUsuarios } from "@/components/usuarios/CifrasUsuarios"
import { FormInactividad } from "@/components/usuarios/FormInactividad"
import { BotonNuevaCuenta, EditorUsuario } from "@/components/usuarios/FormUsuario"
import { VistaUsuarios } from "@/components/usuarios/VistaUsuarios"
import { leerConfiguracion } from "@/dal/configuracion"
import { cifrasUsuarios, listarUsuarios, type FiltroUsuarios } from "@/dal/cuentas"
import { exigirPagina } from "@/dal/guard"
import { usuarios as t } from "@/i18n/es/usuarios"
import { conParametros, leerBusqueda, leerOrdenUsuarios, leerPagina, leerVistaUsuarios, POR_PAGINA_USUARIOS, type ParametrosLista } from "@/lib/parametros"
import { pegar } from "@/lib/texto"
import "@/styles/proyectos.css"
import "@/styles/grupos.css"
import "@/styles/usuarios.css"

export const metadata: Metadata = { title: t.titulo }

/**
 * «¿Quién tiene acceso y está activo?» (WU-06 pantalla 5, D-034). Primero el guard, después todas las
 * lecturas en paralelo, cada bloque en su Suspense (docs/reglas/09 §2.3). De arriba abajo: título con su
 * contador y el alta, las cuatro cifras, la barra de filtros, la tabla con sus páginas de a 12 y, al pie,
 * el cierre por inactividad.
 */
export default async function PaginaUsuarios({ searchParams }: { searchParams: Promise<ParametrosLista> }) {
  const { usuario } = await exigirPagina("usuarios.gestionar", "/usuarios")
  const p = await searchParams
  const f: FiltroUsuarios = { q: leerBusqueda(p), ver: leerVistaUsuarios(p), orden: leerOrdenUsuarios(p), pagina: leerPagina(p) }
  const actuales = { q: f.q || null, ver: f.ver !== "activas" ? f.ver : null, orden: f.orden !== "nombre" ? f.orden : null }
  const lista = listarUsuarios(usuario.id, f)
  const cifras = cifrasUsuarios()
  const config = leerConfiguracion()

  return (
    <EditorUsuario>
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
            <BotonNuevaCuenta />
          </header>
          <div data-llega="" style={{ "--llega-i": 1 } as React.CSSProperties}>
            <LimiteError>
              <Suspense fallback={<CifrasEsqueleto />}>
                <Cifras cifras={cifras} f={f} actuales={actuales} />
              </Suspense>
            </LimiteError>
          </div>
          <div data-llega="" style={{ "--llega-i": 2 } as React.CSSProperties}>
            <BarraUsuarios
              q={f.q}
              ver={f.ver}
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
              <Suspense fallback={<TablaEsqueleto />}>
                <Tabla lista={lista} f={f} actuales={actuales} />
              </Suspense>
            </LimiteError>
          </div>
          <section className="us-ajuste" data-llega="" style={{ "--llega-i": 4 } as React.CSSProperties} aria-labelledby="us-inactividad">
            <div className="us-ajuste__textos">
              <h2 id="us-inactividad" className="us-ajuste__titulo">
                {t.inactividadTitulo}
              </h2>
              <p className="us-ajuste__bajada">{pegar(t.inactividadBajada)}</p>
            </div>
            <LimiteError>
              <Suspense fallback={<div className="ui-skeleton" style={{ height: "3.5rem", width: "100%", maxWidth: "26rem" }} aria-hidden="true" />}>
                <Inactividad config={config} />
              </Suspense>
            </LimiteError>
          </section>
        </Llegada>
      </NavegacionLista>
    </EditorUsuario>
  )
}

type Actuales = Record<string, string | null>

/** El contador al lado del título: las cuentas activas. */
async function Contador({ cifras }: { cifras: ReturnType<typeof cifrasUsuarios> }) {
  const c = await cifras
  return <span className="pr-titulo__cuenta">{t.contador(c.activas)}</span>
}

async function Cuenta({ lista, pagina }: { lista: ReturnType<typeof listarUsuarios>; pagina: number }) {
  const { total } = await lista
  const desde = total === 0 ? 0 : (pagina - 1) * POR_PAGINA_USUARIOS + 1
  return t.contadorPagina(desde, Math.min(total, pagina * POR_PAGINA_USUARIOS), total)
}

async function Cifras({ cifras, f, actuales }: { cifras: ReturnType<typeof cifrasUsuarios>; f: FiltroUsuarios; actuales: Actuales }) {
  const c = await cifras
  // Cada cifra cambia qué cuentas se ven; la búsqueda y el orden se conservan.
  const a = (ver: string | null) => conParametros("/usuarios", actuales, { ver, pagina: null })
  return <CifrasUsuarios cifras={c} vista={f.ver} hrefs={{ activas: a(null), "primer-ingreso": a("primer-ingreso"), "sin-factor": a("sin-factor"), desactivadas: a("desactivadas") }} />
}

async function Tabla({ lista, f, actuales }: { lista: ReturnType<typeof listarUsuarios>; f: FiltroUsuarios; actuales: Actuales }) {
  const { filas, total } = await lista
  // Sin key: la tabla no se remonta al filtrar, así las filas se reacomodan en vez de volver a entrar.
  return (
    <>
      <VistaUsuarios filas={filas} vista={f.ver} filtrando={!!f.q} hrefLimpiar={conParametros("/usuarios", actuales, { q: null, ver: null, pagina: null })} />
      <PaginasUsuarios actuales={actuales} total={total} pagina={f.pagina} />
    </>
  )
}

async function Inactividad({ config }: { config: ReturnType<typeof leerConfiguracion> }) {
  const c = await config
  return <FormInactividad minutos={c.inactividadMinutos} />
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

/** Filas quietas con el alto final de la tabla (05 §13), así nada salta cuando llegan las cuentas. */
function TablaEsqueleto() {
  return (
    <div className="pr-esqueleto" aria-hidden="true">
      {[56, 44, 62, 50].map((ancho, i) => (
        <div key={i} className="pr-esqueleto__fila">
          <span className="ui-skeleton" style={{ width: `${Math.round(ancho * 0.5)}%`, height: "1.25rem" }} />
          <span className="ui-skeleton" style={{ width: `${ancho}%`, height: "0.875rem" }} />
        </div>
      ))}
    </div>
  )
}
