# Sistema de diseño de ARGOS web: ficha rápida

Fuente de verdad: `src/app/shared/tokens/argos-tokens.css` (tokens) y `docs/DISENO.md`
(decisiones). Si algo de aquí contradice el código, manda el código: actualiza esta ficha.

## Tokens

**Color** (Tailwind los expone como `bg-primary`, `text-text-body`, etc.):

| Token | Valor | Uso |
| --- | --- | --- |
| `--color-primary` | `#003841` | Teal profundo: títulos, texto fuerte, panel de navegación |
| `--color-primary-deep` | `#002a31` | Fondos de ilustración, bloque teal |
| `--color-secondary` | `#c5873c` | Dorado: acento de marca (indicador del menú, etiquetas, gráficos), foco (anillo 2 px). No para texto de acción: 3.0:1 sobre blanco |
| `--color-action` / `--color-on-action` | `#b5582a` / `#fff` | Terracota: botón principal y enlaces de acción (4.8:1). Un solo color sólido por pantalla (propuesta del 2026-11-22, por confirmar) |
| `--color-teal-muted` / `-washed` | `#3a6168` / `#e6eeec` | Rellenos secundarios, fondos suaves |
| `--color-success/warning/danger` (+ `-soft`) | `#5a8a6b` / `#9a6722` / `#892f26` | Estados |
| `--color-background` | `#f4f1ea` | Fondo del panel |
| `--color-surface` / `-soft` | `#fff` / `#fbfaf6` | Tarjetas |
| `--color-text-body/secondary/muted` | `#5a5a52` / `#7d7d72` / `#9a9a90` | Texto |
| `--color-border-field/card`, `--color-divider` | `#e2ded3` / `#ede9de` / `#f0ece2` | Bordes |
| crema de la landing | `#f6f2ea` (`--cream` en la landing) | Fondos de sección |

**Radios:** `--radius-xs` 4 · `-sm` 6 · `-field` 8 (botones, campos) · `-tile` 10 · `-card` 12 ·
`-hero` 14 (fotos) · `-sheet` 16 · `-pill` (solo chips y avatares).

**Sombras:** `--shadow-e1` (tarjetas en reposo), `-e2` (hover), `-e3` (tarjetas flotantes sobre
fotos), `--shadow-edge` (brillo interno en superficies oscuras).

**Tipografía:** `font-display` + `tracking-display` para títulos (Plus Jakarta 600, tracking
-0.024 em; la landing lo cierra a -0.034 em). Texto en `font-sans` (Plus Jakarta 400/500/700).
`tabular` para cifras. El wordmark del logo siempre en EB Garamond 600.

**Movimiento:** `--dur-fast/base/slow` (150/250/400 ms), `--ease-enter/exit/standard`,
resortes `--spring-standard` (440 ms), `--spring-snappy` (245), `--spring-bounce` (360, 6 %
rebote), `--spring-gentle` (590); cada uno con su `-dur`. Listas: `.reveal` + `--i` (30 ms por
elemento, máx. 8). Siempre `@media (prefers-reduced-motion: reduce)`.

## Componentes compartidos (`src/app/shared`)

**Átomos**

| Selector | Entradas clave | Cuándo |
| --- | --- | --- |
| `app-button` | `variant` (primary = terracota, secondary = teal lavado, tertiary, ghost, danger, pill, link, icon), `size`, `loading`, `full` | Toda acción; una sola `primary` por vista |
| `app-icon` | `name` (~100 íconos de línea; nuevos en fase 2: pencil, grip, camera, checklist, chevron-up; en fase 3: droplet, wrench, bolt, wind, plug, brush, sofa, file, upload; en fase 4: arrow-down, arrow-up, wallet), `size` | Controles, navegación, metadatos |
| `app-spot-icon` | `name`, `size`, `tint` | Ilustración que representa un concepto o tipo de tarea. Hay 21: offline, evidence, companies, alerts, compliance, map, isolated, roles, switch, features, two-step, retention, logbook, sessions, cleaning, maintenance, arrivals, inventory, parking, pool, payroll |
| `app-avatar` | `initials`, `name`, `size`, `photo`, `ring` | Personas (foto o Notionists; iniciales solo si falla) |
| `app-tenant-mark` | `name`, `logo`, `size` | Empresas (logo o marca generada) |
| `app-photo` | `photo` (de `PHOTOS`), `sizes`, `eager` | Fotos con srcset y fundido |
| `app-logo` | `size`, `tone`, `wordmark`, `intro` | Logo (trazo animado con `intro`) |
| `app-badge`, `app-checkbox`, `app-input`, `app-select`, `app-spinner`, `app-count-up` | — | Formularios y estados |

**Moléculas:** `app-page-header` (eyebrow, title, subtitle), `app-stat-tile` (label, value,
total, icon, tone, note), `app-card`, `app-empty-state`, `app-filter-chips`, `app-segmented`,
`app-tabs` (subpantallas con subrayado y contador; `attention` lo pinta ámbar),
`app-form-sheet` (formulario en drawer: cabecera con ilustración, campos y pie fijo),
`app-bar-chart` (una serie, vertical u horizontal, `highlight` en dorado) y
`app-line-chart` (una serie en el tiempo, guía y tooltip),
`app-menu`, `app-form-field`, `app-search-bar`, `app-avatar-stack`, `app-live-pill`,
`app-otp-input`, `app-arch-cover` (portada SVG generada de una propiedad), `app-user-picker`
(buscar y elegir personas con avatar, o cosas con etiqueta corta como el código de una propiedad),
`app-demo-data-note` (aviso "Simulado"), `app-photo-picker` (`[(files)]`, `label`, `max`: elegir fotos
con miniaturas y quitar; reporte y solución de incidencias).

**Organismos:** `app-sidebar` (panel flotante de navegación que sale del botón de menú de la topbar;
lo abre y cierra `main-layout`: vistazo al pasar el cursor, fijo con clic), `app-topbar` (a todo el
ancho, con botón de menú y logo), `app-data-table` (+ `ng-template[appCell]`),
`app-drawer`, `app-board` (columnas por estado con `ng-template[appBoardCard]` y arrastre
opcional entre columnas), `app-notification-tray` (bandeja de la campana: `[(open)]`, lee
`NotificationsStore`, sin leer y antes, navega a `data.route`).

**Servicios y utilidades:** `ConfirmService.ask` y `askReason` (pide motivo con chips; úsalo
al mover, corregir, ajustar o rechazar), `ApiClient` (`core/http/http-api.ts`, base de los
`Http*Api`), `shared/utils/time.ts` (días locales `AAAA-MM-DD`, `mondayOf`, `gtq`),
`plural.ts` y `csv.ts` (`downloadCsv`). `NotificationsStore` (`core/store`, raíz: sondea cada 60 s,
`hasUnread` enciende el punto de la campana). Campos nativos de fecha, hora y número: clase
`field-native`. Barra de filtros fija: `toolbar-glass`.

**Directivas:** `appInView` (clase `.is-in` al entrar en pantalla; evento `entered`),
`appScrollProgress` (`--p` de 0 a 1 según el scroll).

**Solo en la landing** (`features/landing/components`): `app-topo-lines` (curvas de nivel
procedurales: seed, color, opacity, peaks), `app-hero-visual`, `app-tenant-switch`. Si el panel
necesita uno, se mueve a `shared` (como se hizo con `spot-icon`).

**Medios:** `shared/media/photos.ts` (`PHOTOS`: antiguaArch, antiguaStreet, atitlan, lakeRoom,
beachPool, brightRoom, cleaning, maintenance, checkin; créditos en `PHOTO_CREDITS`),
`demo-brands.ts` (logos de las empresas de demo), `generated-art.ts` (DiceBear).

## Cómo dibujar una ilustración nueva (`app-spot-icon`)

Lienzo 64×64 con placa redondeada (rx 16). Dentro de `<g class="ink">` (trazo teal `#003841`
de 2 px, extremos redondeados) y con el filtro de sombra desplazada que ya tiene el componente:

* Objetos reconocibles de la operación (no metáforas abstractas), con rellenos de la paleta:
  blanco, `#E3EEEA` (menta), `#F3E3CC` (arena), `#3A6168` (teal medio).
* Un solo detalle de acento dorado `#C5873C` dentro de `<g class="accent">`: es lo que se mueve
  al pasar el cursor.
* Pruébala antes en un tablero HTML a 40, 56 y 96 px y sobre placa arena y menta (ver
  "Tableros de comparación" en SKILL.md). Debe leerse a 40 px.

## Gráficos

Antes de dibujar uno, carga el skill `dataviz`. Una serie por gráfico en teal, el dato a
destacar en dorado, sin ejes dobles. Si necesitas colores categóricos (como los canales de
Reservas), valídalos con su `validate_palette.js` y fija el orden.

## Reglas de arquitectura que afectan al diseño

* Componentes standalone, `ChangeDetectionStrategy.OnPush`, signals, sin zone.js.
* Presupuesto de estilos por componente: aviso a 4 kB, error a 8 kB. Lo compartido va en
  `styles.css` o en tokens.
* Las features **nunca** importan `environment`: usan tokens de inyección (`API_BASE_URL`,
  `MOCK_MODULES`, `DEMO_TENANT_LOGOS`).
* Módulos sin endpoint real usan su mock (`MOCK_MODULES`) y muestran `app-demo-data-note`. El
  rediseño no cambia contratos de la API (`docs/plans/fase0X.md` en APP). Los mocks de
  operación se derivan de `core/mocks/demo-ops.ts` (mismas propiedades y personas).
* Un módulo puede mezclar API real y mock por servicio: RRHH usa `hr` para nómina y disciplina y
  `attendance` para asistencia (ver `features/hr/hr.providers.ts`).
* `app-billing-banner` (molécula, en main-layout): aviso de pago vencido o solo lectura según
  `tenant.billing_status` de `/auth/me`. No lo repitas en las pantallas.
* Descargas autenticadas (Excel, PDF): `ApiClient.blob(path, nombreDeRespaldo)` toma el nombre de
  `Content-Disposition` y `downloadBlob(nombre, blob)` (`shared/utils/csv.ts`) lo guarda.
* Mobile-first: todo funciona a 390 px, sin scroll horizontal.
* Textos de interfaz en español, tuteo, frases cortas (ver `APP/docs/plans/ux-ui.md`).
