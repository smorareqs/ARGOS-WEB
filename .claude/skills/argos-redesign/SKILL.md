---
name: argos-redesign
description: Rediseña o pule visualmente pantallas de la web de ARGOS (panel interno, acceso o landing) con el proceso y las reglas que el equipo ya aprobó. Primero investiga referencias reales y audita con capturas. Luego aplica el sistema de diseño (Plus Jakarta, tokens, ilustraciones propias, avatares DiceBear y logos de empresa), verifica a 1440 y 390 px y documenta. Úsalo cuando pidan rediseñar, mejorar, "ponerle más empeño", que "no se vea AI" o modernizar una pantalla o componente de WEB, sobre todo las pantallas de dentro (Inicio, Propiedades, Colaboradores y las que vengan).
---

# Rediseño de pantallas de ARGOS web

Este skill repite el proceso que llevó la landing y el login a quedar aprobados: investigar
antes de diseñar, usar el sistema existente, mirar cada cambio en capturas y documentar.

Antes de tocar nada, lee las dos referencias. Son cortas y contienen decisiones ya tomadas.

* [references/reglas-visuales.md](references/reglas-visuales.md) reúne lo aprobado y lo
  rechazado, lo que se lee "hecho con IA" y las referencias medidas.
* [references/sistema.md](references/sistema.md) es la ficha de tokens, los componentes
  compartidos, cómo dibujar ilustraciones y las reglas de arquitectura.

## 0 · Preparar el entorno

1. Levanta la pila completa desde `WEB/` con `npm run docker:up`. Incluye web en :4200, la API
   en Go en :8000 (docs en `/docs`), PostgreSQL, migraciones y seed. Confírmalo con
   `docker ps`; deben estar `argos-web`, `argos-api` y `argos-db`.
2. Para entrar al panel, usa la cuenta personal definida en `BACKEND/.env` con
   `ARGOS_SEED_DEV_EMAIL` y `ARGOS_SEED_DEV_PASSWORD`. Es administradora en Garrent y Costa
   Limpia. Para ver otros roles, usa las cuentas del seed listadas en `WEB/README.md`. Nunca
   escribas contraseñas en el chat ni en archivos versionados.
3. Guarda las capturas y los tableros en el directorio temporal de la sesión (scratchpad),
   no en el repo.

## 1 · Entender la pantalla

* Lee su especificación en `../APP/docs/plans/ux-ui.md`, en las secciones W-xx; el
  inventario de abajo dice cuál toca. Revisa también qué datos existen en el plan de su fase
  (`../APP/docs/plans/fase0X.md`).
* Abre sus archivos y anota los componentes compartidos que ya usa.
* Comprueba si el módulo usa datos reales o simulados (`MOCK_MODULES` en
  `src/environments/environment.development.ts`). El rediseño no cambia contratos de API ni
  modelos.

## 2 · Auditar lo que hay

Captura el estado actual a escritorio y móvil:

```bash
node .claude/skills/argos-redesign/scripts/panel.mjs --routes /inicio --out <scratchpad>/antes --mobile --scale 2
```

Haz una lista concreta de lo que falla, con estos criterios de
[reglas-visuales.md](references/reglas-visuales.md):

* íconos de librería donde debería ir una ilustración o una foto;
* iniciales;
* estructura con poco contraste (barras o bordes que "no se miran");
* blanco plano o todo con el mismo peso, sin jerarquía;
* tarjetas planas sin contenido real;
* textos largos;
* estados vacíos sin diseño;
* fallas en móvil.

## 3 · Investigar referencias (obligatorio)

El equipo nota cuando no se investigó. Para cada tipo de pantalla, elige de 3 a 5 productos
reales que resuelvan lo mismo:

* **Inicio y resumen del día:** "Hoy" del anfitrión de Airbnb, el dashboard de Guesty, Breezeway.
* **Listas y tablas:** Linear, Stripe, Airbnb (anuncios).
* **Fichas y drawers:** la ficha de anuncio de Airbnb, Linear (issue), Notion.
* **Calendarios:** el calendario de Airbnb, Hostaway, Guesty.
* **Personas y roles:** Notion (miembros), Slack (espacio de trabajo), Linear (equipo).
* **Métricas:** Stripe, Airbnb (estadísticas).

Captúralas y mide su estilo computado:

```bash
node .claude/skills/argos-redesign/scripts/refs.mjs https://www.airbnb.com/hosting https://www.guesty.com --out <scratchpad>/refs
```

Sus apps requieren cuenta, así que estúdialas por sus páginas de producto, sus centros de
ayuda y las capturas públicas. Si un sitio bloquea navegadores automáticos (captcha, 403),
no lo evadas: usa otra fuente. Con lo que veas, anota de 3 a 6 **reglas en común**, por
ejemplo densidad, jerarquía, qué ponen en la primera pantalla o cómo muestran el estado.
Adapta esas reglas; no copies el diseño de nadie.

## 4 · Proponer

* Las mejoras que siguen las reglas ya aprobadas se implementan directamente.
* Cuando hay una decisión de gusto nueva (un estilo de gráfico, un patrón de navegación, una
  paleta de estados), arma un **tablero de comparación**: un HTML en el scratchpad con 3 o 4
  opciones sobre datos reales de ARGOS. Captúralo con
  `node .claude/skills/argos-redesign/scripts/shot.mjs file:///<ruta>/tablero.html <png> --full`,
  elige una opción con una razón y muéstrale al usuario la ruta del PNG. Así se eligieron la
  tipografía (`docs/marca/tipografia-propuestas.png`) y el estilo de avatares.
* Una dependencia nueva, una foto descargada o cualquier archivo externo se pide antes, con
  nombre, origen y tamaño.

## 5 · Implementar

* Usa los tokens y componentes de [sistema.md](references/sistema.md) antes de crear nada. Si
  algo nuevo se va a repetir, va a `src/app/shared/` como átomo o molécula, con un comentario
  que explique qué es y cuándo se usa.
* Con ilustraciones nuevas, sigue el estilo de `app-spot-icon` (la guía está en sistema.md).
  Pruébalas en un tablero a 40, 56 y 96 px antes de integrarlas.
* Si un ícono representa algo (indicador, tipo, estado vacío), usa `app-dim-icon`; si falta el
  objeto, dibújalo con `scripts/dim-icons` (ver sistema.md).
* Personas van con `app-avatar` y empresas con `app-tenant-mark`; nunca con iniciales.
* Las animaciones tienen que contar algo del producto e incluir siempre
  `prefers-reduced-motion`.
* Respeta las reglas de Angular de la ficha: standalone, OnPush, signals, presupuesto de
  4 kB de estilos por componente y nunca importar `environment` en features.
* El texto va en español y con tuteo. Usa frases cortas que digan qué pasa y qué hacer.

## 6 · Verificar (antes de decir que está listo)

```bash
npx tsc -p tsconfig.app.json --noEmit
npx ng test --watch=false
npx ng build          # sin avisos; inicial < 500 kB
node .claude/skills/argos-redesign/scripts/panel.mjs --routes /inicio,/propiedades --out <scratchpad>/despues --mobile
node .claude/skills/argos-redesign/scripts/panel.mjs --routes /inicio --clip "app-stat-tile" --scale 2 --out <scratchpad>/detalle
```

* **Mira las capturas** a 1440 y 390 px, y los recortes a 2x de cada pieza que cambió.
  Compáralas con las de "antes".
* La consola tiene que quedar sin errores; los scripts la imprimen al final.
* Si cambiaste algo compartido (sidebar, topbar, avatar, tokens), revisa también el login
  (`shot.mjs http://localhost:4200/login`) y la landing.
* Si cambió **Inicio**, vuelve a tomar la captura de producto de la landing:
  1. Corre `panel.mjs --routes /inicio --scale 2 --hide-notes`.
  2. Convierte el PNG a WebP 2880×1800, con calidad cerca de 82.
  3. Guárdalo en `public/images/producto/panel-inicio.webp`.

## 7 · Documentar y cerrar

* Pon la decisión y su porqué en `docs/DISENO.md`, en la sección que corresponda o en una
  nueva para la pantalla.
* Agrega una entrada `[A]` en `../APP/docs/plans/avance.md`.
* Si el usuario aprobó o rechazó algo nuevo, súmalo a
  [references/reglas-visuales.md](references/reglas-visuales.md).
* Haz commit solo si el usuario lo pide. La rama es `dev/sebas`. No toques `APP/lib`: la app
  Flutter es de Persona B.
* Al reportar, di qué cambió y por qué (qué referencia o regla lo justifica), dónde están las
  capturas y qué decisiones quedan para el usuario.

## Pantallas internas

Todas existen. Con la API real: acceso, perfil, Colaboradores (con su ficha), Configuración y Plataforma (fase 1), Propiedades (con edificios, checklists y su ficha) y Bitácora (fase 2), Mantenimiento, Alertas e Inicio (fase 3; en Inicio, lo que depende de tareas lleva "Muestra"), Reservas con huéspedes, depósito, inspecciones, canales e iCal (fase 4), RRHH: nómina, disciplina y configuración (fase 5), y Facturación, Integraciones, Planes y Suscripciones (fase 6). Itinerario, Inventario, Parqueos, Áreas comunes, Asistencia, Métricas y Chat usan mocks hasta que Persona B publique su API (bandera `MOCK_MODULES`; la bandeja de la campana es `notifications`). Cada una vive en `src/app/features/…` con
`models/`, `services/` (contrato HTTP + mock), `store/` y `pages/`. Las subpantallas son
pestañas por query param (`?tab=`), y fichas y altas son drawers (`?ver=`, `?nueva=`).

| Pantalla | Ruta | Carpeta | Especificación |
| --- | --- | --- | --- |
| Inicio | `/inicio` | `dashboard/` | W-B1, W-B2 |
| Propiedades | `/propiedades` (`?seccion=edificios` o `checklists`), `/propiedades/CODIGO` | `properties/` (property-cover, checklist-editor, buildings-panel, templates-panel) | W-C1 a W-C4 |
| Acceso por enlace | `/restablecer`, `/invitacion` | `auth/` (auth-shell, password-meter) | W-A4, W-A5 |
| Mi perfil | `/perfil` | `profile/` | Datos, contraseña, 2FA con QR, sesiones |
| Colaboradores | `/colaboradores`, `/colaboradores/:id` | `team/` (employee-form, schedule-editor) | W-D1, W-D2 (con pestañas Nómina y Disciplina) |
| Itinerario | `/itinerario` | `itinerary/` (week-board, task-detail, task-form) | W-E1–E4 |
| Inventario | `/inventario` | `inventory/` (stock-form, item-form) | W-F1–F6 |
| Mantenimiento | `/mantenimiento` | `maintenance/` (tickets-panel, ticket-detail, ticket-form, assets-panel, asset-detail, plans-panel, vendors-panel, metrics-panel y formularios) | W-G1–G5 |
| Reservas | `/reservas` | `reservations/` (occupancy-calendar, reservation-detail, reservation-guests, deposit-panel, inspections-panel, reservation-form, guests-panel, channels-panel, channel-forms) | W-H1–H6 |
| Áreas comunes | `/areas-comunes` | `shared-areas/` | W-I2 |
| Parqueos | `/parqueos` | `parking/` | W-I1 |
| RRHH | `/rrhh` | `hr/` (payroll-grid, line-panel, discipline-list, action-form, payroll-settings, period-form, employee-hr) | W-J1–J5 |
| Métricas | `/metricas` | `metrics/` | W-K1–K2 |
| Chat | `/chat` | `chat/` | W-M1 |
| Alertas | `/alertas` | `alerts/` | W-L1 |
| Bitácora | `/bitacora` | `audit/` | W-N1 |
| Configuración | `/configuracion` (`?tab=integraciones`, `facturacion`) | `settings/`, `billing/` (billing-panel, api-keys-panel) | W-O1, W-O3, W-O4 (W-O2 = Colaboradores) |
| Plataforma | `/plataforma/empresas`, `/planes`, `/suscripciones`, `/bitacora` | `platform/` | W-P1 a W-P4 (solo en modo plataforma) |
| Estructura | todas | `layouts/main-layout`, `shared/organisms/sidebar`, `topbar` | — |

Todas las pantallas de ux-ui.md existen.

Para ver un módulo con datos de cada empresa, usa `--company Garrent` o
`--company "Costa Limpia"` en `panel.mjs` (Parqueos solo está activo en Costa Limpia y Áreas
comunes solo en Garrent, igual que en el seed).

## Problemas conocidos

* **Cambios en `package.json` o en `angular.json`:** reinicia con `docker compose restart web`.
  El contenedor reinstala dependencias si cambió el lock, y `ng serve` no relee `angular.json`
  por sí solo.
* **La API deja de responder tras varios cambios seguidos en BACKEND:** si el log dice "Text
  file busy", corre `docker compose restart api`.
* **Captura con la altura justa del viewport:** el servidor estaba recompilando. Espera a que
  `docker logs argos-web` diga "Application bundle generation complete" y repite.
* **Git Bash convierte `/inicio` en una ruta de Windows:** antepón `MSYS_NO_PATHCONV=1` al
  comando.
* **Overlay de error que no se va:** tras un error de plantilla, el servidor puede seguir
  mostrando el overlay aunque ya compile. Corre `docker compose restart web`.
* **`ng test` falla con "Vitest failed to find the runner":** ocurre en Git Bash porque la
  ruta llega como `c:/` en minúscula. Córrelo desde PowerShell.
* **Fotos externas:** usa Wikimedia Commons con anchos estándar (960, 1280 o 1920 en
  `thumb.wikimedia.org`), con crédito, o el CDN de Unsplash. Las páginas de búsqueda de
  Unsplash bloquean bots; no lo evadas.
