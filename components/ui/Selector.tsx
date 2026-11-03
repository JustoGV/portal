"use client"
import { useRef } from "react"
import { Button, Label, ListBox, ListBoxItem, Popover, Select, SelectValue } from "react-aria-components"
import { ChevronDown, Check } from "lucide-react"
import { Icono } from "@/components/iconos/Icono"
import type { NombreIcono } from "@/components/iconos/trazos"
import { escribirIconos } from "@/lib/gsap"

type Opcion = { id: string; texto: string }

/** Select diseñado (React Aria), nunca el nativo (docs/reglas/05 §3). */
export function Selector({ etiqueta, name, opciones, valor, alCambiar, icono }: { etiqueta: string; name: string; opciones: Opcion[]; valor: string; alCambiar: (v: string) => void; icono?: NombreIcono }) {
  const raiz = useRef<HTMLDivElement>(null)
  return (
    <Select
      ref={raiz}
      name={name}
      selectedKey={valor}
      onSelectionChange={(k) => k !== null && alCambiar(String(k))}
      onOpenChange={(abierto) => abierto && escribirIconos(raiz.current)}
      className="ui-campo"
      data-con-icono={icono ? "" : undefined}
      data-arriba=""
    >
      <div className="ui-campo__control">
        {icono && <Icono nombre={icono} className="ui-campo__icono" />}
        <Button className="ui-select__boton" data-campo="">
          <SelectValue>{({ selectedText }) => selectedText}</SelectValue>
          <ChevronDown size={20} strokeWidth={1.75} aria-hidden="true" />
        </Button>
        <Label className="ui-campo__etiqueta">{etiqueta}</Label>
      </div>
      <div className="ui-campo__pie" />
      <Popover className="ui-popover" offset={6}>
        <ListBox className="ui-lista">
          {opciones.map((o) => (
            <ListBoxItem key={o.id} id={o.id} textValue={o.texto} className="ui-lista__opcion">
              {o.texto}
              <Check className="ui-lista__tilde" size={18} strokeWidth={2} aria-hidden="true" />
            </ListBoxItem>
          ))}
        </ListBox>
      </Popover>
    </Select>
  )
}
