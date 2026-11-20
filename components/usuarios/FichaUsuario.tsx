"use client"
import { CalendarDays, ChevronDown, ChevronUp, History, KeyRound, LogIn, Monitor, MonitorSmartphone, ShieldCheck, Smartphone } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react"
import { Button } from "react-aria-components"
import { verDetalleUsuario } from "@/acciones/usuarios"
import { Boton } from "@/components/ui/Boton"
import { BotonIcono } from "@/components/ui/BotonIcono"
import { Pista } from "@/components/ui/Pista"
import { TarjetaModal } from "@/components/ui/TarjetaModal"
import { comun } from "@/i18n/es/comun"
import { usuarios as t } from "@/i18n/es/usuarios"
import type { DetalleUsuario, FilaUsuario } from "@/lib/cuenta"
import { formatDia, haceCuanto } from "@/lib/fecha"
import { gsap, quieto } from "@/lib/gsap"
import { iniciales } from "@/lib/nombre"
import { pegar } from "@/lib/texto"

type Props = {
  /** Las cuentas que se ven en la tabla: ↑ ↓ recorren estas. */
  filas: FilaUsuario[]
  id: string | null
  origen: () => DOMRect | null
  alCambiar: (id: string) => void
  alCerrar: () => void
  alEditar: (u: FilaUsuario) => void
  alClave: (u: FilaUsuario) => void
  alCerrarSesiones: (u: FilaUsuario, antes?: () => Promise<void>) => Promise<boolean>
  alActivo: (u: FilaUsuario) => void
}

/** El estado de una cuenta en una palabra, con su tono (docs/reglas/05 §8: nunca solo color). */
export const estadoDe = (u: FilaUsuario) =>
  !u.activo ? { texto: t.desactivada, tono: "neutro" as const } : u.debeCambiarClave ? { texto: t.primerIngreso, tono: "warn" as const } : { texto: t.activa, tono: "ok" as const }

type Detalle = { para: string; estado: "cargando" | "listo" | "error"; datos: DetalleUsuario | null }

/**
 * La ficha de una cuenta (D-034, rehecha en D-042 con la forma de la ficha de Servicios, D-037): una
 * tarjeta al centro que crece desde la fila (D-030), nunca un panel lateral (D-029). Arriba la banda azul
 * con la persona, su estado y sus fechas en vidrio; abajo los datos en recuadros, cada uno con su acción
 * adentro: contraseña, segundo factor, las sesiones abiertas («Cerrar todas» en su cabecera) y los últimos
 * cinco movimientos. Las sesiones y los movimientos
 * se piden al abrir (verDetalleUsuario). ↑ ↓ pasan a la cuenta anterior o siguiente; el contenido se cruza
 * 16 px en 0,3 s. Una sesión cerrada sale de la lista en 0,3 s antes de que llegue la lista nueva.
 */
export function FichaUsuario({ filas, id, origen, alCambiar, alCerrar, alEditar, alClave, alCerrarSesiones, alActivo }: Props) {
  const idTitulo = useId()
  const router = useRouter()
  const cuerpo = useRef<HTMLDivElement>(null)
  const cabeza = useRef<HTMLDivElement>(null)
  const listaSesiones = useRef<HTMLUListElement>(null)
  const sentido = useRef(0)
  const [ultimo, setUltimo] = useState<FilaUsuario | null>(null)
  const [detalle, setDetalle] = useState<Detalle>({ para: "", estado: "cargando", datos: null })
  const [version, setVersion] = useState(0)
  const i = filas.findIndex((f) => f.id === id)
  const actual = i >= 0 ? filas[i]! : null
  if (actual && actual !== ultimo) setUltimo(actual)
  const u = actual ?? ultimo

  // Las sesiones y los movimientos de la cuenta que se ve; si se pasa a otra antes de que lleguen, se descartan.
  useEffect(() => {
    if (!id) return
    let vigente = true
    verDetalleUsuario(id)
      .then((r) => {
        if (!vigente) return
        if (r.ok) setDetalle({ para: id, estado: "listo", datos: r.datos })
        else if (r.sesion === "vencida") router.replace("/ingresar?motivo=expirado")
        else setDetalle({ para: id, estado: "error", datos: null })
      })
      .catch(() => vigente && setDetalle({ para: id, estado: "error", datos: null }))
    return () => {
      vigente = false
    }
    // También cuando la fila cambia (se desactivó, se le dio contraseña nueva): sus sesiones ya no son las mismas.
  }, [id, version, router, actual?.activo, actual?.sesiones, actual?.debeCambiarClave])
  const d = detalle.para === id ? detalle : { para: id ?? "", estado: "cargando" as const, datos: null }

  const mover = (paso: number) => {
    if (i < 0 || filas.length < 2) return
    sentido.current = paso
    alCambiar(filas[(i + paso + filas.length) % filas.length]!.id)
  }

  useEffect(() => {
    if (id === null) return
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return
      if (document.querySelectorAll('[role="dialog"], [role="alertdialog"]').length > 1) return
      if ((e.target as HTMLElement | null)?.closest("input")) return
      e.preventDefault()
      mover(e.key === "ArrowDown" ? 1 : -1)
    }
    document.addEventListener("keydown", tecla)
    return () => document.removeEventListener("keydown", tecla)
  })

  useLayoutEffect(() => {
    const c = cuerpo.current
    const lado = sentido.current
    sentido.current = 0
    if (!c || !lado || quieto()) return
    const piezas = [...(cabeza.current?.children ?? []), ...c.querySelectorAll(".pr-recuadro")]
    gsap.fromTo(piezas, { opacity: 0, y: 16 * lado }, { opacity: 1, y: 0, duration: 0.3, stagger: 0.03, ease: "power3.out", clearProps: "opacity,transform", overwrite: "auto" })
  }, [id])

  /** Antes de pedir el cierre, las sesiones salen de la lista: 0,3 s hacia la derecha, de a una. */
  const sacarSesiones = () =>
    new Promise<void>((listo) => {
      const items = listaSesiones.current?.querySelectorAll("li")
      if (!items?.length || quieto()) return listo()
      gsap.to(items, { opacity: 0, x: 24, duration: 0.3, stagger: 0.04, ease: "power2.in", onComplete: listo })
    })

  if (!u) return <TarjetaModal abierto={false} alPedirCierre={alCerrar} origen={origen}>{null}</TarjetaModal>

  const e = estadoDe(u)
  const sesiones = d.datos?.sesiones ?? []
  const cuantas = d.estado === "listo" ? sesiones.length : u.sesiones

  return (
    <TarjetaModal abierto={id !== null && i >= 0} alPedirCierre={alCerrar} idTitulo={idTitulo} ancho="62rem" origen={origen}>
      {/* Arriba, la banda azul de las pantallas (D-036), como la ficha de Servicios (D-037). */}
      <div className="pr-ficha2__banda us-ficha2__banda">
        <div className="pr-ficha2__barra" data-cascada="">
          <div>
            <p className="pr-ficha2__sobre">
              {pegar(t.fichaTitulo)}
              {i >= 0 && (
                <span className="pr-ficha2__cuenta">
                  <span className="us-ficha2__punto"> · </span>
                  {t.fichaDe(i + 1, filas.length)}
                </span>
              )}
            </p>
            <p className="pr-ficha2__ayuda">{t.fichaAyuda}</p>
          </div>
          <div className="pr-ficha2__mandos">
            <Pista texto={t.anterior}>
              <Button className="ui-boton-icono" aria-label={t.anterior} isDisabled={filas.length < 2} onPress={() => mover(-1)}>
                <ChevronUp size={20} strokeWidth={1.75} aria-hidden="true" />
              </Button>
            </Pista>
            <Pista texto={t.siguiente}>
              <Button className="ui-boton-icono" aria-label={t.siguiente} isDisabled={filas.length < 2} onPress={() => mover(1)}>
                <ChevronDown size={20} strokeWidth={1.75} aria-hidden="true" />
              </Button>
            </Pista>
            <BotonIcono icono="cerrar" etiqueta={comun.cerrar} onPress={alCerrar} />
          </div>
        </div>
        <div ref={cabeza} className="pr-ficha2__cabeza">
          <div className="us-ficha2__persona" data-cascada="">
            <span className="us-ficha2__iniciales" aria-hidden="true" data-apagada={!u.activo || undefined}>
              {iniciales(u.nombre)}
            </span>
            <div className="us-ficha2__textos">
              <h2 id={idTitulo} className="pr-ficha2__nombre">
                {pegar(u.nombre)}
              </h2>
              <p className="us-ficha2__mail">{u.email}</p>
            </div>
          </div>
          <div className="pr-ficha2__pastillas" data-cascada="">
            <span className="pr-pastilla" data-tono={e.tono}>
              <span className="pr-pastilla__punto" aria-hidden="true" />
              {e.texto}
            </span>
            {u.esYo && <span className="pr-pastilla">{t.tuCuenta}</span>}
            <span className="pr-pastilla">
              <CalendarDays size={16} strokeWidth={1.75} aria-hidden="true" />
              {t.cuentaDesde(formatDia(u.creadoEn))}
            </span>
            <span className="pr-pastilla">
              <LogIn size={16} strokeWidth={1.75} aria-hidden="true" />
              {u.ultimoIngreso ? t.ultimoIngreso(haceCuanto(u.ultimoIngreso)) : t.nuncaEntro}
            </span>
          </div>
        </div>
      </div>

      <div ref={cuerpo} className="pr-ficha2__cuerpo">
        <div className="pr-ficha2__grilla">
          <section className="pr-recuadro us-recuadro" data-cascada="" aria-label={t.contrasena}>
            <span className="pr-recuadro__icono" aria-hidden="true">
              <KeyRound size={22} strokeWidth={1.75} />
            </span>
            <div className="pr-recuadro__textos">
              <span className="pr-recuadro__rotulo">{t.contrasena}</span>
              <span className="pr-recuadro__valor">{u.debeCambiarClave ? t.claveInicialCorto : t.clavePropiaCorto}</span>
              <span className="pr-recuadro__nota">{pegar(u.debeCambiarClave ? t.contrasenaInicial : t.clavePropiaNota)}</span>
            </div>
            {!u.esYo && (
              <div className="us-recuadro__accion">
                <Boton variante="secundaria" icono="llave" onPress={() => alClave(u)}>
                  {t.claveNueva}
                </Boton>
              </div>
            )}
          </section>

          <section className="pr-recuadro us-recuadro" data-cascada="" aria-label={t.segundoFactor}>
            <span className="pr-recuadro__icono" aria-hidden="true">
              <ShieldCheck size={22} strokeWidth={1.75} />
            </span>
            <div className="pr-recuadro__textos">
              <span className="pr-recuadro__rotulo">{t.segundoFactor}</span>
              <span className="pr-recuadro__valor" data-vacio={u.segundoFactor ? undefined : ""}>
                {u.segundoFactor ? t.factorActivo : t.factorNoCorto}
              </span>
              <span className="pr-recuadro__nota">{pegar(u.segundoFactor ? t.factorActivoTexto : t.factorNoNota)}</span>
            </div>
          </section>

          <section className="pr-recuadro us-recuadro us-recuadro--lista" data-cascada="" aria-labelledby={`${idTitulo}-sesiones`} aria-busy={d.estado === "cargando" || undefined}>
            <span className="pr-recuadro__icono" aria-hidden="true">
              <MonitorSmartphone size={22} strokeWidth={1.75} />
            </span>
            <div className="pr-recuadro__textos">
              <span className="pr-recuadro__rotulo">{t.sesionesRotulo}</span>
              <h3 id={`${idTitulo}-sesiones`} className="pr-recuadro__valor us-recuadro__titulo">
                {t.sesionesTitulo(cuantas)}
              </h3>
            </div>
            {!u.esYo && d.estado === "listo" && sesiones.length > 0 && (
              <div className="us-recuadro__accion">
                <Boton
                  variante="secundaria"
                  icono="salir"
                  onPress={async () => {
                    if (await alCerrarSesiones(u, sacarSesiones)) setVersion((v) => v + 1)
                    else gsap.set(listaSesiones.current?.querySelectorAll("li") ?? [], { clearProps: "opacity,transform" })
                  }}
                >
                  {t.cerrarTodasCorto}
                </Boton>
              </div>
            )}
            <div className="us-recuadro__cuerpo">
              {d.estado === "cargando" ? (
                <div className="us-esqueleto" aria-hidden="true">
                  <span className="ui-skeleton" />
                  <span className="ui-skeleton" />
                </div>
              ) : d.estado === "error" ? (
                <p className="us-recuadro__vacio">{pegar(t.detalleError)}</p>
              ) : sesiones.length === 0 ? (
                <p className="us-recuadro__vacio">{t.sesionesVacio}</p>
              ) : (
                <ul ref={listaSesiones} className="us-lista">
                  {sesiones.map((s) => (
                    <li key={s.id} className="us-lista__fila">
                      <span className="us-lista__icono" aria-hidden="true">
                        {s.movil ? <Smartphone size={18} strokeWidth={1.75} /> : <Monitor size={18} strokeWidth={1.75} />}
                      </span>
                      <span className="us-lista__texto">
                        {s.dispositivo}
                        {s.esEsta && <span className="us-vos">{t.esta}</span>}
                      </span>
                      <span className="us-lista__cuando">{t.abierta(haceCuanto(s.abierta))}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="pr-recuadro us-recuadro us-recuadro--lista" data-cascada="" aria-labelledby={`${idTitulo}-mov`}>
            <span className="pr-recuadro__icono" aria-hidden="true">
              <History size={22} strokeWidth={1.75} />
            </span>
            <div className="pr-recuadro__textos">
              <span className="pr-recuadro__rotulo">{t.movimientosRotulo}</span>
              <h3 id={`${idTitulo}-mov`} className="pr-recuadro__valor us-recuadro__titulo">
                {t.movimientos}
              </h3>
            </div>
            <div className="us-recuadro__cuerpo">
              {d.estado === "listo" && d.datos!.movimientos.length === 0 ? (
                <p className="us-recuadro__vacio">{t.movimientosVacio}</p>
              ) : d.estado === "listo" ? (
                <ol className="us-lista">
                  {d.datos!.movimientos.map((m) => (
                    <li key={m.id} className="us-lista__fila">
                      <span className="us-lista__punto" aria-hidden="true" />
                      <span className="us-lista__texto">
                        {t.movimiento[m.accion] ?? t.movimientoOtro}
                        {m.quien && <span className="us-lista__quien"> {t.por(m.quien)}</span>}
                      </span>
                      <time className="us-lista__cuando" dateTime={new Date(m.cuando).toISOString()}>
                        {haceCuanto(m.cuando)}
                      </time>
                    </li>
                  ))}
                </ol>
              ) : d.estado === "cargando" ? (
                <div className="us-esqueleto" aria-hidden="true">
                  <span className="ui-skeleton" />
                </div>
              ) : (
                <p className="us-recuadro__vacio">{pegar(t.detalleError)}</p>
              )}
            </div>
          </section>
        </div>
      </div>
      <div className="ui-dialogo__acciones pr-ficha__acciones">
        {u.esYo ? (
          <span className="us-ficha__nota">{t.propia}</span>
        ) : (
          <Boton variante={u.activo ? "peligro" : "secundaria"} icono={u.activo ? "desactivar" : "activar"} onPress={() => alActivo(u)}>
            {u.activo ? t.desactivar : t.activar}
          </Boton>
        )}
        <span className="pr-ficha__resto">
          <Boton variante="primaria" icono="editar" onPress={() => alEditar(u)}>
            {t.editar}
          </Boton>
        </span>
      </div>
    </TarjetaModal>
  )
}
