-- Extensiones y el rol de la app (docs/reglas/10 §7, docs/DATOS.md §1).
-- El rol se crea SIN login y sin contraseña: la contraseña la pone el dueño una vez con
-- `pnpm clave-rol-app`, que nunca la escribe en el repo.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'portal_app') THEN
    CREATE ROLE portal_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT;
  END IF;
END
$$;
--> statement-breakpoint
-- El dueño puede actuar como la app (los tests lo usan con SET ROLE para probar los permisos reales).
GRANT portal_app TO CURRENT_USER;
--> statement-breakpoint
REVOKE ALL ON SCHEMA public FROM PUBLIC;
--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO portal_app;
