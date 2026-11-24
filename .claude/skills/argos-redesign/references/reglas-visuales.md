# Reglas visuales de ARGOS: lo aprobado y lo rechazado

Lo que Persona A (quien lleva WEB) ya decidió en tres rondas de revisión. Son decisiones
tomadas: no se vuelven a proponer alternativas salvo que lo pida.

## Historial

| Ronda | Rechazado | Aprobado / hecho |
| --- | --- | --- |
| 1 (20-11-2026) | Degradados oscuros con brillo, decoración SVG abstracta, el motivo de "los 100 ojos" de Argos Panoptes ("turbio"), botones en píldora. Preguntó si de verdad se habían estudiado referencias. | Investigación real de sitios; logo de la casa con greca; botones de 8 px; fotos reales. |
| 2 (21-11-2026) | EB Garamond + Verdana, fondos blancos planos ("demasiado blanco"), íconos de línea genéricos ("demasiado AI"), avatares con iniciales. | **Login aprobado por completo** (formulario a la izquierda, fotos reales que rotan a la derecha). Landing con Plus Jakarta, fondos crema/blanco/teal con curvas de nivel, foto en arco, ilustraciones propias. |
| 3 (21-11-2026) | Íconos de stock dentro de tarjetas, letras (G/C/L) como marca de empresa, cabecera crema sobre crema "que casi no se mira". | Plus Jakarta en toda la web; DiceBear Notionists para personas; logos de empresa (`app-tenant-mark`); ilustraciones también en tarjetas; cabecera blanca con filete. "Ahora sí me gusta." |
| 4 (22-11-2026) | Sidebar fijo que se come ancho de pantalla. | Navegación como panel flotante que sale del botón de menú de la topbar; el contenido usa siempre el 100 % del ancho. |

## Reglas que salen de ahí

1. **Nada de ojos** en ARGOS, en ninguna forma (logo, ilustraciones, fondos, avatares de "anillo").
2. **Nunca iniciales** para personas ni empresas. Personas → `app-avatar` (foto o Notionists).
   Empresas → `app-tenant-mark` (logo o marca generada).
3. **Íconos de línea solo en controles y navegación** (botones, menú, campos, metadatos
   pequeños como reloj o ubicación). Donde un ícono "representa" algo en una tarjeta destacada
   (tipo de tarea, concepto, estado grande) va una ilustración propia (`app-spot-icon`) o una
   foto. Si falta la ilustración, se dibuja una nueva en el mismo estilo.
4. **Contraste suficiente en la estructura**: barras, cabeceras y bordes deben separarse del
   fondo. Crema sobre crema o gris claro sobre blanco "no se mira". Cabeceras blancas con filete
   `0 1px 0 rgba(0,56,65,.1)`; enlaces de navegación en teal oscuro a 14 px.
5. **El fondo nunca es blanco plano en páginas grandes**: crema `#f6f2ea` / blanco / bloque teal,
   y textura sutil (curvas de nivel al 7–11 %) donde haya espacio. En el panel el fondo es
   `--color-background` y las tarjetas blancas.
6. **Botones casi rectos**: 8 px (`--radius-field`); tarjetas 12 px; fotos 14 px. Nada de píldoras
   salvo chips/filtros pequeños y avatares.
7. **Una sola sans** (Plus Jakarta Sans) para títulos y texto. EB Garamond solo en el wordmark.
8. **Fotos reales** de propiedades, Antigua y Atitlán, y personas trabajando; nunca ilustraciones
   genéricas de "personas felices".
9. **El producto real a la vista**: en marketing se muestran piezas reales de la interfaz, no
   maquetas inventadas.
10. **Animación con propósito**: cada animación cuenta algo del producto (checklist que se
    completa, cambio de empresa, barrido de alertas). Siempre con alternativa para "reducir
    movimiento".
11. **La navegación flota**: el menú sale de la topbar y no ocupa columna; nada fijo a los lados
    del contenido.

## Lo que se lee "hecho con IA" (evitar)

* Degradados oscuros con brillo, glassmorphism sobre fondos oscuros, blobs de color.
* Grillas tipo bento, estadísticas inventadas ("+300 % de eficiencia"), etiquetas en píldora sobre
  cada título.
* Íconos de línea de librería dentro de cuadritos de color pastel como único elemento visual.
* Iniciales en círculos de color.
* Fondos de figuras abstractas sin significado.
* Todo con el mismo peso visual; sin jerarquía; demasiado blanco.

## Referencias medidas (estilo computado, 2026-11)

| Sitio | Tipografía | Botones | Fondo |
| --- | --- | --- | --- |
| Apple | SF Pro | píldora (marca propia) | bloques gris claro y negro |
| Airbnb | Airbnb Cereal | 8 px | blanco, fotos protagonistas, cabecera blanca con filete |
| Samsung | SamsungOne | píldora | blanco y negro |
| Guesty | Figtree | — | crema y bandas de color |
| Breezeway | Lexend Deca | 12 px | gris lavanda con curvas |
| Hostaway | Montserrat | 5 px | blanco |
| Linear | Inter | 6–8 px | oscuro (producto) |

Para el **panel** conviene mirar productos de operación con interfaz densa y clara: Airbnb (hoy,
calendario y mensajes del anfitrión), Guesty, Breezeway y Hostaway (tareas y propiedades),
Linear (listas, tablas, atajos), Notion (avatares, vacíos), Stripe (tablas y métricas), Slack
(selector de espacio de trabajo). Sus apps requieren cuenta: se estudian por sus páginas de
producto, centros de ayuda y capturas públicas. No se descargan ni se copian.
