"use client"
import { useEffect, useRef, useState } from "react"
import { verificarDuplicado, type Duplicado } from "@/acciones/proyectos"

export type EstadoDuplicado = { estado: "nada" | "buscando" | "libre" | "existe"; para: string; duplicado: Duplicado }

/**
 * El aviso de repetido en vivo (docs/reglas/06 §3): 300 ms sin teclear y se pregunta al servidor,
 * excluyendo el propio. Recuerda para qué valor contestó: una respuesta vieja nunca se muestra bajo
 * un valor nuevo. Si la búsqueda falla no se inventa nada: la base frena el duplicado igual.
 */
export const useDuplicado = (campo: "nombre" | "url", valor: string, listo: boolean, excluir: string | null) => {
  const [r, setR] = useState<EstadoDuplicado>({ estado: "nada", para: "", duplicado: null })
  const ultimo = useRef(0)

  useEffect(() => {
    if (!listo) return
    const n = ++ultimo.current
    const t = window.setTimeout(async () => {
      setR({ estado: "buscando", para: valor, duplicado: null })
      try {
        const res = await verificarDuplicado(campo, valor, excluir)
        if (n !== ultimo.current) return
        if (!res.ok) return setR({ estado: "nada", para: valor, duplicado: null })
        setR({ estado: res.datos.duplicado ? "existe" : "libre", para: valor, duplicado: res.datos.duplicado })
      } catch {
        if (n === ultimo.current) setR({ estado: "nada", para: valor, duplicado: null })
      }
    }, 300)
    return () => window.clearTimeout(t)
  }, [campo, valor, listo, excluir])

  // Solo vale si contestó para este mismo valor.
  return listo && r.para === valor ? r : { estado: "nada" as const, para: valor, duplicado: null }
}
