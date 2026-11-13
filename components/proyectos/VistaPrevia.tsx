"use client"
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react"
import { Icono } from "@/components/iconos/Icono"
import { proyectos as t } from "@/i18n/es/proyectos"
import { conHover, EASE, gsap, quieto, useGSAP } from "@/lib/gsap"
import type { FilaProyecto } from "@/lib/proyecto"
import { pegar } from "@/lib/texto"
import { sitioDe } from "@/lib/url"

/**
 * La tarjeta que sigue al mouse sobre la lista de proyectos (referencia #5, D-017): el link completo y la
 * descripción entera, que en la fila se corta. Solo con mouse: en un dispositivo táctil no existe y la fila
 * abre el proyecto al tocarla. El movimiento va con quickTo, nunca con estado de React por cada movimiento.
 * Es decorativa (aria-hidden): el nombre accesible del link ya dice todo.
 */
type Api = { mostrar: (p: FilaProyecto, e: PointerEvent | React.PointerEvent) => void; mover: (e: React.PointerEvent) => void; ocultar: () => void }

const Contexto = createContext<Api>({ mostrar: () => {}, mover: () => {}, ocultar: () => {} })
export const useVistaPrevia = () => useContext(Contexto)

const SEPARACION = 20
const MARGEN = 12

export function VistaPrevia({ children }: { children: ReactNode }) {
  const tarjeta = useRef<HTMLDivElement>(null)
  const [p, setP] = useState<FilaProyecto | null>(null)
  const mueveX = useRef<gsap.QuickToFunc | null>(null)
  const mueveY = useRef<gsap.QuickToFunc | null>(null)
  const visible = useRef(false)

  useGSAP(() => {
    if (!tarjeta.current) return
    const d = quieto() ? 0 : 0.35
    mueveX.current = gsap.quickTo(tarjeta.current, "x", { duration: d, ease: EASE })
    mueveY.current = gsap.quickTo(tarjeta.current, "y", { duration: d, ease: EASE })
  })

  /** La posición junto al puntero, sin salirse de la ventana: si no entra a la derecha o abajo, va del otro lado. */
  const destino = (cx: number, cy: number) => {
    const el = tarjeta.current
    const w = el?.offsetWidth ?? 320
    const h = el?.offsetHeight ?? 120
    let x = cx + SEPARACION
    let y = cy + SEPARACION
    if (x + w > innerWidth - MARGEN) x = cx - SEPARACION - w
    if (y + h > innerHeight - MARGEN) y = cy - SEPARACION - h
    return { x: Math.max(MARGEN, x), y: Math.max(MARGEN, y) }
  }

  const mostrar = useCallback<Api["mostrar"]>((fila, e) => {
    if (!conHover() || !tarjeta.current) return
    setP(fila)
    const { x, y } = destino(e.clientX, e.clientY)
    if (!visible.current) {
      // Entra desde donde está el mouse, sin viajar desde la última fila.
      gsap.set(tarjeta.current, { x, y })
      gsap.to(tarjeta.current, { autoAlpha: 1, scale: 1, duration: quieto() ? 0 : 0.2, ease: EASE, overwrite: "auto" })
      visible.current = true
    } else {
      mueveX.current?.(x)
      mueveY.current?.(y)
    }
  }, [])

  const mover = useCallback<Api["mover"]>((e) => {
    if (!visible.current) return
    const { x, y } = destino(e.clientX, e.clientY)
    mueveX.current?.(x)
    mueveY.current?.(y)
  }, [])

  const ocultar = useCallback(() => {
    if (!visible.current || !tarjeta.current) return
    visible.current = false
    gsap.to(tarjeta.current, { autoAlpha: 0, scale: 0.96, duration: quieto() ? 0 : 0.15, ease: EASE, overwrite: "auto" })
  }, [])

  return (
    <Contexto.Provider value={{ mostrar, mover, ocultar }}>
      {children}
      <div ref={tarjeta} className="pr-previa" aria-hidden="true">
        {p && (
          <>
            <p className="pr-previa__sitio">{sitioDe(p.url).split("/")[0]}</p>
            <p className="pr-previa__url">{p.url}</p>
            {p.descripcion && <p className="pr-previa__descripcion">{pegar(p.descripcion)}</p>}
            <p className="pr-previa__pie">
              <Icono nombre="abrir" tamano={16} />
              {t.abreOtraPestana}
            </p>
          </>
        )}
      </div>
    </Contexto.Provider>
  )
}
