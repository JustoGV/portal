# Mapa de verificación del portal

Fuente mantenida para probar lo que ve y hace un usuario del portal. Leer este índice antes de manejar y usar el archivo de la pantalla como receta.

## Estado de partida

- Base local `portal-cess-pg-55442` arriba, `pnpm dev` en `http://localhost:3000`, cookie de `prueba@example.com` hecha con `scripts/sembrar-prueba.ts` (SKILL.md «Launch»).
- `doctor.mjs` da todo `ok`.
- Nunca se maneja producción (`portal-nine-olive.vercel.app`).

## Cómo manejar

- Selectores estables: `aria-label`, roles y las clases de bloque de cada pantalla (`in-`, `pr-`, `tb-`, `ga-`), nunca posiciones.
- Si un flujo escribe en la base, al final se borra lo creado (solo local). La evidencia no se borra.
- Una pantalla se da por buena a los cinco anchos con saltos 0, desborde 0 y consola limpia.

## Qué cuenta como prueba

- La captura de la acción y del estado que queda; con escritura, una lectura de la fila en la base local.
- Si una precondición falta en la muestra (por ejemplo, no hay ninguna urgencia), la receta falla y la razón va en «Gotchas» de esa pantalla. No se afloja la receta para que pase.
- Un camino que no se pudo recorrer se informa como no probado, no como probado por otro.

## Pantallas

- [Inicio](./inicio.md): `/`, la banda con Urgente (pila que se abre) y los cuadros con gráficos.
- [Servicios](./servicios.md): `/servicios`, tabla con filtros en la URL, búsqueda, orden, páginas y ficha.
- [Tablero](./tablero.md): `/tablero`, cuatro listas, ficha de la tarjeta con su conversación y alta por pasos.
- [Gastos](./gastos.md): `/gastos`, tabla de gastos recurrentes con su ficha.
