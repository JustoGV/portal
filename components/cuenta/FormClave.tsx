"use client"
import { useRouter } from "next/navigation"
import { useActionState, useEffect, useState, type FormEvent } from "react"
import { cambiarMiClave } from "@/acciones/cuenta"
import { Boton } from "@/components/ui/Boton"
import { Campo } from "@/components/ui/Campo"
import { useResultado } from "@/components/ui/Resultado"
import { comun } from "@/i18n/es/comun"
import { cuenta as t } from "@/i18n/es/cuenta"
import { CONTRASENA_MAX, CONTRASENA_MIN, contrasenaValida } from "@/lib/contrasena"
import { MENSAJES_CUENTA } from "@/lib/cuenta"

type Errores = Partial<Record<"actual" | "nueva" | "repetida", string>>

/** Los errores de lo escrito, con las mismas reglas que el esquema del servidor (esquemaClaveNueva). */
const revisar = (actual: string, nueva: string, repetida: string): Errores => {
  const e: Errores = {}
  if (!actual) e.actual = t.claveActualFalta
  if (!contrasenaValida(nueva)) e.nueva = nueva.length > CONTRASENA_MAX ? MENSAJES_CUENTA.claveLarga : MENSAJES_CUENTA.claveCorta
  else if (nueva === actual) e.nueva = MENSAJES_CUENTA.claveIgual
  if (repetida !== nueva) e.repetida = MENSAJES_CUENTA.claveDistinta
  return e
}

/**
 * Cambiar la contraseña propia (D-035), dentro de la tarjeta de VistaCuenta: la actual, la nueva y su
 * repetición en una columna, cada error al salir del campo (recorrido-y-formularios §3). Se puede pegar y
 * el navegador ofrece una contraseña nueva (autocomplete). Al guardar se cierran las demás sesiones.
 */
export function FormClave({ alCambiar, alGuardar, alCancelar }: { alCambiar: (c: boolean) => void; alGuardar: () => void; alCancelar: () => void }) {
  const router = useRouter()
  const mostrar = useResultado()
  const [actual, setActual] = useState("")
  const [nueva, setNueva] = useState("")
  const [repetida, setRepetida] = useState("")
  const [tocados, setTocados] = useState<Record<string, boolean>>({})
  const [delServidor, setDelServidor] = useState<Errores>({})

  const [, accion, enviando] = useActionState(async (anterior: Awaited<ReturnType<typeof cambiarMiClave>> | null, datos: FormData) => {
    const estado = await cambiarMiClave(anterior, datos)
    if (estado.ok) {
      alCambiar(false)
      alGuardar()
      mostrar({ tipo: "guardado", titulo: t.claveGuardada, texto: t.claveGuardadaTexto(estado.datos.cerradas) })
      router.refresh()
    } else if (estado.sesion === "vencida") router.replace("/ingresar?motivo=expirado")
    else if (estado.errores) {
      setDelServidor(estado.errores)
      setTocados({ actual: true, nueva: true, repetida: true })
    } else mostrar({ tipo: "error", titulo: comun.noGuardadoTitulo, texto: estado.mensaje })
    return estado
  }, null)

  useEffect(() => alCambiar(!!(actual || nueva || repetida)), [actual, nueva, repetida, alCambiar])

  const err = revisar(actual, nueva, repetida)
  const ver = (k: keyof Errores) => delServidor[k] ?? (tocados[k] ? err[k] : undefined)
  const tocar = (k: string) => setTocados((x) => ({ ...x, [k]: true }))

  const enviar = (e: FormEvent<HTMLFormElement>) => {
    const primero = (Object.keys(err) as (keyof Errores)[])[0]
    if (!primero) return
    e.preventDefault()
    setTocados({ actual: true, nueva: true, repetida: true })
    e.currentTarget.querySelector<HTMLInputElement>(`[name="${primero}"]`)?.focus()
  }

  return (
    <form action={accion} onSubmit={enviar} noValidate>
      <div className="ui-dialogo__campos">
        <Campo
          etiqueta={t.claveActual}
          name="actual"
          tipo="password"
          valor={actual}
          alCambiar={(v) => {
            setActual(v)
            setDelServidor((x) => ({ ...x, actual: undefined }))
          }}
          alSalir={() => tocar("actual")}
          icono="candado"
          autoComplete="current-password"
          max={CONTRASENA_MAX}
          obligatorio
          autoFocus
          error={ver("actual")}
        />
        <Campo
          etiqueta={t.claveNueva}
          name="nueva"
          tipo="password"
          valor={nueva}
          alCambiar={(v) => {
            setNueva(v)
            setDelServidor((x) => ({ ...x, nueva: undefined }))
          }}
          alSalir={() => tocar("nueva")}
          icono="candado"
          autoComplete="new-password"
          max={CONTRASENA_MAX}
          progreso={Math.min(1, nueva.length / CONTRASENA_MIN)}
          ok={!err.nueva}
          obligatorio
          ayuda={t.claveNuevaAyuda}
          error={ver("nueva")}
        />
        <Campo
          etiqueta={t.claveRepetir}
          name="repetida"
          tipo="password"
          valor={repetida}
          alCambiar={(v) => {
            setRepetida(v)
            setDelServidor((x) => ({ ...x, repetida: undefined }))
          }}
          alSalir={() => tocar("repetida")}
          icono="candado"
          autoComplete="new-password"
          max={CONTRASENA_MAX}
          ok={!err.nueva && !err.repetida}
          obligatorio
          error={ver("repetida")}
        />
      </div>
      <div className="ui-dialogo__acciones">
        <Boton variante="secundaria" onPress={alCancelar}>
          {comun.cancelar}
        </Boton>
        <Boton type="submit" variante="primaria" icono="tilde" cargando={enviando} textoCargando={comun.guardando}>
          {t.guardarClave}
        </Boton>
      </div>
    </form>
  )
}
