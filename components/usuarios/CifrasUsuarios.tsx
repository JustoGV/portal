"use client"
import { useLayoutEffect, useRef } from "react"
import { IconoDuo, type IconoDuoApi, type NombreDuo } from "@/components/iconos/IconoDuo"
import { useNavegacionLista } from "@/components/ui/NavegacionLista"
import { usuarios as t } from "@/i18n/es/usuarios"
import { gsap, quieto } from "@/lib/gsap"
import type { VistaUsuarios } from "@/lib/parametros"
import { pegar } from "@/lib/texto"

type Cifras = { activas: number; primerIngreso: number; sinFactor: number; desactivadas: number }
type Vista = Exclude<VistaUsuarios, "todas">

/**
 * Las cuatro cifras de arriba de Usuarios (D-034), con la misma pieza que Servicios y Clientes (D-030,
 * Square UI · Employees): tocar una filtra la tabla. El número cuenta desde cero una sola vez, al entrar
 * (0,9 s); después cambia sin moverse (docs/reglas/05 §10, 08 §2.1).
 */
export function CifrasUsuarios({ cifras, vista, hrefs }: { cifras: Cifras; vista: VistaUsuarios; hrefs: Record<Vista, string> }) {
  const { navegar } = useNavegacionLista()
  const caja = useRef<HTMLDivElement>(null)
  const iconos = useRef<Record<string, IconoDuoApi | null>>({})

  useLayoutEffect(() => {
    if (quieto() || !caja.current) return
    const numeros = Array.from(caja.current.querySelectorAll<HTMLElement>("[data-cifra]"))
    const anims = numeros.map((el, i) => {
      const fin = Number(el.dataset.cifra)
      const o = { v: 0 }
      el.textContent = "0"
      return gsap.to(o, { v: fin, duration: 0.9, delay: 0.15 + i * 0.08, ease: "power3.out", onUpdate: () => (el.textContent = String(Math.round(o.v))), onComplete: () => (el.textContent = String(fin)) })
    })
    return () => anims.forEach((a) => a.progress(1).kill())
    // Solo al montar: un cambio posterior de la cifra se muestra sin contar.
  }, [])

  const tarjetas: { id: Vista; n: number; titulo: string; pista: string; icono: NombreDuo }[] = [
    { id: "activas", n: cifras.activas, titulo: t.cifraActivas, pista: t.cifraActivasPista, icono: "personas" },
    { id: "primer-ingreso", n: cifras.primerIngreso, titulo: t.cifraPrimerIngreso, pista: t.cifraPrimerIngresoPista, icono: "llave" },
    { id: "sin-factor", n: cifras.sinFactor, titulo: t.cifraSinFactor, pista: t.cifraSinFactorPista, icono: "escudo" },
    { id: "desactivadas", n: cifras.desactivadas, titulo: t.cifraDesactivadas, pista: t.cifraDesactivadasPista, icono: "candado" },
  ]

  return (
    <div ref={caja} className="pr-cifras" role="group" aria-label={t.cifrasEtiqueta}>
      {tarjetas.map((c) => {
        const actual = vista === c.id
        return (
          <a
            key={c.id}
            className="pr-cifra"
            href={hrefs[c.id]}
            data-actual={actual || undefined}
            aria-current={actual ? "true" : undefined}
            onPointerEnter={() => iconos.current[c.id]?.animar()}
            onFocus={() => iconos.current[c.id]?.animar()}
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
              e.preventDefault()
              navegar(hrefs[c.id])
            }}
          >
            <span className="pr-cifra__icono" aria-hidden="true">
              <IconoDuo
                ref={(api) => {
                  iconos.current[c.id] = api
                }}
                nombre={c.icono}
                tamano={24}
              />
            </span>
            <span className="pr-cifra__texto">
              <span className="pr-cifra__titulo">{c.titulo}</span>
              <span className="pr-cifra__pista">{pegar(c.pista)}</span>
            </span>
            <span className="pr-cifra__numero" data-cifra={c.n}>
              {c.n}
            </span>
          </a>
        )
      })}
    </div>
  )
}
