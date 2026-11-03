// La matriz rol × acción (docs/ARQUITECTURA.md §4). Pura: sin base ni Next, para testearla sola.
export const ROLES = ["admin"] as const
export type Rol = (typeof ROLES)[number]

export const PERMISOS = [
  "proyectos.ver",
  "proyectos.editar",
  "proyectos.archivar",
  "grupos.gestionar",
  "usuarios.gestionar",
  "configuracion.editar",
] as const
export type Permiso = (typeof PERMISOS)[number]

export const MATRIZ: Record<Rol, readonly Permiso[]> = {
  admin: PERMISOS,
}

export const esRol = (valor: string): valor is Rol => (ROLES as readonly string[]).includes(valor)

export const tienePermiso = (u: { rol: string; activo: boolean }, permiso: Permiso) =>
  u.activo && esRol(u.rol) && MATRIZ[u.rol].includes(permiso)
