CREATE TABLE "auth_account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_rate_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL,
	CONSTRAINT "auth_rate_limit_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "auth_session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "auth_session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "auth_two_factor" (
	"id" text PRIMARY KEY NOT NULL,
	"secret" text NOT NULL,
	"backup_codes" text NOT NULL,
	"user_id" text NOT NULL,
	"verified" boolean DEFAULT true,
	"failed_verification_count" integer DEFAULT 0,
	"locked_until" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "auth_user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"two_factor_enabled" boolean DEFAULT false,
	CONSTRAINT "auth_user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "auth_verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" text NOT NULL,
	"nombre" text NOT NULL,
	"email" text NOT NULL,
	"rol" text DEFAULT 'admin' NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"debe_cambiar_clave" boolean DEFAULT true NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_auth_user_id_unique" UNIQUE("auth_user_id"),
	CONSTRAINT "usuarios_rol_check" CHECK ("usuarios"."rol" in ('admin')),
	CONSTRAINT "usuarios_nombre_check" CHECK (length("usuarios"."nombre") between 1 and 80)
);
--> statement-breakpoint
CREATE TABLE "configuracion" (
	"id" boolean PRIMARY KEY DEFAULT true NOT NULL,
	"inactividad_minutos" integer DEFAULT 480,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_por" uuid,
	CONSTRAINT "configuracion_una_fila" CHECK ("configuracion"."id"),
	CONSTRAINT "configuracion_inactividad_check" CHECK ("configuracion"."inactividad_minutos" is null or "configuracion"."inactividad_minutos" in (30, 60, 120, 240, 480))
);
--> statement-breakpoint
CREATE TABLE "auditoria" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"usuario_id" uuid,
	"accion" text NOT NULL,
	"tabla" text NOT NULL,
	"fila_id" uuid,
	"detalle" jsonb,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intentos_ingreso" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email_clave" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "limites_escritura" (
	"usuario_id" uuid NOT NULL,
	"ventana" timestamp with time zone NOT NULL,
	"cuenta" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "limites_escritura_usuario_id_ventana_pk" PRIMARY KEY("usuario_id","ventana")
);
--> statement-breakpoint
CREATE TABLE "grupos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"nombre_clave" text GENERATED ALWAYS AS (lower(nombre)) STORED,
	"archivado_en" timestamp with time zone,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "grupos_nombre_check" CHECK (length("grupos"."nombre") between 1 and 40 and "grupos"."nombre" = btrim("grupos"."nombre"))
);
--> statement-breakpoint
CREATE TABLE "proyectos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"nombre_clave" text GENERATED ALWAYS AS (lower(nombre)) STORED,
	"url" text NOT NULL,
	"descripcion" text,
	"grupo_id" uuid,
	"archivado_en" timestamp with time zone,
	"archivado_por" uuid,
	"creado_por" uuid NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "proyectos_nombre_check" CHECK (length("proyectos"."nombre") between 1 and 80 and "proyectos"."nombre" = btrim("proyectos"."nombre")),
	CONSTRAINT "proyectos_url_https" CHECK ("proyectos"."url" ~ '^https://[^\s]+$' and length("proyectos"."url") <= 2048),
	CONSTRAINT "proyectos_descripcion_check" CHECK ("proyectos"."descripcion" is null or length("proyectos"."descripcion") between 1 and 200),
	CONSTRAINT "proyectos_archivado_check" CHECK (("proyectos"."archivado_en" is null) = ("proyectos"."archivado_por" is null))
);
--> statement-breakpoint
ALTER TABLE "auth_account" ADD CONSTRAINT "auth_account_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_session" ADD CONSTRAINT "auth_session_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_two_factor" ADD CONSTRAINT "auth_two_factor_user_id_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_auth_user_id_auth_user_id_fk" FOREIGN KEY ("auth_user_id") REFERENCES "public"."auth_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "configuracion" ADD CONSTRAINT "configuracion_actualizado_por_usuarios_id_fk" FOREIGN KEY ("actualizado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "limites_escritura" ADD CONSTRAINT "limites_escritura_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proyectos" ADD CONSTRAINT "proyectos_grupo_id_grupos_id_fk" FOREIGN KEY ("grupo_id") REFERENCES "public"."grupos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proyectos" ADD CONSTRAINT "proyectos_archivado_por_usuarios_id_fk" FOREIGN KEY ("archivado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proyectos" ADD CONSTRAINT "proyectos_creado_por_usuarios_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auth_account_user_id_idx" ON "auth_account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_session_user_id_idx" ON "auth_session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_two_factor_secret_idx" ON "auth_two_factor" USING btree ("secret");--> statement-breakpoint
CREATE INDEX "auth_two_factor_user_id_idx" ON "auth_two_factor" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_verification_identifier_idx" ON "auth_verification" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "auditoria_creado_en_idx" ON "auditoria" USING btree ("creado_en","id");--> statement-breakpoint
CREATE INDEX "intentos_ingreso_email_idx" ON "intentos_ingreso" USING btree ("email_clave","creado_en");--> statement-breakpoint
CREATE UNIQUE INDEX "grupos_nombre_clave_key" ON "grupos" USING btree ("nombre_clave");--> statement-breakpoint
CREATE UNIQUE INDEX "proyectos_nombre_clave_key" ON "proyectos" USING btree ("nombre_clave");--> statement-breakpoint
CREATE UNIQUE INDEX "proyectos_url_key" ON "proyectos" USING btree ("url");--> statement-breakpoint
CREATE INDEX "proyectos_activos_orden_idx" ON "proyectos" USING btree ("nombre_clave","id") WHERE "proyectos"."archivado_en" is null;--> statement-breakpoint
CREATE INDEX "proyectos_archivados_orden_idx" ON "proyectos" USING btree ("nombre_clave","id") WHERE "proyectos"."archivado_en" is not null;--> statement-breakpoint
CREATE INDEX "proyectos_grupo_idx" ON "proyectos" USING btree ("grupo_id");--> statement-breakpoint
CREATE INDEX "proyectos_nombre_trgm" ON "proyectos" USING gin ("nombre" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "proyectos_descripcion_trgm" ON "proyectos" USING gin ("descripcion" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "proyectos_url_trgm" ON "proyectos" USING gin ("url" gin_trgm_ops);