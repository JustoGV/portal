"use client"
import { useEffect, useRef, useState } from "react"
import { Campo } from "./Campo"
import { useNavegacionLista } from "./NavegacionLista"

/**
 * Búsqueda en el servidor (docs/reglas/07 §5): 300 ms después de la última tecla cambia la URL, sin
 * repetir la entrada en cascada. Escape limpia.
 */
export function Busqueda({ etiqueta, valorInicial, href, autoFocus }: { etiqueta: string; valorInicial: string; href: (q: string) => string; autoFocus?: boolean }) {
  const { navegar } = useNavegacionLista()
  const [valor, setValor] = useState(valorInicial)
  const ultimo = useRef(valorInicial)
  const caja = useRef<HTMLDivElement>(null)

  // Si la búsqueda cambia desde afuera (el botón "Limpiar" de un vacío, o atrás y adelante), el campo la sigue.
  // Lo que cambia por escribir acá no entra (para entonces `ultimo` ya vale lo mismo), y con el foco en el
  // campo tampoco: una respuesta que llega tarde no pisa lo que se está escribiendo.
  useEffect(() => {
    if (valorInicial === ultimo.current || caja.current?.contains(document.activeElement)) return
    ultimo.current = valorInicial
    setValor(valorInicial)
  }, [valorInicial])

  useEffect(() => {
    const limpio = valor.replace(/\s+/gu, " ").trim()
    if (limpio === ultimo.current) return
    const t = window.setTimeout(() => {
      ultimo.current = limpio
      navegar(href(limpio))
    }, 300)
    return () => window.clearTimeout(t)
  }, [valor, href, navegar])

  return (
    <div
      ref={caja}
      onKeyDown={(e) => {
        if (e.key === "Escape" && valor) {
          e.stopPropagation()
          setValor("")
        }
      }}
    >
      <Campo etiqueta={etiqueta} name="q" valor={valor} alCambiar={setValor} icono="buscar" max={80} autoFocus={autoFocus} />
    </div>
  )
}
