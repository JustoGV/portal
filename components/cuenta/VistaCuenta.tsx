"use client"
import { KeyRound, Mail, CalendarDays, Monitor, ShieldCheck, Smartphone, UserRound } from "lucide-react"
import { useCallback, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react"
import { IconoDuo, type IconoDuoApi, type NombreDuo } from "@/components/iconos/IconoDuo"
import { Banda } from "@/components/ui/Banda"
import { Boton } from "@/components/ui/Boton"
import { Etiqueta } from "@/components/ui/Etiqueta"
import { cuenta as t } from "@/i18n/es/cuenta"
import { usuarios as tu } from "@/i18n/es/usuarios"
import type { MiCuenta } from "@/lib/cuenta"
import { formatDia, haceCuanto } from "@/lib/fecha"
import { gsap, quieto } from "@/lib/gsap"
import { iniciales } from "@/lib/nombre"
import { pegar } from "@/lib/texto"
import { conCorte, useCuenta, type Cuenta } from "./PiezasCuenta"

type Id = keyof typeof t.seccion
const SECCIONES: { id: Id; icono: NombreDuo }[] = [
  { id: "perfil", icono: "persona" },
  { id: "seguridad", icono: "escudo" },
  { id: "sesiones", icono: "panel" },
  { id: "actividad", icono: "reloj" },
]
const BAJADAS: Record<Id, string> = { perfil: t.perfilBajada, seguridad: t.accesoBajada, sesiones: t.sesionesBajada, actividad: t.movimientosBajada }

/**
 * Mi cuenta (WU-06 pantalla 6, D-035 y D-036). Arriba la banda azul (la misma cabecera que Servicios,
 * Clientes y Usuarios) con tus iniciales, nombre, mail, «Editar nombre» y tres datos. Debajo, la tarjeta
 * con secciones que eligió Mateo (Clerk · UserProfile): Perfil, Seguridad, Sesiones y Actividad, cada una
 * con su movimiento. Elegir una: el resaltado se desliza (0,35 s), el ícono se dibuja y el contenido entra
 * escalonado. ↑ ↓ (o ← →) recorren el menú; en el teléfono el menú es una fila arriba.
 */
export function VistaCuenta({ c }: { c: MiCuenta }) {
  const cuenta = useCuenta(c)
  const [actual, setActual] = useState<Id>("perfil")
  const menu = useRef<HTMLDivElement>(null)
  const resaltado = useRef<HTMLSpanElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const iconos = useRef<Partial<Record<Id, IconoDuoApi | null>>>({})
  const primera = useRef(true)
  const cifra = useRef<HTMLSpanElement>(null)

  const medir = useCallback(
    (animar: boolean) => {
      const m = menu.current
      const el = m?.querySelector<HTMLElement>(`[data-id="${actual}"]`)
      const r = resaltado.current
      if (!m || !el || !r) return
      const a = { x: el.offsetLeft, y: el.offsetTop, width: el.offsetWidth, height: el.offsetHeight }
      if (!animar || quieto()) gsap.set(r, a)
      else gsap.to(r, { ...a, duration: 0.35, ease: "power3.out", overwrite: "auto" })
    },
    [actual],
  )

  // Cambio de sección: el resaltado viaja, el ícono se dibuja y el panel entra de a partes.
  useLayoutEffect(() => {
    medir(!primera.current)
    if (!primera.current) {
      iconos.current[actual]?.animar()
      const p = panel.current
      if (p && !quieto()) gsap.fromTo(p.querySelectorAll(":scope > *"), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.06, ease: "power3.out", clearProps: "opacity,transform" })
    }
    primera.current = false
    const ajustar = () => medir(false)
    window.addEventListener("resize", ajustar)
    return () => window.removeEventListener("resize", ajustar)
  }, [medir, actual])

  // Al entrar: la tarjeta sube, el menú cae de a uno y la cifra de sesiones de la banda cuenta desde 0.
  useLayoutEffect(() => {
    if (quieto()) return
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } })
    tl.fromTo(".cu-tarjeta", { opacity: 0, y: 32 }, { opacity: 1, y: 0, duration: 0.7, clearProps: "opacity,transform" }, 0.3)
      .fromTo(".cu-menu__item", { opacity: 0, x: -12 }, { opacity: 1, x: 0, duration: 0.4, stagger: 0.06, clearProps: "opacity,transform" }, 0.5)
    const n = { v: 0 }
    const el = cifra.current
    if (el) tl.to(n, { v: c.sesiones.length, duration: 0.8, ease: "power2.out", onUpdate: () => void (el.textContent = String(Math.round(n.v))) }, 0.5)
    return () => {
      tl.progress(1).kill()
    }
  }, [c.sesiones.length])

  const teclas = (e: KeyboardEvent<HTMLDivElement>) => {
    const paso = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0
    if (!paso) return
    e.preventDefault()
    const i = SECCIONES.findIndex((s) => s.id === actual)
    const sig = SECCIONES[(i + paso + SECCIONES.length) % SECCIONES.length]!.id
    setActual(sig)
    menu.current?.querySelector<HTMLElement>(`[data-id="${sig}"]`)?.focus()
  }

  return (
    <>
      <Banda
        sobre={t.titulo}
        idTitulo="cu-nombre"
        delante={
          <span className="cu-banda__iniciales" aria-hidden="true">
            {iniciales(c.nombre)}
          </span>
        }
        titulo={pegar(c.nombre)}
        bajada={conCorte(c.email)}
        accion={
          <Boton variante="secundaria" icono="editar" onPress={() => cuenta.abrir("nombre")}>
            {t.editarNombre}
          </Boton>
        }
      >
        <dl className="cu-datos">
          <div className="cu-dato">
            <dt>{t.datoSesiones}</dt>
            <dd>
              <span ref={cifra}>{c.sesiones.length}</span>
            </dd>
          </div>
          <div className="cu-dato">
            <dt>{t.datoFactor}</dt>
            <dd>{c.segundoFactor ? t.factorActivo : t.factorNo}</dd>
          </div>
          <div className="cu-dato">
            <dt>{t.datoDesde}</dt>
            <dd>{formatDia(c.creadoEn)}</dd>
          </div>
        </dl>
      </Banda>

      <div className="cu-tarjeta">
        <div ref={menu} className="cu-menu" role="tablist" aria-label={t.secciones} aria-orientation="vertical" onKeyDown={teclas}>
          <p className="cu-menu__sobre" aria-hidden="true">
            {t.menuSobre}
          </p>
          <span ref={resaltado} className="cu-menu__resaltado" aria-hidden="true" />
          {SECCIONES.map(({ id, icono }) => (
            <button
              key={id}
              type="button"
              role="tab"
              id={`cu-tab-${id}`}
              data-id={id}
              aria-selected={actual === id}
              aria-controls="cu-panel"
              tabIndex={actual === id ? 0 : -1}
              className="cu-menu__item"
              onClick={() => setActual(id)}
              onPointerEnter={() => iconos.current[id]?.animar()}
            >
              <span className="cu-menu__icono" aria-hidden="true">
                <IconoDuo
                  ref={(api) => {
                    iconos.current[id] = api
                  }}
                  nombre={icono}
                  tamano={22}
                />
              </span>
              <span className="cu-menu__textos">
                <span className="cu-menu__titulo">{t.seccion[id].titulo}</span>
                <span className="cu-menu__texto">{t.seccion[id].texto}</span>
              </span>
            </button>
          ))}
        </div>

        <div ref={panel} id="cu-panel" className="cu-panel" role="tabpanel" aria-labelledby={`cu-tab-${actual}`}>
          <header className="cu-panel__cabecera">
            <div>
              <h2 className="cu-panel__titulo">{t.seccion[actual].titulo}</h2>
              <p className="cu-panel__bajada">{pegar(BAJADAS[actual])}</p>
            </div>
            {actual === "sesiones" && c.sesiones.some((s) => !s.esEsta) && (
              <Boton variante="secundaria" icono="salir" onPress={cuenta.cerrarDemas}>
                {t.cerrarDemas}
              </Boton>
            )}
          </header>
          {actual === "perfil" && <PanelPerfil c={c} cuenta={cuenta} />}
          {actual === "seguridad" && <PanelSeguridad c={c} cuenta={cuenta} />}
          {actual === "sesiones" && <PanelSesiones c={c} cuenta={cuenta} />}
          {actual === "actividad" && <PanelActividad c={c} />}
        </div>
      </div>
      {cuenta.dialogos}
    </>
  )
}

/** Un dato en su recuadro: ícono en color, rótulo, valor y, si se puede, su acción. */
function Recuadro({ icono, rotulo, valor, nota, accion, tono = "marca" }: { icono: ReactNode; rotulo: string; valor: ReactNode; nota?: ReactNode; accion?: ReactNode; tono?: "marca" | "ok" | "neutro" }) {
  return (
    <div className="cu-recuadro" data-tono={tono}>
      <span className="cu-recuadro__icono" aria-hidden="true">
        {icono}
      </span>
      <div className="cu-recuadro__textos">
        <span className="cu-recuadro__rotulo">{rotulo}</span>
        <span className="cu-recuadro__valor">{valor}</span>
        {nota && <span className="cu-recuadro__nota">{nota}</span>}
      </div>
      {accion && <div className="cu-recuadro__accion">{accion}</div>}
    </div>
  )
}

function PanelPerfil({ c, cuenta }: { c: MiCuenta; cuenta: Cuenta }) {
  return (
    <div className="cu-recuadros">
      <Recuadro
        icono={<UserRound size={22} strokeWidth={1.75} />}
        rotulo={t.nombreRotulo}
        valor={pegar(c.nombre)}
        accion={
          <Boton variante="secundaria" icono="editar" onPress={() => cuenta.abrir("nombre")}>
            {t.editarNombre}
          </Boton>
        }
      />
      <Recuadro icono={<Mail size={22} strokeWidth={1.75} />} rotulo={t.mailRotulo} valor={conCorte(c.email)} nota={t.mailTexto} />
      <Recuadro icono={<CalendarDays size={22} strokeWidth={1.75} />} rotulo={t.datoDesde} valor={formatDia(c.creadoEn)} />
    </div>
  )
}

/** Un medidor circular: cuántas de las dos protecciones tiene la cuenta. Se dibuja al entrar (1,1 s). */
function PanelSeguridad({ c, cuenta }: { c: MiCuenta; cuenta: Cuenta }) {
  const total = 2
  const n = 1 + (c.segundoFactor ? 1 : 0)
  const arco = useRef<SVGCircleEl>(null)
  const numero = useRef<HTMLSpanElement>(null)
  const R = 52
  const largo = 2 * Math.PI * R

  useLayoutEffect(() => {
    const a = arco.current
    if (!a) return
    const fin = largo * (1 - n / total)
    if (quieto()) {
      a.style.strokeDashoffset = String(fin)
      return
    }
    const o = { v: 0 }
    const tw = gsap.fromTo(a, { strokeDashoffset: largo }, { strokeDashoffset: fin, duration: 1.1, ease: "power3.out", delay: 0.15 })
    const tn = gsap.to(o, { v: n, duration: 1.1, ease: "power3.out", delay: 0.15, onUpdate: () => void (numero.current && (numero.current.textContent = String(Math.round(o.v)))) })
    return () => {
      tw.kill()
      tn.kill()
    }
  }, [largo, n])

  return (
    <div className="cu-seguridad">
      <div className="cu-medidor" data-completo={n === total || undefined}>
        <svg viewBox="0 0 120 120" className="cu-medidor__svg" aria-hidden="true">
          <circle cx="60" cy="60" r={R} className="cu-medidor__pista" />
          <circle ref={arco} cx="60" cy="60" r={R} className="cu-medidor__arco" strokeDasharray={largo} strokeDashoffset={largo * (1 - n / total)} />
        </svg>
        <div className="cu-medidor__centro">
          <span className="cu-medidor__numero">
            <span ref={numero}>{n}</span>
            <span className="cu-medidor__de"> / {total}</span>
          </span>
        </div>
        <div className="cu-medidor__textos">
          <p className="cu-medidor__titulo">{t.medidorTitulo}</p>
          <p className="cu-medidor__texto">{pegar(t.medidorTexto(n === total))}</p>
          <span className="sr-solo">{t.medidorDe(n, total)}</span>
        </div>
      </div>
      <div className="cu-recuadros">
        <Recuadro
          tono="ok"
          icono={<KeyRound size={22} strokeWidth={1.75} />}
          rotulo={t.contrasena}
          valor={<Etiqueta tono="ok">{t.contrasenaEstado}</Etiqueta>}
          nota={pegar(t.contrasenaTexto)}
          accion={
            <Boton variante="secundaria" icono="llave" onPress={() => cuenta.abrir("clave")}>
              {t.cambiar}
            </Boton>
          }
        />
        <Recuadro
          tono={c.segundoFactor ? "ok" : "neutro"}
          icono={<ShieldCheck size={22} strokeWidth={1.75} />}
          rotulo={t.segundoFactor}
          valor={<Etiqueta tono={c.segundoFactor ? "ok" : "neutro"}>{c.segundoFactor ? t.factorActivo : t.factorNo}</Etiqueta>}
          nota={pegar(c.segundoFactor ? t.factorActivoTexto : t.factorNoTexto)}
          accion={
            c.segundoFactor ? (
              <>
                <Boton variante="secundaria" icono="llave" onPress={() => cuenta.abrir("codigos")}>
                  {t.codigosNuevos}
                </Boton>
                <Boton variante="secundaria" icono="desactivar" onPress={() => cuenta.abrir("quitar")}>
                  {t.desactivar}
                </Boton>
              </>
            ) : (
              <Boton variante="primaria" icono="escudo" onPress={() => cuenta.abrir("factor")}>
                {t.activar}
              </Boton>
            )
          }
        />
      </div>
    </div>
  )
}
type SVGCircleEl = SVGCircleElement

/** Cada dispositivo en su recuadro; el de ahora con un punto verde que late. */
function PanelSesiones({ c, cuenta }: { c: MiCuenta; cuenta: Cuenta }) {
  return (
    <>
      <ul className="cu-dispositivos" data-lista-sesiones="">
        {c.sesiones.map((s) => (
          <li key={s.id} className="cu-dispositivo" data-sesion={s.id} data-esta={s.esEsta || undefined}>
            <span className="cu-dispositivo__icono" aria-hidden="true">
              {s.movil ? <Smartphone size={28} strokeWidth={1.5} /> : <Monitor size={28} strokeWidth={1.5} />}
            </span>
            <div className="cu-dispositivo__textos">
              <span className="cu-dispositivo__nombre">{s.dispositivo}</span>
              {s.esEsta ? (
                <span className="cu-dispositivo__vivo">
                  <span className="cu-latido" aria-hidden="true" />
                  {t.esteDispositivo}
                </span>
              ) : null}
              <span className="cu-dispositivo__cuando">{s.esEsta ? t.abierta(haceCuanto(s.abierta)) : t.usada(haceCuanto(s.usada))}</span>
            </div>
            {!s.esEsta && (
              <Boton variante="secundaria" icono="salir" aria-label={t.cerrarDe(s.dispositivo)} onPress={() => cuenta.cerrarUna(s.id)}>
                {t.cerrar}
              </Boton>
            )}
          </li>
        ))}
      </ul>
      {c.sesiones.every((s) => s.esEsta) && <p className="cu-nota">{pegar(t.soloEsta)}</p>}
    </>
  )
}

/** La línea de tiempo se dibuja de arriba abajo y cada punto aparece cuando la línea llega a él. */
function PanelActividad({ c }: { c: MiCuenta }) {
  const lista = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const l = lista.current
    if (!l || quieto()) return
    const ctx = gsap.context(() => {
      const items = l.querySelectorAll(".cu-tiempo__item")
      const dur = 0.25 + items.length * 0.12
      gsap.fromTo(".cu-tiempo__hilo", { scaleY: 0 }, { scaleY: 1, duration: dur, ease: "power1.inOut", transformOrigin: "top", delay: 0.1 })
      gsap.fromTo(".cu-tiempo__punto", { scale: 0 }, { scale: 1, duration: 0.35, ease: "back.out(2)", stagger: 0.12, delay: 0.15, clearProps: "transform" })
      gsap.fromTo(".cu-tiempo__cuerpo", { opacity: 0, x: 12 }, { opacity: 1, x: 0, duration: 0.4, stagger: 0.12, delay: 0.18, ease: "power3.out", clearProps: "opacity,transform" })
    }, l)
    return () => ctx.revert()
  }, [])

  if (c.movimientos.length === 0) return <p className="cu-nota">{t.movimientosVacio}</p>
  return (
    <div ref={lista} className="cu-tiempo-caja">
      <span className="cu-tiempo__hilo" aria-hidden="true" />
      <ol className="cu-tiempo">
      {c.movimientos.map((m) => (
        <li key={m.id} className="cu-tiempo__item">
          <span className="cu-tiempo__punto" aria-hidden="true" />
          <div className="cu-tiempo__cuerpo">
            <span className="cu-tiempo__texto">
              {tu.movimiento[m.accion] ?? tu.movimientoOtro}
              {m.quien && <span className="cu-tiempo__quien"> {tu.por(m.quien)}</span>}
            </span>
            <time className="cu-tiempo__cuando" dateTime={new Date(m.cuando).toISOString()}>
              {haceCuanto(m.cuando)}
            </time>
          </div>
        </li>
      ))}
      </ol>
    </div>
  )
}
