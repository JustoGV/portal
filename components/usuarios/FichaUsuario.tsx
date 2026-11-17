"use client"
import { ChevronDown, ChevronUp, KeyRound, Monitor, ShieldCheck, Smartphone } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react"
import { Button } from "react-aria-components"
import { verDetalleUsuario } from "@/acciones/usuarios"
import { Boton } from "@/components/ui/Boton"
import { BotonIcono } from "@/components/ui/BotonIcono"
import { Etiqueta } from "@/components/ui/Etiqueta"
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
 * La ficha de una cuenta (D-034): una tarjeta al centro que crece desde la fila (D-030), nunca un panel
 * lateral (D-029). Arriba la persona con su estado y sus fechas; abajo dos columnas: «Acceso» (contraseña y
 * segundo factor, como WorkOS · User Security) y las sesiones abiertas con su dispositivo y el botón para
 * cerrarlas (WorkOS · User Sessions); al pie, los últimos cinco movimientos. Las sesiones y los movimientos
 * se piden al abrir (verDetalleUsuario). ↑ ↓ pasan a la cuenta anterior o siguiente; el contenido se cruza
 * 16 px en 0,3 s. Una sesión cerrada sale de la lista en 0,3 s antes de que llegue la lista nueva.
 */
export function FichaUsuario({ filas, id, origen, alCambiar, alCerrar, alEditar, alClave, alCerrarSesiones, alActivo }: Props) {
  const idTitulo = useId()
  const router = useRouter()
  const cuerpo = useRef<HTMLDivElement>(null)
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
    gsap.fromTo(c.children, { opacity: 0, y: 16 * lado }, { opacity: 1, y: 0, duration: 0.3, stagger: 0.03, ease: "power3.out", clearProps: "opacity,transform", overwrite: "auto" })
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

  return (
    <TarjetaModal abierto={id !== null && i >= 0} alPedirCierre={alCerrar} idTitulo={idTitulo} ancho="54rem" origen={origen}>
      <div className="ui-dialogo__cabecera pr-ficha__cabecera gr-ficha__cabecera">
        <div>
          <p className="pr-ficha__sobre">
            {pegar(t.fichaTitulo)}
            {i >= 0 && (
              <span className="pr-ficha__cuenta">
                <span className="gr-ficha__punto"> · </span>
                {t.fichaDe(i + 1, filas.length)}
              </span>
            )}
          </p>
          <p className="pr-ficha__ayuda">{t.fichaAyuda}</p>
        </div>
        <div className="pr-ficha__mandos">
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
      <div ref={cuerpo} className="pr-ficha__cuerpo cf-cuerpo">
        <div className="us-titular" data-cascada="">
          <span className="cf-iniciales us-titular__iniciales" aria-hidden="true" data-apagada={!u.activo || undefined}>
            {iniciales(u.nombre)}
          </span>
          <div className="us-titular__textos">
            <h2 id={idTitulo} className="cf-nombre">
              {pegar(u.nombre)}
              {u.esYo && <span className="us-vos">{t.vos}</span>}
            </h2>
            <p className="us-titular__mail">{u.email}</p>
            <div className="cf-meta">
              <Etiqueta tono={e.tono}>{e.texto}</Etiqueta>
              <span className="cf-fechas">
                <span className="cf-fecha">{t.cuentaDesde(formatDia(u.creadoEn))}</span>
                <span className="cf-fecha">
                  <span aria-hidden="true">· </span>
                  {u.ultimoIngreso ? t.ultimoIngreso(haceCuanto(u.ultimoIngreso)) : t.nuncaEntro}
                </span>
              </span>
            </div>
          </div>
        </div>

        <div className="cf-columnas" data-cascada="">
          <section className="cf-columna" aria-labelledby={`${idTitulo}-acceso`}>
            <h3 id={`${idTitulo}-acceso`} className="gr-ficha__subtitulo">
              {t.acceso}
            </h3>
            <ul className="us-filas">
              <li className="us-fila">
                <span className="cf-dato__icono">
                  <KeyRound size={18} strokeWidth={1.75} aria-hidden="true" />
                </span>
                <span className="us-fila__textos">
                  <span className="us-fila__titulo">{t.contrasena}</span>
                  <span className="us-fila__texto">{pegar(u.debeCambiarClave ? t.contrasenaInicial : t.contrasenaPropia)}</span>
                </span>
                {!u.esYo && (
                  <Boton variante="secundaria" icono="llave" onPress={() => alClave(u)}>
                    {t.claveNueva}
                  </Boton>
                )}
              </li>
              <li className="us-fila">
                <span className="cf-dato__icono">
                  <ShieldCheck size={18} strokeWidth={1.75} aria-hidden="true" />
                </span>
                <span className="us-fila__textos">
                  <span className="us-fila__titulo">{t.segundoFactor}</span>
                  <span className="us-fila__texto">{pegar(u.segundoFactor ? t.factorActivoTexto : t.factorNoTexto)}</span>
                </span>
                <Etiqueta tono={u.segundoFactor ? "ok" : "neutro"}>{u.segundoFactor ? t.factorActivo : t.factorNo}</Etiqueta>
              </li>
            </ul>
          </section>

          <section className="cf-columna" aria-labelledby={`${idTitulo}-sesiones`} aria-busy={d.estado === "cargando" || undefined}>
            <h3 id={`${idTitulo}-sesiones`} className="gr-ficha__subtitulo">
              {d.estado === "listo" ? t.sesionesTitulo(sesiones.length) : t.sesionesTitulo(u.sesiones)}
            </h3>
            {d.estado === "cargando" ? (
              <div className="us-esqueleto" aria-hidden="true">
                <span className="ui-skeleton" />
                <span className="ui-skeleton" />
              </div>
            ) : d.estado === "error" ? (
              <p className="gr-ficha__vacio">{pegar(t.detalleError)}</p>
            ) : sesiones.length === 0 ? (
              <p className="gr-ficha__vacio">{t.sesionesVacio}</p>
            ) : (
              <>
                <ul ref={listaSesiones} className="us-filas">
                  {sesiones.map((s) => (
                    <li key={s.id} className="us-fila">
                      <span className="cf-dato__icono">{s.movil ? <Smartphone size={18} strokeWidth={1.75} aria-hidden="true" /> : <Monitor size={18} strokeWidth={1.75} aria-hidden="true" />}</span>
                      <span className="us-fila__textos">
                        <span className="us-fila__titulo">
                          {s.dispositivo}
                          {s.esEsta && <span className="us-vos">{t.esta}</span>}
                        </span>
                        <span className="us-fila__texto">{t.abierta(haceCuanto(s.abierta))}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                {!u.esYo && (
                  <div className="us-fila__pie">
                    <Boton
                      variante="secundaria"
                      icono="salir"
                      onPress={async () => {
                        if (await alCerrarSesiones(u, sacarSesiones)) setVersion((v) => v + 1)
                        else gsap.set(listaSesiones.current?.querySelectorAll("li") ?? [], { clearProps: "opacity,transform" })
                      }}
                    >
                      {t.cerrarTodas}
                    </Boton>
                  </div>
                )}
              </>
            )}
          </section>
        </div>

        <section className="us-movimientos" data-cascada="" aria-labelledby={`${idTitulo}-mov`}>
          <h3 id={`${idTitulo}-mov`} className="gr-ficha__subtitulo">
            {t.movimientos}
          </h3>
          {d.estado === "listo" && d.datos!.movimientos.length === 0 ? (
            <p className="gr-ficha__vacio">{t.movimientosVacio}</p>
          ) : d.estado === "listo" ? (
            <ol className="us-movimientos__lista">
              {d.datos!.movimientos.map((m) => (
                <li key={m.id} className="us-movimiento">
                  <span className="us-movimiento__punto" aria-hidden="true" />
                  <span className="us-movimiento__texto">
                    {t.movimiento[m.accion] ?? t.movimientoOtro}
                    {m.quien && <span className="us-movimiento__quien"> {t.por(m.quien)}</span>}
                  </span>
                  <time className="us-movimiento__cuando" dateTime={new Date(m.cuando).toISOString()}>
                    {haceCuanto(m.cuando)}
                  </time>
                </li>
              ))}
            </ol>
          ) : d.estado === "cargando" ? (
            <div className="us-esqueleto" aria-hidden="true">
              <span className="ui-skeleton" />
            </div>
          ) : null}
        </section>
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
