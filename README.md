# Delivery Equipo 4

Implementacion base del proyecto de delivery con arquitectura:

- Cliente-servidor
- Backend monolito modular por capas (`routes/controllers/services/repositories`)
- Frontend Angular con auth/session/profile base
- PostgreSQL en Supabase
- Auth con Supabase JWT validado en backend
- Pagos unicamente simulados
- Geolocalizacion MVP: el repartidor comparte su ultima ubicacion durante la ruta

## Estructura

- `apps/api`: API Express + TypeScript
- `apps/web`: frontend Angular con guardas por rol
- `supabase/schema.sql`: esquema inicial de BD
- `docs/backlog-tecnico.md`: plan por sprints

## Arranque rapido (backend)

1. Instalar dependencias del monorepo:

```bash
npm install
```

2. Copiar variables de entorno:

```bash
copy apps\\api\\.env.example apps\\api\\.env
```

En PowerShell tambien puedes usar:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
```

Importante: `apps/api/.env` **no** se sube al repositorio. Comparte ese archivo solo por canal privado
(por ejemplo, 1Password, Bitwarden, mensaje privado o variables de entorno del hosting).

3. Ejecutar `supabase/schema.sql` en SQL editor de Supabase.

4. Si ya tenias una base creada antes de estos cambios, ejecuta tambien:

```bash
supabase/add_product_image_url.sql
supabase/add_delivery_location.sql
```

5. (Opcional) Cargar datos demo de restaurantes y productos:

```bash
supabase/seed_demo.sql
```

Si ya habias corrido una version anterior del seed (menu igual en todos los restaurantes),
ejecuta esto para corregirlo:

```bash
supabase/fix_demo_menus.sql
```

Nota: `seed_demo.sql` usa usuarios reales de `public.users`. Si no tienes usuarios registrados
todavia, primero crea cuentas y completa perfil.

6. Iniciar API:

```bash
npm run dev:api
```

## Arranque rapido (frontend)

1. Editar valores reales en:

- `apps/web/src/environments/environment.development.ts`
- `apps/web/src/environments/environment.prod.ts`

Campos necesarios:

- `supabaseUrl`
- `supabaseAnonKey`
- `apiBaseUrl`

2. Iniciar frontend:

```bash
npm run dev:web
```

## Endpoints base

- `GET /health`
- `POST /auth/profile`
- `GET /auth/me`
- `GET /restaurants`
- `GET /restaurants/:restaurantId/products`
- `POST /restaurants/me/products`
- `POST /orders`
- `GET /orders/my`
- `PATCH /orders/:orderId/status`
- `GET /deliveries/available`
- `POST /deliveries/:orderId/accept`
- `PATCH /deliveries/:orderId/status`
- `POST /deliveries/:orderId/location`
- `POST /incidents`
- `GET /incidents`
- `GET /events/stream` (SSE)
- `GET /restaurants/me`
- `PUT /restaurants/me`
- `GET /restaurants/me/products`
- `DELETE /restaurants/me/products/:productId`
