"use client"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { authClient } from "@/lib/auth-client"

const CLAVE = "portal:actividad"

/**
 * Cierre de sesión por inactividad (docs/reglas/10 §2.5). Cuenta como uso un toque, una tecla, la rueda
 * o el puntero, en cualquier pestaña: la última actividad se comparte por localStorage con una marca
 * que incluye el inicio de la sesión, así una marca vieja nunca cierra una sesión nueva. Un refresco
 * automático no es uso. Si el almacenamiento está bloqueado, cada pestaña cuenta sola.
 */
export function Inactividad({ minutos, inicioSesion }: { minutos: number | null; inicioSesion: number }) {
  const router = useRouter()
  useEffect(() => {
    if (!minutos) return
    const limite = minutos * 60_000
    let ultima = Date.now()
    let cerrando = false

    const leer = () => {
      try {
        const v = JSON.parse(localStorage.getItem(CLAVE) ?? "null") as { inicio?: number; ultima?: number } | null
        if (v?.inicio === inicioSesion && typeof v.ultima === "number") ultima = Math.max(ultima, v.ultima)
      } catch {
        /* almacenamiento bloqueado: cuenta esta pestaña sola */
      }
    }
    let escrito = 0
    const uso = () => {
      ultima = Date.now()
      if (ultima - escrito < 5000) return
      escrito = ultima
      try {
        localStorage.setItem(CLAVE, JSON.stringify({ inicio: inicioSesion, ultima }))
      } catch {
        /* idem */
      }
    }
    const revisar = async () => {
      if (cerrando) return
      leer()
      if (Date.now() - ultima < limite) return
      cerrando = true
      try {
        await authClient.signOut()
      } finally {
        router.replace("/ingresar?motivo=expirado")
        router.refresh()
      }
    }
    const visible = () => document.visibilityState === "visible" && void revisar()

    uso()
    const eventos = ["pointerdown", "keydown", "wheel", "pointermove", "touchstart"] as const
    eventos.forEach((e) => window.addEventListener(e, uso, { passive: true }))
    document.addEventListener("visibilitychange", visible)
    const reloj = window.setInterval(revisar, 30_000)
    return () => {
      eventos.forEach((e) => window.removeEventListener(e, uso))
      document.removeEventListener("visibilitychange", visible)
      window.clearInterval(reloj)
    }
  }, [minutos, inicioSesion, router])
  return null
}
