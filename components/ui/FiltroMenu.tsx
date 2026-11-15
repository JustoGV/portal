"use client"
import { Check, ChevronDown } from "lucide-react"
import { Button, Label, ListBox, ListBoxItem, Popover, Select, SelectValue } from "react-aria-components"
import { gsap, quieto } from "@/lib/gsap"
import { useNavegacionLista } from "./NavegacionLista"

export type OpcionFiltro = { valor: string; texto: string; cuenta?: number; href: string }

/**
 * Un filtro de la barra de herramientas como desplegable propio (docs/reglas/05 §3, 07 §4): muestra solo las
 * opciones que existen, cada una con su cantidad, y al elegir cambia la URL. Al abrirse, las opciones caen
 * una detrás de otra (como el `Desplegable` de EDV).
 */
export function FiltroMenu({ etiqueta, actual, opciones }: { etiqueta: string; actual: string; opciones: OpcionFiltro[] }) {
  const { navegar } = useNavegacionLista()
  return (
    <Select
      className="ui-filtro"
      selectedKey={actual}
      onSelectionChange={(k) => {
        const o = opciones.find((x) => x.valor === k)
        if (o && o.valor !== actual) navegar(o.href)
      }}
      onOpenChange={(abierto) => {
        if (!abierto || quieto()) return
        // La lista vive en otra capa: se busca recién cuando ya está pintada.
        requestAnimationFrame(() => {
          const items = document.querySelectorAll(".ui-filtro__lista .ui-lista__opcion")
          if (items.length) gsap.fromTo(items, { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: 0.22, stagger: 0.02, ease: "power2.out", clearProps: "opacity,transform" })
        })
      }}
    >
      <Label className="ui-filtro__etiqueta">{etiqueta}</Label>
      <Button className="ui-filtro__boton">
        <SelectValue>{({ selectedText }) => selectedText}</SelectValue>
        <ChevronDown size={18} strokeWidth={1.75} aria-hidden="true" />
      </Button>
      <Popover className="ui-popover" offset={6} placement="bottom start">
        <ListBox className="ui-lista ui-filtro__lista">
          {opciones.map((o) => (
            <ListBoxItem key={o.valor} id={o.valor} textValue={o.texto} className="ui-lista__opcion">
              <span className="ui-filtro__texto">{o.texto}</span>
              {o.cuenta !== undefined && <span className="ui-filtro__cuenta">{o.cuenta}</span>}
              <Check className="ui-lista__tilde" size={18} strokeWidth={2} aria-hidden="true" />
            </ListBoxItem>
          ))}
        </ListBox>
      </Popover>
    </Select>
  )
}
