"use client"
import { ArrowUpDown, Check, ChevronDown, X } from "lucide-react"
import { useCallback, type ReactNode } from "react"
import { Button, ListBox, ListBoxItem, Popover, Select, SelectValue } from "react-aria-components"
import { Busqueda } from "@/components/ui/Busqueda"
import { useNavegacionLista } from "@/components/ui/NavegacionLista"
import { Paginacion } from "@/components/ui/Paginacion"
import { grupos as t } from "@/i18n/es/grupos"
import { gsap, quieto } from "@/lib/gsap"
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
                <Pastilla texto={a.texto} href={a.href} />
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

type Opcion = { valor: string; texto: string; href: string }

/** Un filtro de la barra: rótulo arriba y lo elegido abajo, del alto de un campo. Resaltado cuando filtra. */
function Menu({ etiqueta, actual, opciones, neutro, icono }: { etiqueta: string; actual: string; opciones: Opcion[]; neutro?: boolean; icono?: boolean }) {
  const { navegar } = useNavegacionLista()
  return (
    <Select
      className="cl-menu"
      aria-label={etiqueta}
      selectedKey={actual}
      data-filtra={!neutro && actual !== "todos" ? "" : undefined}
      onSelectionChange={(k) => {
        const o = opciones.find((x) => x.valor === k)
        if (o && o.valor !== actual) navegar(o.href)
      }}
      onOpenChange={(abierto) => {
        if (!abierto || quieto()) return
        requestAnimationFrame(() => {
          const items = document.querySelectorAll(".cl-menu__lista .ui-lista__opcion")
          if (items.length)
            gsap.fromTo(
              items,
              { opacity: 0, y: -6 },
              {
                opacity: 1,
                y: 0,
                duration: 0.22,
                stagger: 0.02,
                ease: "power2.out",
                clearProps: "opacity,transform",
              },
            )
        })
      }}
    >
      <Button className="cl-menu__boton">
        {icono && <ArrowUpDown className="cl-menu__icono" size={18} strokeWidth={1.75} aria-hidden="true" />}
        <span className="cl-menu__textos">
          <span className="cl-menu__etiqueta" aria-hidden="true">
            {etiqueta}
          </span>
          <SelectValue className="cl-menu__valor">{({ selectedText }) => selectedText}</SelectValue>
        </span>
        <ChevronDown className="cl-menu__flecha" size={18} strokeWidth={1.75} aria-hidden="true" />
      </Button>
      <Popover className="ui-popover" offset={6} placement="bottom end">
        <ListBox className="ui-lista cl-menu__lista">
          {opciones.map((o) => (
            <ListBoxItem key={o.valor} id={o.valor} textValue={o.texto} className="ui-lista__opcion">
              <span className="ui-filtro__texto">{o.texto}</span>
              <Check className="ui-lista__tilde" size={18} strokeWidth={2} aria-hidden="true" />
            </ListBoxItem>
          ))}
        </ListBox>
      </Popover>
    </Select>
  )
}

/** Una pastilla de filtro activo: tocarla saca ese filtro. */
function Pastilla({ texto, href }: { texto: string; href: string }) {
  return (
    <LinkNavegar className="cl-pastilla" href={href} etiqueta={t.quitarFiltro(texto)}>
      <span className="cl-pastilla__texto">{texto}</span>
      <X size={14} strokeWidth={2.25} aria-hidden="true" />
    </LinkNavegar>
  )
}

/** Un link que navega sin recargar y conserva el reacomodo de la grilla (NavegacionLista). */
function LinkNavegar({ href, className, etiqueta, children }: { href: string; className: string; etiqueta?: string; children: React.ReactNode }) {
  const { navegar } = useNavegacionLista()
  return (
    <a
      className={className}
      href={href}
      aria-label={etiqueta}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return
        e.preventDefault()
        navegar(href)
      }}
    >
      {children}
    </a>
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
