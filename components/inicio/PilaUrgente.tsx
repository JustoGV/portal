"use client"
import Link from "next/link"
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react"
import { createPortal } from "react-dom"
import { Icono } from "@/components/iconos/Icono"
import type { NombreIcono } from "@/components/iconos/trazos"
import type { Urgencia } from "@/dal/inicio"
import { inicio as t } from "@/i18n/es/inicio"
import { formatMonto } from "@/lib/gasto"
import { gsap, quieto } from "@/lib/gsap"
import { pegar } from "@/lib/texto"

/** Cada urgencia en sus partes: el dato que manda (los días, la cantidad), qué es, sobre qué y adónde ir. */
type Parte = { clave: string; n: string; unidad: string; tipo: string; titulo: string; href: string; accion: string; icono: NombreIcono }

const partes = (u: Urgencia): Parte => {
  switch (u.tipo) {
    case "pago":
      return {
        clave: `p${u.id}`,
        n: u.faltan <= 0 ? t.hoy : String(u.faltan),
        unidad: u.faltan <= 0 ? t.pilaVence : t.pilaParaVencer(u.faltan),
        tipo: t.pilaTipoPago,
        titulo: `${u.nombre} · ${formatMonto(u.monto, u.moneda)}`,
        href: "/gastos?ver=semana",
        accion: t.irGastos,
        icono: "reloj",
      }
    case "duda":
      return { clave: `d${u.id}`, n: String(u.dias), unidad: t.pilaQuieta(u.dias), tipo: t.pilaTipoDuda, titulo: u.titulo, href: "/tablero", accion: t.irTablero, icono: "alerta" }
    case "prioridad":
      return { clave: `r${u.id}`, n: "!", unidad: t.pilaAlta, tipo: t.pilaTipoPrioridad(t.listas[u.lista]), titulo: u.titulo, href: "/tablero", accion: t.irTablero, icono: "alerta" }
    case "sin-dueno":
      return { clave: "sd", n: String(u.cuantas), unidad: t.pilaSinDueno, tipo: t.pilaTipoSinDueno, titulo: t.pilaAsignar, href: "/tablero", accion: t.asignar, icono: "persona" }
  }
}

/**
 * Urgente (D-045, segunda vuelta: la 2 · beUI Notification Stack con la 3 · themeocean Expandable Notification
 * Stack; Mateo eligió la versión C, en la banda, el 2026-11-22). Cerrada es una pila de vidrio en el medio de la
 * banda: la urgencia más grave arriba, dos asomando detrás y abajo el número. Se abre con un toque y las tarjetas
 * caen en una lista agrupada (Urgente / Para mirar), donde cada fila manda con su dato: los días que lleva quieta
 * una duda, los días que faltan para un pago. Se cierra con Esc, con la cruz o tocando afuera.
 */
export function PilaUrgente({ urgencias }: { urgencias: Urgencia[] }) {
  const [abierta, setAbierta] = useState(false)
  const [pos, setPos] = useState<CSSProperties>({})
  const raiz = useRef<HTMLElement>(null)
  const mazo = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const cerrando = useRef(false)
  const graves = urgencias.filter((u) => u.nivel === "grave")
  const atencion = urgencias.filter((u) => u.nivel !== "grave")
  const n = urgencias.length

  const medir = useCallback(() => {
    const r = raiz.current?.getBoundingClientRect()
    if (!r) return
    const ancho = Math.min(Math.max(r.width, 400), innerWidth - 32)
    const izq = Math.min(Math.max(16, r.left + r.width / 2 - ancho / 2), innerWidth - 16 - ancho)
    setPos({ position: "absolute", top: r.top + scrollY, left: izq + scrollX, width: ancho })
  }, [])

  const cerrar = useCallback(() => {
    const p = panel.current
    if (!p || cerrando.current) return
    const fin = () => {
      cerrando.current = false
      setAbierta(false)
      mazo.current?.focus({ preventScroll: true })
    }
    if (quieto()) return fin()
    cerrando.current = true
    const filas = p.querySelectorAll<HTMLElement>(".in-pila__fila")
    const alto = filas[0]?.offsetHeight ?? 64
    gsap.to(filas, { y: (i) => -i * (alto - 8), opacity: (i) => (i < 3 ? 1 : 0), duration: 0.22, ease: "power2.in" })
    gsap.to(p, { opacity: 0, duration: 0.2, delay: 0.08, onComplete: fin })
  }, [])

  // Al abrir: las tarjetas salen de la pila y caen a su lugar; el número de cada una cuenta desde 0.
  useLayoutEffect(() => {
    const p = panel.current
    if (!abierta || !p) return
    p.focus({ preventScroll: true })
    if (quieto()) return
    const filas = p.querySelectorAll<HTMLElement>(".in-pila__fila")
    const alto = filas[0]?.offsetHeight ?? 64
    const tl = gsap.timeline()
    tl.fromTo(p, { opacity: 0, y: -6 }, { opacity: 1, y: 0, duration: 0.2, ease: "power2.out" })
    tl.fromTo(p.querySelectorAll(".in-pila__grupo-titulo"), { opacity: 0, x: -8 }, { opacity: 1, x: 0, duration: 0.3, stagger: 0.12, clearProps: "opacity,transform" }, 0.1)
    tl.fromTo(
      filas,
      { y: (i) => -i * (alto - 8), scale: (i) => 1 - Math.min(i, 3) * 0.04, opacity: (i) => (i < 3 ? 1 - i * 0.25 : 0) },
      { y: 0, scale: 1, opacity: 1, duration: 0.55, ease: "back.out(1.3)", stagger: 0.035, clearProps: "transform,opacity" },
      0,
    )
    p.querySelectorAll<HTMLElement>("[data-cuenta]").forEach((el, i) => {
      const fin = Number(el.dataset.cuenta)
      const o = { v: 0 }
      tl.to(o, { v: fin, duration: 0.6, ease: "power2.out", onUpdate: () => void (el.textContent = String(Math.round(o.v))) }, 0.15 + i * 0.035)
    })
    return () => void tl.progress(1).kill()
  }, [abierta])

  // Esc y tocar afuera la cierran; si cambia el tamaño de la ventana, se reubica.
  useEffect(() => {
    if (!abierta) return
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && cerrar()
    const toque = (e: PointerEvent) => {
      const x = e.target as Node
      if (!panel.current?.contains(x) && !mazo.current?.contains(x)) cerrar()
    }
    addEventListener("keydown", tecla)
    addEventListener("pointerdown", toque)
    addEventListener("resize", medir)
    return () => {
      removeEventListener("keydown", tecla)
      removeEventListener("pointerdown", toque)
      removeEventListener("resize", medir)
    }
  }, [abierta, cerrar, medir])

  if (n === 0)
    return (
      <section className="in-pila" data-vacia="" aria-label={t.urgente}>
        <span className="in-pila__icono" data-nivel="ok" aria-hidden="true">
          <Icono nombre="tilde" tamano={20} />
        </span>
        <span>
          <strong className="in-pila__ok-titulo">{t.nadaUrgente}</strong>
          <span className="in-pila__ok-texto">{pegar(t.nadaUrgenteCorto)}</span>
        </span>
      </section>
    )

  const primera = urgencias[0]!
  const p0 = partes(primera)
  const grupo = (titulo: string, lista: Urgencia[], nivel: "grave" | "atencion") =>
    lista.length > 0 && (
      <div className="in-pila__grupo" data-nivel={nivel}>
        <p className="in-pila__grupo-titulo">
          {titulo} <span>{lista.length}</span>
        </p>
        <ul className="in-pila__lista">
          {lista.map((u) => {
            const f = partes(u)
            const numero = /^\d+$/.test(f.n)
            return (
              <li key={f.clave}>
                <Link href={f.href} className="in-pila__fila" data-nivel={u.nivel} aria-label={`${f.tipo}: ${f.titulo}. ${f.n} ${f.unidad}. ${f.accion}`}>
                  <span className="in-pila__dato" aria-hidden="true">
                    <strong data-cuenta={numero ? f.n : undefined}>{f.n}</strong>
                    <span>{f.unidad}</span>
                  </span>
                  <span className="in-pila__cuerpo" aria-hidden="true">
                    <span className="in-pila__tipo">
                      <Icono nombre={f.icono} tamano={16} />
                      {f.tipo}
                    </span>
                    <span className="in-pila__texto">{pegar(f.titulo)}</span>
                    <span className="in-pila__accion">{f.accion}</span>
                  </span>
                  <span className="in-pila__ir" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    )

  const lista = (
    <div ref={panel} className="in-pagina in-pila__panel" style={pos} role="dialog" aria-label={t.urgente} tabIndex={-1}>
      <header className="in-pila__panel-cabeza">
        <div>
          <h3 className="in-pila__titulo">{t.urgente}</h3>
          <p className="in-pila__resumen">{pegar(t.pilaResumen(graves.length, atencion.length))}</p>
        </div>
        <button type="button" className="in-pila__cerrar" onClick={cerrar} aria-label={t.cerrar}>
          <Icono nombre="cerrar" tamano={16} />
        </button>
      </header>
      <div className="in-pila__scroll">
        {grupo(t.grave, graves, "grave")}
        {grupo(t.pilaParaMirar, atencion, "atencion")}
      </div>
    </div>
  )

  return (
    <section ref={raiz} className="in-pila" data-abierta={abierta ? "" : undefined} aria-label={t.urgente}>
      <button
        ref={mazo}
        type="button"
        className="in-pila__mazo"
        data-capas={Math.min(n, 3)}
        aria-expanded={abierta}
        aria-haspopup="dialog"
        onClick={() => {
          if (abierta) return cerrar()
          medir()
          setAbierta(true)
        }}
      >
        <span className="in-pila__pila">
          {n > 2 && <span className="in-pila__sombra" data-n="2" aria-hidden="true" />}
          {n > 1 && <span className="in-pila__sombra" data-n="1" aria-hidden="true" />}
          <span className="in-pila__carta" data-nivel={primera.nivel}>
            <span className="in-pila__icono" data-nivel={primera.nivel} aria-hidden="true">
              <Icono nombre={p0.icono} tamano={20} />
            </span>
            <span className="in-pila__cuerpo">
              <span className="in-pila__nivel">
                {primera.nivel === "grave" ? t.grave : t.atencion}
                <span className="in-pila__nivel-tipo"> · {p0.tipo}</span>
              </span>
              <span className="in-pila__texto">{pegar(p0.titulo)}</span>
            </span>
            <span className="in-pila__mini" aria-hidden="true">
              <strong>{p0.n}</strong>
              <span>{p0.unidad}</span>
            </span>
          </span>
        </span>
        <span className="in-pila__pie">
          <span className="in-pila__cuenta" data-grave={graves.length > 0 ? "" : undefined}>
            {n}
          </span>
          <span>{t.pilaVer(n)}</span>
          <span className="in-pila__resumen-pie">{pegar(t.pilaResumen(graves.length, atencion.length))}</span>
          <svg className="in-pila__flecha" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </button>
      {abierta && createPortal(lista, document.body)}
    </section>
  )
}
