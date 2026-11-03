"use client"
import { useEffect, useRef, type ReactNode } from "react"

/**
 * La entrada de una pantalla (docs/reglas/08 §2.2): CSS bajo la clase `llega`, que está desde el primer
 * cuadro y se saca a los 2 s, así no se repite con ningún cambio posterior.
 */
export function Llegada({ children, className, como = "div" }: { children: ReactNode; className?: string; como?: "div" | "main" }) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const t = window.setTimeout(() => ref.current?.classList.remove("llega"), 2000)
    return () => window.clearTimeout(t)
  }, [])
  const Etiqueta = como
  return (
    <Etiqueta ref={ref as React.RefObject<HTMLDivElement>} className={`llega${className ? ` ${className}` : ""}`}>
      {children}
    </Etiqueta>
  )
}
