"use client"
import { ArrowUpDown, Check, ChevronDown, X } from "lucide-react"
import { Button, ListBox, ListBoxItem, Popover, Select, SelectValue } from "react-aria-components"
import { useNavegacionLista } from "@/components/ui/NavegacionLista"
import { gsap, quieto } from "@/lib/gsap"

// Las piezas de una barra de filtros (D-033): las usan Clientes y Usuarios (D-034). Los estilos viven en
// styles/grupos.css (cl-menu, cl-pastilla).

export type Opcion = { valor: string; texto: string; href: string }

/** Un filtro de la barra: rótulo arriba y lo elegido abajo, del alto de un campo. Resaltado cuando filtra. */
/** `porDefecto`: el valor que no filtra (sin resaltado); por defecto «todos». */
export function Menu({ etiqueta, actual, opciones, neutro, icono, porDefecto = "todos" }: { etiqueta: string; actual: string; opciones: Opcion[]; neutro?: boolean; icono?: boolean; porDefecto?: string }) {
  const { navegar } = useNavegacionLista()
  return (
    <Select
      className="cl-menu"
      aria-label={etiqueta}
      selectedKey={actual}
      data-filtra={!neutro && actual !== porDefecto ? "" : undefined}
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
export function Pastilla({ texto, href, quitar }: { texto: string; href: string; quitar: string }) {
  return (
    <LinkNavegar className="cl-pastilla" href={href} etiqueta={quitar}>
      <span className="cl-pastilla__texto">{texto}</span>
      <X size={14} strokeWidth={2.25} aria-hidden="true" />
    </LinkNavegar>
  )
}

/** Un link que navega sin recargar y conserva el reacomodo de la grilla (NavegacionLista). */
export function LinkNavegar({ href, className, etiqueta, children }: { href: string; className: string; etiqueta?: string; children: React.ReactNode }) {
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

