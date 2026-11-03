"use client"
import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { Icono } from "@/components/iconos/Icono"
import { comun } from "@/i18n/es/comun"
import { gsap, quieto } from "@/lib/gsap"
import { Boton } from "./Boton"

type Tipo = "guardado" | "error" | "dato-mal"
type Aviso = { tipo: Tipo; titulo: string; texto?: string }
type Mostrar = (a: Aviso) => void

const Contexto = createContext<Mostrar | null>(null)
const DURACION = 3 // segundos que se queda lo que salió bien

export const useResultado = () => {
  const c = useContext(Contexto)
  if (!c) throw new Error("useResultado fuera de ProveedorResultado")
  return c
}

/**
 * La tarjeta de resultado (docs/reglas/05 §5): centrada, con un ícono animado por resultado. Lo que
 * salió bien se va solo a los 3 s (con una línea que muestra el tiempo); un error espera "Entendido",
 * se lleva el foco y al cerrarse lo devuelve. Una a la vez: la nueva reemplaza a la anterior.
 */
export function ProveedorResultado({ children }: { children: ReactNode }) {
  const [aviso, setAviso] = useState<(Aviso & { n: number }) | null>(null)
  const n = useRef(0)
  const focoAntes = useRef<HTMLElement | null>(null)

  const mostrar = useCallback<Mostrar>((a) => {
    if (a.tipo !== "guardado" && !focoAntes.current) focoAntes.current = document.activeElement as HTMLElement | null
    n.current += 1
    setAviso({ ...a, n: n.current })
  }, [])

  const cerrar = useCallback(() => {
    setAviso(null)
    const f = focoAntes.current
    focoAntes.current = null
    if (f?.isConnected) f.focus()
  }, [])

  return (
    <Contexto.Provider value={mostrar}>
      {children}
      {aviso && <Tarjeta key={aviso.n} aviso={aviso} alCerrar={cerrar} />}
    </Contexto.Provider>
  )
}

function Tarjeta({ aviso, alCerrar }: { aviso: Aviso; alCerrar: () => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const espera = aviso.tipo !== "guardado"

  useLayoutEffect(() => {
    const t = ref.current
    if (!t) return
    const icono = t.querySelector(".ui-resultado__icono")
    const trazos = t.querySelectorAll("[data-trazo]")
    if (quieto()) {
      gsap.set(t, { opacity: 1 })
      return
    }
    const tl = gsap.timeline()
    tl.fromTo(t, { opacity: 0, y: -16 }, { opacity: 1, y: 0, duration: 0.3, ease: "power3.out" })
    if (aviso.tipo === "guardado") {
      tl.fromTo(icono, { scale: 0.6 }, { scale: 1, duration: 0.4, ease: "expo.out" }, 0.05)
      tl.fromTo(trazos, { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 0.4, ease: "power2.out" }, 0.2)
    } else if (aviso.tipo === "error") {
      tl.fromTo(icono, { rotate: -90 }, { rotate: 0, duration: 0.45, ease: "power3.out" }, 0.05)
      tl.fromTo(trazos, { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 0.3, stagger: 0.1, ease: "power2.out" }, 0.2)
    } else {
      tl.fromTo(trazos, { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration: 0.35, stagger: 0.08, ease: "power2.out" }, 0.1)
      tl.to(icono, { keyframes: { rotate: [0, -12, 9, -5, 0], easeEach: "sine.inOut" }, duration: 0.7 }, 0.3)
    }
    return () => {
      tl.kill()
    }
  }, [aviso.tipo])

  // Lo que salió bien se va solo; lo saca un reloj, no el fin de la animación (02 A §6.4).
  useEffect(() => {
    if (espera) return
    const linea = ref.current?.querySelector(".ui-resultado__tiempo")
    if (linea && !quieto()) gsap.fromTo(linea, { scaleX: 1 }, { scaleX: 0, duration: DURACION, ease: "none" })
    const reloj = window.setTimeout(alCerrar, DURACION * 1000)
    return () => window.clearTimeout(reloj)
  }, [espera, alCerrar])

  // El error se lleva el foco y Escape lo cierra.
  useEffect(() => {
    if (!espera) return
    ref.current?.querySelector<HTMLButtonElement>("button")?.focus()
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation()
        alCerrar()
      }
    }
    window.addEventListener("keydown", tecla, true)
    return () => window.removeEventListener("keydown", tecla, true)
  }, [espera, alCerrar])

  const icono = aviso.tipo === "guardado" ? "tilde" : aviso.tipo === "error" ? "cerrar" : "alerta"

  return (
    <>
      {espera && <div className="ui-resultado-velo" aria-hidden="true" />}
      <div
        ref={ref}
        className="ui-resultado"
        data-tipo={aviso.tipo}
        role={espera ? "alertdialog" : "status"}
        aria-modal={espera || undefined}
        aria-live={espera ? undefined : "polite"}
        aria-labelledby="ui-resultado-titulo"
      >
        <div className="ui-resultado__icono">
          <Icono nombre={icono} tamano={32} />
        </div>
        <p id="ui-resultado-titulo" className="ui-resultado__titulo">
          {aviso.titulo}
        </p>
        {aviso.texto && <p className="ui-resultado__texto">{aviso.texto}</p>}
        {espera ? (
          <div className="ui-resultado__acciones">
            <Boton variante="primaria" onPress={alCerrar}>
              {comun.entendido}
            </Boton>
          </div>
        ) : (
          <span className="ui-resultado__tiempo" aria-hidden="true" />
        )}
      </div>
    </>
  )
}
