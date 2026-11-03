"use client"
import type { ReactNode } from "react"
import { ProveedorConfirmar } from "./Confirmar"
import { ProveedorResultado } from "./Resultado"

export function Proveedores({ children }: { children: ReactNode }) {
  return (
    <ProveedorResultado>
      <ProveedorConfirmar>{children}</ProveedorConfirmar>
    </ProveedorResultado>
  )
}
