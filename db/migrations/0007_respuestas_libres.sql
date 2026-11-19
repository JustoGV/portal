-- La conversación del tablero pasa a mensajes tipo chat (D-041): se puede responder a cualquier mensaje, también
-- a una respuesta, como en WhatsApp. Sigue la regla de que la respuesta sea de la misma tarjeta.
CREATE OR REPLACE FUNCTION exigir_respuesta_valida() RETURNS trigger LANGUAGE plpgsql AS $$
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
  RETURN NEW;
END
$$;
