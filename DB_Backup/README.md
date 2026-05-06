# DB_Backup — E4 Delivery Platform

## Contenido

| Archivo | Descripción |
|---------|-------------|
| `FULL_SCHEMA_CURRENT.sql` | Esquema completo y actualizado listo para ejecutar en una BD nueva |
| `seed_demo.sql` | Datos de prueba (restaurantes y menús de demostración) |
| `migrations/00_schema.sql` | Esquema base original |
| `migrations/01_add_product_image_url.sql` | Agrega `image_url` a `products` |
| `migrations/02_add_user_location.sql` | Agrega `latitude/longitude` a `users` |
| `migrations/03_add_delivery_location.sql` | Agrega GPS a `deliveries` |
| `migrations/04_add_order_geo_and_tip.sql` | Agrega `tip_amount` y coordenadas de entrega a `orders` |
| `migrations/04_fix_demo_menus.sql` | Corrige menús duplicados en datos de demo |

## Cómo restaurar en una base de datos nueva (Supabase)

1. Abre el **SQL Editor** de tu proyecto en Supabase (o usa `psql`).
2. Ejecuta **`FULL_SCHEMA_CURRENT.sql`** — crea todas las tablas, índices y triggers.
3. (Opcional) Ejecuta **`seed_demo.sql`** para cargar restaurantes y menús de prueba.

## Cómo aplicar migraciones en una BD existente

Si ya tienes una BD creada con `00_schema.sql`, aplica las migraciones en orden numérico:

```sql
-- En el SQL Editor de Supabase, uno por uno:
\i migrations/01_add_product_image_url.sql
\i migrations/02_add_user_location.sql
\i migrations/03_add_delivery_location.sql
\i migrations/04_add_order_geo_and_tip.sql
```

## Notas

- El proyecto usa **Supabase** como BaaS; la tabla `auth.users` es administrada por Supabase Auth y no se incluye en este backup.
- Las migraciones son idempotentes (`IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`).
- No se incluyen datos de producción (usuarios, pedidos reales) por privacidad.
