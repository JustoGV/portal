"use client"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react"
import { Icono } from "@/components/iconos/Icono"
import type { NombreIcono } from "@/components/iconos/trazos"
import { navegacion as t } from "@/i18n/es/navegacion"
import { authClient } from "@/lib/auth-client"
import { conHover, escribirIconos, gsap, quieto } from "@/lib/gsap"
import { NOMBRE_VISIBLE } from "@/lib/marca"
import { Pista } from "./Pista"

type Pagina = { href: string; texto: string; icono: NombreIcono }

const SUELTAS: Pagina[] = [{ href: "/", texto: t.proyectos, icono: "proyectos" }]
const ADMIN: Pagina[] = [
  { href: "/grupos", texto: t.grupos, icono: "grupos" },
  { href: "/usuarios", texto: t.usuarios, icono: "usuarios" },
]

export const abrirBusqueda = () => window.dispatchEvent(new Event("portal:buscar"))

/**
 * La barra lateral (docs/reglas/02 B2): sin cabecera arriba; logo, búsqueda y usuario adentro. Los grupos
 * se abren al pasar el mouse (120 ms de reposo) o al tocar, sin chevron, con los íconos en cascada.
 */
export function BarraLateral({ usuario, children }: { usuario: ReactNode; children: ReactNode }) {
  const ruta = usePathname()
  const router = useRouter()
  const [cerrada, setCerrada] = useState(false)
  const [movil, setMovil] = useState(false)
  const [saliendo, setSaliendo] = useState(false)
  const barra = useRef<HTMLElement>(null)

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

  const salir = async () => {
    setSaliendo(true)
    await authClient.signOut()
    router.replace("/ingresar")
  }

  const activa = (href: string) => (href === "/" ? ruta === "/" : ruta.startsWith(href))

  return (
    <div className="bl-marco" data-cerrada={cerrada || undefined} data-movil={movil || undefined}>
      <button type="button" className="bl-abrir" aria-label={t.abrirMenu} aria-expanded={movil} onClick={() => setMovil(true)}>
        <Icono nombre="menu" tamano={24} />
      </button>
      <aside ref={barra} className="bl" aria-label={t.principal}>
        <div className="bl__marca">
          <span className="bl__logo" aria-hidden="true">
            <Icono nombre="carpeta" tamano={20} />
          </span>
          <span className="bl__nombre">{NOMBRE_VISIBLE}</span>
          <button type="button" className="bl__cerrar-movil" aria-label={t.cerrarMenu} onClick={() => setMovil(false)}>
            <Icono nombre="cerrar" tamano={20} />
          </button>
        </div>

        <Pista texto={t.buscarPista} lado="right">
          <button type="button" className="bl__buscar" onClick={abrirBusqueda} onPointerEnter={(e) => escribirIconos(e.currentTarget)}>
            <Icono nombre="buscar" />
            <span className="bl__texto">{t.buscar}</span>
            <kbd className="bl__tecla">Ctrl K</kbd>
          </button>
        </Pista>

        <nav className="bl__nav">
          <ul className="bl__lista">
            {SUELTAS.map((p) => (
              <li key={p.href}>
                <Item pagina={p} activa={activa(p.href)} />
              </li>
            ))}
            <li>
              <Grupo titulo={t.administracion} icono="escudo" paginas={ADMIN} activa={activa} />
            </li>
          </ul>
        </nav>

        <div className="bl__pie">
          <div className="bl__usuario">
            <Icono nombre="persona" />
            <span className="bl__texto">{usuario}</span>
          </div>
          <button type="button" className="bl__item" onClick={salir} disabled={saliendo} onPointerEnter={(e) => escribirIconos(e.currentTarget)}>
            <Icono nombre="salir" />
            <span className="bl__texto">{saliendo ? t.saliendo : t.salir}</span>
          </button>
          <button type="button" className="bl__item bl__achicar" onClick={() => setCerrada((c) => !c)} aria-pressed={cerrada}>
            <Icono nombre="menu" />
            <span className="bl__texto">{cerrada ? t.agrandar : t.achicar}</span>
          </button>
        </div>

        {/* La barra colapsada se abre tocándola en cualquier parte (02 B2). */}
        {cerrada && <button type="button" className="bl__tapa" aria-label={t.agrandar} onClick={() => setCerrada(false)} />}
      </aside>
      {movil && <div className="bl-velo" aria-hidden="true" onClick={() => setMovil(false)} />}
      <div className="bl-contenido">{children}</div>
    </div>
  )
}

function Item({ pagina, activa }: { pagina: Pagina; activa: boolean }) {
  return (
    <Link
      href={pagina.href}
      className="bl__item"
      aria-current={activa ? "page" : undefined}
      onPointerEnter={(e) => escribirIconos(e.currentTarget)}
      data-icono-item=""
    >
      <Icono nombre={pagina.icono} />
      <span className="bl__texto">{pagina.texto}</span>
    </Link>
  )
}

function Grupo({ titulo, icono, paginas, activa }: { titulo: string; icono: NombreIcono; paginas: Pagina[]; activa: (h: string) => boolean }) {
  const contieneActual = paginas.some((p) => activa(p.href))
  const [abierto, setAbierto] = useState(contieneActual)
  const porHover = useRef(false)
  const reloj = useRef<number | undefined>(undefined)
  const cuerpo = useRef<HTMLUListElement>(null)
  const primera = useRef(true)

  const cambiar = (abrir: boolean) => {
    const c = cuerpo.current
    if (!c || abrir === abierto) return
    // La altura de partida se fija en línea ANTES del cambio de estado (05 §12).
    c.style.height = `${c.offsetHeight}px`
    setAbierto(abrir)
  }

  useLayoutEffect(() => {
    const c = cuerpo.current
    if (!c) return
    if (primera.current) {
      primera.current = false
      c.style.height = abierto ? "auto" : "0px"
      return
    }
    if (quieto()) {
      c.style.height = abierto ? "auto" : "0px"
      return
    }
    if (abierto) {
      gsap.to(c, { height: c.scrollHeight, duration: 0.32, ease: "power3.out", overwrite: "auto", onComplete: () => void (c.style.height = "auto") })
      escribirIconos(c, { retraso: 0.05, paso: 0.08 })
    } else {
      gsap.to(c, { height: 0, duration: 0.22, ease: "power2.inOut", overwrite: "auto" })
    }
  }, [abierto])

  return (
    <div
      className="bl__grupo"
      onPointerEnter={() => {
        if (!conHover() || abierto) return
        reloj.current = window.setTimeout(() => {
          porHover.current = true
          cambiar(true)
        }, 120)
      }}
      onPointerLeave={() => {
        window.clearTimeout(reloj.current)
        if (porHover.current && !contieneActual) {
          porHover.current = false
          cambiar(false)
        }
      }}
    >
      <button
        type="button"
        className="bl__item bl__grupo-titulo"
        aria-expanded={abierto}
        onClick={() => {
          window.clearTimeout(reloj.current)
          // Si lo abrió el hover, el click lo deja fijo; si no, alterna.
          if (porHover.current) porHover.current = false
          else cambiar(!abierto)
        }}
        onPointerEnter={(e) => escribirIconos(e.currentTarget)}
      >
        <Icono nombre={icono} />
        <span className="bl__texto">{titulo}</span>
      </button>
      <ul ref={cuerpo} className="bl__grupo-cuerpo" inert={!abierto}>
        {paginas.map((p) => (
          <li key={p.href}>
            <Item pagina={p} activa={activa(p.href)} />
          </li>
        ))}
      </ul>
    </div>
  )
}
