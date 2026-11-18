"use client"
import { CalendarDays, ChevronDown, ChevronUp, Globe, Users } from "lucide-react"
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react"
import { Boton } from "@/components/ui/Boton"
import { BotonIcono } from "@/components/ui/BotonIcono"
import { Pista } from "@/components/ui/Pista"
import { useResultado } from "@/components/ui/Resultado"
import { TarjetaModal } from "@/components/ui/TarjetaModal"
import { comun } from "@/i18n/es/comun"
import { proyectos as t } from "@/i18n/es/proyectos"
import { formatDia, haceCuanto } from "@/lib/fecha"
import { gsap, quieto } from "@/lib/gsap"
import type { FilaProyecto } from "@/lib/proyecto"
import { pegar } from "@/lib/texto"
import { sitioDe } from "@/lib/url"
import { Button } from "react-aria-components"

type Props = {
  /** Las filas que se ven en la tabla: ↑ ↓ recorren estas. */
  filas: FilaProyecto[]
  id: string | null
  archivados: boolean
  origen: () => DOMRect | null
  alCambiar: (id: string) => void
  alCerrar: () => void
  alEditar: (p: FilaProyecto) => void
  alArchivo: (p: FilaProyecto) => void
}

/**
 * La ficha de un servicio (D-030, rehecha en D-037): una tarjeta al centro que crece desde la fila que se
 * tocó. Arriba la banda azul con el nombre grande y el estado y el cliente en vidrio; abajo la descripción y
 * los datos en recuadros: el link partido (el sitio grande, el resto de la dirección en chico, «Copiar
 * link»), el cliente y la fecha. Nunca un panel lateral (rechazado por Mateo, D-029). ↑ ↓ pasan al servicio
 * anterior o siguiente de la tabla sin cerrar, como el legajo de EDV; el contenido se cruza de costado.
 */
export function FichaProyecto({ filas, id, archivados, origen, alCambiar, alCerrar, alEditar, alArchivo }: Props) {
  const idTitulo = useId()
  const mostrar = useResultado()
  const cuerpo = useRef<HTMLDivElement>(null)
  const cabeza = useRef<HTMLDivElement>(null)
  const sentido = useRef(0)
  // Mientras la tarjeta se cierra sigue mostrando el último servicio.
  const [ultimo, setUltimo] = useState<FilaProyecto | null>(null)
  const i = filas.findIndex((f) => f.id === id)
  const actual = i >= 0 ? filas[i]! : null
  if (actual && actual !== ultimo) setUltimo(actual)
  const p = actual ?? ultimo

  const mover = (paso: number) => {
    if (i < 0 || filas.length < 2) return
    sentido.current = paso
    alCambiar(filas[(i + paso + filas.length) % filas.length]!.id)
  }

  // ↑ ↓ recorren; no dentro de un campo ni con otra tarjeta encima.
  useEffect(() => {
    if (id === null) return
    const tecla = (e: KeyboardEvent) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return
      if (document.querySelectorAll('[role="dialog"], [role="alertdialog"]').length > 1) return
      e.preventDefault()
      mover(e.key === "ArrowDown" ? 1 : -1)
    }
    document.addEventListener("keydown", tecla)
    return () => document.removeEventListener("keydown", tecla)
  })

  // Al pasar a otro servicio, el contenido entra desde el lado hacia donde se fue.
  useLayoutEffect(() => {
    const c = cuerpo.current
    const lado = sentido.current
    sentido.current = 0
    if (!c || !lado || quieto()) return
    const piezas = [...(cabeza.current?.children ?? []), c.querySelector(".pr-ficha2__descripcion"), ...c.querySelectorAll(".pr-recuadro")].filter(Boolean)
    gsap.fromTo(piezas, { opacity: 0, y: 16 * lado }, { opacity: 1, y: 0, duration: 0.3, stagger: 0.03, ease: "power3.out", clearProps: "opacity,transform", overwrite: "auto" })
  }, [id])

  const copiar = async () => {
    if (!p) return
    try {
      await navigator.clipboard.writeText(p.url)
      mostrar({ tipo: "guardado", titulo: t.copiado, texto: sitioDe(p.url) })
    } catch {
      mostrar({ tipo: "error", titulo: t.noCopiado })
    }
  }

  // El link partido: el sitio grande, legible, y el resto de la dirección aparte, en chico.
  const partes = (() => {
    if (!p) return { host: "", resto: "" }
    try {
      const u = new URL(p.url)
      const resto = `${u.pathname === "/" ? "" : u.pathname}${u.search}${u.hash}`
      return { host: u.host, resto }
    } catch {
      return { host: p.url, resto: "" }
    }
  })()

  return (
    <TarjetaModal abierto={id !== null && i >= 0} alPedirCierre={alCerrar} idTitulo={idTitulo} ancho="62rem" origen={origen}>
      {p && (
        <>
          {/* Arriba, la banda azul de las pantallas (D-036): el nombre grande y el estado y el cliente en vidrio. */}
          <div className="pr-ficha2__banda">
            <div className="pr-ficha2__barra" data-cascada="">
              <div>
                <p className="pr-ficha2__sobre">
                  {pegar(t.fichaTitulo)}
                  {i >= 0 && <span className="pr-ficha2__cuenta"> · {t.fichaDe(i + 1, filas.length)}</span>}
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
              <h2 id={idTitulo} className="pr-ficha2__nombre" data-cascada="">
                {pegar(p.nombre)}
              </h2>
              <div className="pr-ficha2__pastillas" data-cascada="">
                <span className="pr-pastilla" data-tono={p.archivadoEn ? "neutro" : "ok"}>
                  <span className="pr-pastilla__punto" aria-hidden="true" />
                  {p.archivadoEn ? t.estadoArchivado : t.estadoActivo}
                </span>
                <span className="pr-pastilla">
                  <Users size={16} strokeWidth={1.75} aria-hidden="true" />
                  {p.grupoNombre ?? t.sinGrupo}
                </span>
              </div>
            </div>
          </div>

          <div ref={cuerpo} className="pr-ficha2__cuerpo">
            <p className="pr-ficha2__descripcion" data-cascada="" data-vacio={p.descripcion ? undefined : ""}>
              {p.descripcion ? pegar(p.descripcion) : t.sinDescripcion}
            </p>
            <div className="pr-ficha2__grilla">
              <section className="pr-recuadro pr-recuadro--link" data-cascada="" aria-label={t.link}>
                <span className="pr-recuadro__icono" aria-hidden="true">
                  <Globe size={24} strokeWidth={1.75} />
                </span>
                <div className="pr-recuadro__textos">
                  <span className="pr-recuadro__rotulo">{t.link}</span>
                  <span className="pr-recuadro__sitio">{partes.host}</span>
                  {partes.resto && (
                    <span className="pr-recuadro__ruta" title={p.url}>
                      {partes.resto}
                    </span>
                  )}
                </div>
                <div className="pr-recuadro__acciones">
                  <Boton variante="secundaria" icono="copiar" onPress={copiar}>
                    {t.copiar}
                  </Boton>
                </div>
              </section>
              <section className="pr-recuadro" data-cascada="" aria-label={t.grupo}>
                <span className="pr-recuadro__icono" aria-hidden="true">
                  <Users size={22} strokeWidth={1.75} />
                </span>
                <div className="pr-recuadro__textos">
                  <span className="pr-recuadro__rotulo">{t.grupo}</span>
                  <span className="pr-recuadro__valor" data-vacio={p.grupoNombre ? undefined : ""}>
                    {p.grupoNombre ?? t.sinGrupo}
                  </span>
                </div>
              </section>
              <section className="pr-recuadro" data-cascada="" aria-label={t.colActualizado}>
                <span className="pr-recuadro__icono" aria-hidden="true">
                  <CalendarDays size={22} strokeWidth={1.75} />
                </span>
                <div className="pr-recuadro__textos">
                  <span className="pr-recuadro__rotulo">{t.colActualizado}</span>
                  <span className="pr-recuadro__valor">{formatDia(p.actualizadoEn)}</span>
                  <span className="pr-recuadro__nota">{t.fichaActualizadoHace(haceCuanto(p.actualizadoEn))}</span>
                </div>
              </section>
            </div>
          </div>
          <div className="ui-dialogo__acciones pr-ficha__acciones">
            <Boton variante={archivados ? "secundaria" : "peligro"} icono={archivados ? "restaurar" : "archivar"} onPress={() => alArchivo(p)}>
              {archivados ? t.restaurar : t.archivar}
            </Boton>
            <span className="pr-ficha__resto">
              <Boton variante="secundaria" icono="editar" onPress={() => alEditar(p)}>
                {t.editar}
              </Boton>
              <Boton variante="primaria" icono="abrir" onPress={() => window.open(p.url, "_blank", "noopener,noreferrer")}>
                {t.abrir}
              </Boton>
            </span>
          </div>
        </>
      )}
    </TarjetaModal>
  )
}
