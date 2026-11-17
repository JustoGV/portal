"use client"
import { ChevronRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { useLayoutEffect, useRef, useState } from "react"
import { archivarGrupo, restaurarGrupo } from "@/acciones/grupos"
import { Boton } from "@/components/ui/Boton"
import { BotonIcono } from "@/components/ui/BotonIcono"
import { useConfirmar } from "@/components/ui/Confirmar"
import { useNavegacionLista } from "@/components/ui/NavegacionLista"
import { Pista } from "@/components/ui/Pista"
import { useResultado } from "@/components/ui/Resultado"
import { Vacio } from "@/components/ui/Vacio"
import { comun } from "@/i18n/es/comun"
import { grupos as t } from "@/i18n/es/grupos"
import { gsap, quieto } from "@/lib/gsap"
import type { FilaGrupo } from "@/lib/grupo"
import type { VistaGrupos } from "@/lib/parametros"
import { pegar } from "@/lib/texto"
import { Carpeta, moverCarpeta } from "./Carpeta"
import { useEditorGrupo } from "./EditorGrupo"
import { FichaGrupo } from "./FichaGrupo"

type Props = {
  filas: FilaGrupo[]
  vista: VistaGrupos
  filtrando: boolean
  hrefLimpiar: string
}

/** Cuántos servicios se nombran en la tarjeta; el resto va como "+N" y se ve entero en la ficha. */
const A_LA_VISTA = 3

/**
 * La grilla de Clientes (WU-06 pantalla 4; por dentro, grupos: D-032): cada cliente es una tarjeta-carpeta, con su responsable bajo el nombre, (Square UI · Files) que
 * muestra sus primeros servicios sin entrar (Refine · Categories) y se entreabre con el mouse (React Bits
 * · Folder). Tocarla abre la ficha en una tarjeta que crece desde la carpeta. Al buscar, filtrar u ordenar,
 * cada carpeta se desliza de su lugar viejo al nuevo y las que no estaban entran: solo cuando la persona
 * cambia algo, nunca en un refresco (docs/reglas/07 §4, 08 §2.1).
 */
export function GrillaGrupos({ filas, vista, filtrando, hrefLimpiar }: Props) {
  const editor = useEditorGrupo()
  const confirmar = useConfirmar()
  const mostrar = useResultado()
  const router = useRouter()
  const { pendiente } = useNavegacionLista()
  const lista = useRef<HTMLUListElement>(null)
  const lugares = useRef<Map<string, { x: number; y: number }> | null>(null)
  const [fichaId, setFichaId] = useState<string | null>(null)
  const origen = useRef<Element | null>(null)
  const archivados = vista === "archivados"

  // Reacomodo a mano (como la tabla de Servicios, G-010): se recuerda dónde estaba cada carpeta dentro de la
  // grilla (offsetLeft y offsetTop no dependen del scroll ni de una animación en curso) y se anima la diferencia.
  const firma = filas.map((f) => f.id).join(",")
  useLayoutEffect(() => {
    const tarjetas = lista.current ? Array.from(lista.current.querySelectorAll<HTMLElement>("li[data-flip-id]")) : []
    const antes = lugares.current
    lugares.current = new Map(tarjetas.map((el) => [el.dataset.flipId!, { x: el.offsetLeft, y: el.offsetTop }]))
    // La primera vez no corre: esa entrada es la cascada en CSS.
    if (!antes) return
    const reciente = editor.tomarReciente()
    if (quieto()) return
    const nuevas: HTMLElement[] = []
    for (const el of tarjetas) {
      const viejo = antes.get(el.dataset.flipId!)
      if (!viejo) nuevas.push(el)
      else if (viejo.x !== el.offsetLeft || viejo.y !== el.offsetTop)
        gsap.fromTo(
          el,
          { x: viejo.x - el.offsetLeft, y: viejo.y - el.offsetTop },
          {
            x: 0,
            y: 0,
            duration: 0.45,
            ease: "power2.inOut",
            overwrite: "auto",
            clearProps: "transform",
          },
        )
    }
    if (nuevas.length)
      gsap.fromTo(
        nuevas,
        { opacity: 0, y: 10 },
        {
          opacity: 1,
          y: 0,
          duration: 0.35,
          stagger: 0.02,
          ease: "power2.out",
          overwrite: "auto",
          clearProps: "opacity,transform",
        },
      )
    // La carpeta recién creada queda resaltada 1,2 s: el fondo vuelve de a poco al de las demás.
    const creada = reciente ? tarjetas.find((el) => el.dataset.flipId === reciente) : null
    if (creada) {
      const estilo = getComputedStyle(creada)
      gsap.fromTo(
        creada,
        {
          backgroundColor: estilo.getPropertyValue("--sys-marca-suave-2").trim(),
          borderColor: estilo.getPropertyValue("--sys-marca").trim(),
        },
        {
          backgroundColor: estilo.backgroundColor,
          borderColor: estilo.borderTopColor,
          duration: 1.2,
          ease: "power2.inOut",
          clearProps: "backgroundColor,borderColor",
        },
      )
      creada.scrollIntoView({ block: "nearest", behavior: "smooth" })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo cuando cambia qué carpetas hay o su orden
  }, [firma])

  const tarjetaDe = (id: string) => lista.current?.querySelector(`li[data-flip-id="${CSS.escape(id)}"]`) ?? null

  if (filas.length === 0) {
    if (filtrando)
      return (
        <Vacio
          icono="buscar"
          titulo={t.sinResultados}
          texto={pegar(t.sinResultadosTexto)}
          accion={
            <Boton variante="secundaria" onPress={() => router.replace(hrefLimpiar)}>
              {t.limpiar}
            </Boton>
          }
        />
      )
    if (archivados) return <Vacio icono="archivar" titulo={t.sinArchivados} />
    if (vista === "vacios") return <Vacio icono="carpeta" titulo={t.sinVacios} texto={pegar(t.sinVaciosTexto)} />
    return (
      <Vacio
        icono="carpeta"
        titulo={t.vacioTitulo}
        texto={pegar(t.vacioTexto)}
        accion={
          <Boton variante="primaria" icono="agregar" onPress={(e) => editor.abrirNuevo(e.target)}>
            {t.nuevo}
          </Boton>
        }
      />
    )
  }

  const cambiarArchivo = async (g: FilaGrupo) => {
    if (
      !archivados &&
      !(await confirmar({
        titulo: t.archivarTitulo(g.nombre),
        texto: t.archivarTexto(g.proyectos),
        accion: t.archivar,
        peligro: true,
      }))
    )
      return
    setFichaId(null)
    // La carpeta se cierra y sale mientras se guarda; si no se guardó, vuelve.
    const tarjeta = tarjetaDe(g.id)
    moverCarpeta(tarjeta, false)
    if (tarjeta && !quieto())
      gsap.to(tarjeta, {
        opacity: 0,
        scale: 0.94,
        duration: 0.3,
        ease: "power2.in",
        overwrite: "auto",
      })
    const volver = () =>
      tarjeta?.isConnected &&
      gsap.to(tarjeta, {
        opacity: 1,
        scale: 1,
        duration: 0.22,
        ease: "power2.out",
        overwrite: "auto",
        clearProps: "opacity,transform",
      })
    let r: Awaited<ReturnType<typeof archivarGrupo>>
    try {
      r = archivados ? await restaurarGrupo(g.id) : await archivarGrupo(g.id)
    } catch (e) {
      volver()
      throw e
    }
    if (r.ok) {
      mostrar({
        tipo: "guardado",
        titulo: archivados ? t.restaurado : t.archivado,
        texto: r.datos.nombre,
      })
      // En "Vacíos" un grupo restaurado no cambia de lista: la carpeta sigue ahí.
      volver()
    } else {
      volver()
      if (r.sesion === "vencida") router.replace("/ingresar?motivo=expirado")
      else
        mostrar({
          tipo: "error",
          titulo: comun.noGuardadoTitulo,
          texto: r.mensaje,
        })
    }
  }

  const abrirFicha = (g: FilaGrupo, tarjeta: Element | null) => {
    origen.current = tarjeta
    moverCarpeta(tarjeta, false)
    setFichaId(g.id)
  }

  return (
    <>
      <ul ref={lista} className="gr-grilla" aria-label={t.lista} aria-busy={pendiente || undefined} data-pendiente={pendiente || undefined}>
        {filas.map((g, i) => {
          const resto = g.proyectos - Math.min(g.servicios.length, A_LA_VISTA)
          return (
            <li
              key={g.id}
              data-flip-id={g.id}
              className="gr-tarjeta"
              data-archivado={g.archivadoEn ? "" : undefined}
              style={{ "--i": Math.min(i, 15) } as React.CSSProperties}
              onPointerEnter={(e) => e.pointerType === "mouse" && moverCarpeta(e.currentTarget, true)}
              onPointerLeave={(e) => e.pointerType === "mouse" && moverCarpeta(e.currentTarget, false)}
            >
              <div className="gr-tarjeta__arriba">
                <Carpeta hojas={g.proyectos} />
                <div className="gr-tarjeta__titular">
                  <h2 className="gr-tarjeta__nombre">
                    <button
                      type="button"
                      className="gr-tarjeta__abrir"
                      aria-label={`${t.verFicha}: ${g.nombre}, ${g.responsableNombre ?? t.sinResponsable}, ${g.proyectos === 0 ? t.sinServicios : t.servicios(g.proyectos)}`}
                      onClick={(e) => abrirFicha(g, e.currentTarget.closest("li"))}
                      onFocus={(e) => e.currentTarget.matches(":focus-visible") && moverCarpeta(e.currentTarget.closest("li"), true)}
                      onBlur={(e) => moverCarpeta(e.currentTarget.closest("li"), false)}
                    >
                      {pegar(g.nombre)}
                    </button>
                  </h2>
                  <p className="gr-tarjeta__responsable" data-vacio={g.responsableNombre ? undefined : ""}>
                    {g.responsableNombre ?? t.sinResponsable}
                  </p>
                  <p className="gr-tarjeta__cuenta" data-vacio={g.proyectos === 0 || undefined}>
                    {g.proyectos === 0 ? t.sinServicios : t.servicios(g.proyectos)}
                  </p>
                </div>
                <ChevronRight className="gr-tarjeta__pico" size={20} strokeWidth={1.75} aria-hidden="true" />
              </div>
              {g.servicios.length > 0 && (
                <ul className="gr-tarjeta__servicios" aria-label={t.serviciosTitulo}>
                  {g.servicios.slice(0, A_LA_VISTA).map((s) => (
                    <li key={s.id} className="gr-pastilla">
                      {s.nombre}
                    </li>
                  ))}
                  {resto > 0 && (
                    <li className="gr-pastilla gr-pastilla--mas">
                      <Pista texto={t.yMasPista(resto)}>
                        <span tabIndex={-1}>{t.yMas(resto)}</span>
                      </Pista>
                    </li>
                  )}
                </ul>
              )}
              <div className="gr-tarjeta__pie">
                <span className="gr-tarjeta__estado">{g.archivadoEn ? t.estadoArchivado : t.verFicha}</span>
                <span className="gr-tarjeta__acciones">
                  {!archivados && <BotonIcono icono="editar" etiqueta={`${t.editar} ${g.nombre}`} pista={t.editar} onPress={() => editor.abrirEdicion(g, tarjetaDe(g.id))} />}
                  <BotonIcono
                    icono={archivados ? "restaurar" : "archivar"}
                    etiqueta={`${archivados ? t.restaurar : t.archivar} ${g.nombre}`}
                    pista={archivados ? t.restaurar : t.archivar}
                    peligro={!archivados}
                    onPress={() => cambiarArchivo(g)}
                  />
                </span>
              </div>
            </li>
          )
        })}
      </ul>
      <FichaGrupo
        filas={filas}
        id={fichaId}
        archivados={archivados}
        origen={() => {
          // Vuelve a la carpeta del grupo que se está viendo (pudo cambiar con ↑ ↓), o a la que la abrió.
          const tarjeta = (fichaId && tarjetaDe(fichaId)) || origen.current
          return tarjeta?.isConnected ? tarjeta.getBoundingClientRect() : null
        }}
        alCambiar={setFichaId}
        alCerrar={() => setFichaId(null)}
        alEditar={(g) => {
          setFichaId(null)
          editor.abrirEdicion(g, tarjetaDe(g.id))
        }}
        alArchivo={cambiarArchivo}
      />
    </>
  )
}
