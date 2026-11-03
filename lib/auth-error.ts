export type MotivoAuth =
  | "sin-sesion"
  | "sin-usuario"
  | "inactivo"
  | "primer-ingreso-pendiente"
  | "sin-permiso"
  | "demasiadas-escrituras"

/** 401 = no sabemos quién es; 403 = sabemos y no puede. El motivo es interno: nunca se muestra. */
export class AuthError extends Error {
  readonly status: 401 | 403 | 429
  constructor(readonly motivo: MotivoAuth) {
    super(motivo)
    this.name = "AuthError"
    this.status =
      motivo === "sin-sesion" || motivo === "sin-usuario" || motivo === "inactivo" ? 401 : motivo === "demasiadas-escrituras" ? 429 : 403
  }
}
