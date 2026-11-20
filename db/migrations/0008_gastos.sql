CREATE TABLE "gastos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"monto" numeric(12, 2) NOT NULL,
	"moneda" text NOT NULL,
	"frecuencia" text NOT NULL,
	"dia_pago" smallint NOT NULL,
	"mes_pago" smallint,
	"medio_pago" text NOT NULL,
	"paga_id" uuid NOT NULL,
	"archivado_en" timestamp with time zone,
	"archivado_por" uuid,
	"creado_por" uuid NOT NULL,
	"creado_en" timestamp with time zone DEFAULT now() NOT NULL,
	"actualizado_en" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gastos_nombre_check" CHECK (length("gastos"."nombre") between 1 and 80 and "gastos"."nombre" = btrim("gastos"."nombre")),
	CONSTRAINT "gastos_descripcion_check" CHECK ("gastos"."descripcion" is null or length("gastos"."descripcion") between 1 and 200),
	CONSTRAINT "gastos_monto_check" CHECK ("gastos"."monto" > 0),
	CONSTRAINT "gastos_moneda_check" CHECK ("gastos"."moneda" in ('ARS', 'USD')),
	CONSTRAINT "gastos_frecuencia_check" CHECK ("gastos"."frecuencia" in ('mensual', 'anual')),
	CONSTRAINT "gastos_dia_check" CHECK ("gastos"."dia_pago" between 1 and 31),
	CONSTRAINT "gastos_mes_check" CHECK (("gastos"."frecuencia" = 'anual') = ("gastos"."mes_pago" is not null) and ("gastos"."mes_pago" is null or "gastos"."mes_pago" between 1 and 12)),
	CONSTRAINT "gastos_medio_check" CHECK (length("gastos"."medio_pago") between 1 and 60 and regexp_replace("gastos"."medio_pago", '[[:space:]-]', '', 'g') !~ '[0-9]{5,}'),
	CONSTRAINT "gastos_archivado_check" CHECK (("gastos"."archivado_en" is null) = ("gastos"."archivado_por" is null))
);
--> statement-breakpoint
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_paga_id_usuarios_id_fk" FOREIGN KEY ("paga_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_archivado_por_usuarios_id_fk" FOREIGN KEY ("archivado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gastos" ADD CONSTRAINT "gastos_creado_por_usuarios_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "gastos_activos_idx" ON "gastos" USING btree ("id") WHERE "gastos"."archivado_en" is null;--> statement-breakpoint
CREATE INDEX "gastos_paga_idx" ON "gastos" USING btree ("paga_id");