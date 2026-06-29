# Guía de Arquitectura y Buenas Prácticas para Proyectos Angular

> Modern Standalone & Tailwind CSS

Este documento establece los lineamientos arquitectónicos, principios de diseño y estándares operativos para cualquier proyecto moderno basado en Angular, utilizando un enfoque **100% Standalone**, **Tailwind CSS** para la capa de estilos y un **Design System Atómico**.

---

## 1. Stack Tecnológico Base

| Área | Tecnología / Enfoque |
|------|----------------------|
| **Framework** | Angular (versión más reciente) con inicialización completamente Standalone (`bootstrapApplication`) |
| **Lenguaje** | TypeScript configurado en modo estricto (`"strict": true`) |
| **Estilos y UI** | Tailwind CSS (utility-first). Sin frameworks tradicionales rígidos o pesados como Bootstrap |
| **Design System** | Metodología de Diseño Atómico (Atomic Design) |
| **Enrutamiento** | Routing nativo standalone con `Routes`, `loadChildren` y `loadComponent`. Fuerte enfoque en Lazy Loading |
| **Gestión de Estado** | Angular Signals (estado local) + tiendas reactivas basadas en funciones (ej. `@ngrx/signals` o patrones inyectables ligeros) |
| **Cliente HTTP** | Configurado mediante `provideHttpClient()` con interceptores funcionales |
| **Asincronía** | RxJS para flujos complejos e integración con APIs. Signals priorizados para renderización en plantillas |

---

## 2. Principios Obligatorios de Arquitectura

### Cero NgModules

Queda **estrictamente prohibida** la creación de nuevos archivos `*.module.ts`. Toda la aplicación debe construirse sobre componentes, directivas y pipes con la bandera `standalone: true`.

### Prohibición de SharedModule Monolítico

No se debe agrupar código compartido en un único archivo modular. Los componentes utilitarios deben importarse de forma **explícita e individual** solo en los componentes que los requieran.

### Aislamiento de Entornos (Environments)

Las URLs de las APIs y las variables de configuración **jamás** deben importarse directamente desde los archivos de `environment` dentro de las capas de negocio (`features`). Deben consumirse mediante `InjectionToken` declarados en el núcleo del sistema.

### Separación de Responsabilidades (Estado vs. HTTP)

Los servicios encargados de realizar las peticiones HTTP (`*-api.service.ts`) deben ser **puros y agnósticos**:

- No deben almacenar estado interno
- No deben contener `Subject`, `BehaviorSubject` ni Signals mutables
- Su única función es conectar con la red y retornar datos

### Gestión del Estado de UI

El estado exclusivo de la interfaz (ej. si un modal está abierto, la pestaña activa, animaciones) debe vivir en **Signals locales** dentro del componente y no en tiendas globales o de feature.

### Fronteras de Carga Diferida (Lazy Loading estricto)

Es **absolutamente crítico y obligatorio** el manejo de rutas con Lazy Loading:

- Mantener un aislamiento estricto por dominio para garantizar el rendimiento inicial de la app
- Ningún módulo o página de una feature debe importar directamente componentes enrutables o páginas de otra feature
- Todo acceso inter-dominio debe realizarse a través del sistema de rutas diferidas

### Desacoplamiento de Layouts

Los layouts de la aplicación (estructuras globales de visualización) pertenecen al directorio de infraestructura visual (`layouts/`) y deben estar completamente separados de los componentes compartidos y lógicas de negocio.

---

## 3. Blueprint del Sistema de Archivos

Esta estructura es **mandatoria** e integra el enfoque de Atomic Design en la carpeta `shared/`:

```
src/app/
├── app.config.ts                  # Configuración centralizada de proveedores globales
├── app.routes.ts                  # Definición de fronteras de enrutamiento raíz
│
├── core/                          # INFRAESTRUCTURA GLOBAL (Se instancia una sola vez)
│   ├── auth/                      # Guardias, servicios y tokens de autenticación
│   ├── guards/                    # Protectores de rutas transversales
│   ├── interceptors/              # Interceptores funcionales (Tokens, errores HTTP)
│   ├── services/                  # Servicios globales utilitarios (Temas, Logs)
│   ├── store/                     # Estado global mínimo (Datos de sesión, usuario activo)
│   └── tokens/                    # Centralización de InjectionTokens (URLs de APIs)
│
├── layouts/                       # ESTRUCTURAS DE PÁGINA (Layouts del sistema)
│   ├── main-layout/               # Layout principal con navegación lateral/superior
│   └── auth-layout/               # Layout limpio para pantallas de login/registro
│
├── shared/                        # DESIGN SYSTEM ATÓMICO (100% Agnóstico al negocio)
│   ├── tokens/                    # Constantes de diseño (variables CSS, tailwind preset)
│   ├── atoms/                     # Componentes indivisibles (Botones, Inputs, Badges, Iconos)
│   ├── molecules/                 # Agrupaciones simples (Input con Label, SearchBar, Cards simples)
│   ├── organisms/                 # Secciones complejas (Header, Tablas de datos complejas, Formularios enteros)
│   ├── templates/                 # Esqueletos de página sin contenido dinámico (Grid layouts, Skeletons de vista)
│   ├── directives/                # Directivas globales utilitarias
│   └── pipes/                     # Pipes de formateo transversales
│
└── features/                      # CAPA DE DOMINIOS DE NEGOCIO (Módulos independientes)
    ├── [nombre-dominio-a]/        # Ejemplo: 'billing', 'inventory', 'customers'
    │   ├── [dominio-a].routes.ts  # Enrutamiento interno del dominio
    │   ├── pages/                 # SCREENS: Vistas finales instanciando Templates con estado real
    │   ├── shared/                # Componentes reutilizables EXCLUSIVOS de este dominio
    │   ├── services/              # Consumo de APIs específicas (*-api.service.ts)
    │   ├── store/                 # Tienda de estado para la lógica de este dominio
    │   └── models/                # Interfaces, tipos y tipados de datos de la feature
    │
    └── [nombre-dominio-b]/
        └── ...
```

---

## 4. Estrategia de Enrutamiento (Lazy Loading obligatorio)

Es de extrema importancia que toda la aplicación se base en una arquitectura de **carga diferida (Lazy Loading)** para mantener un bundle inicial ligero y optimizar los tiempos de carga (FCP y TTI).

### Rutas raíz

Las rutas raíz (`app.routes.ts`) solo deben actuar como despachadores de alto nivel mediante el uso de `loadChildren`, **sin cargar ningún componente de feature directamente**:

```typescript
export const APP_ROUTES: Routes = [
  {
    path: 'dashboard',
    loadChildren: () =>
      import('./features/dashboard/dashboard.routes').then(m => m.DASHBOARD_ROUTES),
  },
];
```

### Rutas internas por dominio

Cada sub-dominio debe gestionar de forma interna sus pantallas hijas (Screens) utilizando `loadComponent` para asegurar un empaquetamiento optimizado (tree-shaking) a nivel de página:

```typescript
export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/overview/overview.component').then(m => m.OverviewComponent),
  },
];
```

### Providers con ciclo de vida de ruta

Si una tienda de estado o servicio requiere tener el mismo ciclo de vida que la ruta (destruirse automáticamente cuando el usuario sale de la sección), se debe declarar dentro del arreglo `providers` de la ruta correspondiente.

---

## 5. Gestión de Estado Eficiente

### Estado mínimo global

El estado transversal de la aplicación debe limitarse estrictamente a:

- Información de la sesión activa
- Configuraciones globales de usuario
- Permisos

### Flujo unidireccional de datos

1. El componente lee la información mediante **Signals** provistos por la tienda de estado
2. Las acciones del usuario desencadenan llamadas a métodos dentro de la tienda
3. La tienda interactúa con la capa de servicios HTTP, procesa los datos y actualiza el estado de forma controlada

> **Regla:** No se debe mutar el estado directamente desde las plantillas HTML ni desde los controladores de los componentes.

---

## 6. Integración de Tailwind CSS y Design System Atómico

La consistencia visual y la reusabilidad se garantizan mediante la estricta implementación de **Atomic Design** apoyado en Tailwind CSS:

| Nivel | Descripción |
|-------|-------------|
| **Tokens** (Fundamentos) | Colores de marca, fuentes, espaciados y breakpoints definidos en `tailwind.config.js` y, de ser necesario, en variables CSS base. Prohibido hardcodear valores arbitrarios en el HTML (ej. evitar `bg-[#f3a123]`) |
| **Atoms** (Átomos) | Componentes UI básicos y de responsabilidad única (ej. `<app-button>`, `<app-input>`, `<app-icon>`). Usan Tailwind para estilo base y variaciones según `@Input()` |
| **Molecules** (Moléculas) | Combinación de 2 o más átomos para crear un bloque funcional simple (ej. `<app-form-field>` que une Label, Input y mensaje de error) |
| **Organisms** (Organismos) | Estructuras UI complejas y autónomas construidas a partir de moléculas y átomos (ej. `<app-navbar>`, `<app-data-table>`) |
| **Templates** (Plantillas) | Componentes a nivel de página que definen el layout estructural y dónde van los organismos, **sin** conexión a servicios de datos (no tienen inyección de stores) |
| **Screens** (Páginas/Vistas) | Componentes en `features/[dominio]/pages/`. Vista real conectada al enrutador. Importan un Template y le pasan el estado real (Signals) consumido desde la tienda o servicio del dominio |

---

## 7. Capa de Servicios y Consumo HTTP

- Todos los servicios HTTP de negocio deben nombrarse bajo la convención `<nombre>-api.service.ts`
- Su única responsabilidad es mapear los parámetros de entrada, ejecutar la acción de red mediante `HttpClient` y retornar un flujo de datos (`Observable` o `Promise`)
- La inyección de tokens de autorización (JWT), refresco de sesiones expiradas y el formateo base de errores globales se deben realizar en un **único interceptor funcional** inyectado en la configuración raíz

---

## 8. Convenciones de Nomenclatura Estrictas

Para mantener la uniformidad en todo el repositorio:

| Tipo | Convención |
|------|------------|
| Archivos de ruta | `<nombre-feature>.routes.ts` |
| Controladores enrutables (Screens/Páginas) | `pages/<nombre>/<nombre>.component.ts` |
| Componentes compartidos de feature | `shared/components/<nombre>/<nombre>.component.ts` |
| Servicios de API | `<nombre>-api.service.ts` |
| Gestores de estado (Stores) | `<nombre>.store.ts` |
| Modelos de datos | `<nombre>.model.ts` |
| Tokens de inyección | `<contexto>.tokens.ts` |

---

## 9. Diseño Responsive · Mobile-First (Obligatorio)

Toda la interfaz se construye con un enfoque **Mobile-First**: se diseña y se
estiliza primero para la pantalla más pequeña y, a partir de ahí, se **escala
hacia arriba** mediante los breakpoints de Tailwind. Esto garantiza que el panel
sea plenamente usable en móvil, tablet y escritorio sin layouts rotos.

### Reglas

- **Base sin prefijo = móvil.** Las utilidades sin prefijo (`flex-col`, `p-6`,
  `text-[28px]`) describen el estado en pantalla pequeña. Los breakpoints
  (`sm:`, `md:`, `lg:`, `xl:`) **sólo añaden o sobrescriben** para pantallas
  mayores. Prohibido el patrón inverso (estilar para escritorio y "arreglar"
  con `max-*`).
- **Breakpoints estándar de Tailwind** como única fuente: `sm` 640px ·
  `md` 768px · `lg` 1024px · `xl` 1280px · `2xl` 1536px. No introducir
  breakpoints arbitrarios.
- **Sin desbordes horizontales.** Los contenedores fluyen al ancho disponible
  (`w-full`, `min-w-0`, `flex-1`); los anchos fijos del diseño (ej. el split
  46% del login, la tarjeta de 1240px) se aplican **sólo** a partir de `md:`.
- **Layouts que reflowan.** Las rejillas multicolumna del escritorio
  (`md:grid-cols-2`, `grid-cols-[0.95fr_1.5fr]`) colapsan a una sola columna en
  móvil. La navegación lateral (sidebar) se oculta/condensa en móvil y el
  contenido principal ocupa el ancho completo.
- **Áreas táctiles.** Botones y controles mantienen una altura mínima cómoda
  (~44px) en móvil; usar los tokens de altura del design system.
- **Unidades de viewport modernas.** Preferir `min-h-[100dvh]` sobre `100vh`
  para evitar saltos por la barra de direcciones en móvil.
- **Verificación.** Toda pantalla nueva debe revisarse al menos en tres anchos
  representativos (≈375px móvil, ≈768px tablet, ≥1280px escritorio) antes de
  darse por terminada.
