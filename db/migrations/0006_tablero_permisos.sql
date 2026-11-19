-- El tablero de trabajo (D-040): permisos del rol de la app y las reglas que no dependen de la app (docs/DATOS.md).

-- 1. Las tarjetas no se borran: sin DELETE.
GRANT SELECT, INSERT, UPDATE ON tarjetas TO portal_app;
--> statement-breakpoint
-- 2. Los comentarios solo se agregan: sin UPDATE ni DELETE.
GRANT SELECT, INSERT ON comentarios TO portal_app;
--> statement-breakpoint
CREATE TRIGGER tarjetas_actualizado_en BEFORE UPDATE ON tarjetas FOR EACH ROW EXECUTE FUNCTION tocar_actualizado_en();
--> statement-breakpoint

-- 3. Una respuesta cuelga de un comentario de la misma tarjeta, y nunca de otra respuesta.
CREATE FUNCTION exigir_respuesta_valida() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  padre comentarios%ROWTYPE;
BEGIN
  IF NEW.respuesta_a IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT * INTO padre FROM comentarios WHERE id = NEW.respuesta_a;
  IF padre.tarjeta_id IS DISTINCT FROM NEW.tarjeta_id THEN
    RAISE EXCEPTION 'la respuesta tiene que ser de la misma tarjeta' USING ERRCODE = '23514', HINT = 'respuesta-otra-tarjeta';
  END IF;
  IF padre.respuesta_a IS NOT NULL THEN
    RAISE EXCEPTION 'no se responde a una respuesta' USING ERRCODE = '23514', HINT = 'respuesta-de-respuesta';
  END IF;
  RETURN NEW;
END
$$;
--> statement-breakpoint
CREATE TRIGGER comentarios_respuesta_valida BEFORE INSERT ON comentarios FOR EACH ROW EXECUTE FUNCTION exigir_respuesta_valida();
