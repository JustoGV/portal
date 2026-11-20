"use client"
import { useRouter } from "next/navigation"
import { useLayoutEffect, useRef, useState } from "react"
import { cambiarActivo, cerrarSesiones, nuevaClaveInicial } from "@/acciones/usuarios"
import { Boton } from "@/components/ui/Boton"
import { BotonIcono } from "@/components/ui/BotonIcono"
import { CajaTabla } from "@/components/ui/CajaTabla"
import { useConfirmar } from "@/components/ui/Confirmar"
import { Etiqueta } from "@/components/ui/Etiqueta"
import { useResultado } from "@/components/ui/Resultado"
import { Vacio } from "@/components/ui/Vacio"
import { comun } from "@/i18n/es/comun"
import { usuarios as t } from "@/i18n/es/usuarios"
import type { FilaUsuario } from "@/lib/cuenta"
import { formatDia, haceCuanto } from "@/lib/fecha"
import { escribirIconos, gsap, quieto } from "@/lib/gsap"
import { iniciales } from "@/lib/nombre"
import type { VistaUsuarios as Vista } from "@/lib/parametros"
import { pegar } from "@/lib/texto"
import { estadoDe, FichaUsuario } from "./FichaUsuario"
import { useEditorUsuario } from "./FormUsuario"

type Props = { filas: FilaUsuario[]; vista: Vista; filtrando: boolean; hrefLimpiar: string }

/**
 * La tabla de Usuarios (WU-06 pantalla 5, D-034): la persona en una celda con sus iniciales, su nombre y su
 * mail (WorkOS · Users Management), estado, segundo factor, último ingreso y alta (Circle · Members), y las
 * acciones a la vista con su nombre (EDV). Tocar la fila abre la ficha en una tarjeta que crece desde la fila
 * (D-030). Al filtrar u ordenar, las filas que siguen se deslizan a su lugar y las nuevas entran: solo cuando
 * la persona cambia algo, nunca en un refresco (docs/reglas/07 §4, 08 §2.1). Sobre la cuenta propia, las
 * acciones quedan apagadas y dicen por qué.
 */
export function VistaUsuarios({ filas, vista, filtrando, hrefLimpiar }: Props) {
  const editor = useEditorUsuario()
  const router = useRouter()
  const confirmar = useConfirmar()
  const mostrar = useResultado()
  const cuerpo = useRef<HTMLTableSectionElement>(null)
  const lugares = useRef<Map<string, number> | null>(null)
  const [fichaId, setFichaId] = useState<string | null>(null)
  const origen = useRef<Element | null>(null)

  // Reacomodo a mano, como la tabla de Servicios (G-010): offsetTop no depende del scroll.
  const firma = filas.map((f) => f.id).join(",")
  useLayoutEffect(() => {
    const trs = cuerpo.current ? Array.from(cuerpo.current.querySelectorAll<HTMLElement>("tr[data-flip-id]")) : []
    const antes = lugares.current
    lugares.current = new Map(trs.map((el) => [el.dataset.flipId!, el.offsetTop]))
    if (!antes) return
    if (quieto()) return
    const nuevas: HTMLElement[] = []
    for (const el of trs) {
      const viejo = antes.get(el.dataset.flipId!)
      if (viejo === undefined) nuevas.push(el)
      else if (viejo !== el.offsetTop) gsap.fromTo(el, { y: viejo - el.offsetTop }, { y: 0, duration: 0.45, ease: "power2.inOut", overwrite: "auto", clearProps: "transform" })
    }
    if (nuevas.length) gsap.fromTo(nuevas, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.35, stagger: 0.02, ease: "power2.out", overwrite: "auto", clearProps: "opacity,transform" })
  }, [firma])

  const filaDe = (id: string) => cuerpo.current?.querySelector(`tr[data-flip-id="${id}"]`) ?? null

  const tratar = (r: { ok: false; mensaje: string; sesion?: "vencida" }) => {
    if (r.sesion === "vencida") router.replace("/ingresar?motivo=expirado")
    else mostrar({ tipo: "error", titulo: comun.noGuardadoTitulo, texto: r.mensaje })
  }

  const alternar = async (u: FilaUsuario) => {
    if (u.activo && !(await confirmar({ titulo: t.desactivarTitulo(u.nombre), texto: t.desactivarTexto, accion: t.desactivar, peligro: true }))) return
    const r = await cambiarActivo(u.id, !u.activo)
    if (r.ok) mostrar({ tipo: "guardado", titulo: u.activo ? t.desactivada_ : t.activada, texto: r.datos.nombre })
    else tratar(r)
  }

  const claveNueva = async (u: FilaUsuario) => {
    if (!(await confirmar({ titulo: t.claveTitulo(u.nombre), texto: t.claveTexto, accion: t.claveAccion, peligro: true }))) return
    const r = await nuevaClaveInicial(u.id)
    if (r.ok) {
      setFichaId(null)
      editor.mostrarClave({ nombre: r.datos.nombre, email: u.email, clave: r.datos.clave }, filaDe(u.id))
    } else tratar(r)
  }

  /** `antes`: lo que hace la ficha entre la confirmación y el pedido (sacar las sesiones de la vista). */
  const cerrar = async (u: FilaUsuario, antes?: () => Promise<void>) => {
    if (!(await confirmar({ titulo: t.cerrarTitulo(u.nombre), texto: t.cerrarTexto, accion: t.cerrarAccion, peligro: true }))) return false
    await antes?.()
    const r = await cerrarSesiones(u.id)
    if (r.ok) mostrar({ tipo: "guardado", titulo: t.cerradas(r.datos.cerradas), texto: r.datos.nombre })
    else tratar(r)
    return r.ok
  }

  if (filas.length === 0) {
    if (filtrando)
      return (
        <Vacio
          icono="buscar"
          titulo={t.sinResultados}
          texto={t.sinResultadosTexto}
          accion={
            <Boton variante="secundaria" onPress={() => router.replace(hrefLimpiar)}>
              {t.limpiarFiltros}
            </Boton>
          }
        />
      )
    const vacio = vista === "desactivadas" ? t.sinDesactivadas : vista === "primer-ingreso" ? t.sinPrimerIngreso : vista === "sin-factor" ? t.sinSinFactor : t.sinResultados
    return <Vacio icono="usuarios" titulo={vacio} />
  }

  const abrirFicha = (u: FilaUsuario, fila: Element | null) => {
    origen.current = fila
    setFichaId(u.id)
  }

  return (
    <>
      <CajaTabla etiqueta={t.tabla} filas={filas.length}>
        <table className="ui-tabla us-tabla">
          <caption className="sr-solo">{t.tabla}</caption>
          <thead>
            <tr>
              <th scope="col">{t.colPersona}</th>
              <th scope="col">{t.colEstado}</th>
              <th scope="col" data-prioridad={3}>
                {t.colFactor}
              </th>
              <th scope="col" data-prioridad={2}>
                {t.colIngreso}
              </th>
              <th scope="col" data-prioridad={3}>
                {t.colAlta}
              </th>
              <th scope="col">{t.colAcciones}</th>
            </tr>
          </thead>
          <tbody ref={cuerpo}>
            {filas.map((u, i) => {
              const e = estadoDe(u)
              return (
                <tr
                  key={u.id}
                  data-flip-id={u.id}
                  className="pr-tr us-tr"
                  style={{ "--i": i } as React.CSSProperties}
                  onClick={(ev) => {
                    if ((ev.target as Element).closest("button, a")) return
                    abrirFicha(u, ev.currentTarget)
                  }}
                  onPointerEnter={(ev) => ev.pointerType === "mouse" && escribirIconos(ev.currentTarget, { paso: 0.04 })}
                >
                  <td className="us-td-persona">
                    <span className="us-persona">
                      <span className="cf-iniciales us-iniciales" aria-hidden="true" data-apagada={!u.activo || undefined}>
                        {iniciales(u.nombre)}
                      </span>
                      <span className="us-persona__textos">
                        <button type="button" className="pr-nombre us-persona__nombre" onClick={(ev) => abrirFicha(u, ev.currentTarget.closest("tr"))} aria-label={`${t.verFicha}: ${u.nombre}`}>
                          {pegar(u.nombre)}
                        </button>
                        {u.esYo && <span className="us-vos">{t.vos}</span>}
                        <span className="us-persona__mail">{u.email}</span>
                      </span>
                    </span>
                  </td>
                  <td>
                    <Etiqueta tono={e.tono}>{e.texto}</Etiqueta>
                  </td>
                  <td data-prioridad={3}>
                    <Etiqueta tono={u.segundoFactor ? "ok" : "neutro"}>{u.segundoFactor ? t.factorActivo : t.factorNo}</Etiqueta>
                  </td>
                  <td data-prioridad={2} className="ui-tabla__secundario us-fecha">
                    {u.ultimoIngreso ? <time dateTime={new Date(u.ultimoIngreso).toISOString()}>{haceCuanto(u.ultimoIngreso)}</time> : t.nuncaEntro}
                  </td>
                  <td data-prioridad={3} className="ui-tabla__secundario us-fecha">
                    <time dateTime={new Date(u.creadoEn).toISOString()}>{formatDia(u.creadoEn)}</time>
                  </td>
                  <td className="ui-tabla__acciones">
                    <span className="ui-tabla__fila-acciones">
                      <BotonIcono icono="llave" etiqueta={`${t.claveNueva}: ${u.nombre}`} pista={u.esYo ? t.propia : t.claveNueva} isDisabled={u.esYo} onPress={() => claveNueva(u)} />
                      <BotonIcono
                        icono="salir"
                        etiqueta={`${t.cerrarSesiones}: ${u.nombre}`}
                        pista={u.esYo ? t.propia : u.sesiones === 0 ? t.sinSesiones : t.cerrarSesiones}
                        isDisabled={u.esYo || u.sesiones === 0}
                        onPress={() => cerrar(u)}
                      />
                      <BotonIcono
                        icono={u.activo ? "desactivar" : "activar"}
                        etiqueta={`${u.activo ? t.desactivar : t.activar} ${u.nombre}`}
                        pista={u.esYo ? t.propia : u.activo ? t.desactivar : t.activar}
                        peligro={u.activo}
                        isDisabled={u.esYo}
                        onPress={() => alternar(u)}
                      />
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </CajaTabla>
      <FichaUsuario
        filas={filas}
        id={fichaId}
        origen={() => {
          const fila = (fichaId && filaDe(fichaId)) || origen.current
          return fila?.isConnected ? fila.getBoundingClientRect() : null
        }}
        alCambiar={setFichaId}
        alCerrar={() => setFichaId(null)}
        alEditar={(u) => {
          setFichaId(null)
          editor.abrirEdicion(u, filaDe(u.id))
        }}
        alClave={claveNueva}
        alCerrarSesiones={cerrar}
        alActivo={alternar}
      />
    </>
  )
}
