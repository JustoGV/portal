-- El responsable de cada cliente (D-032). En la pantalla «Grupos» se llama «Clientes»; la tabla sigue siendo `grupos`.
-- Cuatro datos optativos de una sola persona. Vacío es NULL, nunca un texto vacío. Los topes y el formato los
-- cuida la base; la app solo da los mensajes (docs/reglas/11 §invariantes).
ALTER TABLE "grupos" ADD COLUMN "responsable_nombre" text;
--> statement-breakpoint
ALTER TABLE "grupos" ADD COLUMN "responsable_cargo" text;
--> statement-breakpoint
ALTER TABLE "grupos" ADD COLUMN "responsable_mail" text;
--> statement-breakpoint
ALTER TABLE "grupos" ADD COLUMN "responsable_telefono" text;
--> statement-breakpoint
ALTER TABLE "grupos" ADD CONSTRAINT "grupos_responsable_nombre_check" CHECK ("grupos"."responsable_nombre" is null or (length("grupos"."responsable_nombre") between 1 and 80 and "grupos"."responsable_nombre" = btrim("grupos"."responsable_nombre")));
--> statement-breakpoint
ALTER TABLE "grupos" ADD CONSTRAINT "grupos_responsable_cargo_check" CHECK ("grupos"."responsable_cargo" is null or (length("grupos"."responsable_cargo") between 1 and 60 and "grupos"."responsable_cargo" = btrim("grupos"."responsable_cargo")));
--> statement-breakpoint
ALTER TABLE "grupos" ADD CONSTRAINT "grupos_responsable_mail_check" CHECK ("grupos"."responsable_mail" is null or (length("grupos"."responsable_mail") <= 254 and "grupos"."responsable_mail" = lower("grupos"."responsable_mail") and "grupos"."responsable_mail" ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'));
--> statement-breakpoint
ALTER TABLE "grupos" ADD CONSTRAINT "grupos_responsable_telefono_check" CHECK ("grupos"."responsable_telefono" is null or (length("grupos"."responsable_telefono") between 6 and 30 and "grupos"."responsable_telefono" ~ '^[+(]?[0-9][0-9 ()-]*[0-9]$'));
