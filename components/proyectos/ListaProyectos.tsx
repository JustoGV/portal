"use client"
import { useRouter } from "next/navigation"
import { useRef } from "react"
import { Link } from "react-aria-components"
import { archivarProyecto, restaurarProyecto } from "@/acciones/proyectos"
import { Icono } from "@/components/iconos/Icono"
import { Boton } from "@/components/ui/Boton"
import { BotonIcono } from "@/components/ui/BotonIcono"
import { CajaTabla } from "@/components/ui/CajaTabla"
import { useConfirmar } from "@/components/ui/Confirmar"
import { Paginacion } from "@/components/ui/Paginacion"
import { Pista } from "@/components/ui/Pista"
import { useResultado } from "@/components/ui/Resultado"
import { Vacio } from "@/components/ui/Vacio"
import { comun } from "@/i18n/es/comun"
import { proyectos as t } from "@/i18n/es/proyectos"
import { formatDia } from "@/lib/fecha"
import { escribirIconos } from "@/lib/gsap"
import { conParametros } from "@/lib/parametros"
import type { FilaProyecto } from "@/lib/proyecto"
import { sitioDe } from "@/lib/url"
import { useEditorProyecto } from "./EditorProyecto"

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
      <CajaTabla etiqueta={t.tabla} filas={filas.length}>
        <table className="ui-tabla">
          <caption className="sr-solo">{t.tabla}</caption>
          <thead>
            <tr>
              <th scope="col">{t.colNombre}</th>
              <th scope="col" data-prioridad="2">
                {t.colGrupo}
              </th>
              <th scope="col" data-prioridad="3">
                {t.colLink}
              </th>
              <th scope="col" data-prioridad="3">
                {t.colDescripcion}
              </th>
              <th scope="col" data-prioridad="3">
                {t.colActualizado}
              </th>
              <th scope="col">
                <span className="sr-solo">{t.colAcciones}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filas.map((p, i) => (
              <Fila key={p.id} p={p} i={i} archivados={archivados} alEditar={() => editor.abrirEdicion(p)} alArchivo={() => cambiarArchivo(p)} />
            ))}
          </tbody>
        </table>
      </CajaTabla>
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

function Fila({ p, i, archivados, alEditar, alArchivo }: { p: FilaProyecto; i: number; archivados: boolean; alEditar: () => void; alArchivo: () => void }) {
  const fila = useRef<HTMLTableRowElement>(null)
  return (
    <tr ref={fila} style={{ "--i": i } as React.CSSProperties} onPointerEnter={() => escribirIconos(fila.current?.querySelector(".ui-tabla__fila-acciones") ?? null, { paso: 0.05 })}>
      <td>
        <a className="pr-abrir" href={p.url} target="_blank" rel="noopener noreferrer">
          <span className="pr-abrir__nombre">{p.nombre}</span>
          <span className="sr-solo">({t.abrirPista})</span>
        </a>
      </td>
      <td data-prioridad="2">{p.grupoNombre ?? <span className="ui-tabla__secundario">{t.sinGrupo}</span>}</td>
      <td data-prioridad="3" className="ui-tabla__secundario pr-celda-corta">
        {sitioDe(p.url)}
      </td>
      <td data-prioridad="3" className="ui-tabla__secundario pr-celda-corta">
        {p.descripcion ?? "–"}
      </td>
      <td data-prioridad="3" className="ui-tabla__secundario">
        {formatDia(p.actualizadoEn)}
      </td>
      <td className="ui-tabla__acciones">
        <span className="ui-tabla__fila-acciones">
          <Pista texto={t.abrirPista}>
            <Link className="ui-boton-icono" href={p.url} target="_blank" rel="noopener noreferrer" aria-label={`${t.abrir} ${p.nombre}`} onHoverStart={(e) => escribirIconos(e.target)}>
              <Icono nombre="abrir" />
            </Link>
          </Pista>
          <BotonIcono icono="editar" etiqueta={`${t.editar} ${p.nombre}`} pista={t.editar} onPress={alEditar} />
          <BotonIcono
            icono={archivados ? "restaurar" : "archivar"}
            etiqueta={`${archivados ? t.restaurar : t.archivar} ${p.nombre}`}
            pista={archivados ? t.restaurar : t.archivar}
            peligro={!archivados}
            onPress={alArchivo}
          />
        </span>
      </td>
    </tr>
  )
}
