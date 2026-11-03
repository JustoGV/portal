import { TRAZOS, type NombreIcono } from "./trazos"

type Props = { nombre: NombreIcono; tamano?: 16 | 20 | 24 | 28 | 32 | 48; className?: string }

/**
 * Ícono de trazo propio. No se anima solo: lo escribe el que lo contiene (botón, fila, campo) con
 * escribirIconos() al pasar el mouse o al cambiar de estado. Siempre decorativo: el nombre lo lleva el botón.
 */
export function Icono({ nombre, tamano = 20, className }: Props) {
  return (
    <svg
      data-icono={nombre}
      className={className ? `ui-icono ${className}` : "ui-icono"}
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {TRAZOS[nombre].map((d) => (
        <path key={d} d={d} data-trazo="" />
      ))}
    </svg>
  )
}
