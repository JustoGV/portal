"use client"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { Icono } from "@/components/iconos/Icono"
import { IconoDuo, type IconoDuoApi, type NombreDuo } from "@/components/iconos/IconoDuo"
import { navegacion as t } from "@/i18n/es/navegacion"
import { authClient } from "@/lib/auth-client"
import { EASE, gsap, quieto } from "@/lib/gsap"
import { EMPRESA, PRODUCTO } from "@/lib/marca"
import { Pista } from "./Pista"

type Pagina = { href: string; texto: string; icono: NombreDuo }

const SECCIONES: { titulo: string; paginas: Pagina[] }[] = [
  { titulo: t.seccionPortal, paginas: [{ href: "/", texto: t.proyectos, icono: "carpeta" }] },
  {
    titulo: t.administracion,
    paginas: [
      { href: "/grupos", texto: t.grupos, icono: "grupos" },
      { href: "/usuarios", texto: t.usuarios, icono: "personas" },
    ],
  },
]

export const abrirBusqueda = () => window.dispatchEvent(new Event("portal:buscar"))

/**
 * La barra lateral (WU-06 pantalla 2, D-022; referencia #3 Animate UI Sidebar): la empresa y "Portal"
 * arriba, búsqueda, secciones siempre visibles ("Dale, visible") y un solo resaltado que se desliza de
 * una opción a otra siguiendo el mouse y vuelve a la página actual. Se achica a íconos con una curva.
 */
export function BarraLateral({ usuario, children }: { usuario: ReactNode; children: ReactNode }) {
  const ruta = usePathname()
  const router = useRouter()
  const [cerrada, setCerrada] = useState(false)
  const [movil, setMovil] = useState(false)
  const [saliendo, setSaliendo] = useState(false)
  const nav = useRef<HTMLElement>(null)
  const resaltado = useRef<HTMLSpanElement>(null)
  const mueveY = useRef<gsap.QuickToFunc | null>(null)
  const mueveAlto = useRef<gsap.QuickToFunc | null>(null)
  const panel = useRef<IconoDuoApi>(null)
  const lupa = useRef<IconoDuoApi>(null)
  const salida = useRef<IconoDuoApi>(null)

  // En el teléfono, navegar cierra la barra.
  const [rutaVista, setRutaVista] = useState(ruta)
  if (ruta !== rutaVista) {
    setRutaVista(ruta)
    setMovil(false)
  }

  useEffect(() => {
    if (!movil) return
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setMovil(false)
    window.addEventListener("keydown", tecla)
    return () => window.removeEventListener("keydown", tecla)
  }, [movil])

  const activa = (href: string) => (href === "/" ? ruta === "/" : ruta.startsWith(href))

  /** Lleva el resaltado a una opción (o lo esconde si no hay ninguna). Sin estado de React. */
  const resaltar = useCallback((el: HTMLElement | null, inmediato = false) => {
    const r = resaltado.current
    if (!r) return
    if (!el) {
      gsap.to(r, { opacity: 0, duration: 0.15, overwrite: "auto" })
      return
    }
    const y = el.offsetTop
    const alto = el.offsetHeight
    if (inmediato || quieto() || !mueveY.current || !mueveAlto.current) {
      gsap.set(r, { y, height: alto, opacity: 1 })
      return
    }
    gsap.to(r, { opacity: 1, duration: 0.15, overwrite: "auto" })
    mueveY.current(y)
    mueveAlto.current(alto)
  }, [])

  const actual = useCallback(() => nav.current?.querySelector<HTMLElement>('[aria-current="page"]') ?? null, [])

  useLayoutEffect(() => {
    if (resaltado.current) {
      mueveY.current = gsap.quickTo(resaltado.current, "y", { duration: 0.35, ease: EASE })
      mueveAlto.current = gsap.quickTo(resaltado.current, "height", { duration: 0.35, ease: EASE })
    }
  }, [])

  // Al cambiar de página o de ancho, el resaltado se apoya en la página actual.
  useLayoutEffect(() => {
    resaltar(actual(), true)
  }, [ruta, cerrada, resaltar, actual])

  const salir = async () => {
    setSaliendo(true)
    await authClient.signOut()
    router.replace("/ingresar")
  }

  const alternar = () => {
    panel.current?.animar("alternar")
    setCerrada((c) => !c)
  }

  return (
    <div className="bl-marco" data-cerrada={cerrada || undefined} data-movil={movil || undefined}>
      <button type="button" className="bl-abrir" aria-label={t.abrirMenu} aria-expanded={movil} onClick={() => setMovil(true)}>
        <Icono nombre="menu" tamano={24} />
      </button>
      <aside className="bl" aria-label={t.principal}>
        <div className="bl__marca">
          <span className="bl__nombres">
            <span className="bl__empresa">{EMPRESA}</span>
            <span className="bl__producto">{PRODUCTO}</span>
          </span>
          <Pista texto={cerrada ? t.agrandar : t.achicar} lado="right">
            <button type="button" className="bl__panel" onClick={alternar} aria-label={cerrada ? t.agrandar : t.achicar} aria-pressed={cerrada} onPointerEnter={() => panel.current?.animar()}>
              <IconoDuo ref={panel} nombre="panel" tamano={20} />
            </button>
          </Pista>
          <button type="button" className="bl__cerrar-movil" aria-label={t.cerrarMenu} onClick={() => setMovil(false)}>
            <Icono nombre="cerrar" tamano={20} />
          </button>
        </div>

        <button type="button" className="bl__buscar" onClick={abrirBusqueda} onPointerEnter={() => lupa.current?.animar()} aria-label={t.buscarPista}>
          <IconoDuo ref={lupa} nombre="lupa" tamano={20} />
          <span className="bl__texto">{t.buscar}</span>
          <kbd className="bl__tecla">Ctrl K</kbd>
        </button>

        <nav ref={nav} className="bl__nav" onPointerLeave={() => resaltar(actual())} onBlur={(e) => !nav.current?.contains(e.relatedTarget as Node) && resaltar(actual())}>
          <span ref={resaltado} className="bl__resaltado" aria-hidden="true" />
          {SECCIONES.map((s) => (
            <div key={s.titulo} className="bl__seccion">
              <p className="bl__seccion-titulo">{s.titulo}</p>
              <ul className="bl__lista">
                {s.paginas.map((p) => (
                  <li key={p.href}>
                    <Item pagina={p} activa={activa(p.href)} alEntrar={resaltar} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="bl__pie">
          <div className="bl__usuario">
            <span className="bl__avatar" aria-hidden="true">
              <IconoDuo nombre="persona" tamano={18} />
            </span>
            <span className="bl__texto">{usuario}</span>
          </div>
          <button type="button" className="bl__item bl__salir" onClick={salir} disabled={saliendo} onPointerEnter={() => salida.current?.animar()}>
            <IconoDuo ref={salida} nombre="salir" tamano={20} />
            <span className="bl__texto">{saliendo ? t.saliendo : t.salir}</span>
          </button>
        </div>
      </aside>
      {movil && <div className="bl-velo" aria-hidden="true" onClick={() => setMovil(false)} />}
      <div className="bl-contenido">{children}</div>
    </div>
  )
}

function Item({ pagina, activa, alEntrar }: { pagina: Pagina; activa: boolean; alEntrar: (el: HTMLElement) => void }) {
  const icono = useRef<IconoDuoApi>(null)
  const entrar = (el: HTMLElement) => {
    alEntrar(el)
    icono.current?.animar()
  }
  return (
    <Link
      href={pagina.href}
      className="bl__item"
      aria-current={activa ? "page" : undefined}
      onPointerEnter={(e) => entrar(e.currentTarget)}
      onFocus={(e) => entrar(e.currentTarget)}
    >
      <IconoDuo ref={icono} nombre={pagina.icono} tamano={20} />
      <span className="bl__texto">{pagina.texto}</span>
    </Link>
  )
}
