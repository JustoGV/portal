"use client"
import { useRouter } from "next/navigation"
import { useActionState, useEffect, useState, type FormEvent } from "react"
import { guardarProyecto } from "@/acciones/proyectos"
import { Boton } from "@/components/ui/Boton"
import { Campo } from "@/components/ui/Campo"
import { useResultado } from "@/components/ui/Resultado"
import { enterAvanza } from "@/components/ui/use-enter-avanza"
import { comun } from "@/i18n/es/comun"
import { proyectos as t } from "@/i18n/es/proyectos"
import { DESCRIPCION_MAX, NOMBRE_PROYECTO_MAX } from "@/lib/nombre"
import { MENSAJES_PROYECTO, validarNombreProyecto, type FilaProyecto } from "@/lib/proyecto"
import { limpiarTexto } from "@/lib/texto"
import { MENSAJE_URL, normalizarUrl } from "@/lib/url"
import { ComboGrupo, type Grupo } from "./ComboGrupo"
import { useDuplicado, type EstadoDuplicado } from "./use-duplicado"

type Props = {
  proyecto: FilaProyecto | null
  grupos: Grupo[]
  alCambiar: (hayCambios: boolean) => void
  alGuardar: () => void
  alCancelar: () => void
  /** Cierra sin preguntar (para ir al proyecto existente). */
  alCerrar: () => void
}

export function FormProyecto({ proyecto, grupos, alCambiar, alGuardar, alCancelar, alCerrar }: Props) {
  const router = useRouter()
  const mostrar = useResultado()
  const [inicial] = useState(() => ({
    nombre: proyecto?.nombre ?? "",
    url: proyecto?.url ?? "",
    grupo: proyecto?.grupoNombre ?? "",
    descripcion: proyecto?.descripcion ?? "",
  }))
  const [nombre, setNombre] = useState(inicial.nombre)
  const [url, setUrl] = useState(inicial.url)
  const [grupo, setGrupo] = useState(inicial.grupo)
  const [descripcion, setDescripcion] = useState(inicial.descripcion)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [tocado, setTocado] = useState<Record<string, boolean>>({})

  // La respuesta del servidor se atiende dentro de la acción (corre en la transición del envío).
  const [, accion, enviando] = useActionState(async (anterior: Awaited<ReturnType<typeof guardarProyecto>> | null, datos: FormData) => {
    const estado = await guardarProyecto(anterior, datos)
    if (estado.ok) {
      alCambiar(false)
      alGuardar()
      mostrar({ tipo: "guardado", titulo: t.guardado, texto: estado.datos.nombre })
    } else if (estado.sesion === "vencida") {
      router.replace("/ingresar?motivo=expirado")
    } else if (estado.errores) {
      setErrores(estado.errores)
      mostrar({ tipo: "dato-mal", titulo: comun.datoMalTitulo, texto: estado.mensaje })
    } else {
      mostrar({ tipo: "error", titulo: comun.noGuardadoTitulo, texto: estado.mensaje })
    }
    return estado
  }, null)

  const excluir = proyecto?.id ?? null
  const nombreLimpio = limpiarTexto(nombre)
  const errorNombre = validarNombreProyecto(nombre)
  const u = normalizarUrl(url)
  const dupNombre = useDuplicado("nombre", nombreLimpio, !errorNombre && nombreLimpio.toLowerCase() !== (proyecto?.nombre ?? "").toLowerCase(), excluir)
  const dupUrl = useDuplicado("url", u.ok ? u.url : "", u.ok && (!proyecto || u.url !== proyecto.url), excluir)

  const hayCambios =
    nombre !== inicial.nombre || url !== inicial.url || grupo !== inicial.grupo || descripcion !== inicial.descripcion
  useEffect(() => alCambiar(hayCambios), [hayCambios, alCambiar])

  const errorUrl = !u.ok ? MENSAJE_URL[u.error] : null
  const mensajeDup = (d: EstadoDuplicado, campo: "nombre" | "url") =>
    d.estado === "existe" && d.duplicado ? (d.duplicado.archivado ? t.existeArchivado(d.duplicado.nombre) : t.existe(d.duplicado.nombre)) + (campo === "url" ? " " + MENSAJES_PROYECTO.urlRepetida + "." : "") : null

  // El rojo puede esperar a que salgas del campo; el aviso de repetido no (06 §1.5, §3).
  const verErrorNombre = errores.nombre ?? mensajeDup(dupNombre, "nombre") ?? (tocado.nombre ? errorNombre : null) ?? undefined
  const verErrorUrl = errores.url ?? mensajeDup(dupUrl, "url") ?? (tocado.url && url ? errorUrl : null) ?? (tocado.url && !url ? MENSAJE_URL.vacio : null) ?? undefined

  const validar = (e: FormEvent<HTMLFormElement>) => {
    const err: Record<string, string> = {}
    if (errorNombre) err.nombre = errorNombre
    else if (dupNombre.estado === "existe") err.nombre = mensajeDup(dupNombre, "nombre")!
    if (errorUrl) err.url = errorUrl
    else if (dupUrl.estado === "existe") err.url = mensajeDup(dupUrl, "url")!
    if (limpiarTexto(descripcion).length > DESCRIPCION_MAX) err.descripcion = MENSAJES_PROYECTO.descripcionLarga
    setErrores(err)
    setTocado({ nombre: true, url: true })
    if (Object.keys(err).length) {
      e.preventDefault()
      e.currentTarget.querySelector<HTMLInputElement>(`[name="${Object.keys(err)[0]}"]`)?.focus()
      mostrar({ tipo: "dato-mal", titulo: comun.datoMalTitulo, texto: comun.datoMalTexto })
    }
  }

  const exacto = grupos.find((g) => g.nombre.toLowerCase() === limpiarTexto(grupo).toLowerCase())
  const verExistente = (d: EstadoDuplicado) =>
    d.estado === "existe" && d.duplicado ? (
      <button
        type="button"
        className="ui-enlace"
        onClick={() => {
          alCerrar()
          router.push(`/?q=${encodeURIComponent(d.duplicado!.nombre)}${d.duplicado!.archivado ? "&estado=archivados" : ""}`)
        }}
      >
        {t.verExistente}
      </button>
    ) : null

  return (
    <form action={accion} onSubmit={validar} onKeyDown={enterAvanza} noValidate>
      <input type="hidden" name="id" value={proyecto?.id ?? ""} />
      <input type="hidden" name="grupoId" value={exacto?.id ?? ""} />
      <input type="hidden" name="grupoNuevo" value={exacto ? "" : limpiarTexto(grupo)} />
      <div className="ui-dialogo__campos ui-dialogo__campos--dos">
        <div>
          <Campo
            etiqueta={t.nombre}
            name="nombre"
            valor={nombre}
            alCambiar={(v) => {
              setNombre(v)
              setErrores(({ nombre: _, ...r }) => r)
            }}
            alSalir={() => setTocado((x) => ({ ...x, nombre: true }))}
            icono="texto"
            max={NOMBRE_PROYECTO_MAX}
            contador="cerca"
            obligatorio
            autoFocus
            ok={!errorNombre && (dupNombre.estado === "libre" || (!!proyecto && nombreLimpio.toLowerCase() === proyecto.nombre.toLowerCase()))}
            error={verErrorNombre}
          />
          {verExistente(dupNombre)}
        </div>
        <ComboGrupo grupos={grupos} texto={grupo} alCambiar={setGrupo} error={errores.grupo} />
        <div className="ui-campo--ancho">
          <Campo
            etiqueta={t.link}
            name="url"
            tipo="url"
            valor={url}
            alCambiar={(v) => {
              setUrl(v)
              setErrores(({ url: _, ...r }) => r)
            }}
            alSalir={() => setTocado((x) => ({ ...x, url: true }))}
            icono="link"
            max={2048}
            inputMode="url"
            obligatorio
            ayuda={t.linkAyuda}
            progreso={u.ok ? 1 : 0}
            ok={u.ok && (dupUrl.estado === "libre" || (!!proyecto && u.url === proyecto.url))}
            error={verErrorUrl}
          />
          {verExistente(dupUrl)}
        </div>
        <Campo
          etiqueta={t.descripcion}
          name="descripcion"
          valor={descripcion}
          alCambiar={setDescripcion}
          multilinea
          max={DESCRIPCION_MAX}
          contador="siempre"
          ancho
          error={errores.descripcion}
        />
      </div>
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
