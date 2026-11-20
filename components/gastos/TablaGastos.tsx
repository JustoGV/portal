"use client"
import { useRouter } from "next/navigation"
import { useRef, useState } from "react"
import { archivarGasto, restaurarGasto } from "@/acciones/gastos"
import { Boton } from "@/components/ui/Boton"
import { BotonIcono } from "@/components/ui/BotonIcono"
import { CajaTabla } from "@/components/ui/CajaTabla"
import { useConfirmar } from "@/components/ui/Confirmar"
import { Etiqueta } from "@/components/ui/Etiqueta"
import { Paginacion } from "@/components/ui/Paginacion"
import { useResultado } from "@/components/ui/Resultado"
import { Vacio } from "@/components/ui/Vacio"
import { comun } from "@/i18n/es/comun"
import { gastos as t } from "@/i18n/es/gastos"
import { cadaCuanto, cuandoVence, formatMonto, tonoVence, type FilaGasto } from "@/lib/gasto"
import { escribirIconos } from "@/lib/gsap"
import { conParametros } from "@/lib/parametros"
import { pegar } from "@/lib/texto"
import { useEditorGasto } from "./EditorGasto"
import { FichaGasto } from "./FichaGasto"

/** Con dos palabras no se pegan («Dominio cessgvg.com.ar»): pegadas no entran y el navegador parte una por la mitad. */
const nombreFila = (n: string) => (n.split(" ").length > 2 ? pegar(n) : n)

type Props = {
  filas: FilaGasto[]
  total: number
  pagina: number
  porPagina: number
  actuales: Record<string, string | null>
  vista: "activos" | "semana" | "archivados"
}

/**
 * La tabla de Gastos (D-043), con la forma de la de Servicios (D-030) y la idea de Cledara: lo que vence
 * pronto se ve en la misma fila («En 3 días», en naranja), ordenado por lo que vence primero. El monto va a
 * la derecha y en cifras tabulares; tocar la fila abre la ficha.
 */
export function TablaGastos({ filas, total, pagina, porPagina, actuales, vista }: Props) {
  const editor = useEditorGasto()
  const confirmar = useConfirmar()
  const mostrar = useResultado()
  const router = useRouter()
  const cuerpo = useRef<HTMLTableSectionElement>(null)
  const [fichaId, setFichaId] = useState<string | null>(null)
  const origen = useRef<Element | null>(null)
  const archivados = vista === "archivados"

  if (filas.length === 0) {
    if (archivados) return <Vacio icono="archivar" titulo={t.sinArchivados} />
    if (vista === "semana")
      return (
        <Vacio
          icono="reloj"
          titulo={t.vacioSemana}
          texto={t.vacioSemanaTexto}
          accion={
            <Boton variante="secundaria" onPress={() => router.replace("/gastos")}>
              {t.verTodos}
            </Boton>
          }
        />
      )
    return (
      <Vacio
        icono="ficha"
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

  const cambiarArchivo = async (g: FilaGasto) => {
    if (!archivados) {
      const ok = await confirmar({ titulo: t.archivarTitulo(g.nombre), texto: t.archivarTexto, accion: t.archivar, peligro: true })
      if (!ok) return
    }
    const r = archivados ? await restaurarGasto(g.id) : await archivarGasto(g.id)
    if (r.ok) {
      setFichaId(null)
      mostrar({ tipo: "guardado", titulo: archivados ? t.restaurado : t.archivado, texto: r.datos.nombre })
    } else if (r.sesion === "vencida") router.replace("/ingresar?motivo=expirado")
    else mostrar({ tipo: "error", titulo: comun.noGuardadoTitulo, texto: r.mensaje })
  }

  const abrirFicha = (g: FilaGasto, fila: Element | null) => {
    origen.current = fila
    setFichaId(g.id)
  }
  const filaDe = (id: string) => cuerpo.current?.querySelector(`tr[data-fila="${id}"]`) ?? null
  const desde = (pagina - 1) * porPagina + 1
  const hasta = Math.min(total, pagina * porPagina)

  return (
    <>
      <CajaTabla etiqueta={t.tabla} filas={filas.length}>
        <table className="ui-tabla pr-tabla ga-tabla">
          <caption className="sr-solo">{t.tabla}</caption>
          <thead>
            <tr>
              <th scope="col">{t.colGasto}</th>
              <th scope="col" data-prioridad={2}>
                {t.colPaga}
              </th>
              <th scope="col" className="ga-th-monto ga-col-ancha">
                {t.colMonto}
              </th>
              <th scope="col" className="ga-col-ancha">
                {t.colProximo}
              </th>
              <th scope="col" data-prioridad={3}>
                {t.colMedio}
              </th>
              <th scope="col">{t.colAcciones}</th>
            </tr>
          </thead>
          <tbody ref={cuerpo}>
            {filas.map((g, i) => (
              <tr
                key={g.id}
                data-fila={g.id}
                className="pr-tr"
                style={{ "--i": i } as React.CSSProperties}
                onClick={(e) => {
                  if ((e.target as Element).closest("button, a")) return
                  abrirFicha(g, e.currentTarget)
                }}
                onPointerEnter={(e) => e.pointerType === "mouse" && escribirIconos(e.currentTarget, { paso: 0.04 })}
              >
                <td className="pr-td-servicio">
                  <button type="button" className="pr-nombre" onClick={(e) => abrirFicha(g, e.currentTarget.closest("tr"))} aria-label={`${t.verFicha}: ${g.nombre}`}>
                    {nombreFila(g.nombre)}
                  </button>
                  <p className="pr-descripcion">{g.descripcion ?? cadaCuanto(g.frecuencia, g.diaPago, g.mesPago)}</p>
                  <p className="ga-movil">
                    <span className="ga-monto">{formatMonto(g.monto, g.moneda)}</span>
                    <span className="ga-monto__cada">{g.frecuencia === "anual" ? t.porAnio : t.porMes}</span>
                    {!archivados && <Etiqueta tono={tonoVence(g.faltan)}>{cuandoVence(g.faltan, g.proximoPago)}</Etiqueta>}
                  </p>
                </td>
                <td data-prioridad={2}>
                  <span className="ga-paga">{g.pagaNombre}</span>
                </td>
                <td className="ga-td-monto ga-col-ancha">
                  <span className="ga-monto">{formatMonto(g.monto, g.moneda)}</span>
                  <span className="ga-monto__cada">{g.frecuencia === "anual" ? t.porAnio : t.porMes}</span>
                </td>
                <td className="ga-td-proximo ga-col-ancha">
                  {archivados ? (
                    <span className="ui-tabla__secundario">—</span>
                  ) : (
                    <>
                      <Etiqueta tono={tonoVence(g.faltan)}>{cuandoVence(g.faltan, g.proximoPago)}</Etiqueta>
                      {g.faltan <= 30 && (
                        <time className="ga-fecha" dateTime={g.proximoPago}>
                          {g.proximoPago.split("-").reverse().join("/")}
                        </time>
                      )}
                    </>
                  )}
                </td>
                <td data-prioridad={3} className="ui-tabla__secundario ga-medio">
                  {g.medioPago}
                </td>
                <td className="ui-tabla__acciones">
                  <span className="ui-tabla__fila-acciones">
                    <BotonIcono icono="ficha" etiqueta={`${t.verFicha}: ${g.nombre}`} pista={t.verFicha} onPress={() => abrirFicha(g, filaDe(g.id))} />
                    <span className="pr-acciones-extra">
                      <BotonIcono icono="editar" etiqueta={`${t.editar} ${g.nombre}`} pista={t.editar} onPress={() => editor.abrirEdicion(g, filaDe(g.id))} />
                      <BotonIcono icono={archivados ? "restaurar" : "archivar"} etiqueta={`${archivados ? t.restaurar : t.archivar} ${g.nombre}`} pista={archivados ? t.restaurar : t.archivar} peligro={!archivados} onPress={() => cambiarArchivo(g)} />
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
            href={({ pagina: n, por }) => conParametros("/gastos", actuales, { pagina: n && n > 1 ? n : null, ...(por ? { por: por === 10 ? null : por } : {}) })}
          />
        </div>
      </CajaTabla>
      <FichaGasto
        filas={filas}
        id={fichaId}
        archivados={archivados}
        origen={() => {
          const fila = (fichaId && filaDe(fichaId)) || origen.current
          return fila?.isConnected ? fila.getBoundingClientRect() : null
        }}
        alCambiar={setFichaId}
        alCerrar={() => setFichaId(null)}
        alEditar={(g) => {
          setFichaId(null)
          editor.abrirEdicion(g, filaDe(g.id))
        }}
        alArchivo={cambiarArchivo}
      />
    </>
  )
}
