-- El DNI del responsable y el teléfono en un solo formato (D-033). Sigue siendo la tabla `grupos` («Clientes»).
-- El DNI se guarda solo con números (7 u 8 cifras); en la pantalla se muestra con puntos.
ALTER TABLE "grupos" ADD COLUMN "responsable_dni" text;
--> statement-breakpoint
ALTER TABLE "grupos" ADD CONSTRAINT "grupos_responsable_dni_check" CHECK ("grupos"."responsable_dni" is null or "grupos"."responsable_dni" ~ '^[0-9]{7,8}$');
--> statement-breakpoint
-- El teléfono pasa al formato internacional (E.164: «+5493424551234»), que arma la app con libphonenumber-js.
-- Lo cargado antes en otro formato no se puede convertir sin adivinar la característica: queda vacío.
-- (La 0003 todavía no corrió en producción; esto solo toca datos de prueba locales.)
ALTER TABLE "grupos" DROP CONSTRAINT "grupos_responsable_telefono_check";
--> statement-breakpoint
UPDATE "grupos" SET "responsable_telefono" = NULL WHERE "responsable_telefono" IS NOT NULL AND "responsable_telefono" !~ '^\+[1-9][0-9]{7,14}$';
--> statement-breakpoint
ALTER TABLE "grupos" ADD CONSTRAINT "grupos_responsable_telefono_check" CHECK ("grupos"."responsable_telefono" is null or "grupos"."responsable_telefono" ~ '^\+[1-9][0-9]{7,14}$');
