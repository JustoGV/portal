"use client"
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import { useRouter } from "next/navigation"
import { useLayoutEffect, useRef, useState } from "react"
import { Button } from "react-aria-components"
import { archivarProyecto, restaurarProyecto } from "@/acciones/proyectos"
import { Boton } from "@/components/ui/Boton"
import { BotonIcono } from "@/components/ui/BotonIcono"
import { CajaTabla } from "@/components/ui/CajaTabla"
import { useConfirmar } from "@/components/ui/Confirmar"
import { Etiqueta } from "@/components/ui/Etiqueta"
import { useNavegacionLista } from "@/components/ui/NavegacionLista"
import { Paginacion } from "@/components/ui/Paginacion"
import { Pista } from "@/components/ui/Pista"
import { useResultado } from "@/components/ui/Resultado"
import { Vacio } from "@/components/ui/Vacio"
import { comun } from "@/i18n/es/comun"
import { proyectos as t } from "@/i18n/es/proyectos"
import { formatDia } from "@/lib/fecha"
import { escribirIconos, gsap, quieto } from "@/lib/gsap"
import { conParametros, type Orden } from "@/lib/parametros"
import type { FilaProyecto } from "@/lib/proyecto"
import { pegar } from "@/lib/texto"
import { sitioDe } from "@/lib/url"
import { useEditorProyecto } from "./EditorProyecto"
import { FichaProyecto } from "./FichaProyecto"

type Props = {
  filas: FilaProyecto[]
  total: number
  pagina: number
  porPagina: number
  actuales: Record<string, string | null>
  filtrando: boolean
  archivados: boolean
  orden: Orden
  dir: "asc" | "desc"
}

/**
 * La tabla de Servicios (WU-06 pantalla 3, D-030): una combinación de la tabla de Untitled UI y de Shadcn
 * Admin con las piezas de EDV. Cada columna tiene su título, que explica qué es y ordena al tocarlo; las
 * acciones de la fila están a la vista con su nombre; tocar la fila abre su ficha en una tarjeta que crece
 * desde la fila. Al filtrar, buscar u ordenar las filas que siguen se deslizan a su lugar (GSAP) y las
 * nuevas entran: solo cuando la persona cambia algo, nunca en un refresco (docs/reglas/07 §4, 08 §2.1).
 */
export function TablaProyectos({ filas, total, pagina, porPagina, actuales, filtrando, archivados, orden, dir }: Props) {
  const editor = useEditorProyecto()
  const confirmar = useConfirmar()
  const mostrar = useResultado()
  const router = useRouter()
  const { navegar } = useNavegacionLista()
  const cuerpo = useRef<HTMLTableSectionElement>(null)
  const lugares = useRef<Map<string, number> | null>(null)
  const [fichaId, setFichaId] = useState<string | null>(null)
  const origen = useRef<Element | null>(null)

  // Reacomodo (la técnica FLIP, a mano): se recuerda dónde estaba cada fila dentro de la tabla y, cuando el
  // orden cambia, cada una se desliza desde su lugar viejo al nuevo; las que no estaban entran. Se mide con
  // offsetTop, que no depende del scroll ni de una animación en curso: por eso no usa Flip.getState, que
  // guarda posiciones de pantalla (se desfasan al scrollear) y en desarrollo se anulaba con el doble efecto.
  const firma = filas.map((f) => f.id).join(",")
  useLayoutEffect(() => {
    const filasDom = cuerpo.current ? Array.from(cuerpo.current.querySelectorAll<HTMLElement>("tr[data-flip-id]")) : []
    const antes = lugares.current
    const ahora = new Map(filasDom.map((el) => [el.dataset.flipId!, el.offsetTop]))
    lugares.current = ahora
    // La primera vez no corre: esa entrada es la cascada en CSS de la caja.
    if (!antes || quieto()) return
    const nuevas: HTMLElement[] = []
    for (const el of filasDom) {
      const viejo = antes.get(el.dataset.flipId!)
      if (viejo === undefined) nuevas.push(el)
      else if (viejo !== el.offsetTop) gsap.fromTo(el, { y: viejo - el.offsetTop }, { y: 0, duration: 0.45, ease: "power2.inOut", overwrite: "auto", clearProps: "transform" })
    }
    if (nuevas.length) gsap.fromTo(nuevas, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.35, stagger: 0.02, ease: "power2.out", overwrite: "auto", clearProps: "opacity,transform" })
  }, [firma])

  if (filas.length === 0) {
    if (filtrando)
      return (
        <Vacio
          icono="buscar"
          titulo={t.sinResultados}
          texto={t.sinResultadosTexto}
          accion={
            <Boton variante="secundaria" onPress={() => router.replace("/")}>
              {t.limpiar}
            </Boton>
          }
        />
      )
    if (archivados) return <Vacio icono="archivar" titulo={t.sinArchivados} />
    return (
      <Vacio
        icono="proyectos"
        titulo={t.vacioTitulo}
        texto={t.vacioTexto}
        accion={
          <Boton variante="primaria" icono="agregar" onPress={(e) => editor.abrirNuevo(e.target)}>
            {t.nuevo}
          </Boton>
        }
      />
    )
  }

  const cambiarArchivo = async (p: FilaProyecto) => {
    if (!archivados) {
      const ok = await confirmar({ titulo: t.archivarTitulo(p.nombre), texto: t.archivarTexto, accion: t.archivar, peligro: true })
      if (!ok) return
    }
    const r = archivados ? await restaurarProyecto(p.id) : await archivarProyecto(p.id)
    if (r.ok) {
      setFichaId(null)
      mostrar({ tipo: "guardado", titulo: archivados ? t.restaurado : t.archivado, texto: r.datos.nombre })
    } else if (r.sesion === "vencida") router.replace("/ingresar?motivo=expirado")
    else mostrar({ tipo: "error", titulo: comun.noGuardadoTitulo, texto: r.mensaje })
  }

  const abrirFicha = (p: FilaProyecto, fila: Element | null) => {
    origen.current = fila
    setFichaId(p.id)
  }
  const filaDe = (id: string) => cuerpo.current?.querySelector(`tr[data-flip-id="${id}"]`) ?? null

  /** El título de una columna que ordena: dice cómo está ordenada y al tocarlo cambia. */
  const titulo = (col: Orden, texto: string, prioridad?: 2 | 3) => {
    const activa = orden === col
    const sigue = activa && dir === "asc" ? "desc" : "asc"
    const Flecha = !activa ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown
    return (
      <th scope="col" data-prioridad={prioridad} aria-sort={activa ? (dir === "asc" ? "ascending" : "descending") : "none"}>
        <Pista texto={activa ? t.ordenActivo[col][dir] : t.ordenPista[col]}>
          <Button
            className="ui-tabla__orden"
            data-activa={activa || undefined}
            onPress={() => navegar(conParametros("/", actuales, { orden: col === "nombre" && sigue === "asc" ? null : col, dir: sigue === "desc" ? "desc" : null, pagina: null }))}
          >
            {texto}
            <Flecha size={14} strokeWidth={2} aria-hidden="true" />
          </Button>
        </Pista>
      </th>
    )
  }

  const desde = (pagina - 1) * porPagina + 1
  const hasta = Math.min(total, pagina * porPagina)

  return (
    <>
      <CajaTabla etiqueta={t.tabla} filas={filas.length}>
        <table className="ui-tabla pr-tabla">
          <caption className="sr-solo">{t.tabla}</caption>
          <thead>
            <tr>
              {titulo("nombre", t.colServicio)}
              {titulo("grupo", t.colGrupo, 2)}
              <th scope="col" data-prioridad={3}>
                {t.colLink}
              </th>
              <th scope="col" data-prioridad={3}>
                {t.colEstado}
              </th>
              {titulo("actualizado", t.colActualizado, 2)}
              <th scope="col">{t.colAcciones}</th>
            </tr>
          </thead>
          <tbody ref={cuerpo}>
            {filas.map((p, i) => (
              <tr
                key={p.id}
                data-flip-id={p.id}
                className="pr-tr"
                style={{ "--i": i } as React.CSSProperties}
                onClick={(e) => {
                  // La fila entera abre la ficha, salvo que se haya tocado uno de sus botones.
                  if ((e.target as Element).closest("button, a")) return
                  abrirFicha(p, e.currentTarget)
                }}
                onPointerEnter={(e) => e.pointerType === "mouse" && escribirIconos(e.currentTarget, { paso: 0.04 })}
              >
                <td className="pr-td-servicio">
                  <button type="button" className="pr-nombre" onClick={(e) => abrirFicha(p, e.currentTarget.closest("tr"))} aria-label={`${t.verFicha}: ${p.nombre}`}>
                    {pegar(p.nombre)}
                  </button>
                  {p.descripcion && <p className="pr-descripcion">{p.descripcion}</p>}
                </td>
                <td data-prioridad={2}>{p.grupoNombre ? <span className="pr-grupo">{p.grupoNombre}</span> : <span className="pr-grupo pr-grupo--sin">{t.sinGrupo}</span>}</td>
                <td data-prioridad={3} className="ui-tabla__secundario pr-sitio">
                  {sitioDe(p.url)}
                </td>
                <td data-prioridad={3}>
                  <Etiqueta tono={p.archivadoEn ? "neutro" : "ok"}>{p.archivadoEn ? t.estadoArchivado : t.estadoActivo}</Etiqueta>
                </td>
                <td data-prioridad={2} className="ui-tabla__secundario pr-fecha">
                  <time dateTime={new Date(p.actualizadoEn).toISOString()}>{formatDia(p.actualizadoEn)}</time>
                </td>
                <td className="ui-tabla__acciones">
                  <span className="ui-tabla__fila-acciones">
                    <BotonIcono icono="abrir" etiqueta={`${t.abrirPista}: ${p.nombre}`} pista={t.abrirPista} onPress={() => window.open(p.url, "_blank", "noopener,noreferrer")} />
                    <span className="pr-acciones-extra">
                      <BotonIcono icono="ficha" etiqueta={`${t.verFicha}: ${p.nombre}`} pista={t.verFicha} onPress={() => abrirFicha(p, filaDe(p.id))} />
                      <BotonIcono icono="editar" etiqueta={`${t.editar} ${p.nombre}`} pista={t.editar} onPress={() => editor.abrirEdicion(p, filaDe(p.id))} />
                      <BotonIcono
                        icono={archivados ? "restaurar" : "archivar"}
                        etiqueta={`${archivados ? t.restaurar : t.archivar} ${p.nombre}`}
                        pista={archivados ? t.restaurar : t.archivar}
                        peligro={!archivados}
                        onPress={() => cambiarArchivo(p)}
                      />
                    </span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pr-pie">
          <p className="pr-pie__cuenta" aria-live="polite">
            {t.mostrando(desde, hasta, total)}
          </p>
          <Paginacion
            total={total}
            pagina={pagina}
            porPagina={porPagina}
            etiquetaFilas={t.filas}
            href={({ pagina: n, por }) => conParametros("/", actuales, { pagina: n && n > 1 ? n : null, ...(por ? { por: por === 25 ? null : por } : {}) })}
          />
        </div>
      </CajaTabla>
      <FichaProyecto
        filas={filas}
        id={fichaId}
        archivados={archivados}
        origen={() => {
          // Vuelve a la fila del servicio que se está viendo (pudo cambiar con ↑ ↓), o a la que la abrió.
          const fila = (fichaId && filaDe(fichaId)) || origen.current
          return fila?.isConnected ? fila.getBoundingClientRect() : null
        }}
        alCambiar={setFichaId}
        alCerrar={() => setFichaId(null)}
        alEditar={(p) => {
          setFichaId(null)
          editor.abrirEdicion(p, filaDe(p.id))
        }}
        alArchivo={cambiarArchivo}
      />
    </>
  )
}
