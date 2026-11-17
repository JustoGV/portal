"use client"
import Link from "next/link"
import { useLayoutEffect, useRef } from "react"
import { IconoDuo, type IconoDuoApi, type NombreDuo } from "@/components/iconos/IconoDuo"
import { useNavegacionLista } from "@/components/ui/NavegacionLista"
import { grupos as t } from "@/i18n/es/grupos"
import { gsap, quieto } from "@/lib/gsap"
import type { VistaGrupos } from "@/lib/parametros"
import { pegar } from "@/lib/texto"

type Cifras = { activos: number; vacios: number; archivados: number; sinGrupo: number }
type Tarjeta = { id: string; n: number; titulo: string; pista: string; icono: NombreDuo; href: string; filtra: boolean; actual: boolean }

/**
 * Las cuatro cifras de arriba de Grupos, con la misma pieza que Servicios (D-030): tocar una filtra la
 * grilla; "Servicios sin grupo" lleva a Servicios ya filtrado. El número cuenta desde cero una sola vez,
 * al entrar a la pantalla (0,9 s); después cambia sin moverse (docs/reglas/05 §10, 08 §2.1).
 */
export function CifrasGrupos({ cifras, vista, hrefs, hrefSinGrupo }: { cifras: Cifras; vista: VistaGrupos; hrefs: Record<VistaGrupos, string>; hrefSinGrupo: string }) {
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

  const tarjetas: Tarjeta[] = [
    { id: "activos", n: cifras.activos, titulo: t.cifraActivos, pista: t.cifraActivosPista, icono: "grupos", href: hrefs.activos, filtra: true, actual: vista === "activos" },
    { id: "vacios", n: cifras.vacios, titulo: t.cifraVacios, pista: t.cifraVaciosPista, icono: "carpeta", href: hrefs.vacios, filtra: true, actual: vista === "vacios" },
    { id: "archivados", n: cifras.archivados, titulo: t.cifraArchivados, pista: t.cifraArchivadosPista, icono: "archivo", href: hrefs.archivados, filtra: true, actual: vista === "archivados" },
    { id: "sinGrupo", n: cifras.sinGrupo, titulo: t.cifraSinGrupo, pista: t.cifraSinGrupoPista, icono: "abrir", href: hrefSinGrupo, filtra: false, actual: false },
  ]

  return (
    <div ref={caja} className="pr-cifras" role="group" aria-label={t.cifrasEtiqueta}>
      {tarjetas.map((c) => {
        const interior = (
          <>
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
          </>
        )
        const comunes = { className: "pr-cifra", "data-actual": c.actual || undefined, onPointerEnter: () => iconos.current[c.id]?.animar(), onFocus: () => iconos.current[c.id]?.animar() }
        return c.filtra ? (
          <a
            key={c.id}
            {...comunes}
            href={c.href}
            aria-current={c.actual ? "true" : undefined}
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
              e.preventDefault()
              navegar(c.href)
            }}
          >
            {interior}
          </a>
        ) : (
          <Link key={c.id} {...comunes} href={c.href}>
            {interior}
          </Link>
        )
      })}
    </div>
  )
}

