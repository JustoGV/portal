"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type TransitionEvent } from "react"
import { Icono } from "@/components/iconos/Icono"
import { IconoDuo, type IconoDuoApi, type NombreDuo } from "@/components/iconos/IconoDuo"
import { navegacion as t } from "@/i18n/es/navegacion"
import { EASE, gsap, quieto } from "@/lib/gsap"
import { EMPRESA, PRODUCTO } from "@/lib/marca"
import { Pista } from "./Pista"

type Pagina = { href: string; texto: string; icono: NombreDuo }
type SeccionDatos = { id: string; titulo: string; icono: NombreDuo; paginas: Pagina[] }

const SECCIONES: SeccionDatos[] = [
  { id: "portal", titulo: t.seccionPortal, icono: "inicio", paginas: [{ href: "/", texto: t.proyectos, icono: "carpeta" }] },
  {
    id: "administracion",
    titulo: t.administracion,
    icono: "escudo",
    paginas: [
      { href: "/clientes", texto: t.grupos, icono: "grupos" },
      { href: "/usuarios", texto: t.usuarios, icono: "personas" },
    ],
  },
]

export const abrirBusqueda = () => window.dispatchEvent(new Event("portal:buscar"))

/**
 * La barra lateral (WU-06 pantalla 2, D-022 y D-024; referencia #3 Animate UI Sidebar): la empresa y
 * "Portal" arriba, búsqueda, y cada sección como una fila que se abre y cierra, con sus páginas debajo
 * como sub-enlaces unidos por una línea (corrección de Mateo del 2026-11-14: "que los títulos sea como
 * una línea y lo otro un sub link"). Un solo resaltado se desliza de una fila a otra siguiendo el mouse
 * y vuelve a la página actual. Se achica a íconos con una curva.
 */
export function BarraLateral({ cuenta, children }: { cuenta: ReactNode; children: ReactNode }) {
  const ruta = usePathname()
  const [cerrada, setCerrada] = useState(false)
  const [movil, setMovil] = useState(false)
  // Todas las secciones arrancan abiertas; cada una se cierra con su fila.
  const [plegadas, setPlegadas] = useState<Record<string, boolean>>({})
  const nav = useRef<HTMLElement>(null)
  const resaltado = useRef<HTMLSpanElement>(null)
  const mueve = useRef<Record<"x" | "y" | "width" | "height", gsap.QuickToFunc> | null>(null)
  /** La fila donde está el mouse o el foco; si no hay ninguna, el resaltado descansa en la página actual. */
  const encima = useRef<HTMLElement | null>(null)
  const panel = useRef<IconoDuoApi>(null)
  const lupa = useRef<IconoDuoApi>(null)

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

  /** Dónde descansa el resaltado: la página actual, o la fila de su sección si está plegada. */
  const actual = useCallback(() => {
    const pagina = nav.current?.querySelector<HTMLElement>('[aria-current="page"]') ?? null
    if (pagina?.getClientRects().length && !pagina.closest("[inert]")) return pagina
    return pagina?.closest(".bl__seccion")?.querySelector<HTMLElement>(".bl__grupo") ?? pagina
  }, [])

  /** Lleva el resaltado a una fila (o lo esconde si no hay ninguna). Sin estado de React. */
  const resaltar = useCallback((el: HTMLElement | null, inmediato = false) => {
    const r = resaltado.current
    const n = nav.current
    if (!r || !n) return
    if (!el || !el.getClientRects().length) {
      gsap.to(r, { opacity: 0, duration: 0.15, overwrite: "auto" })
      return
    }
    const marco = n.getBoundingClientRect()
    const caja = el.getBoundingClientRect()
    const a = { x: caja.left - marco.left, y: caja.top - marco.top, width: caja.width, height: caja.height }
    const m = mueve.current
    if (!m) {
      gsap.set(r, { ...a, opacity: 1 })
      return
    }
    if (inmediato || quieto()) {
      // Sin animar: el movimiento arranca y termina en el mismo valor. No se usa gsap.set porque un
      // deslizamiento que venía en camino seguiría hasta su destino viejo y pisaría esta medida.
      gsap.set(r, { opacity: 1 })
      m.x(a.x, a.x)
      m.y(a.y, a.y)
      m.width(a.width, a.width)
      m.height(a.height, a.height)
      return
    }
    gsap.to(r, { opacity: 1, duration: 0.15, overwrite: "auto" })
    m.x(a.x)
    m.y(a.y)
    m.width(a.width)
    m.height(a.height)
  }, [])

  /** Vuelve a apoyar el resaltado donde corresponde, sin animar: después de que algo cambió de tamaño. */
  const reposar = useCallback(() => {
    const el = encima.current?.getClientRects().length ? encima.current : actual()
    resaltar(el, true)
  }, [actual, resaltar])

  const entrar = useCallback(
    (el: HTMLElement) => {
      encima.current = el
      resaltar(el)
    },
    [resaltar],
  )
  const dejar = useCallback(() => {
    encima.current = null
    resaltar(actual())
  }, [actual, resaltar])

  useLayoutEffect(() => {
    const r = resaltado.current
    if (!r) return
    const hacia = (p: string) => gsap.quickTo(r, p, { duration: 0.35, ease: EASE })
    mueve.current = { x: hacia("x"), y: hacia("y"), width: hacia("width"), height: hacia("height") }
  }, [])

  // Al cambiar de página, de ancho o al abrir y cerrar una sección, el resaltado se vuelve a apoyar.
  useLayoutEffect(() => {
    reposar()
  }, [ruta, cerrada, plegadas, reposar])

  // La barra y las secciones cambian de tamaño con una transición de CSS: al terminar, se vuelve a medir.
  const alTerminar = (e: TransitionEvent<HTMLElement>) => {
    if (e.propertyName === "width" || e.propertyName === "grid-template-rows") reposar()
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
      <aside className="bl" aria-label={t.principal} onTransitionEnd={alTerminar}>
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

        <nav ref={nav} className="bl__nav" onPointerLeave={dejar} onBlur={(e) => !nav.current?.contains(e.relatedTarget as Node) && dejar()}>
          <span ref={resaltado} className="bl__resaltado" aria-hidden="true" />
          {SECCIONES.map((s) => (
            <Seccion
              key={s.id}
              seccion={s}
              abierta={!plegadas[s.id]}
              // Achicada a íconos no hay filas de sección: se ven las páginas directamente.
              plegable={!cerrada}
              activa={activa}
              alEntrar={entrar}
              alAlternar={() => setPlegadas((p) => ({ ...p, [s.id]: !p[s.id] }))}
            />
          ))}
        </nav>

        {/* La cuenta: la entrada a Mi cuenta y «Salir» (D-024, D-035). */}
        <div className="bl__pie">{cuenta}</div>
      </aside>
      {movil && <div className="bl-velo" aria-hidden="true" onClick={() => setMovil(false)} />}
      <div className="bl-contenido">{children}</div>
    </div>
  )
}

type SeccionProps = {
  seccion: SeccionDatos
  abierta: boolean
  plegable: boolean
  activa: (href: string) => boolean
  alEntrar: (el: HTMLElement) => void
  alAlternar: () => void
}

/** Una sección: la fila que la abre y la cierra, y debajo sus páginas como sub-enlaces. */
function Seccion({ seccion, abierta, plegable, activa, alEntrar, alAlternar }: SeccionProps) {
  const icono = useRef<IconoDuoApi>(null)
  const idLista = `bl-sub-${seccion.id}`
  const tieneActual = seccion.paginas.some((p) => activa(p.href))
  const escondida = plegable && !abierta
  const entrar = (el: HTMLElement) => {
    alEntrar(el)
    icono.current?.animar()
  }
  return (
    <div className="bl__seccion" data-abierta={abierta || undefined}>
      <button
        type="button"
        className="bl__item bl__grupo"
        aria-expanded={abierta}
        aria-controls={idLista}
        data-actual={(escondida && tieneActual) || undefined}
        onClick={alAlternar}
        onPointerEnter={(e) => entrar(e.currentTarget)}
        onFocus={(e) => entrar(e.currentTarget)}
      >
        <IconoDuo ref={icono} nombre={seccion.icono} tamano={20} />
        <span className="bl__texto">{seccion.titulo}</span>
        <IconoDuo nombre="pico" tamano={16} className="bl__pico" />
      </button>
      <div className="bl__sub" inert={escondida}>
        <div className="bl__sub-recorte">
          <ul id={idLista} className="bl__lista">
            {seccion.paginas.map((p) => (
              <li key={p.href}>
                <Item pagina={p} activa={activa(p.href)} alEntrar={alEntrar} />
              </li>
            ))}
          </ul>
        </div>
      </div>
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
      className="bl__item bl__item--sub"
      aria-current={activa ? "page" : undefined}
      onPointerEnter={(e) => entrar(e.currentTarget)}
      onFocus={(e) => entrar(e.currentTarget)}
    >
      <IconoDuo ref={icono} nombre={pagina.icono} tamano={18} />
      <span className="bl__texto">{pagina.texto}</span>
    </Link>
  )
}
