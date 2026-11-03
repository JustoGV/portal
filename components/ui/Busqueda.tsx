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
