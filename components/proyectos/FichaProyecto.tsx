"use client"
import { ChevronDown, ChevronUp } from "lucide-react"
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react"
import { Boton } from "@/components/ui/Boton"
import { BotonIcono } from "@/components/ui/BotonIcono"
import { Etiqueta } from "@/components/ui/Etiqueta"
import { Pista } from "@/components/ui/Pista"
import { useResultado } from "@/components/ui/Resultado"
import { TarjetaModal } from "@/components/ui/TarjetaModal"
import { comun } from "@/i18n/es/comun"
import { proyectos as t } from "@/i18n/es/proyectos"
import { formatDia } from "@/lib/fecha"
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
 * La ficha de un servicio (D-030): una tarjeta al centro que crece desde la fila que se tocó, con todos
 * sus datos y sus acciones. Nunca un panel lateral (rechazado por Mateo, D-029). ↑ ↓ pasan al servicio
 * anterior o siguiente de la tabla sin cerrar, como el legajo de EDV; el contenido se cruza de costado.
 */
export function FichaProyecto({ filas, id, archivados, origen, alCambiar, alCerrar, alEditar, alArchivo }: Props) {
  const idTitulo = useId()
  const mostrar = useResultado()
  const cuerpo = useRef<HTMLDivElement>(null)
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
    gsap.fromTo(c.children, { opacity: 0, y: 16 * lado }, { opacity: 1, y: 0, duration: 0.3, stagger: 0.03, ease: "power3.out", clearProps: "opacity,transform", overwrite: "auto" })
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

  return (
    <TarjetaModal abierto={id !== null && i >= 0} alPedirCierre={alCerrar} idTitulo={idTitulo} ancho="40rem" origen={origen}>
      {p && (
        <>
          <div className="ui-dialogo__cabecera pr-ficha__cabecera">
            <div>
              <p className="pr-ficha__sobre">
                {t.fichaTitulo}
                {i >= 0 && <span className="pr-ficha__cuenta"> · {t.fichaDe(i + 1, filas.length)}</span>}
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
          <div ref={cuerpo} className="pr-ficha__cuerpo">
            <div className="pr-ficha__titular" data-cascada="">
              <h2 id={idTitulo} className="pr-ficha__nombre">
                {pegar(p.nombre)}
              </h2>
              <div className="pr-ficha__etiquetas">
                <Etiqueta tono={p.archivadoEn ? "neutro" : "ok"}>{p.archivadoEn ? t.estadoArchivado : t.estadoActivo}</Etiqueta>
                {p.grupoNombre ? <span className="pr-grupo">{p.grupoNombre}</span> : <span className="pr-grupo pr-grupo--sin">{t.sinGrupo}</span>}
              </div>
            </div>
            <p className="pr-ficha__descripcion" data-cascada="" data-vacio={p.descripcion ? undefined : ""}>
              {p.descripcion ? pegar(p.descripcion) : t.sinDescripcion}
            </p>
            <dl className="ui-resumen" data-cascada="">
              <div className="ui-resumen__fila">
                <dt>{t.link}</dt>
                <dd>{p.url}</dd>
              </div>
              <div className="ui-resumen__fila">
                <dt>{t.fichaSitio}</dt>
                <dd>{sitioDe(p.url)}</dd>
              </div>
              <div className="ui-resumen__fila">
                <dt>{t.grupo}</dt>
                <dd data-vacio={p.grupoNombre ? undefined : ""}>{p.grupoNombre ?? t.sinGrupo}</dd>
              </div>
              <div className="ui-resumen__fila">
                <dt>{t.colActualizado}</dt>
                <dd>{formatDia(p.actualizadoEn)}</dd>
              </div>
            </dl>
          </div>
          <div className="ui-dialogo__acciones pr-ficha__acciones">
            <Boton variante={archivados ? "secundaria" : "peligro"} icono={archivados ? "restaurar" : "archivar"} onPress={() => alArchivo(p)}>
              {archivados ? t.restaurar : t.archivar}
            </Boton>
            <span className="pr-ficha__resto">
              <Boton variante="secundaria" icono="copiar" onPress={copiar}>
                {t.copiar}
              </Boton>
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
