import "server-only"
import { eq } from "drizzle-orm"
import { headers } from "next/headers"
import { cache } from "react"
import { db } from "@/db"
import { usuarios } from "@/db/schema"
import { auth } from "@/lib/auth"

/** La sesión, una vez por pedido (docs/reglas/09 §2.1). */
export const sesion = cache(async () => auth.api.getSession({ headers: await headers() }))

/** La fila que manda en los permisos, una vez por pedido. */
export const usuarioPorAuthId = cache(async (authUserId: string) => {
  const [u] = await db.select().from(usuarios).where(eq(usuarios.authUserId, authUserId)).limit(1)
  return u ?? null
})

export type Usuario = typeof usuarios.$inferSelect
