"use client"
import { useEffect, useRef, type ReactNode } from "react"
import { useNavegacionLista } from "./NavegacionLista"

/**
 * La caja de una tabla (docs/reglas/07 §1–2): enfocable, scrollea con las flechas, entra en cascada una
 * vez por montaje (al entrar y al cambiar de filtro, que la remonta con otra key), nunca en un refresco.
 */
export function CajaTabla({ etiqueta, filas, children }: { etiqueta: string; filas: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const { pendiente } = useNavegacionLista()
  useEffect(() => {
    const t = window.setTimeout(() => ref.current?.classList.remove("llega"), 1800)
    return () => window.clearTimeout(t)
  }, [])
  const paso = filas > 1 ? Math.min(0.25, 1 / (Math.min(filas, 15) - 1)) : 0
  return (
    <div
      ref={ref}
      className="ui-tabla-caja llega"
      role="region"
      aria-label={etiqueta}
      tabIndex={0}
      aria-busy={pendiente || undefined}
      style={{ "--paso": `${paso}s` } as React.CSSProperties}
    >
      {children}
    </div>
  )
}
