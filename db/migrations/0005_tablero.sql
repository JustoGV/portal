CREATE TABLE "comentarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tarjeta_id" uuid NOT NULL,
	"autor_id" uuid NOT NULL,
	"respuesta_a" uuid,
	"texto" text NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "comentarios_texto_check" CHECK (length("comentarios"."texto") between 1 and 2000 and "comentarios"."texto" = btrim("comentarios"."texto"))
);
--> statement-breakpoint
CREATE TABLE "tarjetas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lista" text NOT NULL,
	"posicion" integer DEFAULT 0 NOT NULL,
	"titulo" text NOT NULL,
	"descripcion" text,
	"proyecto_id" uuid,
	"grupo_id" uuid,
	"responsable_id" uuid,
	"prioridad" boolean DEFAULT false NOT NULL,
	"respuestas" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"resuelta_en" timestamp with time zone,
	"resuelta_por" uuid,
	"creado_por" uuid NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tarjetas_lista_check" CHECK ("tarjetas"."lista" in ('dudas', 'servicios', 'tareas', 'correcciones')),
	CONSTRAINT "tarjetas_posicion_check" CHECK ("tarjetas"."posicion" >= 0),
	CONSTRAINT "tarjetas_titulo_check" CHECK (length("tarjetas"."titulo") between 1 and 120 and "tarjetas"."titulo" = btrim("tarjetas"."titulo")),
	CONSTRAINT "tarjetas_descripcion_check" CHECK ("tarjetas"."descripcion" is null or (length("tarjetas"."descripcion") between 1 and 2000)),
	CONSTRAINT "tarjetas_respuestas_check" CHECK (jsonb_typeof("tarjetas"."respuestas") = 'array' and jsonb_array_length("tarjetas"."respuestas") <= 12),
	CONSTRAINT "tarjetas_resuelta_check" CHECK (("tarjetas"."resuelta_en" is null) = ("tarjetas"."resuelta_por" is null)),
	CONSTRAINT "tarjetas_resuelta_duda_check" CHECK ("tarjetas"."resuelta_en" is null or "tarjetas"."lista" = 'dudas')
);
--> statement-breakpoint
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_tarjeta_id_tarjetas_id_fk" FOREIGN KEY ("tarjeta_id") REFERENCES "public"."tarjetas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_autor_id_usuarios_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "comentarios" ADD CONSTRAINT "comentarios_respuesta_a_comentarios_id_fk" FOREIGN KEY ("respuesta_a") REFERENCES "public"."comentarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarjetas" ADD CONSTRAINT "tarjetas_proyecto_id_proyectos_id_fk" FOREIGN KEY ("proyecto_id") REFERENCES "public"."proyectos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarjetas" ADD CONSTRAINT "tarjetas_grupo_id_grupos_id_fk" FOREIGN KEY ("grupo_id") REFERENCES "public"."grupos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarjetas" ADD CONSTRAINT "tarjetas_responsable_id_usuarios_id_fk" FOREIGN KEY ("responsable_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarjetas" ADD CONSTRAINT "tarjetas_resuelta_por_usuarios_id_fk" FOREIGN KEY ("resuelta_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tarjetas" ADD CONSTRAINT "tarjetas_creado_por_usuarios_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "comentarios_tarjeta_idx" ON "comentarios" USING btree ("tarjeta_id","creado_en","id");--> statement-breakpoint
CREATE INDEX "tarjetas_lista_posicion_idx" ON "tarjetas" USING btree ("lista","posicion","id");