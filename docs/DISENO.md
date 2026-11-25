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

## Fase 1 con la API real (2026-11-21)

* **Enlaces de correo** (`/restablecer`, `/invitacion`): el mismo panel partido del login (`app-auth-shell`). El token se quita de la barra de direcciones al leerlo. La invitación muestra el logo de la empresa, el rol y quién invita antes de pedir datos; si la persona ya tiene cuenta, solo pide su contraseña (y su código 2FA).
* **Mi perfil** (`/perfil`, pestañas por `?tab=`): datos, seguridad (contraseña con medidor de fuerza y 2FA con QR generado en el navegador, clave en grupos de 4 para copiar) y sesiones por dispositivo con "Esta sesión" marcada.
* **Modo plataforma**: "Administración ARGOS" aparece como una empresa más en "Elige una empresa" y en el selector de la barra superior, con el símbolo de ARGOS. Su menú solo tiene Empresas y Bitácora de plataforma; las rutas de empresa redirigen a `/plataforma`.
* **Configuración**: los módulos del plan son de solo lectura (check o candado); los roles del sistema muestran la matriz bloqueada con "Duplicar"; los roles propios se renombran en el mismo título y su matriz bloquea los permisos que la persona no tiene.

## Fase 2 con la API real (2026-11-21)

Investigación (skill `argos-redesign`): páginas de ayuda públicas de Besty (ficha de anuncio),
Hospitable (tareas y equipo) y Breezeway (perfil de propiedad y plantillas), más el editor de
anuncios de Airbnb. Hostaway respondió 403, Hometime 404 y Guesty bloquea navegadores
automáticos: no se evadieron. Reglas en común que se adaptaron:

* La ficha se abre con identidad clara: volver, nombre y dirección, y un selector para saltar a
  otra propiedad ("Switch listing" de Besty).
* Secciones cortas con un resumen legible y "Editar" a mano (editor de anuncios de Airbnb), en
  vez de un formulario enorme siempre abierto.
* El acceso (llaves, códigos) vive aparte y dice quién lo ve (Breezeway separa el acceso del
  huésped del acceso del equipo).
* El checklist se arma con título, descripción y secciones con puntos, y se revisa como lo ve el
  colaborador ("Preview tasks" de Hospitable).
* Las personas asignadas van con avatar y en orden.

Decisiones:

* **Sin estado de hoy inventado.** Mientras no existan tareas, la lista muestra lo que sí se sabe
  y lo que le falta a cada propiedad para operar (sin asignados, sin checklist, sin acceso) como
  aviso en la portada y como chips de filtro. El estado del día vuelve cuando llegue la API de B.
* **Portada**: la foto subida (S3, firmada) o, si no hay, la escena generada con el entorno
  deducido de la zona (playa, lago, colonial, ciudad).
* **Edificios y Checklists son pestañas** de Propiedades (`?seccion=`), no pantallas sueltas.
* **Editor de checklist** en drawer ancho: secciones e ítems que se arrastran (y flechas para
  teclado y móvil), "Foto" y "Antes y después" como interruptores, y a la derecha la vista
  previa en un marco de teléfono. "Duplicar" crea una copia y la abre.
* **Ficha de colaborador** con la misma cabecera teal del drawer de Colaboradores; el horario se
  edita sobre una regla de 5:00 a 23:00 con barras por día.
* **Selector de personas** (`app-user-picker`): búsqueda, avatar, elegidas primero. Sirve también
  para propiedades (código en lugar de avatar).
* Íconos de control nuevos: `pencil`, `grip`, `camera`, `checklist`, `chevron-up` (mismo trazo).

## Fase 3 con la API real (2026-11-22)

Mantenimiento, Alertas e Inicio pasaron a datos reales con los patrones ya aprobados de la tabla
de abajo (columnas por estado de Linear para el tablero, una serie por gráfico de Stripe para
Indicadores). Decisiones:

* **El tablero solo arrastra para iniciar.** Asignar pide a quién, resolver pide qué se hizo y
  cerrar es de administración: esos pasos se hacen en la ficha, donde caben los datos. Arrastrar
  a otra columna que no sea "En curso" no hace nada.
* **Ficha de incidencia en drawer** con folio (#15), estado, urgencia, fotos del reporte y de la
  solución (etiqueta "Solución"), responsables, costo editable, "Qué se hizo" y una línea de
  tiempo en frases ("Sebas M asignó la incidencia · Ana López · nota"). Las acciones van fijas
  abajo y cambian con el estado.
* **Lugar**: el código de propiedad va en monoespaciada (TB-1102) y el nombre de edificio en la
  letra normal ("Torre Botánica · Edificio completo"); la mono solo se usa en códigos y folios.
* **Fotos** con `app-photo-picker` (miniaturas, quitar, máximo configurable) en el reporte y al
  resolver; los documentos del activo se adjuntan desde la ficha (PDF o imagen).
* **Indicadores**: el gasto dice su moneda en la etiqueta ("Gasto del mes (Q)"); la línea de
  resolución omite meses sin incidencias resueltas (dibujarlos en 0 h hundiría la tendencia) y,
  con menos de dos meses, lo explica en lugar de mostrar un punto suelto.
* **Inicio con datos parciales**: lo real (alertas, incidencias, preventivos, mapa, actividad) se
  muestra normal; lo que aún depende de tareas y reservas lleva la etiqueta "Muestra" y una nota
  arriba. Sin alertas de prioridad alta, el número grande del héroe pasa a ser el total ("2
  alertas activas · Ninguna de prioridad alta") para no mostrar un 0 bajo "Requiere tu atención".
* **Mapa**: las coordenadas reales se proyectan al mapa estilizado por cercanía a seis lugares
  dibujados (Atitlán, Antigua, zonas de la capital, Monterrico, Puerto San José); los pines que se
  enciman se reparten en círculo.
* **Campana**: abre una bandeja (`app-notification-tray`) con "Sin leer" y "Antes", marcar todo
  leído y enlace al panel de alertas. Mientras B no publique su API muestra la etiqueta
  "Simulado".
* **Alertas** sin "deshacer": reconocer y resolver son reales y el aviso explica que, si la causa
  sigue, el sistema la vuelve a levantar.
* Íconos de control nuevos (mismo trazo): `droplet`, `wrench`, `bolt`, `wind`, `plug`, `brush`,
  `sofa`, `file`, `upload` (categorías de activo y documentos).

## Fase 4 con la API real (2026-11-22)

Reservas (W-H1 a W-H6) pasó a datos reales sobre los patrones ya aprobados (multicalendario de
Guesty y Hostaway, ficha en drawer como Mantenimiento). Decisiones:

* **Calendario que llena el ancho**: muestra 24 días como mínimo y más si la pantalla da; las
  columnas se estiran para no dejar una franja vacía a la derecha. Arrastrar sobre días libres
  abre "Nueva reserva" con ese rango; la barra dice el canal por color y lo que falta por rayado.
* **Ficha con cuatro pestañas** (Huéspedes, Depósito, Inspecciones, Historial) y las acciones del
  estado fijas abajo (confirmar, check-in, check-out, cancelar con motivo, no llegó, reenviar).
* **Registro del huésped** en la misma ficha: documento y dos casillas de foto (frente y reverso).
  Las fotos no se muestran en miniatura: "Frente" y "Reverso" abren la URL firmada en otra pestaña y
  queda en la bitácora; abajo se dice cuándo se borran ("Se borran el 19 feb 2027").
* **Depósito como libro**: monto, recibido, devuelto, retenido y saldo arriba; movimientos con
  flecha y color abajo. El formulario solo ofrece lo que se puede hacer (recibir, retener, devolver)
  y sugiere el monto.
* **Hallazgos** con gravedad en chips, cargo al depósito y "Abrir incidencia en Mantenimiento" (el
  hallazgo enlaza a su incidencia).
* **Canales en tarjetas** con sus reglas en palabras ("Depósito de Q 1,200", "Entrada y salida
  automáticas") y los calendarios iCal en tabla con la última lectura o el error del canal.
* Íconos de control nuevos: `arrow-down`, `arrow-up` (movimientos) y `wallet` (depósito).

## Fase 5 con la API real (2026-11-23)

Nómina y disciplina (W-J2 a W-J5 y las pestañas de RRHH de W-D2) pasaron a datos reales. Referencias:
la nómina por período de Gusto y Rippling (lista de corridas con estado y total, y una planilla
donde se corrige antes de aprobar) y el expediente de BambooHR. Decisiones:

* **Períodos como filas con el líquido a la derecha**: nombre, fechas, estado y si paga aguinaldo o
  Bono 14. En móvil el estado y el monto bajan a su propia fila para no apretar el nombre.
* **Planilla tipo hoja**: una fila por colaborador, columnas con cifras tabulares y totales al pie.
  Solo en revisión las celdas son editables; lo corregido a mano se subraya y la fila dice "N
  cambios". Al cambiar días, horas o limpiezas la base se recalcula en vivo.
* **Barra de estado del período** arriba de la planilla con el líquido, el IGSS y solo las acciones
  que tocan (calcular, pasar a revisión, volver a borrador, cerrar, Excel, boletas). Cerrar pide
  confirmación con las cifras y dice qué va a pasar (correos, ya no se cambia).
* **Ficha de la línea** en drawer con la boleta como se va a imprimir, la explicación del Bono 14 o
  aguinaldo en palabras ("12 meses: 2 con nómina en ARGOS y 10 estimados") y el historial de
  correcciones.
* **Aviso de la fuente**: mientras no haya marcajes ni itinerario, la planilla dice que días y horas
  salen del horario y que las limpiezas se corrigen en revisión.
* **Disciplina** en tarjetas con el tipo en color, las fechas de suspensión, los adjuntos y el acuse
  (con la nota del colaborador) o "Esperando acuse".
* La boleta PDF repite la marca: banda teal con el nombre de la empresa, devengos y deducciones en
  dos columnas, líquido destacado y líneas de firma.

## Fase 6 con la API real (2026-11-23)

Facturación (W-O4), Integraciones, Planes (W-P2) y Suscripciones (W-P3) usan la API real; el Chat
(W-M1) usa datos simulados hasta la API de Persona B. Referencias: la facturación de Linear y Notion
(plan con uso y límites, historial de facturas), el centro de pagos de Stripe (suscripciones con
estado y cobros fallidos) y las bandejas de Airbnb y Front para el chat (lista, conversación y
contexto de la reserva). Decisiones:

* **Plan en la tarjeta teal** que ya existía: nombre, precio por ciclo, estado y barras de uso frente
  al límite (ámbar desde el 85 %); "sin límite" cuando el plan no tiene tope.
* **La deuda se dice arriba y con la acción al lado**: franja ámbar (pago vencido, con la fecha en que
  pasa a solo lectura) o roja (solo lectura) con "Pagar Q …". En todo el panel, el mismo aviso arriba
  del contenido lleva a Facturación a quien puede pagar y le dice al resto a quién acudir.
* **Cambiar de plan en un drawer** con mensual/anual, cada plan como tarjeta con límites y
  funcionalidades; el actual y los que no alcanzan para el uso quedan deshabilitados con el motivo, y
  se avisa qué módulos se apagarían. Confirmar dice cuánto se cobra.
* **Clave API visible una sola vez** en una franja con "Copiar" y "Ya la guardé"; la lista solo
  muestra el prefijo y el último uso.
* **Chat a tres columnas** (lista, conversación, reserva) que en móvil es lista o conversación con
  "volver". Burbujas teal para lo propio y blancas para lo recibido, separadas por día; no leídos con
  el color de acción; respuestas rápidas como chips sobre el campo de texto.
* **Suscripciones** con cuatro indicadores (al día, en prueba, vencidas, suspendidas) y una tabla
  ordenada por urgencia.

## Navegación flotante y color de acción (2026-11-22)

* **Sidebar flotante** (lo pidió Persona A): la navegación ya no ocupa una columna; es un panel teal
  que sale del botón de menú de la topbar, a la izquierda, igual que la bandeja de notificaciones
  sale de la campana a la derecha. En escritorio se asoma al pasar el cursor por el botón (140 ms) y
  se fija con un clic; se cierra al navegar, con Escape o con clic fuera. En móvil abre con velo. El
  contenido usa el 100 % del ancho y la topbar lleva el logo. Referencia: el sidebar que se asoma de
  Notion y Linear cuando está oculto.
* **Color de acción terracota (propuesta, por confirmar)**: el botón principal dorado con texto
  blanco daba 3.0:1 (no cumple WCAG AA para texto de 12–15 px) y competía con los secundarios teal
  sólidos. Se evaluaron cuatro opciones sobre pantallas reales (tablero
  `tablero-botones.png` en el scratchpad de la sesión): dorado actual, terracota, naranja vivo
  (3.0:1, se lee "promoción") y terracota con secundarios suaves. Quedó la última: principal
  `--color-action: #b5582a` (barro de las fachadas de Antigua, 4.8:1), secundarios en teal lavado
  con texto teal (10.8:1) y enlaces de acción en terracota. Un solo color sólido por pantalla, como
  Airbnb o Linear. El dorado sigue como acento de marca (indicador del menú, etiquetas, gráficos).

## Pantallas internas (fases 2 a 5)

Construidas con el skill `argos-redesign`. Lo que se tomó de cada referencia (patrones, no
diseños):

| Patrón | Referencia | Dónde |
| --- | --- | --- |
| Filas por persona, columnas por día y "Sin asignar" arriba; arrastrar para reasignar | Breezeway, Coast | Itinerario · semana |
| Columnas por estado con punto de color y contador; tarjetas solo con lo que decide el siguiente paso | Linear | Itinerario · hoy, Mantenimiento |
| Multicalendario: filas por propiedad, barras que empiezan y terminan a media celda, color por canal | Guesty, Hostaway | Reservas |
| Suministros con mínimo y alerta; reposición ligada a la limpieza | Hospitable, Turno | Inventario |
| Selector de período, cifras clave, una serie por gráfico y la tabla que explica el número | Stripe | Métricas, Indicadores |

Decisiones:

* **Pestañas con subrayado** (`app-tabs`) para las subpantallas de un módulo; el control
  segmentado queda para alternar vistas del mismo dato (semana/hoy, tablero/tabla).
* **Todo el estado de vista vive en la URL** (`?tab=`, `?ver=`, `?semana=`): se puede
  compartir un enlace a una tarea, una reserva o un período de nómina.
* **Mover o corregir pide motivo.** `ConfirmService.askReason` muestra chips con motivos
  frecuentes y "Otro"; el motivo queda en la línea de tiempo y en la bitácora.
* **Colores de canal** (Airbnb, Booking.com, Vrbo, venta directa) validados con la guía de
  visualización: banda de luminosidad, croma, separación con daltonismo y contraste. Barras
  tenues con borde de color y texto oscuro; las reservas por completar van rayadas.
* **Gráficos** (`app-bar-chart`, `app-line-chart`): una sola serie en teal, el dato a
  destacar en dorado, rejilla tenue, tooltip al pasar el cursor y tabla oculta para lectores
  de pantalla. Sin ejes dobles.
* **Parqueos como plano** del nivel, con la placa de cada espacio: así lo ve seguridad.
* **Áreas comunes con foto real** del área; la agenda del día marca en rayado las horas en
  que el área está cerrada.
* **Ilustraciones nuevas** (21 en total): `inventory`, `parking`, `pool` y `payroll`, en el
  mismo estilo. Se probaron a 40, 56 y 96 px sobre arena y menta.
* Los íconos de línea siguen en controles, navegación y en los stat tiles, como estaba
  aprobado.

## Íconos con volumen, mapa real y movimiento (2026-11-23)

Pedido: más íconos, elementos visuales y animación, y un mapa "mucho mejor". Referencias: la
iconografía dimensional de Airbnb (2025: objetos con luz, sombra y un brillo, animados), el mapa de
búsqueda de Airbnb (Google Maps apagado, marcadores en píldora con el dato, mini-pines y zoom arriba a
la derecha), los grupos con anillo por categoría de Mapbox, la tarjeta flotante sobre el mapa de
Airbnb, el alta de anfitrión de Airbnb (el tipo de espacio se elige por su ícono) y los tiempos de
microinteracción de Linear y Stripe (150–300 ms, hundido al presionar).

* **Íconos con volumen** (`app-dim-icon`, 19 objetos): casa, apartamento, habitación, edificio,
  llave (otro), cubeta, despertador, caja de herramientas, maleta, cono, balanza, caja, gafete,
  barras, calendario, sello, candado, alto y lupa. Luz arriba a la izquierda, sombra de contacto y un
  detalle dorado; pintan con degradados globales `#dg-*` (index.html). Cada uno tiene su gesto al
  pasar el cursor por él o por su tarjeta: ventanas que se encienden, despertador que suena, maleta
  que salta, balanza que se mece, burbujas en la cubeta. Reemplazan el patrón "ícono de línea en
  cuadrito pastel" en los 23 indicadores, en las alertas del Inicio y en los estados vacíos; marcan
  el tipo en las tarjetas de propiedad (placa sobre la portada), en la ficha, en el mapa y en el alta
  (cuatro tarjetas con ícono en lugar del segmentado). Los íconos de línea siguen en controles y
  navegación. Tablero: `.claude/skills/argos-redesign/scripts/dim-icons/board.mjs`.
* **Mapa del Inicio con geografía real**: centro y sur de Guatemala proyectados desde coordenadas
  (costa, canal de Chiquimulilla, Atitlán y Amatitlán, ocho volcanes con cara iluminada y en sombra,
  Fuego y Pacaya con humo, curvas de nivel, sombreado de la sierra, seis ríos, CA-1, CA-9, CA-2 y
  RN-14 con escudos, ciudades y, al acercar, calles de Antigua y la capital y lugares como el Parque
  Central, el Arco o el aeropuerto). Las propiedades van en sus coordenadas (o las de su edificio).
  La cámara vuela de la región a tus propiedades al cargar; se arrastra, se acerca con Ctrl + rueda,
  doble clic, pellizco o los botones, y "Ver todas" reencuadra. Los pines cercanos forman un grupo
  con anillo de estados que se separa al tocarlo; los de un mismo edificio, una píldora con su nombre.
  Cada propiedad es una píldora con su ícono, código y estado (la incidencia late). Tarjeta flotante
  con portada, tipo, lugar, estado e incidencias, o la lista de un edificio. Los estados filtran, hay
  atajos por zona y escala en km. Sin dependencias ni teselas externas.
* **Movimiento**: los botones se hunden al presionar (faltaba `transform` en su transición); los
  íconos entran con rebote y las barras de las gráficas crecen; pines, tarjeta y lista del mapa
  entran escalonados. Todo respeta "reducir movimiento".



## Segunda vuelta: navegación visual, mapa real, 3D y dibujo (2026-11-24)

La primera vuelta se sintió "monótona, apagada y con mucho texto". Cambios:

* **Barra de secciones** bajo la topbar (ref. la barra de categorías de Airbnb): cada módulo con su
  ícono con volumen sobre el nombre, halo de su color al pasar el cursor y en la activa, subrayado.
  Siempre a la vista; se compacta al bajar; flechas o desliz cuando no cabe. El **menú** pasó de lista
  oscura a cuadrícula clara de mosaicos de color por área (como la biblioteca de apps de iOS).
* **Mapa real**: Google Maps 3D fotorrealista (volcanes, calles y edificios en relieve) cuando el
  backend tiene `ARGOS_GOOGLE_MAPS_KEY`. La cámara vuela de la región a tus propiedades; al tocar
  una baja inclinada y gira alrededor; "Recorrido" pasea por todas; satélite o mapa. Un marcador
  por edificio. Sin clave, o si Google la rechaza, el mapa ilustrado. El mapa ocupa todo el ancho.
* **Cosas que salen de la pantalla**: los íconos de los indicadores sobresalen por arriba de su
  tarjeta, la campana de "Requiere tu atención" sale del bloque y suena, el saludo lleva sol o luna
  flotando; indicadores y tarjetas de propiedad se inclinan en 3D siguiendo el cursor (directiva
  `appTilt`, ref. tarjetas de Apple TV) con brillo, y lo marcado `.pop` se adelanta.
* **Portadas en dibujo** (urban sketching): acuarela con bordes irregulares corrida respecto de la
  tinta, línea temblorosa, rayado en el suelo y grano de papel, todo con filtros SVG. Sin la paleta
  de noche (la acuarela pide papel claro).
* **Itinerario** (ref. los eventos de Google Calendar): cada tarea es un bloque del color de su
  tipo con su ícono con volumen; insignia de estado (retrasada late en rojo, en curso con barra de
  avance, finalizadas atenuadas), leyenda de tipos, "Hoy" marcado y tareas por día.
* **Favicon** con borde claro (se leía como un cuadro en pestañas oscuras) y versión en el enlace
  para que el navegador no use uno guardado. Juego completo generado del SVG: `favicon.ico`
  (16/32/48), `favicon-32.png`, `favicon.svg` y `apple-touch-icon.png` (180, iOS no acepta SVG).
* **Menos texto**: el aviso de datos de muestra pasó a una etiqueta con detalle al pasar el cursor;
  se quitaron la frase bajo el saludo y la ayuda del mapa.



## Tercera vuelta: mapa 3D vectorial e inventario visual (2026-11-24)

* **Mapa del Inicio en 3D vectorial** (modo `ROADMAP` de `Map3DElement`, esquema claro): calles
  limpias, edificios en volumen e íconos de lugares; se lee como ilustración animada y no como foto.
  "Satélite" queda como segunda opción. El fotorrealista de entrada se sentía oscuro y, al bajar a
  una propiedad de costa, la cámara terminaba mirando solo mar. El mapa ya no ocupa media pantalla:
  alto entre 320 y 440 px (400 en celular). Al tocar una propiedad la cámara baja a ~1 km inclinada.
  Pendiente: un estilo propio en Google Cloud (Map ID) para ocultar los íconos de comercios.
* **Inventario · Artículos** pasó de tabla de cinco columnas a lista visual (ref. Sortly y la vista
  de inventario de Shopify): cada artículo con el objeto de su categoría (íconos con volumen nuevos:
  toallas, amenidades, taza de café y llave), categoría en píldora de su color, un medidor de nivel
  con la marca del mínimo y el estado en palabras ("Agotado", "Bajo mínimo", "En orden"). Lo que falta
  sube primero y lleva una barra de color a la izquierda; se puede ordenar por nombre o existencia.
  En celular, el estado ("faltan 8") reemplaza a la categoría.
* **Mapa sin giro:** al tocar una propiedad la cámara baja y se queda quieta (el giro alrededor
  distraía).
* **Mantenimiento** con el mismo patrón de lista visual. *Activos*: objeto de su categoría (nueve
  íconos con volumen nuevos: minisplit, gota, foco, elevador, cámara, rodillo, lavadora, llave
  inglesa y sofá), lugar, estado en píldora de color, lo abierto y el preventivo como cuenta atrás
  ("En 58 d", "Toca hoy", "Vencido hace 3 d"); lo que falla sube primero. *Incidencias* en
  tabla: barra con el color de la urgencia, objeto del activo, estado, responsable con avatar y
  edad; las cerradas se atenúan al final. Las tarjetas del tablero también llevan el objeto.
  *Preventivos*: el objeto del activo en "Lo que toca" y en miniatura en los días del calendario.
  *Proveedores*: cada tarjeta con el objeto de su especialidad (la categoría más común de sus
  activos o, si no tiene, la que sugiere su tipo de servicio).

## Pendiente de decidir

* **Tipografía de la app:** la web ya usa Plus Jakarta Sans; la app sigue en EB Garamond +
  Verdana. Alinearla es decisión de Persona B.
* **Fotos propias** para la landing y el login (ver "Fotografía").
* **Íconos con volumen** (2026-11-23): propuesta aplicada en indicadores, alertas, vacíos y
  propiedades; falta la confirmación del usuario para pasarla a reglas-visuales.md.
* **Mapa con teselas reales**: si se quiere calle por calle, Google Maps (permitido por el proyecto)
  con estilo apagado y los mismos marcadores; requiere clave y facturación de Google.
* **Modo oscuro** fuera de esta versión (ux-ui.md §2.2); los tokens ya son semánticos.
