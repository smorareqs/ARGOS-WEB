# ARGOS web · Notas de diseño

Antes de diseñar se revisaron sitios reales, de dos grupos: marcas de referencia (Apple,
Airbnb, Samsung) y plataformas del mismo rubro (Breezeway, Hostaway, Guesty). Se capturaron
sus páginas completas y se anotó qué tienen en común. La identidad de ARGOS (teal y dorado,
neutros arena y el logotipo) no cambia; lo que se adoptó son sus reglas, entre ellas una sola
sans para toda la web.

## Qué tienen en común las referencias

| Regla | Dónde se ve en ellas | Cómo se aplica en ARGOS |
| --- | --- | --- |
| Fotografía real, no ilustraciones | Airbnb (anfitriones en su casa), Guesty (interiores, personas con el teléfono), Breezeway (personal de limpieza) | Propiedades reales, Antigua y Atitlán, y personas limpiando, reparando y recibiendo huéspedes |
| El producto real, a la vista | Breezeway y Guesty ponen tarjetas reales de su interfaz sobre las fotos; Apple muestra el producto grande y centrado | Tarjetas reales de ARGOS (tarea validada, checklist, selector de empresas) sobre fotos y una captura real del panel |
| Fondos claros y casi sin decoración | Las seis: blanco o arena, sin degradados con brillo | Blanco y arena alternados; el único fondo oscuro es una foto |
| Botones casi rectos | Hostaway (5 px), Breezeway (12 px) | Botones de 8 px, tarjetas de 12 px y fotos de 14 px |
| Titulares grandes, texto breve, una idea por sección | Apple, Airbnb | Un titular, un párrafo y la prueba visual en cada sección |
| Una sola sans para todo | Apple (SF Pro), Airbnb (Cereal), Samsung (SamsungOne), Guesty (Figtree), Breezeway (Lexend Deca), Hostaway (Montserrat), Linear (Inter); medidas leyendo el estilo computado de cada página | Toda la web usa Plus Jakarta Sans en títulos y texto |
| El fondo nunca es blanco plano | Guesty (crema y bandas de color), Breezeway (gris lavanda y curvas), Apple (bloques gris claro y negro) | Secciones crema, blancas y un bloque teal, con curvas de nivel como textura |

Lo que se evitó por leerse "hecho con IA": degradados oscuros con brillo, vidrio sobre fondos
oscuros, grillas tipo bento, estadísticas inventadas, etiquetas en píldora sobre cada título y
fondos de figuras abstractas.

Primera ronda (HIG de Apple, CSS de Airbnb, One UI de Samsung) y lo que sigue vigente: material
translúcido solo en la capa funcional (cabeceras), resortes como easing `linear()`, elevación
en capas de sombras pequeñas y cabeceras que se condensan al hacer scroll.

## Tipografía

Comparadas con el texto real del hero (`docs/marca/tipografia-propuestas.png`): Plus Jakarta
Sans, Figtree, Manrope e Instrument Sans. Se eligió **Plus Jakarta Sans** (600 en títulos, 400
en texto): geométrica y cálida como Airbnb Cereal y con buenos acentos. Desde el 21-11-2026 es
la tipografía de toda la web (landing, acceso y panel) a través de `--font-display` y
`--font-sans` en `argos-tokens.css`. El tracking de titulares es -0.024 em
(`--display-tracking`) y la landing lo cierra a -0.034 em porque sus titulares son más grandes.
EB Garamond queda solo en el wordmark del logo. La app (Flutter) sigue con EB Garamond +
Verdana hasta que Persona B decida alinearla.

## Fondos y formas

* **Color por sección:** crema `#f6f2ea` (hero, multiempresa, "Por qué ARGOS", pie), blanco
  (operación, seguridad, cierre) y un bloque teal profundo para el panel.
* **Curvas de nivel** (`landing/components/topo-lines`): el relieve de un volcán, generado
  por código y determinista, con trazo de 1 px al 7–11 %. Es textura, no decoración: recuerda
  el paisaje de Antigua y Atitlán.
* **El arco:** la foto del hero tiene forma de arco de medio punto, como los de Antigua.
* **Cabecera:** barra blanca con filete inferior que se separa del crema (como Airbnb y
  Guesty), enlaces en teal oscuro a 14 px; al bajar se vuelve translúcida y gana sombra.

## Ilustraciones propias

`shared/atoms/spot-icon`: 17 ilustraciones dibujadas para ARGOS. En la landing: sin señal,
evidencia, multiempresa, alertas, cumplimiento, mapa, datos aislados, roles, cambio de
empresa, funciones, dos pasos, retención, bitácora y sesiones. En las tarjetas de tarea y en
el panel del acceso: limpieza (atomizador), mantenimiento (caja y llave) y llegadas (maleta y
llave). Placa arena o menta, trazo teal de 2 px, rellenos de la paleta, sombra desplazada que
les da volumen y un detalle de acento en dorado que se mueve al pasar el cursor. Los íconos de
línea (`app-icon`) quedan para controles y navegación.

## Avatares de personas

Sin foto, `app-avatar` muestra un retrato de **DiceBear** (`@dicebear/core`, MIT) en el estilo
**Notionists** (Zoish, CC0, sin atribución obligatoria), el estilo de ilustración de Notion.
Se compararon 12 estilos con los nombres del demo y fue el más sobrio. Ajustes (en
`shared/media/generated-art.ts`):

* Tinta teal de la marca (`#0b3a42`) y fondos menta, arena, gris azulado y crema.
* Cara encuadrada (escala 1.4) para que se lea desde 24 px.
* Sin barba ni gestos: el estilo no sabe nada de la persona y el retrato no intenta adivinarlo
  por el nombre.
* El estilo (~110 kB comprimido) se sirve como JSON estático en `/vendor/dicebear` (angular.json)
  y el motor (~26 kB) es un chunk aparte: no pesa en la carga inicial y se pide una sola vez.
  Mientras carga se ve el color de fondo; si falla, las iniciales.
* Si la persona tiene foto (`photo`), se muestra la foto.

## Logos de empresas

`app-tenant-mark` muestra el logo de la empresa (`logo_url` de la API), como los selectores de
espacio de trabajo de Slack o Linear. Se usa en "Elige una empresa", en el selector de la
barra superior y en la landing.

* **Empresas de demostración:** Garrent, Costa Limpia y Lago Stays tienen logos inventados
  para ARGOS en `public/images/empresas`. Mientras no exista la subida de logos a S3
  (fase01.md §3.8) la API devuelve `logo_url: null`; fuera de producción
  (`demoTenantLogos` en los environments → token `DEMO_TENANT_LOGOS`) la web usa esos
  archivos para las empresas del seed.
* **Sin logo:** una marca abstracta estable generada a partir del nombre (DiceBear · Shapes,
  CC0) con la paleta de ARGOS, nunca una inicial.

## Movimiento

Tokens en `src/app/shared/tokens/argos-tokens.css`. Las curvas de resorte son propias: se
calcularon con un resorte amortiguado (masa 1) y se exportaron como `linear()`.

| Token | Uso | Duración |
| --- | --- | --- |
| `--dur-fast` / `--dur-base` / `--dur-slow` | Estados de botón / aparición / hojas (ux-ui.md §2.4) | 150 / 250 / 400 ms |
| `--spring-standard` | Paneles laterales, indicador del menú, segmentados | 440 ms, sin rebote |
| `--spring-snappy` | Menús desplegables | 245 ms |
| `--spring-bounce` | Toasts, pines del mapa, confirmaciones (6 % de rebote) | 360 ms |
| `--spring-gentle` | Entradas grandes | 590 ms |
| `--ease-enter` / `--ease-exit` | Entradas y salidas (la salida dura ~30 % menos) | — |

Listas: aparición escalonada de 30 ms por elemento, máximo 8 (`.reveal` + `--i`).
"Reducir movimiento" del sistema: todo pasa a fundido de 100 ms y se apagan los bucles.

## Animaciones propias

Cada una cuenta algo del producto; ninguna es decorativa.

* **Ilustraciones.** El detalle de acento de cada ilustración se levanta al pasar el cursor.
* **El trazo del logo.** El símbolo se dibuja en una sola línea al aparecer (cabecera, login y
  "Por qué ARGOS").
* **Checklist que se completa.** En el hero, las casillas se marcan una por una, el contador
  sube de 9 a 12 y la limpieza queda "Validada".
* **El panel se endereza.** La captura del panel entra inclinada y se pone plana mientras se
  hace scroll (`appScrollProgress`, sigue al scroll y se revierte).
* **Cambio de empresa.** El selector de empresas pasa solo de una empresa a otra, como lo hace
  quien trabaja para varias.
* **Antigua a ancho completo.** La foto del Arco de Santa Catalina pasa de tarjeta a ancho
  completo con el scroll.
* **Login.** Las fotos rotan cada 7 s con fundido y un leve acercamiento; las barras inferiores
  marcan el avance y la tarjeta muestra el estado de cada propiedad.
* En el panel siguen el barrido de radar de "Requiere tu atención", el indicador deslizante del
  menú y las ventanas que se encienden en las portadas de propiedades.

## Logotipo

**Concepto.** En la mitología griega, Argos era el guardián al que Hera confiaba lo que más
quería cuidar: lo que quedaba a su cargo nunca quedaba desatendido. El símbolo une las dos
ideas de ARGOS: **una casa (la propiedad) trazada con la greca griega, en una sola línea
continua**. Sube por la pared, cruza el techo, baja y se enrolla hacia dentro como el meandro;
la abertura inferior izquierda es la puerta. Funciona en un solo color y se lee a 16 px.

* Archivos: `public/brand/argos-mark*.svg` (símbolo), `argos-logo*.svg` (horizontal),
  `argos-app-icon.svg` (ícono de app) y `public/favicon.svg` / `favicon.ico`. El trazo está en
  un solo lugar del código: `ARGOS_MARK_PATH` en `shared/atoms/logo`.
* El wordmark va en EB Garamond 600 con tracking 0.18 em. En los SVG es texto: para imprenta
  conviene convertirlo a curvas.
* Se descartaron: la llave con paletón de greca (el anillo con punto parecía un ojo), el
  frontón de templo (se confunde con el ícono de banco) y la alfa con travesaño de greca.
* La app (`packages/design_system/lib/atoms/argos_logo.dart`) sigue con el anillo y punto:
  adoptar el símbolo nuevo es tarea de la app (Persona B), con estos SVG como fuente.

## Fotografía

Catálogo único en `shared/media/photos.ts` y átomo `app-photo` (srcset responsivo, fundido al
cargar, sin saltos de layout).

| Fuente | Fotos | Licencia |
| --- | --- | --- |
| Wikimedia Commons | Arco de Santa Catalina y calle del Arco (Not So Dusty), Lago de Atitlán (chensiyuan) | CC BY 2.0 y CC BY-SA 4.0: se acredita en la foto y en el pie |
| Unsplash | Habitación frente al lago, casa de playa, dormitorio, limpieza, mantenimiento, recepción | Licencia Unsplash (uso libre, sin atribución obligatoria) |

* Se sirven desde su origen (no están en el repo). Antes de producción hay que reemplazarlas
  por fotos propias de las propiedades de los clientes, servidas desde nuestro bucket.
* Las fotos de Unsplash no muestran lugares reales de Guatemala: no se rotulan con ubicación.
  Solo las de Commons llevan lugar ("Antigua Guatemala").
* La captura del panel (`public/images/producto/panel-inicio.webp`) es la pantalla real de
  `/inicio` con datos de demo, tomada a 2x. Hay que volver a tomarla cuando cambie el panel.

## Ilustraciones de propiedades

Mientras no haya fotos reales (S3, fase 2), cada propiedad del panel tiene una portada generada
(`shared/molecules/arch-cover`): escena SVG determinista por código, con tipo (torre, casa,
hotel), entorno guatemalteco (ciudad, colonial con volcán, playa, lago) y hora del día. Cuando
existan fotos, la portada quedará como respaldo si una foto falla.

## Pendiente de decidir

* **Tipografía de la app:** la web ya usa Plus Jakarta Sans; la app sigue en EB Garamond +
  Verdana. Alinearla es decisión de Persona B.
* **Fotos propias** para la landing y el login (ver "Fotografía").
* **Modo oscuro** fuera de esta versión (ux-ui.md §2.2); los tokens ya son semánticos.
