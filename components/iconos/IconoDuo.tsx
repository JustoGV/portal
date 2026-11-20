"use client"
// Íconos propios a dos colores con el movimiento de Lordicon (D-018). Nacieron en WU-06 · Ingreso.
// Referencia: el estilo "wired outline" de lordicon.com (lock, wired-outline-94: arco y cerradura en acento, cuerpo oscuro) (trazo oscuro + partes en color de acento, cada
// parte se mueve por separado). Cada ícono anota de cuál salió su animación.
// Color 1 (`--duo-1`): el trazo principal. Color 2 (`--duo-2`): las partes que cuentan qué hace.
import { forwardRef, useImperativeHandle, useRef } from "react"
import { EASE, gsap, quieto } from "@/lib/gsap"

export type NombreDuo = "sobre" | "candado" | "ojo" | "flecha" | "tilde" | "carpeta" | "alerta" | "lupa" | "abrir" | "archivo" | "persona" | "llave" | "reloj" | "grupos" | "personas" | "salir" | "panel" | "tablero" | "inicio" | "escudo" | "pico" | "cruz"

export type IconoDuoApi = { animar: (variante?: "entrar" | "foco" | "alternar") => void }

type Props = { nombre: NombreDuo; tamano?: number; tachado?: boolean; className?: string }

const C1 = { stroke: "var(--duo-1, currentColor)" }
const C2 = { stroke: "var(--duo-2, var(--sys-marca-tinta))" }

/** Los dibujos: grupos con data-parte para mover cada parte por separado. viewBox 24. */
function Dibujo({ nombre, tachado }: { nombre: NombreDuo; tachado?: boolean }) {
  switch (nombre) {
    // Patrón "wired outline" de lordicon (sin abrir el ícono puntual): el sobre se abre y la carta asoma.
    case "sobre":
      return (
        <>
          <path data-parte="carta" style={C2} d="M7.5 9.5V5.5h9v4" />
          <rect data-parte="cuerpo" style={C1} x="3" y="7.5" width="18" height="12" rx="2" />
          <path data-parte="solapa" style={C2} d="M3.5 8.5l8.5 6 8.5-6" />
        </>
      )
    // lordicon "wired-outline-94-lock" (abierto 2026-11-12), animación "locked": el arco baja y rebota, la cerradura late.
    case "candado":
      return (
        <>
          <path data-parte="arco" style={C2} d="M8 11V8a4 4 0 0 1 8 0v3" />
          <rect data-parte="cuerpo" style={C1} x="5" y="11" width="14" height="10" rx="2" />
          <rect data-parte="cerradura" style={C2} x="10.5" y="14.5" width="3" height="3" rx="0.5" />
        </>
      )
    // Patrón "wired outline" de lordicon (sin abrir el ícono puntual): el párpado parpadea y la pupila mira; al ocultar, la raya se escribe.
    case "ojo":
      return (
        <>
          <g data-parte="parpado">
            <path style={C1} d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
            <circle data-parte="pupila" style={C2} cx="12" cy="12" r="2.75" />
          </g>
          <path data-parte="raya" style={{ ...C2, opacity: tachado ? 1 : 0 }} d="M4 4l16 16" />
        </>
      )
    // Patrón "wired outline" de lordicon (sin abrir el ícono puntual): la flecha sale por la derecha y vuelve por la izquierda.
    case "flecha":
      return (
        <>
          <path data-parte="cola" style={C1} d="M4 12h14" />
          <path data-parte="punta" style={C2} d="M13 6.5l5.5 5.5-5.5 5.5" />
        </>
      )
    // Patrón "wired outline" de lordicon (sin abrir el ícono puntual): el aro se dibuja y entra el tilde.
    case "tilde":
      return (
        <>
          <circle data-parte="aro" style={C1} cx="12" cy="12" r="9" />
          <path data-parte="marca" style={C2} d="M8 12.5l2.75 2.75L16.5 9.5" />
        </>
      )
    // Patrón "wired outline" de lordicon (sin abrir el ícono puntual): la tapa se levanta y un papel asoma.
    case "carpeta":
      return (
        <>
          <path data-parte="papel" style={C2} d="M7 9V6.5h10V9" />
          <path data-parte="cuerpo" style={C1} d="M3 8.5a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
          <path data-parte="tapa" style={C2} d="M3.5 12h17" />
        </>
      )
    // Patrón "wired outline" de lordicon (sin abrir el ícono puntual): el triángulo se dibuja y el signo se balancea.
    case "alerta":
      return (
        <>
          <path data-parte="aro" style={C1} d="M10.3 4.2 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0Z" />
          <g data-parte="signo">
            <path style={C2} d="M12 9.5v4" />
            <path style={C2} d="M12 16.8v.01" />
          </g>
        </>
      )
    // Patrón "wired outline" de lordicon (sin abrir el ícono puntual): la lente busca y el mango gira.
    case "lupa":
      return (
        <>
          <circle data-parte="lente" style={C1} cx="10.5" cy="10.5" r="6.5" />
          <path data-parte="brillo" style={C2} d="M7.5 9a3.2 3.2 0 0 1 2.5-2.4" />
          <path data-parte="mango" style={C2} d="M15.5 15.5 20.5 20.5" />
        </>
      )
    // Patrón "wired outline" de lordicon (sin abrir el ícono puntual): la flecha sale de la caja.
    case "abrir":
      return (
        <>
          <path data-parte="caja" style={C1} d="M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" />
          <g data-parte="flecha">
            <path style={C2} d="M14 4h6v6" />
            <path style={C2} d="M20 4l-9 9" />
          </g>
        </>
      )
    // Patrón "wired outline" de lordicon (sin abrir el ícono puntual): la tapa se levanta y vuelve a cerrar.
    case "archivo":
      return (
        <>
          <rect data-parte="tapa" style={C2} x="3" y="4" width="18" height="4.5" rx="1" />
          <path data-parte="cuerpo" style={C1} d="M5 8.5V18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5" />
          <path data-parte="asa" style={C2} d="M10 12.5h4" />
        </>
      )
    // Patrón "wired outline" de lordicon (sin abrir el ícono puntual): la cabeza asiente.
    case "persona":
      return (
        <>
          <circle data-parte="cabeza" style={C2} cx="12" cy="8" r="3.75" />
          <path data-parte="cuerpo" style={C1} d="M4.5 20.5a7.5 7.5 0 0 1 15 0" />
        </>
      )
    // Patrón "wired outline" de lordicon (sin abrir el ícono puntual): la llave gira como en una cerradura.
    case "llave":
      return (
        <>
          <circle data-parte="ojo" style={C1} cx="7.5" cy="15.5" r="4" />
          <path data-parte="cana" style={C2} d="M10.5 12.5 20 3" />
          <path data-parte="dientes" style={C2} d="M16.5 6.5l2.5 2.5M14 9l2 2" />
        </>
      )
    // Patrón "wired outline" de lordicon (sin abrir el ícono puntual): la aguja da una vuelta.
    case "reloj":
      return (
        <>
          <circle data-parte="aro" style={C1} cx="12" cy="12" r="9" />
          <path data-parte="agujas" style={C2} d="M12 7.5V12l3 2" />
        </>
      )
    // Patrón "wired outline" de lordicon (sin abrir el ícono puntual): las casillas se acomodan y la última entra.
    case "grupos":
      return (
        <>
          <rect data-parte="c1" style={C1} x="3.5" y="3.5" width="7" height="7" rx="1.5" />
          <rect data-parte="c2" style={C1} x="13.5" y="3.5" width="7" height="7" rx="1.5" />
          <rect data-parte="c3" style={C1} x="3.5" y="13.5" width="7" height="7" rx="1.5" />
          <path data-parte="mas" style={C2} d="M17 14v6M14 17h6" />
        </>
      )
    // Patrón "wired outline" de lordicon (sin abrir el ícono puntual): las dos cabezas asienten una tras otra.
    case "personas":
      return (
        <>
          <circle data-parte="cabeza1" style={C1} cx="9" cy="8" r="3.25" />
          <path data-parte="cuerpo1" style={C1} d="M3 19.5a6 6 0 0 1 12 0" />
          <circle data-parte="cabeza2" style={C2} cx="16.5" cy="9" r="2.6" />
          <path data-parte="cuerpo2" style={C2} d="M15.5 14.2A5 5 0 0 1 21 19.5" />
        </>
      )
    // Patrón "wired outline" de lordicon (sin abrir el ícono puntual): la flecha sale por la puerta.
    case "salir":
      return (
        <>
          <path data-parte="puerta" style={C1} d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
          <g data-parte="flecha">
            <path style={C2} d="M14 8l4 4-4 4" />
            <path style={C2} d="M18 12H9" />
          </g>
        </>
      )
    // Patrón "wired outline" de lordicon (sin abrir el ícono puntual): la columna del panel se corre.
    case "panel":
      return (
        <>
          <rect data-parte="marco" style={C1} x="3" y="4" width="18" height="16" rx="2" />
          <path data-parte="columna" style={C2} d="M9 4.5v15" />
        </>
      )
    // El tablero de trabajo: tres listas con sus tarjetas.
    case "tablero":
      return (
        <>
          <rect data-parte="marco" style={C1} x="3" y="4" width="18" height="16" rx="2" />
          <path data-parte="t1" style={C2} d="M6.5 8h2.5M6.5 11h2.5" />
          <path data-parte="t2" style={C2} d="M11 8h2.5" />
          <path data-parte="t3" style={C2} d="M15.5 8h2M15.5 11h2M15.5 14h2" />
        </>
      )
    // Patrón "wired outline" de lordicon (sin abrir el ícono puntual): el techo se asienta y la puerta se dibuja.
    case "inicio":
      return (
        <>
          <path data-parte="casa" style={C1} d="M5 10.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19v-8.5" />
          <path data-parte="techo" style={C1} d="M3 11.5l9-7.5 9 7.5" />
          <path data-parte="puerta" style={C2} d="M9.75 20.5v-5.5h4.5v5.5" />
        </>
      )
    // Patrón "wired outline" de lordicon (sin abrir el ícono puntual): el escudo late y el tilde se escribe.
    case "escudo":
      return (
        <>
          <path data-parte="escudo" style={C1} d="M12 3.5l7.5 2.75v5.5c0 4.5-3 7.75-7.5 9-4.5-1.25-7.5-4.5-7.5-9v-5.5L12 3.5Z" />
          <path data-parte="marca" style={C2} d="M8.75 12l2.25 2.25 4.25-4.5" />
        </>
      )
    // El pico que dice si una sección está abierta. Lo gira el CSS (.bl__pico); no tiene animación propia.
    // Patrón "wired outline" de lordicon (sin abrir el ícono puntual): el aro se dibuja y las dos rayas de la cruz se escriben, una tras otra.
    case "cruz":
      return (
        <>
          <circle data-parte="aro" style={C1} cx="12" cy="12" r="9" />
          <path data-parte="raya1" style={C2} d="M8.75 8.75l6.5 6.5" />
          <path data-parte="raya2" style={C2} d="M15.25 8.75l-6.5 6.5" />
        </>
      )
    case "pico":
      return <path data-parte="pico" style={C1} d="M9.5 6.5l5.5 5.5-5.5 5.5" />
  }
}

export const IconoDuo = forwardRef<IconoDuoApi, Props>(function IconoDuo({ nombre, tamano = 24, tachado, className }, ref) {
  const svg = useRef<SVGSVGElement>(null)
  const parte = (n: string) => svg.current?.querySelector<SVGElement>(`[data-parte="${n}"]`) ?? null

  useImperativeHandle(ref, () => ({
    animar(variante = "foco") {
      const s = svg.current
      if (!s || quieto() || !s.getClientRects().length) return
      const tl = gsap.timeline({ defaults: { ease: EASE } })
      switch (nombre) {
        case "sobre":
          tl.fromTo(parte("solapa"), { scaleY: 1 }, { scaleY: -1, transformOrigin: "50% 0%", duration: 0.22, yoyo: true, repeat: 1, ease: "power2.inOut" })
            .fromTo(parte("carta"), { y: 3, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3 }, 0.12)
          break
        case "candado":
          tl.fromTo(parte("arco"), { y: -3.5 }, { y: 0, duration: 0.5, ease: "bounce.out" })
            .fromTo(parte("cerradura"), { scale: 0.4, transformOrigin: "50% 50%" }, { scale: 1, duration: 0.35, ease: "back.out(3)" }, 0.25)
          if (variante === "entrar") tl.fromTo(s, { rotate: -8 }, { rotate: 0, duration: 0.5 }, 0)
          break
        case "ojo":
          tl.to(parte("parpado"), { scaleY: 0.12, transformOrigin: "50% 50%", duration: 0.09, yoyo: true, repeat: 1, ease: "power1.in" })
            .fromTo(parte("pupila"), { x: -1.5 }, { x: 0, duration: 0.35 }, 0.1)
          if (variante === "alternar") {
            const raya = parte("raya")
            if (raya) tl.fromTo(raya, { drawSVG: "0% 0%", opacity: 1 }, { drawSVG: "0% 100%", duration: 0.3 }, 0.12)
          }
          break
        case "flecha":
          tl.to(parte("punta"), { x: 8, opacity: 0, duration: 0.18, ease: "power2.in" })
            .to(parte("cola"), { scaleX: 0.6, transformOrigin: "0% 50%", duration: 0.18 }, 0)
            .set(parte("punta"), { x: -8 })
            .to(parte("punta"), { x: 0, opacity: 1, duration: 0.3 })
            .to(parte("cola"), { scaleX: 1, duration: 0.3 }, "<")
          break
        case "tilde":
          tl.fromTo(parte("aro"), { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 0.4 })
            .fromTo(parte("marca"), { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 0.3 }, 0.25)
          break
        case "carpeta":
          tl.fromTo(parte("papel"), { y: 3, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35 })
            .fromTo(parte("tapa"), { y: 0 }, { y: -1.5, duration: 0.15, yoyo: true, repeat: 1 }, 0)
          break
        case "alerta":
          tl.fromTo(parte("aro"), { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 0.4 })
            .fromTo(parte("signo"), { rotate: -14, transformOrigin: "50% 100%" }, { rotate: 0, duration: 0.6, ease: "elastic.out(1.2, 0.35)" }, 0.2)
          break
        case "lupa":
          tl.fromTo(parte("lente"), { scale: 0.85, transformOrigin: "10.5px 10.5px" }, { scale: 1, duration: 0.4, ease: "back.out(3)" })
            .fromTo(parte("mango"), { rotate: -25, transformOrigin: "15.5px 15.5px" }, { rotate: 0, duration: 0.5, ease: "elastic.out(1, 0.4)" }, 0.05)
            .fromTo(parte("brillo"), { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 0.3 }, 0.2)
          break
        case "abrir":
          tl.to(parte("flecha"), { x: 3, y: -3, opacity: 0, duration: 0.18, ease: "power2.in" })
            .set(parte("flecha"), { x: -4, y: 4 })
            .to(parte("flecha"), { x: 0, y: 0, opacity: 1, duration: 0.35 })
          break
        case "archivo":
          tl.to(parte("tapa"), { y: -3, rotate: -6, transformOrigin: "0% 100%", duration: 0.2, yoyo: true, repeat: 1, ease: "power2.out" })
            .fromTo(parte("asa"), { scaleX: 0.3, transformOrigin: "50% 50%" }, { scaleX: 1, duration: 0.35, ease: "back.out(3)" }, 0.15)
          break
        case "persona":
          tl.fromTo(parte("cabeza"), { y: 0 }, { y: -2, duration: 0.18, yoyo: true, repeat: 1, ease: "power2.out" })
            .fromTo(parte("cuerpo"), { drawSVG: "50% 50%" }, { drawSVG: "0% 100%", duration: 0.4 }, 0)
          break
        case "llave":
          tl.fromTo(s, { rotate: 0 }, { rotate: -20, transformOrigin: "30% 70%", duration: 0.2, yoyo: true, repeat: 1, ease: "power2.inOut" })
            .fromTo(parte("dientes"), { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 0.3 }, 0.1)
          break
        case "tablero":
          tl.fromTo([parte("t1"), parte("t2"), parte("t3")], { y: -3, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, stagger: 0.08 })
          break
        case "reloj":
          tl.fromTo(parte("agujas"), { rotate: -360, transformOrigin: "12px 12px" }, { rotate: 0, duration: 0.8 })
          break
        case "grupos":
          tl.fromTo([parte("c1"), parte("c2"), parte("c3")], { scale: 0.6, transformOrigin: "50% 50%", opacity: 0.4 }, { scale: 1, opacity: 1, duration: 0.35, stagger: 0.07, ease: "back.out(3)" })
            .fromTo(parte("mas"), { rotate: -90, transformOrigin: "17px 17px", opacity: 0 }, { rotate: 0, opacity: 1, duration: 0.4 }, 0.2)
          break
        case "personas":
          tl.fromTo(parte("cabeza1"), { y: 0 }, { y: -2, duration: 0.16, yoyo: true, repeat: 1, ease: "power2.out" })
            .fromTo(parte("cabeza2"), { y: 0 }, { y: -2, duration: 0.16, yoyo: true, repeat: 1, ease: "power2.out" }, 0.12)
          break
        case "salir":
          tl.to(parte("flecha"), { x: 4, opacity: 0, duration: 0.18, ease: "power2.in" })
            .set(parte("flecha"), { x: -4 })
            .to(parte("flecha"), { x: 0, opacity: 1, duration: 0.3 })
          break
        case "panel":
          tl.fromTo(parte("columna"), { x: 0 }, { x: variante === "alternar" ? -3 : 3, duration: 0.18, yoyo: true, repeat: 1, ease: "power2.inOut" })
          break
        case "inicio":
          tl.fromTo(parte("techo"), { y: -2.5 }, { y: 0, duration: 0.5, ease: "bounce.out" })
            .fromTo(parte("puerta"), { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 0.35 }, 0.1)
          break
        case "escudo":
          tl.fromTo(parte("escudo"), { scale: 0.88, transformOrigin: "50% 50%" }, { scale: 1, duration: 0.4, ease: "back.out(3)" })
            .fromTo(parte("marca"), { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 0.3 }, 0.12)
          break
        case "cruz":
          tl.fromTo(parte("aro"), { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 0.4 })
            .fromTo([parte("raya1"), parte("raya2")], { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 0.25, stagger: 0.1 }, 0.2)
          break
        case "pico":
          break
      }
    },
  }))

  return (
    <svg
      ref={svg}
      className={className ? `duo ${className}` : "duo"}
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      style={{ overflow: "visible" }}
    >
      <Dibujo nombre={nombre} tachado={tachado} />
    </svg>
  )
})
