"use client"
import { ChevronDown, Check } from "lucide-react"
import { useRef } from "react"
import { Button, ComboBox, Input, Label, ListBox, ListBoxItem, Popover } from "react-aria-components"
import { Icono } from "@/components/iconos/Icono"
import { proyectos as t } from "@/i18n/es/proyectos"
import { escribirIconos } from "@/lib/gsap"
import { NOMBRE_GRUPO_MAX } from "@/lib/nombre"
import { limpiarTexto } from "@/lib/texto"

export type Grupo = { id: string; nombre: string }

const sinAcentos = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()

/**
 * El grupo de un proyecto: se elige uno o se escribe uno nuevo (D-005). Lo que se escribe decide: si
 * coincide con un grupo, es ese; si no, se crea al guardar (y se dice antes, docs/reglas/02 A §2.3).
 */
export function ComboGrupo({ grupos, texto, alCambiar, error }: { grupos: Grupo[]; texto: string; alCambiar: (texto: string) => void; error?: string }) {
  const raiz = useRef<HTMLDivElement>(null)
  const limpio = limpiarTexto(texto)
  const exacto = grupos.find((g) => g.nombre.toLowerCase() === limpio.toLowerCase())
  const q = sinAcentos(limpio)
  const visibles = q ? grupos.filter((g) => sinAcentos(g.nombre).includes(q)) : grupos
  const items = [...visibles.map((g) => ({ id: g.id, texto: g.nombre, crear: false })), ...(limpio && !exacto ? [{ id: "__crear", texto: t.grupoCrear(limpio), crear: true }] : [])]
  const ayuda = limpio && !exacto ? t.grupoNuevo(limpio) : t.grupoAyuda

  return (
    <ComboBox
      ref={raiz}
      className="ui-campo"
      data-con-icono=""
      data-error={error ? "" : undefined}
      data-ok={exacto ? "" : undefined}
      inputValue={texto}
      onInputChange={(v) => alCambiar(v.slice(0, NOMBRE_GRUPO_MAX))}
      selectedKey={exacto?.id ?? null}
      onSelectionChange={(k) => {
        if (k === null) return
        if (k === "__crear") return alCambiar(limpio)
        const g = grupos.find((x) => x.id === k)
        if (g) alCambiar(g.nombre)
      }}
      items={items}
      allowsCustomValue
      allowsEmptyCollection
      menuTrigger="focus"
      onFocus={() => escribirIconos(raiz.current)}
    >
      <div className="ui-campo__control">
        <Icono nombre="carpeta" className="ui-campo__icono" />
        <Input className="ui-campo__entrada" placeholder=" " maxLength={NOMBRE_GRUPO_MAX} />
        <Label className="ui-campo__etiqueta">{t.grupoCampo}</Label>
        <Button className="ui-combo__boton" aria-label="Ver los grupos">
          <ChevronDown size={20} strokeWidth={1.75} aria-hidden="true" />
        </Button>
      </div>
      <div className="ui-campo__pie">
        {error ? (
          <span className="ui-campo__error" role="alert">
            {error}
          </span>
        ) : (
          <span className="ui-campo__ayuda">{ayuda}</span>
        )}
      </div>
      <Popover className="ui-popover" offset={6}>
        <ListBox className="ui-lista" renderEmptyState={() => <p className="ui-lista__vacia">{t.grupoVacio}</p>}>
          {(i: (typeof items)[number]) => (
            <ListBoxItem id={i.id} textValue={i.texto} className={`ui-lista__opcion${i.crear ? " ui-lista__crear" : ""}`}>
              {i.crear ? <Icono nombre="agregar" /> : null}
              {i.texto}
              {!i.crear && <Check className="ui-lista__tilde" size={18} strokeWidth={2} aria-hidden="true" />}
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
    </ComboBox>
  )
}
