"use client"
import { useRouter } from "next/navigation"
import { useActionState, useEffect, useState, type FormEvent } from "react"
import { archivarGrupo, guardarGrupo, restaurarGrupo } from "@/acciones/grupos"
import { Boton } from "@/components/ui/Boton"
import { BotonIcono } from "@/components/ui/BotonIcono"
import { CajaTabla } from "@/components/ui/CajaTabla"
import { Campo } from "@/components/ui/Campo"
import { useConfirmar } from "@/components/ui/Confirmar"
import { Dialogo } from "@/components/ui/Dialogo"
import { useResultado } from "@/components/ui/Resultado"
import { Vacio } from "@/components/ui/Vacio"
import { enterAvanza } from "@/components/ui/use-enter-avanza"
import { comun } from "@/i18n/es/comun"
import { grupos as t } from "@/i18n/es/grupos"
import type { FilaGrupo } from "@/lib/grupo"
import { MENSAJES_GRUPO } from "@/lib/grupo"
import { NOMBRE_GRUPO_MAX } from "@/lib/nombre"
import { limpiarTexto } from "@/lib/texto"

type Editor = { abierto: boolean; grupo: FilaGrupo | null; apertura: number }

/** El botón "Nuevo grupo" y el diálogo comparten estado con la tabla. */
export function BotonNuevoGrupo() {
  return (
    <Boton variante="primaria" icono="agregar" onPress={() => window.dispatchEvent(new CustomEvent("grupos:nuevo"))}>
      {t.nuevo}
    </Boton>
  )
}

export function VistaGrupos({ filas, archivados }: { filas: FilaGrupo[]; archivados: boolean }) {
  const router = useRouter()
  const confirmar = useConfirmar()
  const mostrar = useResultado()
  const [editor, setEditor] = useState<Editor>({ abierto: false, grupo: null, apertura: 0 })
  const [cambios, setCambios] = useState(false)

  const abrir = (g: FilaGrupo | null) => {
    setCambios(false)
    setEditor((e) => ({ abierto: true, grupo: g, apertura: e.apertura + 1 }))
  }
  const cerrar = () => setEditor((e) => ({ ...e, abierto: false }))
  const cancelar = async () => {
    if (cambios && !(await confirmar({ titulo: comun.descartarTitulo, texto: comun.descartarTexto, accion: comun.descartar, cancelar: comun.seguirEditando, peligro: true }))) return
    cerrar()
  }

  useEffect(() => {
    const nuevo = () => abrir(null)
    window.addEventListener("grupos:nuevo", nuevo)
    return () => window.removeEventListener("grupos:nuevo", nuevo)
  }, [])

  const cambiarArchivo = async (g: FilaGrupo) => {
    if (!archivados && !(await confirmar({ titulo: t.archivarTitulo(g.nombre), texto: t.archivarTexto(g.proyectos), accion: t.archivar, peligro: true }))) return
    const r = archivados ? await restaurarGrupo(g.id) : await archivarGrupo(g.id)
    if (r.ok) mostrar({ tipo: "guardado", titulo: archivados ? t.restaurado : t.archivado, texto: r.datos.nombre })
    else if (r.sesion === "vencida") router.replace("/ingresar?motivo=expirado")
    else mostrar({ tipo: "error", titulo: comun.noGuardadoTitulo, texto: r.mensaje })
  }

  return (
    <>
      {filas.length === 0 ? (
        archivados ? (
          <Vacio icono="archivar" titulo={t.sinArchivados} />
        ) : (
          <Vacio
            icono="grupos"
            titulo={t.vacioTitulo}
            texto={t.vacioTexto}
            accion={
              <Boton variante="primaria" icono="agregar" onPress={() => abrir(null)}>
                {t.nuevo}
              </Boton>
            }
          />
        )
      ) : (
        <CajaTabla etiqueta={t.tabla} filas={filas.length}>
          <table className="ui-tabla">
            <caption className="sr-solo">{t.tabla}</caption>
            <thead>
              <tr>
                <th scope="col">{t.colNombre}</th>
                <th scope="col">{t.colProyectos}</th>
                <th scope="col">
                  <span className="sr-solo">{t.colAcciones}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filas.map((g, i) => (
                <tr key={g.id} style={{ "--i": i } as React.CSSProperties}>
                  <td className="gr-nombre">{g.nombre}</td>
                  <td>{g.proyectos}</td>
                  <td className="ui-tabla__acciones">
                    <span className="ui-tabla__fila-acciones">
                      <BotonIcono icono="editar" etiqueta={`${t.renombrar} ${g.nombre}`} pista={t.renombrar} onPress={() => abrir(g)} />
                      <BotonIcono
                        icono={archivados ? "restaurar" : "archivar"}
                        etiqueta={`${archivados ? t.restaurar : t.archivar} ${g.nombre}`}
                        pista={archivados ? t.restaurar : t.archivar}
                        peligro={!archivados}
                        onPress={() => cambiarArchivo(g)}
                      />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CajaTabla>
      )}
      <Dialogo abierto={editor.abierto} alCerrar={cerrar} titulo={editor.grupo ? t.tituloRenombrar : t.tituloNuevo} hayCambios={cambios} ancho="28rem">
        <FormGrupo key={editor.apertura} grupo={editor.grupo} alCambiar={setCambios} alGuardar={cerrar} alCancelar={cancelar} />
      </Dialogo>
    </>
  )
}

function FormGrupo({ grupo, alCambiar, alGuardar, alCancelar }: { grupo: FilaGrupo | null; alCambiar: (c: boolean) => void; alGuardar: () => void; alCancelar: () => void }) {
  const router = useRouter()
  const mostrar = useResultado()
  const [nombre, setNombre] = useState(grupo?.nombre ?? "")
  const [error, setError] = useState<string | undefined>()
  const [, accion, enviando] = useActionState(async (anterior: Awaited<ReturnType<typeof guardarGrupo>> | null, datos: FormData) => {
    const estado = await guardarGrupo(anterior, datos)
    if (estado.ok) {
      alCambiar(false)
      alGuardar()
      mostrar({ tipo: "guardado", titulo: t.guardado, texto: estado.datos.nombre })
    } else if (estado.sesion === "vencida") router.replace("/ingresar?motivo=expirado")
    else if (estado.errores) setError(estado.errores.nombre)
    else mostrar({ tipo: "error", titulo: comun.noGuardadoTitulo, texto: estado.mensaje })
    return estado
  }, null)

  useEffect(() => alCambiar(nombre !== (grupo?.nombre ?? "")), [nombre, grupo, alCambiar])

  const validar = (e: FormEvent<HTMLFormElement>) => {
    if (!limpiarTexto(nombre)) {
      e.preventDefault()
      setError(MENSAJES_GRUPO.falta)
    }
  }

  return (
    <form action={accion} onSubmit={validar} onKeyDown={enterAvanza} noValidate>
      <input type="hidden" name="id" value={grupo?.id ?? ""} />
      <Campo
        etiqueta={t.nombre}
        name="nombre"
        valor={nombre}
        alCambiar={(v) => {
          setNombre(v)
          setError(undefined)
        }}
        icono="carpeta"
        max={NOMBRE_GRUPO_MAX}
        contador="cerca"
        obligatorio
        autoFocus
        error={error}
      />
      <div className="ui-dialogo__acciones">
        <Boton variante="secundaria" onPress={alCancelar}>
          {comun.cancelar}
        </Boton>
        <Boton type="submit" variante="primaria" icono="tilde" cargando={enviando} textoCargando={comun.guardando}>
          {t.guardar}
        </Boton>
      </div>
    </form>
  )
}
