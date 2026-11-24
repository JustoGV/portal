"use client"
import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { gsap, quieto } from "@/lib/gsap"

// Gráficos del Inicio, dibujados en SVG propio (sin librería: docs/reglas/09 §5 y graficos.md). Se dibujan una
// vez al entrar (la pantalla ya tiene entrada, D-036); al pasar el mouse o tocar muestran el valor exacto.
// Con movimiento reducido quedan quietos.

// Nombres propios y no Intl: el servidor y el navegador traen distinto ICU («sept» contra «sep») y la página
// no coincidía al hidratar.
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
const DIAS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"]
const partes = (fecha: string) => new Date(`${fecha.slice(0, 10)}T12:00:00Z`)
/** «16 nov» para una fecha sin hora («2026-11-16»). */
export const diaCorto = (fecha: string) => `${partes(fecha).getUTCDate()} ${MESES[partes(fecha).getUTCMonth()]}`
export const mesDe = (fecha: string) => MESES[partes(fecha).getUTCMonth()]!
export const diaDeSemana = (fecha: string) => DIAS[partes(fecha).getUTCDay()]!

/** Un número entero que cuenta desde 0 al entrar (0,9 s). */
export function Cifra({ valor, className }: { valor: number; className?: string }) {
  const el = useRef<HTMLSpanElement>(null)
  useLayoutEffect(() => {
    const e = el.current
    if (!e || quieto() || valor === 0) return
    const o = { v: 0 }
    const tw = gsap.to(o, { v: valor, duration: 0.9, ease: "power2.out", delay: 0.2, onUpdate: () => void (e.textContent = String(Math.round(o.v))) })
    return () => {
      tw.kill()
      e.textContent = String(valor)
    }
  }, [valor])
  return (
    <span ref={el} className={className}>
      {valor}
    </span>
  )
}

/** El cartelito del valor exacto: sigue al punto que se señala, sin flecha (app-screens §6.4). */
function Globo({ x, y, children }: { x: number; y: number; children: ReactNode }) {
  return (
    <span className="in-globo" style={{ left: `${x}%`, top: `${y}%` }} role="status">
      {children}
    </span>
  )
}

// ---------- Barras verticales, con el valor al señalar ----------

export function Barras({ valores, etiquetas, detalle, resaltar, className, textos }: { valores: number[]; etiquetas: string[]; detalle: (i: number) => string; resaltar?: number; className?: string; textos?: string[] }) {
  const caja = useRef<HTMLDivElement>(null)
  const [punto, setPunto] = useState<number | null>(null)
  const max = Math.max(1, ...valores)
  useLayoutEffect(() => {
    const c = caja.current
    if (!c || quieto()) return
    const tw = gsap.fromTo(c.querySelectorAll(".in-barras__barra"), { scaleY: 0 }, { scaleY: 1, duration: 0.7, stagger: 0.05, ease: "power3.out", delay: 0.2, clearProps: "transform" })
    return () => void tw.progress(1).kill()
  }, [valores])
  return (
    <div ref={caja} className={`in-barras ${className ?? ""}`} onPointerLeave={() => setPunto(null)}>
      {valores.map((v, i) => (
        <button
          key={etiquetas[i]}
          type="button"
          className="in-barras__col"
          aria-label={detalle(i)}
          data-resaltada={i === resaltar || undefined}
          onPointerEnter={() => setPunto(i)}
          onFocus={() => setPunto(i)}
          onBlur={() => setPunto(null)}
          onClick={() => setPunto(i)}
        >
          <span className="in-barras__pista">
            {textos && (
              <span className="in-barras__texto" aria-hidden="true">
                {textos[i]}
              </span>
            )}
            <span className="in-barras__barra" data-cero={v === 0 || undefined} style={{ height: `${v === 0 ? 0 : Math.max(4, (v / max) * 100)}%` }} />
          </span>
          <span className="in-barras__etiqueta" aria-hidden="true">
            {etiquetas[i]}
          </span>
          {punto === i && (
            <span className="in-globo in-globo--barra" role="status">
              {detalle(i)}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

// ---------- Línea con su área, que se dibuja de izquierda a derecha ----------

export function Linea({ valores, etiquetas, detalle, desde, hasta }: { valores: number[]; etiquetas: string[]; detalle: (i: number) => string; desde?: string; hasta?: string }) {
  const caja = useRef<HTMLDivElement>(null)
  const [punto, setPunto] = useState<number | null>(null)
  const id = useId().replace(/:/g, "")
  const A = 600
  const H = 160
  // La escala termina en un número redondo arriba del máximo (app-screens §6.3): 4, 8, 20, 40, 80…
  const pico = Math.max(1, ...valores)
  const paso = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500].find((x) => x * 4 >= pico) ?? Math.ceil(pico / 4)
  const max = paso * 4
  const pts = valores.map((v, i) => [valores.length === 1 ? A / 2 : (i * A) / (valores.length - 1), H - 8 - (v / max) * (H - 24)] as [number, number])
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x},${y}`).join(" ")
  useLayoutEffect(() => {
    const c = caja.current
    if (!c || quieto()) return
    const tl = gsap.timeline({ delay: 0.25 })
    tl.fromTo(c.querySelector(".in-linea__trazo"), { drawSVG: "0%" }, { drawSVG: "100%", duration: 1.2, ease: "power2.inOut" })
    tl.fromTo(c.querySelector(".in-linea__area"), { opacity: 0 }, { opacity: 1, duration: 0.6 }, 0.6)
    return () => void tl.progress(1).kill()
  }, [d])
  return (
    <div className="in-linea-caja">
    <div className="in-linea__escala" aria-hidden="true">
      {[4, 3, 2, 1, 0].map((k) => (
        <span key={k}>{paso * k}</span>
      ))}
    </div>
    <div ref={caja} className="in-linea" onPointerLeave={() => setPunto(null)}>
      <svg viewBox={`0 0 ${A} ${H}`} preserveAspectRatio="none" className="in-linea__svg" aria-hidden="true">
        <defs>
          <linearGradient id={`area-${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="currentColor" stopOpacity="0.32" />
            <stop offset="1" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((k) => {
          const y = H - 8 - ((paso * (k + 1)) / max) * (H - 24)
          return <line key={k} x1="0" x2={A} y1={y} y2={y} className="in-linea__grilla" />
        })}
        <path d={`${d} L${A},${H} L0,${H} Z`} fill={`url(#area-${id})`} className="in-linea__area" />
        <path d={d} className="in-linea__trazo" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="in-linea__zonas">
        {valores.map((_, i) => (
          <button
            key={etiquetas[i]}
            type="button"
            className="in-linea__zona"
            aria-label={detalle(i)}
            onPointerEnter={() => setPunto(i)}
            onFocus={() => setPunto(i)}
            onBlur={() => setPunto(null)}
            onClick={() => setPunto(i)}
          />
        ))}
      </div>
      {punto !== null && (
        <>
          <span className="in-linea__punto" style={{ left: `${(pts[punto]![0] / A) * 100}%`, top: `${(pts[punto]![1] / H) * 100}%` }} aria-hidden="true" />
          <Globo x={(pts[punto]![0] / A) * 100} y={0}>
            {detalle(punto)}
          </Globo>
        </>
      )}
    </div>
    {desde && hasta && (
      <div className="in-linea__fechas" aria-hidden="true">
        <span>{desde}</span>
        <span>{hasta}</span>
      </div>
    )}
    </div>
  )
}

/** Una fila de rayitas: las primeras en color hasta la proporción (como «Goals» y «Free cash»). */
export function Rayitas({ proporcion, n = 32, etiqueta }: { proporcion: number; n?: number; etiqueta: string }) {
  const caja = useRef<HTMLSpanElement>(null)
  const llenas = Math.round(Math.min(1, Math.max(0, proporcion)) * n)
  useLayoutEffect(() => {
    const c = caja.current
    if (!c || quieto() || llenas === 0) return
    const tw = gsap.fromTo(c.querySelectorAll("[data-llena]"), { scaleY: 0.2 }, { scaleY: 1, duration: 0.35, stagger: 0.015, delay: 0.3, ease: "power2.out", clearProps: "transform" })
    return () => void tw.progress(1).kill()
  }, [llenas])
  return (
    <span ref={caja} className="in-rayitas" role="img" aria-label={etiqueta}>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className="in-rayitas__r" data-llena={i < llenas || undefined} />
      ))}
    </span>
  )
}
