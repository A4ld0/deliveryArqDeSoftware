# E4 Delivery Platform
---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Angular 20 (standalone components, signals) |
| Backend | Node.js + Express + TypeScript |
| Base de datos | PostgreSQL vía Supabase |
| Autenticación | Supabase Auth (JWT) |
| Tiempo real | Server-Sent Events (SSE) |
| Mapas | Leaflet.js + OpenStreetMap + Nominatim |
| Monorepo | npm workspaces |

---

## Estructura del proyecto

```
deliveryArqDeSoftware/
├── apps/
│   ├── api/                  # Backend Express + TypeScript
│   │   └── src/
│   │       ├── modules/      # auth, orders, deliveries, restaurants, products, incidents, events, admin
│   │       ├── middlewares/  # auth JWT, require-role, error-handler
│   │       ├── domain/       # order-status state machine, roles
│   │       ├── realtime/     # SSE broker + order events
│   │       └── lib/          # db, http-error, transaction, async-handler
│   └── web/                  # Frontend Angular 20
│       └── src/app/
│           ├── pages/        # client, restaurant, driver, admin, auth, profile
│           ├── components/   # OrderMapComponent, LocationPickerComponent
│           ├── core/         # ApiService, SessionService, ProfileService, models
│           ├── guards/       # role-based route guards
│           └── interceptors/ # auth token interceptor
├── supabase/                 # Migraciones SQL originales
├── DB_Backup/                # Respaldo de BD + esquema completo actual
│   ├── FULL_SCHEMA_CURRENT.sql
│   ├── seed_demo.sql
│   └── migrations/
└── MANUAL.md                 # Manual de instalación y ejecución detallado
```

---

## Roles y capacidades

| Rol | Capacidades principales |
|-----|------------------------|
| **Client** | Explorar restaurantes, hacer pedidos, seguir entrega en tiempo real |
| **Restaurant** | Gestionar menú y precios, aceptar/rechazar pedidos, marcar pedido listo |
| **Driver** | Ver pedidos disponibles, transmitir GPS en tiempo real, confirmar entregas |
| **Admin** | Dashboard global con métricas, gestión de usuarios e incidentes |

---

## Flujo de estados de un pedido

```
PENDING → ACCEPTED → READY_FOR_PICKUP → ASSIGNED → IN_TRANSIT → DELIVERED
       ↘ REJECTED                      ↘ CANCELLED
```

---

## API — Endpoints principales

### Auth & Perfil
| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/auth/register` | Registro de usuario con rol |
| `GET` | `/auth/profile` | Perfil del usuario autenticado |
| `PATCH` | `/auth/profile` | Actualizar perfil |

### Restaurantes
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/restaurants` | Listar restaurantes abiertos |
| `GET` | `/restaurants/:id/products` | Productos de un restaurante |
| `PUT` | `/restaurants/mine` | Crear o actualizar el propio restaurante |

### Pedidos
| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/orders` | Crear pedido (rol: client) |
| `GET` | `/orders/my` | Mis pedidos (según rol) |
| `PATCH` | `/orders/:id/status` | Actualizar estado del pedido |
| `GET` | `/orders/:id/items` | Detalle de productos del pedido |

### Entregas
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/deliveries/available` | Pedidos disponibles para tomar (rol: driver) |
| `POST` | `/deliveries/:orderId/accept` | Aceptar entrega |
| `PATCH` | `/deliveries/:orderId/status` | Actualizar estado de la entrega |
| `PATCH` | `/deliveries/:orderId/location` | Actualizar coordenadas GPS del repartidor |
| `GET` | `/deliveries/stats` | Estadísticas del repartidor |

### Incidentes
| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/incidents` | Reportar incidente |
| `GET` | `/incidents` | Listar incidentes (admin) |
| `PATCH` | `/incidents/:id` | Actualizar estado de incidente |

### Tiempo real (SSE)
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/events/orders/:id` | Stream SSE de cambios de estado de un pedido |
| `GET` | `/events/orders/:id/location` | Stream SSE de ubicación del repartidor |

### Admin
| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/admin/metrics` | Métricas globales de la plataforma |
| `GET` | `/admin/users` | Listar todos los usuarios |
| `PATCH` | `/admin/users/:id` | Modificar usuario |

---

## Inicio rápido

Consulta el **[MANUAL.md](./MANUAL.md)** para instrucciones completas y detalladas. Versión abreviada:

```bash
# 1. Instalar dependencias (monorepo)
npm install

# 2. Configurar variables de entorno del backend
cp apps/api/.env.example apps/api/.env
# Editar apps/api/.env con tus credenciales de Supabase

# 3. Crear tablas en Supabase (SQL Editor)
# Ejecutar: DB_Backup/FULL_SCHEMA_CURRENT.sql
# Ejecutar (opcional): DB_Backup/seed_demo.sql

# 4. Configurar el frontend
# Editar: apps/web/src/environments/environment.development.ts
# Rellenar supabaseUrl, supabaseAnonKey, apiBaseUrl

# 5. Iniciar backend (terminal 1)
cd apps/api && npm run dev

# 6. Iniciar frontend (terminal 2)
cd apps/web && npm start
```

La app estará disponible en `http://localhost:4200`.

---

## Base de datos

El respaldo completo se encuentra en [`DB_Backup/`](./DB_Backup/):

- **`FULL_SCHEMA_CURRENT.sql`** — esquema completo y actualizado listo para ejecutar
- **`seed_demo.sql`** — datos de prueba (6 restaurantes con menús diferenciados)
- **`migrations/`** — historial de migraciones numeradas (`00` → `04`)

---

## Funcionalidades destacadas

- **Mapa en tiempo real** — el cliente ve al repartidor moverse mientras hace la entrega (SSE + Leaflet)
- **Geocodificación** — dirección de entrega se ubica automáticamente en el mapa (Nominatim)
- **Geocodificación inversa** — al mover el pin, el campo de dirección se actualiza solo
- **Multi-rol** — cuatro roles independientes con rutas, guards y vistas propias
- **State machine** de pedidos — transiciones controladas con validación de rol por estado
- **Pagos simulados** — flujo completo de pago y reembolso en cancelaciones
