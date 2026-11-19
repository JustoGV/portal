"use client"
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as PE } from "react"
import { useRouter } from "next/navigation"
import { Button, Menu, MenuItem, MenuTrigger, Popover } from "react-aria-components"
import { ArrowLeftRight, CircleHelp, Layers, ListTodo, Wrench } from "lucide-react"
import { Banda } from "@/components/ui/Banda"
import { Boton } from "@/components/ui/Boton"
import { useResultado } from "@/components/ui/Resultado"
import { comentar as comentarEn, crearTarjeta, leerConversacion, moverTarjeta, resolverDuda } from "@/acciones/tablero"
import { comun } from "@/i18n/es/comun"
import type { NuevaTarjeta } from "@/lib/tablero"
import { AltaTarjeta } from "./AltaTarjeta"
import { FichaTarjeta } from "./FichaTarjeta"
import { gsap, quieto } from "@/lib/gsap"
import { pegar } from "@/lib/texto"
import { LISTAS, type Comentario, type ListaId, type Persona, type Tarjeta } from "./listas"
import { TarjetaTablero } from "./TarjetaTablero"

const ICONO = { dudas: CircleHelp, servicios: Layers, tareas: ListTodo, correcciones: Wrench } as const
/** En qué lista está una tarjeta. */
const listaDe = (id: string, o: Record<ListaId, string[]>) => (Object.keys(o) as ListaId[]).find((l) => o[l].includes(id))!

type Arrastre = {
  id: string
  el: HTMLElement
  tipo: string
  x0: number
  y0: number
  caja: DOMRect
  activo: boolean
  fantasma?: HTMLElement
  espera?: number
  ultimo?: string
  soltarToque?: () => void
  px: number
  py: number
}

/**
 * El tablero de trabajo (WU-07, D-038): la banda con lo que hay en cada lista, las cuatro listas y el arrastre.
 * Tarjeta: la versión «Franja», elegida por Mateo el 2026-11-18 («LA 3»). Movimiento de la referencia 1 (Mohamed
 * Uvaish · Kanban Board), rehecho con GSAP: la tarjeta se levanta con sombra
 * y un giro leve, la lista de destino se tiñe, las otras se corren (FLIP medido a mano, 0,28 s) y al soltar la tarjeta se
 * desliza a su lugar (0,4 s, power3.out). Con el mouse arranca al moverse 5 px; con el dedo, manteniendo
 * apretado 280 ms (si el dedo se mueve antes, es scroll). «Mover a…» hace lo mismo sin arrastrar.
 */
/** «Mover a…»: el mismo menú en la tarjeta y en la ficha. */
function MenuMover({ titulo, actual, alMover }: { titulo: string; actual: ListaId; alMover: (l: ListaId) => void }) {
  return (
    <MenuTrigger>
      <Button className="tb-mover" aria-label={`Mover «${titulo}» a otra lista`} data-no-arrastre="">
        <ArrowLeftRight size={15} strokeWidth={2} aria-hidden="true" />
      </Button>
      <Popover className="ui-popover" placement="bottom end" offset={6}>
        <Menu className="ui-lista tb-menu" onAction={(k) => alMover(k as ListaId)}>
          {LISTAS.filter((x) => x.id !== actual).map((x) => (
            <MenuItem key={x.id} id={x.id} className="ui-lista__opcion tb-menu__opcion">
              <span className="tb-menu__punto" data-tono={x.tono} aria-hidden="true" />
              Mover a {x.titulo}
            </MenuItem>
          ))}
        </Menu>
      </Popover>
    </MenuTrigger>
  )
}

type Opcion = { id: string; nombre: string }
type Props = {
  inicial: { tarjetas: Record<string, Tarjeta>; orden: Record<ListaId, string[]>; masDe: Record<ListaId, boolean> }
  personas: Persona[]
  sistemas: Opcion[]
  clientes: Opcion[]
  yo: Persona
}

/** Una acción que no llegó al servidor (sin conexión, servidor caído) se trata como un «no se guardó». */
const seguro = async <T,>(f: () => Promise<T>, mensaje: string): Promise<T | { ok: false; mensaje: string; sesion?: undefined }> => {
  try {
    return await f()
  } catch {
    return { ok: false, mensaje }
  }
}

/** Una copia del orden, para volver atrás si el servidor no guardó. */
const copia = (o: Record<ListaId, string[]>) => Object.fromEntries((Object.keys(o) as ListaId[]).map((l) => [l, [...o[l]]])) as Record<ListaId, string[]>

export function Tablero({ inicial, personas, sistemas, clientes, yo }: Props) {
  const [orden, setOrden] = useState(inicial.orden)
  const [arrastrando, setArrastrando] = useState<string | null>(null)
  const [destino, setDestino] = useState<ListaId | null>(null)
  const [tarjetas, setTarjetas] = useState<Record<string, Tarjeta>>(inicial.tarjetas)
  // La conversación de cada tarjeta se trae al abrir su ficha (undefined: todavía no se trajo).
  const [conv, setConv] = useState<Record<string, Comentario[] | undefined>>({})
  const [errorConv, setErrorConv] = useState<string | null>(null)
  const mostrar = useResultado()
  const router = useRouter()
  /** Lo que contesta una acción que no salió: la sesión vencida va al ingreso, el resto a la tarjeta de error. */
  const fallo = useCallback(
    (r: { ok: false; mensaje: string; sesion?: "vencida" }) => {
      if (r.sesion === "vencida") router.replace("/ingresar?motivo=expirado")
      else mostrar({ tipo: "error", titulo: comun.noGuardadoTitulo, texto: r.mensaje })
    },
    [mostrar, router],
  )
  const [abierta, setAbierta] = useState(false)
  const [fichaId, setFichaId] = useState<string | null>(null)
  const [alta, setAlta] = useState(false)
  const botonAlta = useRef<Element | null>(null)
  const raiz = useRef<HTMLDivElement>(null)
  const listas = useRef<HTMLDivElement>(null)
  const avance = useRef<HTMLSpanElement>(null)
  const ordenRef = useRef(orden)
  const antes = useRef<Map<string, DOMRect> | null>(null)
  /** El orden de antes de arrastrar: si el servidor no guarda, la tarjeta vuelve ahí. */
  const previo = useRef<Record<ListaId, string[]> | null>(null)
  const llegada = useRef<string | null>(null)
  const arr = useRef<Arrastre | null>(null)
  useLayoutEffect(() => {
    ordenRef.current = orden
  }, [orden])

  /**
   * Mueve una tarjeta y anota dónde estaba cada una, para animar el cambio después del render (FLIP). Se mide
   * a mano: `Flip.getState` de GSAP llevaba la página al principio en el teléfono (G-014).
   */
  const mover = useCallback((id: string, a: ListaId, indice: number) => {
    if (raiz.current && !quieto())
      antes.current = new Map(Array.from(raiz.current.querySelectorAll<HTMLElement>(".tb-listas .tb-tarjeta")).map((e) => [e.dataset.flipId!, e.getBoundingClientRect()]))
    setOrden((o) => {
      const n = { ...o } as Record<ListaId, string[]>
      for (const l of Object.keys(n) as ListaId[]) n[l] = n[l].filter((x) => x !== id)
      n[a] = [...n[a].slice(0, indice), id, ...n[a].slice(indice)]
      return n
    })
  }, [])

  useLayoutEffect(() => {
    const r = raiz.current
    if (!r) return
    const previas = antes.current
    antes.current = null
    if (previas) {
      for (const e of Array.from(r.querySelectorAll<HTMLElement>(".tb-listas .tb-tarjeta"))) {
        const p = previas.get(e.dataset.flipId!)
        if (!p) continue
        gsap.killTweensOf(e, "x,y")
        gsap.set(e, { x: 0, y: 0 }) // se mide el lugar nuevo sin el corrimiento que estuviera a medias
        const c = e.getBoundingClientRect()
        const dx = p.left - c.left
        const dy = p.top - c.top
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue
        gsap.fromTo(e, { x: dx, y: dy }, { x: 0, y: 0, duration: 0.28, ease: "power3.out", clearProps: "transform" })
      }
    }
    // Después de «Mover a…», la tarjeta que llegó se marca un instante y se queda con el foco.
    const id = llegada.current
    if (id) {
      llegada.current = null
      const el = r.querySelector(`[data-flip-id="${id}"]`)
      if (el && !quieto()) gsap.fromTo(el, { boxShadow: "0 0 0 3px var(--sys-marca)" }, { boxShadow: "0 0 0 0px var(--sys-marca)", duration: 1.1, delay: 0.25, ease: "power2.out", clearProps: "boxShadow" })
      // El menú devuelve el foco a su botón, que quedó en la lista vieja: se lo damos al de la tarjeta movida.
      requestAnimationFrame(() => r.querySelector<HTMLElement>(`[data-flip-id="${id}"] .tb-mover`)?.focus())
    }
  }, [orden])

  // Entrada: las listas y sus tarjetas suben de a una, una vez, después de la banda.
  useLayoutEffect(() => {
    const r = raiz.current
    if (!r || quieto()) return
    const ctx = gsap.context(() => {
      gsap.fromTo(".tb-lista", { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.55, stagger: 0.07, ease: "power3.out", delay: 0.2, clearProps: "opacity,transform" })
      gsap.fromTo(".tb-tarjeta", { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.45, stagger: 0.03, ease: "power3.out", delay: 0.35, clearProps: "opacity,transform" })
    }, r)
    return () => ctx.revert()
  }, [])

  // La barra de avance del teléfono: dónde estás entre las cuatro listas.
  const medirAvance = useCallback(() => {
    const s = listas.current
    const a = avance.current
    if (!s || !a) return
    const parte = s.clientWidth / s.scrollWidth
    a.style.width = `${Math.min(100, parte * 100)}%`
    a.style.transform = `translateX(${(s.scrollLeft / s.clientWidth) * 100}%)`
  }, [])
  useEffect(() => {
    medirAvance()
    addEventListener("resize", medirAvance)
    return () => removeEventListener("resize", medirAvance)
  }, [medirAvance])

  // Con el dedo, una vez que la tarjeta se levantó, la página no se mueve.
  useEffect(() => {
    const frenar = (e: TouchEvent) => {
      if (arr.current?.activo) e.preventDefault()
    }
    document.addEventListener("touchmove", frenar, { passive: false })
    return () => document.removeEventListener("touchmove", frenar)
  }, [])

  /** Guarda dónde quedó una tarjeta. Si el servidor no guardó, vuelve a donde estaba y se avisa. */
  const guardarLugar = async (id: string, antesDe: Record<ListaId, string[]>) => {
    const o = ordenRef.current
    const l = listaDe(id, o)
    const deAntes = listaDe(id, antesDe)
    if (l === deAntes && o[l].indexOf(id) === antesDe[l].indexOf(id)) return
    const r = await seguro(() => moverTarjeta(id, l, o[l].indexOf(id)), comun.errorGuardar)
    if (r.ok) {
      // Una duda resuelta que sale de «Dudas» deja de estar resuelta (lo mismo hace la base).
      if (l !== "dudas") setTarjetas((t) => (t[id]?.resuelta ? { ...t, [id]: { ...t[id]!, resuelta: false } } : t))
      return
    }
    setOrden(antesDe)
    fallo(r)
  }

  const levantar = (a: Arrastre) => {
    previo.current = copia(ordenRef.current)
    a.activo = true
    const f = a.el.cloneNode(true) as HTMLElement
    f.classList.add("tb-fantasma")
    f.removeAttribute("data-flip-id")
    Object.assign(f.style, { position: "fixed", left: `${a.caja.left}px`, top: `${a.caja.top}px`, width: `${a.caja.width}px`, height: `${a.caja.height}px`, margin: "0", zIndex: "60", pointerEvents: "none" })
    raiz.current?.appendChild(f)
    a.fantasma = f
    gsap.set(f, { x: a.px - a.x0, y: a.py - a.y0 })
    if (!quieto()) gsap.to(f, { scale: 1.04, rotation: 2.5, duration: 0.22, ease: "power2.out" })
    if (a.tipo === "touch") navigator.vibrate?.(10)
    setArrastrando(a.id)
    setDestino(listaDe(a.id, ordenRef.current))
    bucle()
  }

  /** Mientras se arrastra: si la tarjeta se acerca al borde del tablero, el tablero se corre (teléfono). */
  const bucle = () => {
    const a = arr.current
    const s = listas.current
    if (!a?.activo || !s) return
    const c = s.getBoundingClientRect()
    if (s.scrollWidth > s.clientWidth) {
      if (a.px < c.left + 48) s.scrollLeft -= 9
      else if (a.px > c.right - 48) s.scrollLeft += 9
    }
    ubicar(a)
    requestAnimationFrame(bucle)
  }

  /** En qué lista y en qué lugar caería la tarjeta, mirando dónde está el puntero. */
  const ubicar = (a: Arrastre) => {
    const r = raiz.current
    if (!r) return
    const lista = Array.from(r.querySelectorAll<HTMLElement>(".tb-lista")).find((l) => {
      const c = l.getBoundingClientRect()
      return a.px >= c.left && a.px <= c.right
    })
    if (!lista) return
    const l = lista.dataset.lista as ListaId
    const otras = Array.from(lista.querySelectorAll<HTMLElement>(".tb-tarjeta")).filter((e) => e.dataset.flipId !== a.id)
    let i = otras.findIndex((e) => {
      const c = e.getBoundingClientRect()
      return a.py < c.top + c.height / 2
    })
    if (i < 0) i = otras.length
    const o = ordenRef.current
    const actual = listaDe(a.id, o)
    const clave = `${l}:${i}`
    // Mientras las otras tarjetas se corren, sus cajas se mueven: solo se reacomoda si el lugar cambió de verdad.
    if (a.ultimo === clave || (actual === l && o[actual].indexOf(a.id) === i)) {
      a.ultimo = clave
      return
    }
    a.ultimo = clave
    setDestino(l)
    mover(a.id, l, i)
  }

  const alSoltar = () => {
    const a = arr.current
    arr.current = null
    removeEventListener("pointermove", alMover)
    removeEventListener("pointerup", alSoltar)
    removeEventListener("pointercancel", alSoltar)
    if (!a) return
    clearTimeout(a.espera)
    a.soltarToque?.()
    a.el.classList.remove("tb-tarjeta--esperando")
    if (!a.activo || !a.fantasma) {
      // Un toque o un click sin arrastrar abre la ficha.
      if (!a.activo && Math.hypot(a.px - a.x0, a.py - a.y0) < 6) abrir(a.id)
      return
    }
    const f = a.fantasma
    const lugar = raiz.current?.querySelector<HTMLElement>(`[data-flip-id="${a.id}"]`)?.getBoundingClientRect()
    setDestino(null)
    if (previo.current) void guardarLugar(a.id, previo.current)
    previo.current = null
    const fin = () => {
      f.remove()
      setArrastrando(null)
    }
    if (!lugar || quieto()) return fin()
    gsap.to(f, { x: lugar.left - a.caja.left, y: lugar.top - a.caja.top, width: lugar.width, height: lugar.height, scale: 1, rotation: 0, duration: 0.4, ease: "power3.out", onComplete: fin })
  }

  const alMover = (e: PointerEvent) => {
    const a = arr.current
    if (!a) return
    a.px = e.clientX
    a.py = e.clientY
    const lejos = Math.hypot(a.px - a.x0, a.py - a.y0)
    if (!a.activo) {
      if (a.tipo === "touch") {
        if (lejos > 8) alSoltar() // se movió antes de tiempo: es scroll
      } else if (lejos > 5) levantar(a)
      return
    }
    gsap.set(a.fantasma!, { x: a.px - a.x0, y: a.py - a.y0 })
  }

  const alApretar = (e: PE<HTMLDivElement>) => {
    if (e.button !== 0 || arr.current) return
    const el = (e.target as HTMLElement).closest<HTMLElement>(".tb-tarjeta")
    if (!el || (e.target as HTMLElement).closest("[data-no-arrastre]")) return
    const a: Arrastre = { id: el.dataset.flipId!, el, tipo: e.pointerType, x0: e.clientX, y0: e.clientY, px: e.clientX, py: e.clientY, caja: el.getBoundingClientRect(), activo: false }
    arr.current = a
    if (e.pointerType === "touch") {
      // Preventivo: al cambiar de lista, React saca del documento el nodo que se tocó y el navegador le sigue
      // mandando los touchmove a ese nodo suelto, que ya no llegan al documento. Se frenan también ahí.
      const tocado = e.target as HTMLElement
      const frenar = (ev: TouchEvent) => {
        if (arr.current?.activo) ev.preventDefault()
      }
      tocado.addEventListener("touchmove", frenar, { passive: false })
      a.soltarToque = () => tocado.removeEventListener("touchmove", frenar)
      el.classList.add("tb-tarjeta--esperando")
      a.espera = window.setTimeout(() => {
        el.classList.remove("tb-tarjeta--esperando")
        if (arr.current === a) {
          a.caja = el.getBoundingClientRect()
          levantar(a)
        }
      }, 280)
    }
    addEventListener("pointermove", alMover)
    addEventListener("pointerup", alSoltar)
    addEventListener("pointercancel", alSoltar)
  }

  const moverA = (id: string, a: ListaId) => {
    const antesDe = copia(ordenRef.current)
    llegada.current = id
    mover(id, a, 0)
    // Después del render, para guardar el orden ya actualizado.
    requestAnimationFrame(() => void guardarLugar(id, antesDe))
  }

  const traerConversacion = async (id: string) => {
    setErrorConv(null)
    const r = await seguro(() => leerConversacion(id), comun.errorCarga)
    if (r.ok) setConv((c) => ({ ...c, [id]: r.datos }))
    else if (r.sesion === "vencida") router.replace("/ingresar?motivo=expirado")
    else setErrorConv(r.mensaje)
  }
  const abrir = (id: string) => {
    setFichaId(id)
    setAbierta(true)
    if (!conv[id]) void traerConversacion(id)
  }
  const origenFicha = () => (fichaId ? (raiz.current?.querySelector(`[data-flip-id="${fichaId}"]`)?.getBoundingClientRect() ?? null) : null)

  /** Guarda un comentario; si salió, aparece en la conversación. Devuelve si se guardó (el campo se vacía solo entonces). */
  const comentar = async (id: string, texto: string, respuestaA?: string) => {
    const r = await seguro(() => comentarEn(id, texto, respuestaA ?? null), comun.errorGuardar)
    if (!r.ok) {
      fallo(r)
      return false
    }
    const nuevo = r.datos
    setConv((c) => ({ ...c, [id]: [...(c[id] ?? []), nuevo] }))
    setTarjetas((t) => (t[id] ? { ...t, [id]: { ...t[id]!, comentarios: t[id]!.comentarios + 1 } } : t))
    return true
  }
  /** Marca resuelta o reabre al toque; si el servidor no guardó, vuelve como estaba. */
  const resolver = async (id: string) => {
    const nueva = !tarjetas[id]?.resuelta
    const poner = (v: boolean) => setTarjetas((t) => (t[id] ? { ...t, [id]: { ...t[id]!, resuelta: v } } : t))
    poner(nueva)
    const r = await seguro(() => resolverDuda(id, nueva), comun.errorGuardar)
    if (!r.ok) {
      poner(!nueva)
      fallo(r)
    }
  }

  /** Crea la tarjeta en el servidor; si salió, entra arriba de su lista. Devuelve si se guardó. */
  const crear = async (n: NuevaTarjeta) => {
    const r = await seguro(() => crearTarjeta(n), comun.errorGuardar)
    if (!r.ok) {
      fallo(r)
      return false
    }
    const t = r.datos
    setTarjetas((x) => ({ ...x, [t.id]: t }))
    setConv((c) => ({ ...c, [t.id]: [] }))
    llegada.current = t.id
    mover(t.id, n.lista, 0)
    return true
  }

  const menuMover = (id: string, t: Tarjeta) => <MenuMover titulo={t.titulo} actual={listaDe(id, orden)} alMover={(l) => moverA(id, l)} />

  const total = Object.values(orden).flat().length
  const altas = Object.values(orden)
    .flat()
    .filter((id) => tarjetas[id]?.prioridad).length
  const fichaT = fichaId ? (tarjetas[fichaId] ?? null) : null
  const fichaLista = fichaId ? (LISTAS.find((l) => l.id === listaDe(fichaId, orden)) ?? null) : null

  return (
    <>
      <Banda sobre="Portal" titulo="Tablero" idTitulo="tb-titulo" bajada={pegar("Lo que hay que hacer, lo que espera respuesta y quién lo tiene.")}
        accion={
          <Boton
            variante="primaria"
            icono="agregar"
            onPress={(e) => {
              botonAlta.current = e.target as Element
              setAlta(true)
            }}
          >
            Nueva tarjeta
          </Boton>
        }
      >
        <div className="pr-cifras" role="group" aria-label="Tarjetas por lista">
          {LISTAS.map((l) => {
            const Icono = ICONO[l.id]
            return (
              <span key={l.id} className="pr-cifra">
                <span className="pr-cifra__icono" aria-hidden="true">
                  <Icono size={20} strokeWidth={1.75} />
                </span>
                <span className="pr-cifra__texto">
                  <span className="pr-cifra__titulo">{l.titulo}</span>
                  <span className="pr-cifra__pista">{l.corta}</span>
                </span>
                <span className="pr-cifra__numero">{orden[l.id].length}</span>
              </span>
            )
          })}
        </div>
      </Banda>
      <div ref={raiz} className="tb-tablero" data-arrastrando={arrastrando ? "" : undefined}>
        <div ref={listas} className="tb-listas" onScroll={medirAvance} onPointerDown={alApretar} onContextMenu={(e) => (e.target as HTMLElement).closest(".tb-tarjeta") && e.preventDefault()}>
          {LISTAS.map((l) => {
            const Icono = ICONO[l.id]
            return (
              <section key={l.id} className="tb-lista" data-lista={l.id} data-tono={l.tono} data-destino={destino === l.id || undefined} aria-labelledby={`tb-${l.id}`}>
                <header className="tb-lista__cabeza">
                  <span className="tb-lista__icono" aria-hidden="true">
                    <Icono size={16} strokeWidth={2} />
                  </span>
                  <h2 id={`tb-${l.id}`} className="tb-lista__titulo">
                    {l.titulo}
                  </h2>
                  <span className="tb-lista__contador">{orden[l.id].length}</span>
                </header>
                <p className="tb-lista__pista">{pegar(l.pista)}</p>
                <div className="tb-lista__cuerpo">
                  {orden[l.id].map((id) => {
                    const t = tarjetas[id]!
                    return (
                      <article
                        key={id}
                        data-flip-id={id}
                        className="tb-tarjeta"
                        data-hueco={arrastrando === id || undefined}
                        data-resuelta={t.resuelta || undefined}
                        aria-label={t.titulo}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if ((e.key === "Enter" || e.key === " ") && e.target === e.currentTarget) {
                            e.preventDefault()
                            abrir(id)
                          }
                        }}
                      >
                        <TarjetaTablero t={t} lista={l.id} mover={menuMover(id, t)} />
                      </article>
                    )
                  })}
                  {orden[l.id].length === 0 && <p className="tb-lista__vacia">Soltá una tarjeta acá</p>}
                  {inicial.masDe[l.id] && <p className="tb-lista__vacia">{pegar("Hay más tarjetas en esta lista: se ven las primeras 200.")}</p>}
                </div>
              </section>
            )
          })}
        </div>
        <div className="tb-avance" aria-hidden="true">
          <span ref={avance} className="tb-avance__barra" />
        </div>
        <footer className="tb-pie">
          <span className="tb-pie__caras">
            {personas.map((p) => (
              <span key={p.id} className="tb-av" data-tono={p.tono} title={p.nombre}>
                {p.iniciales}
              </span>
            ))}
          </span>
          <span className="tb-pie__dato">
            <strong>{personas.length}</strong> {personas.length === 1 ? "socio" : "socios"}
          </span>
          <span className="tb-pie__dato">
            <strong>{total}</strong> tarjetas
          </span>
          <span className="tb-pie__dato">
            <strong>{altas}</strong> con prioridad alta
          </span>
        </footer>
      </div>

      <FichaTarjeta
        tarjeta={fichaT}
        lista={fichaLista}
        abierta={abierta}
        alCerrar={() => setAbierta(false)}
        origen={origenFicha}
        comentarios={fichaId ? conv[fichaId] : undefined}
        errorConversacion={errorConv}
        alReintentar={() => fichaId && void traerConversacion(fichaId)}
        personas={personas}
        yo={yo}
        alComentar={(texto, respuestaA) => (fichaId ? comentar(fichaId, texto, respuestaA) : Promise.resolve(false))}
        resuelta={!!fichaT?.resuelta}
        alResolver={fichaLista?.id === "dudas" && fichaId ? () => void resolver(fichaId) : undefined}
        mover={fichaId && fichaT ? menuMover(fichaId, fichaT) : null}
      />
      <AltaTarjeta abierta={alta} alCerrar={() => setAlta(false)} origen={() => (botonAlta.current?.isConnected ? botonAlta.current.getBoundingClientRect() : null)} sistemas={sistemas} clientes={clientes} personas={personas} yo={yo} alCrear={crear} />
    </>
  )
}
