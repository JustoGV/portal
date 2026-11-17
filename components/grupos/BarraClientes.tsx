"use client"
import { useCallback, type ReactNode } from "react"
import { LinkNavegar, Menu, Pastilla } from "@/components/ui/BarraFiltros"
import { Busqueda } from "@/components/ui/Busqueda"
import { Paginacion } from "@/components/ui/Paginacion"
import { grupos as t } from "@/i18n/es/grupos"
import { conParametros, ORDENES_GRUPOS, POR_PAGINA_CLIENTES, type OrdenGrupos, type SiNo } from "@/lib/parametros"

type Actuales = Record<string, string | null>
type Props = {
  q: string
  responsable: SiNo | null
  servicios: SiNo | null
  orden: OrdenGrupos
  /** Los parámetros de la dirección hoy (sin la página): cada cambio parte de estos y vuelve a la página 1. */
  actuales: Actuales
  /** «13 a 24 de 31 clientes»: llega cuando llega la lista (va en su Suspense). */
  cuenta: ReactNode
}

const ir = (actuales: Actuales, cambios: Actuales) => conParametros("/clientes", actuales, { ...cambios, pagina: null })

/**
 * La barra de filtros de Clientes (D-033): el buscador y, al lado, tres botones del mismo alto (Responsable,
 * Servicios, Ordenar) con su rótulo arriba y lo elegido abajo, como un campo. Debajo, lo que está filtrando
 * en pastillas que se sacan de a una, y cuántos clientes se ven. Todo vive en la dirección (07 §3).
 */
export function BarraClientes({ q, responsable, servicios, orden, actuales, cuenta }: Props) {
  const hrefQ = useCallback((texto: string) => ir(actuales, { q: texto || null }), [actuales])
  const activos = [
    q
      ? {
          clave: "q",
          texto: t.chipBusqueda(q),
          href: ir(actuales, { q: null }),
        }
      : null,
    responsable
      ? {
          clave: "responsable",
          texto: t.filtroResponsableOpciones[responsable],
          href: ir(actuales, { responsable: null }),
        }
      : null,
    servicios
      ? {
          clave: "servicios",
          texto: t.filtroServiciosOpciones[servicios],
          href: ir(actuales, { servicios: null }),
        }
      : null,
  ].filter((a): a is { clave: string; texto: string; href: string } => a !== null)

  return (
    <div className="cl-barra">
      <div className="cl-barra__fila">
        <div className="cl-barra__busqueda">
          <Busqueda etiqueta={t.buscar} valorInicial={q} href={hrefQ} autoFocus />
        </div>
        <div className="cl-barra__filtros">
          <Menu
            etiqueta={t.filtroResponsable}
            actual={responsable ?? "todos"}
            opciones={(["todos", "con", "sin"] as const).map((v) => ({
              valor: v,
              texto: v === "todos" ? t.filtroTodos : t.filtroResponsableOpciones[v],
              href: ir(actuales, { responsable: v === "todos" ? null : v }),
            }))}
          />
          <Menu
            etiqueta={t.filtroServicios}
            actual={servicios ?? "todos"}
            opciones={(["todos", "con", "sin"] as const).map((v) => ({
              valor: v,
              texto: v === "todos" ? t.filtroTodos : t.filtroServiciosOpciones[v],
              href: ir(actuales, { servicios: v === "todos" ? null : v }),
            }))}
          />
          <Menu
            etiqueta={t.ordenar}
            actual={orden}
            neutro
            icono
            opciones={ORDENES_GRUPOS.map((o) => ({
              valor: o,
              texto: t.ordenesCorto[o],
              href: ir(actuales, { orden: o === "nombre" ? null : o }),
            }))}
          />
        </div>
      </div>
      <div className="cl-barra__estado">
        {activos.length > 0 && (
          <ul className="cl-barra__activos" aria-label={t.filtrando}>
            {activos.map((a) => (
              <li key={a.clave}>
                <Pastilla texto={a.texto} href={a.href} quitar={t.quitarFiltro(a.texto)} />
              </li>
            ))}
            {activos.length > 1 && (
              <li>
                <LinkNavegar
                  className="cl-barra__limpiar"
                  href={ir(actuales, {
                    q: null,
                    responsable: null,
                    servicios: null,
                  })}
                >
                  {t.limpiarFiltros}
                </LinkNavegar>
              </li>
            )}
          </ul>
        )}
        <p className="cl-barra__cuenta" aria-live="polite">
          {cuenta}
        </p>
      </div>
    </div>
  )
}

/** Las páginas de a 12 abajo de la grilla (D-033), con la misma pieza que Servicios y sin el tamaño de página. */
export function PaginasClientes({ actuales, total, pagina }: { actuales: Actuales; total: number; pagina: number }) {
  return (
    <div className="cl-paginas">
      <Paginacion
        total={total}
        pagina={pagina}
        porPagina={POR_PAGINA_CLIENTES}
        conTamanos={false}
        etiquetaFilas={t.paginas}
        href={({ pagina: n }) =>
          conParametros("/clientes", actuales, {
            pagina: n && n > 1 ? String(n) : null,
          })
        }
      />
    </div>
  )
}
