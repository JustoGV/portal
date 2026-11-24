# Gastos

Gastos recurrentes de la consultora (Administración): tabla con monto, moneda, frecuencia, próximo pago, medio de pago y quién paga, y una ficha por gasto.

## Sub-features

- `gastos-carga` abre con la tabla o con su estado vacío.
- `gastos-semana` `?ver=semana` muestra lo que vence en los próximos días.
- `gastos-ficha` click en el nombre abre la ficha.
- `gastos-alta` alta de un gasto nuevo.

## How to get to it (user POV)

- Barra lateral → Administración → Gastos.
- Inicio → una fila de pago en Urgente.

## Driving it with recorrer.mjs

Preconditions:

- Estado de partida del índice. La semilla **no** carga gastos: para probar la ficha hay que dar de alta uno desde la pantalla y borrarlo al final.

- **Carga.** `recorrer.mjs --rutas "/gastos,/gastos?ver=semana"`. `ok` a los cinco anchos.
- **Ficha.** Con un gasto cargado: `recorrer.mjs --rutas /gastos --anchos 1440 --abrir "button.pr-nombre"`.
- **Proof.** Capturas e `informe.json`.

## Gotchas

- Los montos son texto decimal (`numeric(12,2)`), nunca números de JS: comparar como texto.
- Sin gastos se ve el estado vacío; la ficha no se puede probar sin dar uno de alta.
