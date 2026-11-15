"use client"
import Link from "next/link"
import { useLayoutEffect, useRef } from "react"
import { IconoDuo, type IconoDuoApi, type NombreDuo } from "@/components/iconos/IconoDuo"
import { useNavegacionLista } from "@/components/ui/NavegacionLista"
import { proyectos as t } from "@/i18n/es/proyectos"
import { gsap, quieto } from "@/lib/gsap"
import { pegar } from "@/lib/texto"

type Cifras = { activos: number; archivados: number; sinGrupo: number; grupos: number }
type Tarjeta = { id: string; n: number; titulo: string; pista: string; icono: NombreDuo; href: string; filtra: boolean; actual: boolean }

/**
 * Las cuatro cifras de arriba (D-030; de las tarjetas que filtran de EDV y de los contadores de Square UI
 * Bookmarks). Tocar una filtra la tabla; "Grupos" lleva a su pantalla. El número cuenta desde cero una
 * sola vez, al entrar a la pantalla: después cambia sin moverse (docs/reglas/05 §10, 08 §2.1).
 */
export function CifrasProyectos({ cifras, vista, hrefs }: { cifras: Cifras; vista: "activos" | "sinGrupo" | "archivados" | null; hrefs: { activos: string; sinGrupo: string; archivados: string } }) {
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
    { id: "activos", n: cifras.activos, titulo: t.cifraActivos, pista: t.cifraActivosPista, icono: "abrir", href: hrefs.activos, filtra: true, actual: vista === "activos" },
    { id: "sinGrupo", n: cifras.sinGrupo, titulo: t.cifraSinGrupo, pista: t.cifraSinGrupoPista, icono: "carpeta", href: hrefs.sinGrupo, filtra: true, actual: vista === "sinGrupo" },
    { id: "archivados", n: cifras.archivados, titulo: t.cifraArchivados, pista: t.cifraArchivadosPista, icono: "archivo", href: hrefs.archivados, filtra: true, actual: vista === "archivados" },
    { id: "grupos", n: cifras.grupos, titulo: t.cifraGrupos, pista: t.cifraGruposPista, icono: "grupos", href: "/grupos", filtra: false, actual: false },
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
