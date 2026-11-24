# Inicio

La primera pantalla después de entrar: una banda con el título, la pila **Urgente** (lo que vence o está quieto) y el botón al tablero; abajo, cuadros con gráficos de servicios, tablero y gastos, cada uno con su pregunta y su conclusión.

## Sub-features

- `inicio-carga` la pantalla abre con sesión y sin errores.
- `urgente-pila` cerrada muestra la urgencia más grave, el dato («10 días quieta») y «Ver las N».
- `urgente-abre` un toque abre la bandeja agrupada Urgente / Para mirar; cada fila es un link.
- `urgente-cierra` cierra con Esc, con la cruz o tocando afuera; el foco vuelve a la pila.
- `urgente-vacia` sin urgencias, muestra el tilde y «Nada urgente».
- `cuadros` gráficos con datos; cada link lleva a su pantalla.

## How to get to it (user POV)

- Entrar al portal: después de ingresar se cae en `/`.
- Barra lateral → Portal → Inicio.
- `Ctrl+K` → «Inicio».

## Driving it with recorrer.mjs

Preconditions:

- Estado de partida del índice. Para ver la pila llena hace falta al menos una urgencia: una tarjeta en Dudas sin movimiento hace 3 días o más, una de prioridad alta, una sin responsable o un gasto que vence en 7 días.

- **Carga y pila.** `recorrer.mjs --rutas / --abrir ".in-pila__mazo" --abierto ".in-pila__panel" --cerrar-esc`. Por ancho: `ok`, abre `true`, Esc `true`, saltos 0, desborde 0, consola 0.
- **Fila como link.** Con la bandeja abierta, click en el primer `.in-pila__fila`: la URL pasa a `/tablero` o `/gastos?ver=semana` según el tipo.
- **Cerrar tocando afuera.** Abrir y hacer click en el `h1` de la banda: `.in-pila__panel` desaparece.
- **Proof.** `$EV/raiz-<ancho>.png` y `$EV/raiz-<ancho>-abierta.png`, más `informe.json`.

## Gotchas

- La bandeja abierta se monta en `document.body` (portal de React), no adentro de la banda: buscarla con `.in-pila__panel` en toda la página.
- Los números de cada fila cuentan desde 0 al abrir (0,6 s): esperar unos 900 ms antes de leerlos o capturar.
- Con «reducir movimiento» no hay animación; abre y cierra al instante.
- Si la muestra no tiene urgencias, se ve el estado vacío y `--abrir` falla: es falta de precondición, no un error de la pantalla.
