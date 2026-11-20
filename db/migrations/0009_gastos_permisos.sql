-- Los gastos (D-043): permisos del rol de la app y el cálculo del próximo pago, en un solo lugar.

-- 1. Los gastos no se borran: se archivan. Sin DELETE.
GRANT SELECT, INSERT, UPDATE ON gastos TO portal_app;
--> statement-breakpoint
CREATE TRIGGER gastos_actualizado_en BEFORE UPDATE ON gastos FOR EACH ROW EXECUTE FUNCTION tocar_actualizado_en();
--> statement-breakpoint

-- 2. El día de pago en un mes dado: si el mes es más corto (un 31 en febrero), el último día del mes.
CREATE FUNCTION dia_de_pago(anio int, mes int, dia int) RETURNS date LANGUAGE sql IMMUTABLE AS $$
  SELECT make_date(anio, mes, least(dia, extract(day FROM (make_date(anio, mes, 1) + interval '1 month - 1 day'))::int))
$$;
--> statement-breakpoint

-- 3. El próximo pago desde `hoy` (incluido): mensual, este mes o el que viene; anual, este año o el que viene.
CREATE FUNCTION proximo_pago(dia int, mes int, hoy date) RETURNS date LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN mes IS NULL THEN
      CASE WHEN dia_de_pago(extract(year FROM hoy)::int, extract(month FROM hoy)::int, dia) >= hoy
        THEN dia_de_pago(extract(year FROM hoy)::int, extract(month FROM hoy)::int, dia)
        ELSE dia_de_pago(extract(year FROM (hoy + interval '1 month'))::int, extract(month FROM (hoy + interval '1 month'))::int, dia)
      END
    ELSE
      CASE WHEN dia_de_pago(extract(year FROM hoy)::int, mes, dia) >= hoy
        THEN dia_de_pago(extract(year FROM hoy)::int, mes, dia)
        ELSE dia_de_pago(extract(year FROM hoy)::int + 1, mes, dia)
      END
  END
$$;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION dia_de_pago(int, int, int), proximo_pago(int, int, date) TO portal_app;
