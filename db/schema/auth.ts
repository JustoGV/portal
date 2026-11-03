// Tablas de better-auth. Salen de getSchema() de better-auth 1.7 con el plugin de segundo factor y el
// límite de intentos en la base; los nombres de las columnas van en snake_case y el adaptador usa los
// nombres de las propiedades. Si se actualiza better-auth, tests/auth-esquema.test.ts avisa si cambió.
import { bigint, boolean, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core"

const momento = (nombre: string) => timestamp(nombre, { withTimezone: true })

export const authUser = pgTable("auth_user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: momento("created_at").notNull().defaultNow(),
  updatedAt: momento("updated_at").notNull().defaultNow(),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
})

export const authSession = pgTable(
  "auth_session",
  {
    id: text("id").primaryKey(),
    expiresAt: momento("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: momento("created_at").notNull().defaultNow(),
    updatedAt: momento("updated_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id").notNull().references(() => authUser.id, { onDelete: "cascade" }),
  },
  (t) => [index("auth_session_user_id_idx").on(t.userId)],
)

export const authAccount = pgTable(
  "auth_account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id").notNull().references(() => authUser.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: momento("access_token_expires_at"),
    refreshTokenExpiresAt: momento("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: momento("created_at").notNull().defaultNow(),
    updatedAt: momento("updated_at").notNull(),
  },
  (t) => [index("auth_account_user_id_idx").on(t.userId)],
)

export const authVerification = pgTable(
  "auth_verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: momento("expires_at").notNull(),
    createdAt: momento("created_at").notNull().defaultNow(),
    updatedAt: momento("updated_at").notNull().defaultNow(),
  },
  (t) => [index("auth_verification_identifier_idx").on(t.identifier)],
)

export const authTwoFactor = pgTable(
  "auth_two_factor",
  {
    id: text("id").primaryKey(),
    secret: text("secret").notNull(),
    backupCodes: text("backup_codes").notNull(),
    userId: text("user_id").notNull().references(() => authUser.id, { onDelete: "cascade" }),
    verified: boolean("verified").default(true),
    failedVerificationCount: integer("failed_verification_count").default(0),
    lockedUntil: momento("locked_until"),
  },
  (t) => [index("auth_two_factor_secret_idx").on(t.secret), index("auth_two_factor_user_id_idx").on(t.userId)],
)

export const authRateLimit = pgTable("auth_rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: bigint("last_request", { mode: "number" }).notNull(),
})
