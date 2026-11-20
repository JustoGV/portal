"use client"
// El marco de las pantallas de ingreso (WU-06, variante "Escenario" elegida por Mateo el 2026-11-12):
// fondo azul noche con haces de luz que lo cruzan despacio y una tarjeta de vidrio en el medio con la
// empresa, "Portal" y el título. Pedido de Mateo: "solamente el nombre de la compañía, portal abajo,
// inicio de sesión, nada más que eso". Referencias de la ronda: #6 Aceternity Background Beams y #4
// Aceternity Signup Form, rehechas con GSAP y CSS (Framer Motion no entra).
import { Fragment, useRef, type ReactNode } from "react"
import { IconoDuo, type IconoDuoApi } from "@/components/iconos/IconoDuo"
import { EASE, gsap, quieto, useGSAP } from "@/lib/gsap"
import { EMPRESA, PRODUCTO } from "@/lib/marca"
import { pegar } from "@/lib/texto"

// Curvas que cruzan la pantalla de abajo a la izquierda hacia arriba a la derecha.
const HACES = Array.from({ length: 9 }, (_, i) => {
  const d = i * 46
  return `M${-120 + d} ${980 - d * 0.2} C ${260 + d} ${720 - d * 0.6}, ${720 + d} ${560 - d * 0.4}, ${1600 + d * 0.3} ${-120 + d * 0.5}`
})

type Props = { titulo: string; bajada?: string; aviso?: ReactNode; ancha?: boolean; children: ReactNode }

export function Escenario({ titulo, bajada, aviso, ancha, children }: Props) {
  const raiz = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      if (quieto()) return
      gsap
        .timeline({ defaults: { ease: EASE } })
        .from(".esc__haces", { opacity: 0, duration: 1.2 })
        .from(".esc__tarjeta", { y: 32, scale: 0.97, opacity: 0, duration: 0.8 }, 0.1)
        .from(".esc__palabra", { yPercent: 110, opacity: 0, duration: 0.7, stagger: 0.05 }, 0.3)
        .from(".esc__aparece", { y: 12, opacity: 0, duration: 0.5, stagger: 0.07 }, 0.45)
      // La luz corre por cada haz, cada uno a su ritmo. Lenta: es un fondo, no un aviso.
      gsap.utils.toArray<SVGPathElement>(".esc__luz").forEach((p, i) => {
        gsap.fromTo(p, { drawSVG: "0% 0%" }, { drawSVG: "70% 100%", duration: 5 + (i % 4), repeat: -1, ease: "none", delay: i * 0.6 })
      })
    },
    { scope: raiz },
  )

  const palabras = pegar(titulo).split(" ")

  return (
    <main ref={raiz} className="esc">
      <svg className="esc__haces" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id="esc-luz" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#3061d8" stopOpacity="0" />
            <stop offset="0.5" stopColor="#6f9bff" />
            <stop offset="1" stopColor="#7ee0ff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {HACES.map((d) => (
          <path key={d} d={d} className="esc__haz" />
        ))}
        {HACES.map((d) => (
          <path key={`l${d}`} d={d} className="esc__luz" stroke="url(#esc-luz)" />
        ))}
      </svg>
      <div className="esc__resplandor" aria-hidden="true" />

      <section className={ancha ? "esc__tarjeta esc__tarjeta--ancha" : "esc__tarjeta"} aria-labelledby="esc-titulo">
        {/* Corrección de Mateo (2026-11-12): el nombre más grande, con "Portal", y sin el ícono de carpeta. */}
        <div className="esc__marca esc__aparece">
          <span className="esc__empresa">{EMPRESA}</span>
          <span className="esc__producto">{PRODUCTO}</span>
        </div>
        <h1 id="esc-titulo" className="esc__titulo">
          {palabras.map((p, i) => (
            <Fragment key={i}>
              <span className="esc__mascara">
                <span className="esc__palabra">{p}</span>
              </span>
              {i < palabras.length - 1 ? " " : null}
            </Fragment>
          ))}
        </h1>
        {bajada && <p className="esc__bajada esc__aparece">{pegar(bajada)}</p>}
        {aviso && <div className="esc__aparece">{aviso}</div>}
        <div className="esc__aparece">{children}</div>
      </section>
    </main>
  )
}

/** Un aviso dentro de la tarjeta (sesión vencida, cuenta desactivada, cuenta creada): palabra + ícono. */
export function AvisoEscenario({ tono, icono, children }: { tono: "info" | "warn" | "ok"; icono: "reloj" | "alerta" | "tilde"; children: string }) {
  const api = useRef<IconoDuoApi>(null)
  useGSAP(() => {
    gsap.delayedCall(0.6, () => api.current?.animar("entrar"))
  })
  return (
    <div className="esc__aviso" data-tono={tono} role="status">
      <IconoDuo ref={api} nombre={icono} tamano={20} />
      <span>{pegar(children)}</span>
    </div>
  )
}
