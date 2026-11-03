-- Permisos mínimos del rol de la app y las invariantes que no dependen de la app (docs/DATOS.md).

-- 1. Tablas de better-auth: las maneja la librería entera.
GRANT SELECT, INSERT, UPDATE, DELETE ON auth_user, auth_session, auth_account, auth_verification, auth_two_factor, auth_rate_limit TO portal_app;
--> statement-breakpoint
-- 2. Tablas que no se borran: sin DELETE.
GRANT SELECT, INSERT, UPDATE ON usuarios, configuracion, grupos, proyectos TO portal_app;
--> statement-breakpoint
-- 3. Auditoría: solo inserciones (y lectura).
GRANT SELECT, INSERT ON auditoria TO portal_app;
--> statement-breakpoint
-- 4. Límites: se limpian.
GRANT SELECT, INSERT, UPDATE, DELETE ON limites_escritura, intentos_ingreso TO portal_app;
--> statement-breakpoint

-- actualizado_en se mantiene solo.
CREATE FUNCTION tocar_actualizado_en() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.actualizado_en := now();
  RETURN NEW;
END
$$;
--> statement-breakpoint
CREATE TRIGGER usuarios_actualizado_en BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION tocar_actualizado_en();
--> statement-breakpoint
CREATE TRIGGER grupos_actualizado_en BEFORE UPDATE ON grupos FOR EACH ROW EXECUTE FUNCTION tocar_actualizado_en();
--> statement-breakpoint
CREATE TRIGGER proyectos_actualizado_en BEFORE UPDATE ON proyectos FOR EACH ROW EXECUTE FUNCTION tocar_actualizado_en();
--> statement-breakpoint
CREATE TRIGGER configuracion_actualizado_en BEFORE UPDATE ON configuracion FOR EACH ROW EXECUTE FUNCTION tocar_actualizado_en();
--> statement-breakpoint

-- Nunca quedan cero cuentas activas. Bloquea las filas activas para que dos desactivaciones
-- simultáneas no pasen las dos.
CREATE FUNCTION exigir_una_cuenta_activa() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.activo AND NOT NEW.activo THEN
    PERFORM 1 FROM usuarios WHERE activo FOR UPDATE;
    IF NOT EXISTS (SELECT 1 FROM usuarios WHERE activo AND id <> OLD.id) THEN
      RAISE EXCEPTION 'tiene que quedar al menos una cuenta activa' USING ERRCODE = 'P0001', HINT = 'ultima-cuenta-activa';
    END IF;
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint
CREATE TRIGGER usuarios_una_activa BEFORE UPDATE OF activo ON usuarios FOR EACH ROW EXECUTE FUNCTION exigir_una_cuenta_activa();
--> statement-breakpoint

-- La fila única de configuración.
INSERT INTO configuracion (id) VALUES (true) ON CONFLICT DO NOTHING;
