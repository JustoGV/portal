# BRIEF — portal-cess-gvg

## 1. El problema

Los dos socios tienen varios proyectos, cada uno con su dirección web, y no hay un solo lugar donde estén todas. Hoy cada link vive donde quedó: favoritos, chats, notas. Cuesta encontrarlo cuando hace falta.

## 2. El objetivo

Un portal interno con **la lista de los proyectos**: cada uno con su nombre y su link. Se entra, se encuentra el proyecto y un click lo abre.

**Sale bien si:**
- los dos socios usan el portal como el único lugar donde buscan el link de un proyecto;
- encontrar un proyecto y abrirlo lleva un par de segundos (buscar por nombre o con `Ctrl+K`, Enter);
- ningún link se pierde: lo que ya no se usa se archiva, no se borra.

## 3. Los usuarios

| Quién | Cuántos | Qué hace |
|---|---|---|
| Los dos socios (Mateo y su socio) | 2 | Ven la misma lista. Los dos pueden agregar, editar, archivar y restaurar proyectos, y administrar las cuentas |

Es **solo interno**: no hay registro abierto ni usuarios de afuera. Un solo rol (`admin`) para empezar (`D-002`).

## 4. Alcance

**Entra:**
- Ingreso con email y contraseña, sin segundo factor (D-013).
- La lista de proyectos: nombre, link, descripción corta opcional, grupo opcional. Búsqueda, filtro por grupo, activos o archivados, paginación en el servidor.
- Alta y edición en una tarjeta centrada. Aviso en vivo si el nombre o el link ya existen.
- Archivar y restaurar (nunca borrar).
- Abrir un proyecto: el click abre su link **en una pestaña nueva** (`D-004`).
- Búsqueda rápida `Ctrl+K`: escribir parte del nombre, Enter y se abre.
- Grupos: crearlos desde el formulario del proyecto y renombrarlos o archivarlos desde su pantalla.
- Cuentas: alta de una cuenta con contraseña inicial, desactivarla, darle una contraseña inicial nueva, y el tiempo de cierre por inactividad.

**Queda afuera (por ahora):**
- Dirección corta del portal que redirige (`/ir/<proyecto>`). Se descartó en la entrevista (respuesta 3: opción a). Se puede sumar después como unidad propia.
- Varios links por proyecto (producción, prueba, repo), íconos o colores por proyecto, notas largas.
- Roles de solo lectura o más usuarios.
- Recuperación de contraseña por mail (no hay servicio de mail: la resuelve el otro socio con una contraseña inicial nueva).
- Revisar si un link está caído.

## 5. Lo que falta y quién lo pasa

| Falta | Quién | Dónde espera |
|---|---|---|
| Confirmar segundo factor obligatorio y cierre por inactividad de 8 h | Socio | `OQ-001` |
| Dueño de las cuentas de GitHub, Vercel y Neon (y Sentry) | Socio | `OQ-002` |
| Dominio, o seguir con `.vercel.app` | Socio | `OQ-003` |
| Marca: colores, logo, tipografía | Socio | `OQ-004`, `{{CONFIRMAR}}` en `docs/DISENO.md` |
| Prioridad y fecha | Socio | `OQ-005` |
| El nombre que se muestra en la pantalla y qué significan "CESS" y "GVG" | Socio | Nombre: Portal Consultora (`D-016`). CESS y GVG: sin decir |
| Dónde y cómo se mira el portal (escritorio, teléfono, luz) | Socio | `OQ-007`, párrafo de `docs/DISENO.md` |
