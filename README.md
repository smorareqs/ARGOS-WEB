# ARGOS · Portal web

Portal de administración de ARGOS: Angular 21 (100 % standalone, zoneless), Tailwind CSS v4 y
un design system atómico, siguiendo [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md). Las
decisiones visuales y de movimiento están en [`docs/DISENO.md`](docs/DISENO.md).

> Angular 21 (no 22) por compatibilidad con el Node instalado (v22.14). Angular 22 exige
> Node >= 22.22.3.

## Levantar con Docker (recomendado)

Requiere Docker Desktop encendido y los repos `WEB` y `BACKEND` uno al lado del otro (con
`BACKEND/.env`). Un solo comando levanta todo: portal web, API en Go, PostgreSQL,
migraciones y las cuentas de demostración.

```bash
npm run docker:up      # docker compose up -d --build
npm run docker:logs    # logs de la web y de la API
npm run docker:down    # apagar todo
```

| Servicio | Qué es | Dirección |
| --- | --- | --- |
| `web` | Angular con recarga en caliente | http://localhost:4200 |
| `api` | API en Go con recarga en caliente (air) | http://localhost:8000 · documentación en http://localhost:8000/docs |
| `db` | PostgreSQL 16 | `localhost:5433` (DataGrip, psql) |
| `migrate` | Aplica las migraciones y sincroniza los permisos de los roles; termina | — |
| `seed` | Crea o actualiza las empresas y cuentas de demostración; termina | — |

La API, la base, `migrate` y `seed` vienen de `../BACKEND/docker-compose.yml` (el compose de
la web lo incluye). La primera vez tarda unos minutos en construir las imágenes.

**Cuentas reales** (están en la base de datos; las crea `seed`, ver
`BACKEND/cmd/argos/seed.go`):

| Correo | Empresa y rol |
| --- | --- |
| `ana.lopez@garrent.gt` | Garrent · Administradora |
| `jorge.pena@garrent.gt` | Garrent · Supervisor (menú reducido) |
| `carlos.ruiz@argos.gt` | Garrent (Supervisor) y Costa Limpia (Administrador): elige empresa al entrar |
| `maria.ramos@garrent.gt`, `luis.torres@garrent.gt`, `sofia.mendez@garrent.gt`, `ricardo.castillo@garrent.gt` | Limpieza, Mantenimiento, Seguridad y Propietario (roles de la app) |

Todas usan la contraseña de `ARGOS_SEED_PASSWORD` en `BACKEND/docker-compose.yml` (la
misma de las cuentas del "Modo demo" del mock). Solo para desarrollo: `seed` se niega a
correr en producción.

**Tu propia cuenta:** define `ARGOS_SEED_DEV_EMAIL`, `ARGOS_SEED_DEV_NAME` y
`ARGOS_SEED_DEV_PASSWORD` en `BACKEND/.env` (no se versiona) y corre
`docker compose up --no-deps seed`: queda como Administrador en Garrent y Costa Limpia.

* **`web-demo`** (opcional): build optimizado servido por nginx, todo simulado y sin
  backend, para mostrarlo a otros: `npm run docker:demo` → http://localhost:4280.

`docker/Dockerfile` también sirve para producción: `--build-arg CONFIGURATION=production`.

## Comandos sin Docker

```bash
npm install
npm start            # http://localhost:4200 · acceso contra la API en :8000 (levantarla con Docker)
npm run start:mock   # http://localhost:4200 · todo simulado, sin backend ("Modo demo" en el login)
npm run build        # producción en dist/ (todo contra la API real)
npm test             # vitest
```

## Qué es real y qué es simulado

Cada servicio `*-api.service.ts` define un contrato abstracto con dos implementaciones:
`Http*Api` (API en Go, `/api/v1`) y `Mock*Api` (simulado en el navegador). El entorno decide
**por módulo** cuál usar (`mocks` en `src/environments/*`, token `MOCK_MODULES`), así se
mezcla lo que ya existe en la API con lo que todavía no (reparto.md §3, regla 1).

| Módulo | development (`npm start`, Docker) | mock (`start:mock`) y demo | production |
| --- | --- | --- | --- |
| Acceso (`auth`: login, empresa, sesión) | **API real** | simulado | API real |
| Inicio (`dashboard`) | simulado | simulado | API real |
| Propiedades | simulado | simulado | API real |
| Colaboradores (`team`) | simulado | simulado | API real |
| Solicitar demo (`demoRequests`) | simulado | simulado | API real |

Las pantallas simuladas lo dicen arriba con un aviso **"Simulado"**. Los mocks reconocen las
empresas reales por nombre (Garrent, Costa Limpia) para mostrar sus datos de ejemplo. Cuando
un endpoint llegue a la API, basta con cambiar su módulo a `false` en
`environment.development.ts`.

El mock persiste sus datos en `localStorage` (claves `argos.mock.*`): lo que crees sobrevive
a una recarga. Para volver a la semilla, borrar esas claves desde las herramientas del
navegador.

## Pantallas

| Ruta | Ficha (ux-ui.md) | Qué hace |
| --- | --- | --- |
| `/` | — | Sitio público: fotografía real, ilustraciones propias, captura del panel, multiempresa, seguridad, origen del nombre y "Solicitar demo" (`/#demo` abre el formulario) |
| `/login` | W-A1, W-A2, W-A3 | Login con "recordarme 30 días", 2FA (428 → código), elegir empresa, recuperar contraseña; fotos de propiedades a la derecha |
| `/inicio` | W-B1 | Alertas de prioridad (reconocer con deshacer), indicadores, cumplimiento, ranking, mapa de propiedades, actividad y mantenimientos |
| `/propiedades` | W-C1 | Tarjetas o tabla, filtros en la URL, detalle en panel lateral (`?ver=CODIGO`), acceso cifrado con "Mostrar", alta con vista previa |
| `/colaboradores` | W-D1, W-O2 | Miembros por rol, cambio de rol con deshacer, suspender con confirmación, cerrar sesiones, invitaciones (enviar, reenviar, revocar) |
| `/itinerario`, `/inventario`, … | — | Secciones de fases siguientes: muestran qué traerán y en qué fase |

El menú lateral se construye desde los permisos del rol y las banderas del tenant
(`layouts/main-layout/navigation.ts`); cada ruta exige su permiso con `permissionGuard` y los
botones de escritura usan `*argosCan`.

## Estructura

```
src/app/
├── app.config.ts            # proveedores: router (view transitions), http, USE_MOCKS, AuthApi
├── app.routes.ts            # fronteras lazy + guards
├── core/
│   ├── auth/                # contrato de auth, permisos, TokenStorage, *argosCan
│   ├── guards/              # authGuard, guestGuard, permissionGuard
│   ├── http/                # ApiError (RFC 9457), Page<T>
│   ├── interceptors/        # Bearer + refresh único ante 401
│   ├── mocks/               # backend simulado: semillas y MockAuthApi
│   ├── services/            # toasts y confirmaciones
│   └── store/               # SessionStore (sesión, tenant, permisos, banderas)
├── layouts/                 # auth-layout, main-layout, overlays (toasts, confirmación)
├── shared/                  # design system: tokens, atoms, molecules, organisms, pipes
└── features/
    ├── landing/             # sitio público y solicitud de demo
    ├── auth/                # acceso
    ├── dashboard/           # inicio
    ├── properties/          # propiedades
    ├── team/                # colaboradores e invitaciones
    └── coming-soon/         # secciones planificadas
```

Las tiendas de cada pantalla se proveen en el propio componente (no en la ruta): se destruyen
al salir y al cambiar de empresa, así que la siguiente carga siempre es del tenant activo.

## Marca

Logotipo oficial en [`public/brand/`](public/brand): símbolo (`argos-mark.svg`,
`argos-mark-light.svg`), logotipo horizontal (`argos-logo.svg`, `argos-logo-light.svg`), ícono
de app (`argos-app-icon.svg`) y `public/favicon.svg`. En la web se usa el componente
`app-logo` (`shared/atoms/logo`). El concepto está en
[`docs/DISENO.md`](docs/DISENO.md#logotipo).

Las fotos de la landing y del login vienen de Unsplash y Wikimedia Commons (catálogo y
créditos en `shared/media/photos.ts`) y se cargan desde internet. Hay que reemplazarlas por
fotos propias antes de producción ([`docs/DISENO.md`](docs/DISENO.md#fotografía)).
