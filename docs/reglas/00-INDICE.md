# 00 — Índice de reglas

Estas reglas salieron de construir un sistema interno real (agenda, caja, fichas, panel, login con segundo factor) para un cliente que lo usa todos los días. Cada regla está porque algo se rompió una vez o porque el dueño del proyecto la pidió con sus palabras. No describen ese proyecto: describen cómo se construye bien cualquier sistema de este tipo.

**Antes de una tarea, leé las filas que la tocan.** Si una regla choca con lo que el proyecto necesita de verdad, gana el problema real, pero se dice en voz alta y queda como `D-` en `docs/MEMORY.md`. Nunca se resuelve en silencio.

| Si vas a… | Leé |
|---|---|
| Empezar cualquier tarea, registrar algo, dudar de un dato | `01-FORMA-DE-TRABAJO.md` |
| Diseñar o cambiar cualquier pantalla del sistema | `02-CRITERIO-DASHBOARD.md` (primero) y `03-DISENO-VISUAL.md` |
| Tocar colores, tipografía, espacios, contraste, estados vacíos o de error, textos | `03-DISENO-VISUAL.md` |
| Elegir o poner un ícono | `04-ICONOS.md` |
| Crear o cambiar un botón, un campo, un diálogo, un tooltip, una tarjeta, la barra lateral | `05-COMPONENTES.md` |
| Armar un formulario o una regla de un campo (DNI, teléfono, email, fecha, plata, duplicados) | `06-FORMULARIOS.md` |
| Mostrar una lista o tabla, paginar, filtrar, buscar, exportar | `07-TABLAS-PAGINACION-FILTROS.md` |
| Animar algo | `08-MOVIMIENTO-GSAP.md` y la skill `motion-web-senior` |
| Leer datos para una pantalla, cargar una librería, medir velocidad | `09-RENDIMIENTO.md` |
| Login, sesión, permisos, entrada de datos, archivos, secretos, datos personales, instalar un paquete | `10-SEGURIDAD.md` |
| Tocar el esquema, una migración, una consulta, plata, fechas, datos de muestra | `11-DATOS.md` |
| Decir que algo está terminado | `12-VERIFICACION.md` |

## Las cinco que más se olvidan

1. **El párrafo de quién mira la pantalla** se escribe antes de cualquier regla visual (`02` §1).
2. **Lo que se refresca solo no se vuelve a animar** (`02` §6.1, `08` §2).
3. **La identidad no es el estado**: el color de la marca nunca reemplaza al verde de "listo" ni al rojo de "error" (`02` §3.2).
4. **La autorización está en el servidor**, en cada acción y en cada página (`10` §3).
5. **Nada se estima: se mide.** El contraste, la fluidez y la velocidad tienen números (`03` §3, `08` §5, `09` §1).
