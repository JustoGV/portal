"use client"
import { useRouter } from "next/navigation"
import { Boton } from "@/components/ui/Boton"
import type { NombreIcono } from "@/components/iconos/trazos"
import type { DatosInicio, PersonaInicio } from "@/dal/inicio"
import { inicio as t } from "@/i18n/es/inicio"
import { iniciales } from "@/lib/nombre"
import { LISTAS_ID } from "@/lib/tablero"
import { pegar } from "@/lib/texto"
import { Rayitas } from "./Graficos"

// Piezas del Inicio (D-045).

/** La frase de la banda: lo más urgente de hoy, en una oración. */
export const textoHallazgo = (d: DatosInicio) => pegar(t.hallazgo(d.tablero.abiertas.dudas, d.gastos ? d.gastos.semana : null))

export const totalAbiertas = (d: DatosInicio) => LISTAS_ID.reduce((a, l) => a + d.tablero.abiertas[l], 0)

/** Quién tiene qué: una fila por persona con sus rayitas (Finance Bento · Goals). */
export function ListaPersonas({ personas, maximo = 3 }: { personas: PersonaInicio[]; maximo?: number }) {
  const max = Math.max(1, ...personas.map((p) => p.abiertas))
  return (
    <ul className="in-personas">
      {personas.slice(0, maximo).map((p) => (
        <li key={p.id} className="in-personas__fila">
          <span className="in-personas__cabeza">
            <span className="in-chip in-chip--persona" aria-hidden="true">
              {iniciales(p.nombre)}
            </span>
            <span className="in-personas__nombre">{p.nombre}</span>
            <span className="in-personas__n">{t.tarjetasN(p.abiertas)}</span>
          </span>
          <Rayitas proporcion={p.abiertas / max} n={28} etiqueta={`${p.nombre}: ${p.abiertas} ${t.abiertas(p.abiertas)}`} />
        </li>
      ))}
    </ul>
  )
}

/** Un botón que lleva a otra pantalla (sobre el azul de la banda va el secundario, que es blanco). */
export function BotonIr({ href, icono = "abrir", variante = "secundaria", children }: { href: string; icono?: NombreIcono; variante?: "primaria" | "secundaria"; children: React.ReactNode }) {
  const router = useRouter()
  return (
    <Boton variante={variante} icono={icono} onPress={() => router.push(href)}>
      {children}
    </Boton>
  )
}
