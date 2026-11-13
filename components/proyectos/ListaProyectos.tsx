"use client"
import { useRouter } from "next/navigation"
import { useRef } from "react"
import { archivarProyecto, restaurarProyecto } from "@/acciones/proyectos"
import { Icono } from "@/components/iconos/Icono"
import { Boton } from "@/components/ui/Boton"
import { BotonIcono } from "@/components/ui/BotonIcono"
import { CajaTabla } from "@/components/ui/CajaTabla"
import { useConfirmar } from "@/components/ui/Confirmar"
import { Paginacion } from "@/components/ui/Paginacion"
import { useResultado } from "@/components/ui/Resultado"
import { Vacio } from "@/components/ui/Vacio"
import { comun } from "@/i18n/es/comun"
import { proyectos as t } from "@/i18n/es/proyectos"
import { formatDia } from "@/lib/fecha"
import { escribirIconos } from "@/lib/gsap"
import { conParametros } from "@/lib/parametros"
import type { FilaProyecto } from "@/lib/proyecto"
import { pegar } from "@/lib/texto"
import { sitioDe } from "@/lib/url"
import { useEditorProyecto } from "./EditorProyecto"
import { useVistaPrevia, VistaPrevia } from "./VistaPrevia"

type Props = {
  filas: FilaProyecto[]
  total: number
  pagina: number
  porPagina: number
  actuales: Record<string, string | null>
  filtrando: boolean
  archivados: boolean
}

export function ListaProyectos({ filas, total, pagina, porPagina, actuales, filtrando, archivados }: Props) {
  const editor = useEditorProyecto()
  const confirmar = useConfirmar()
  const mostrar = useResultado()
  const router = useRouter()

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
          <Boton variante="primaria" icono="agregar" onPress={editor.abrirNuevo}>
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
    if (r.ok) mostrar({ tipo: "guardado", titulo: archivados ? t.restaurado : t.archivado, texto: r.datos.nombre })
    else if (r.sesion === "vencida") router.replace("/ingresar?motivo=expirado")
    else mostrar({ tipo: "error", titulo: comun.noGuardadoTitulo, texto: r.mensaje })
  }

  return (
    <>
      <VistaPrevia>
        <CajaTabla etiqueta={t.tabla} filas={filas.length}>
          <ul className="pr-lista" aria-label={t.tabla}>
            {filas.map((p, i) => (
              <Fila key={p.id} p={p} i={i} archivados={archivados} alEditar={() => editor.abrirEdicion(p)} alArchivo={() => cambiarArchivo(p)} />
            ))}
          </ul>
        </CajaTabla>
      </VistaPrevia>
      <Paginacion
        total={total}
        pagina={pagina}
        porPagina={porPagina}
        etiquetaFilas={t.filas}
        href={({ pagina: n, por }) => conParametros("/", actuales, { pagina: n && n > 1 ? n : null, ...(por ? { por: por === 25 ? null : por } : {}) })}
      />
    </>
  )
}

/**
 * Una fila de la lista (referencia #5, D-017): el nombre manda y abre el proyecto; toda la fila es el
 * área de toque del link (el ::after del link la cubre). Editar y archivar quedan por encima, con su nombre
 * y su tooltip. Al entrar el mouse: la fila sube un nivel, el nombre se subraya, la flecha y los íconos se
 * escriben (04 §5) y aparece la tarjeta con el link completo.
 */
function Fila({ p, i, archivados, alEditar, alArchivo }: { p: FilaProyecto; i: number; archivados: boolean; alEditar: () => void; alArchivo: () => void }) {
  const fila = useRef<HTMLLIElement>(null)
  const previa = useVistaPrevia()
  return (
    <li
      ref={fila}
      className="pr-fila"
      style={{ "--i": i } as React.CSSProperties}
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse") return
        escribirIconos(fila.current, { paso: 0.05 })
        previa.mostrar(p, e)
      }}
      onPointerMove={previa.mover}
      onPointerLeave={previa.ocultar}
    >
      <div className="pr-fila__principal">
        <a className="pr-fila__abrir" href={p.url} target="_blank" rel="noopener noreferrer" onFocus={() => escribirIconos(fila.current, { paso: 0.05 })}>
          <span className="pr-fila__nombre">{pegar(p.nombre)}</span>
          <Icono nombre="abrir" tamano={16} className="pr-fila__flecha" />
          <span className="sr-solo">
            ({t.abrirPista}: {sitioDe(p.url)})
          </span>
        </a>
        {p.descripcion && <p className="pr-fila__descripcion">{pegar(p.descripcion)}</p>}
      </div>
      <div className="pr-fila__meta">
        {p.grupoNombre ? <span className="pr-grupo">{p.grupoNombre}</span> : <span className="pr-grupo pr-grupo--sin">{t.sinGrupo}</span>}
        <time className="pr-fila__fecha" dateTime={new Date(p.actualizadoEn).toISOString()}>
          {t.actualizado(formatDia(p.actualizadoEn))}
        </time>
      </div>
      <div className="pr-fila__acciones" onPointerEnter={previa.ocultar} onPointerLeave={(e) => e.pointerType === "mouse" && previa.mostrar(p, e)}>
        <BotonIcono icono="editar" etiqueta={`${t.editar} ${p.nombre}`} pista={t.editar} onPress={alEditar} />
        <BotonIcono
          icono={archivados ? "restaurar" : "archivar"}
          etiqueta={`${archivados ? t.restaurar : t.archivar} ${p.nombre}`}
          pista={archivados ? t.restaurar : t.archivar}
          peligro={!archivados}
          onPress={alArchivo}
        />
      </div>
    </li>
  )
}
