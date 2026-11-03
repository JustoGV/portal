"use client"
import { useRouter } from "next/navigation"
import { createContext, useContext, useTransition, type ReactNode } from "react"

type Nav = { pendiente: boolean; navegar: (href: string) => void }
const Contexto = createContext<Nav>({ pendiente: false, navegar: () => {} })

/**
 * Filtros, búsqueda y paginación cambian la URL dentro de una transición: la vista anterior se queda
 * (atenuada a .8, con aria-busy) hasta que llega la nueva (docs/reglas/07 §4).
 */
export function NavegacionLista({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [pendiente, iniciar] = useTransition()
  const navegar = (href: string) => iniciar(() => router.replace(href, { scroll: false }))
  return <Contexto.Provider value={{ pendiente, navegar }}>{children}</Contexto.Provider>
}

export const useNavegacionLista = () => useContext(Contexto)
