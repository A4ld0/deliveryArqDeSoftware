# Manual de Ejecución — E4 Delivery Platform

> **Para exportar a PDF:** Abre este archivo en VS Code y usa la extensión *Markdown PDF*, o ejecuta:
> ```bash
> npx md-to-pdf MANUAL.md
> ```

---

## Índice

1. [Requisitos previos](#1-requisitos-previos)
2. [Clonar el repositorio](#2-clonar-el-repositorio)
3. [Configurar la base de datos (Supabase)](#3-configurar-la-base-de-datos-supabase)
4. [Configurar el backend (API)](#4-configurar-el-backend-api)
5. [Configurar el frontend (Angular)](#5-configurar-el-frontend-angular)
6. [Iniciar el proyecto](#6-iniciar-el-proyecto)
7. [Credenciales de acceso de ejemplo](#7-credenciales-de-acceso-de-ejemplo)
8. [Flujo de prueba sugerido](#8-flujo-de-prueba-sugerido)
9. [Solución de problemas comunes](#9-solución-de-problemas-comunes)

---

## 1. Requisitos previos

Asegúrate de tener instalados los siguientes programas antes de comenzar:

| Herramienta | Versión mínima | Verificación |
|-------------|---------------|--------------|
| Node.js | 20 LTS | `node -v` |
| npm | 10+ | `npm -v` |
| Git | 2.x | `git --version` |
| Cuenta Supabase | — | [supabase.com](https://supabase.com) (gratuita) |

---

## 2. Clonar el repositorio

```bash
git clone <URL-del-repositorio>
cd deliveryArqDeSoftware
```

Instala las dependencias de todos los workspace de una sola vez:

```bash
npm install
```

Esto instala las dependencias tanto de `apps/api` como de `apps/web`.

---

## 3. Configurar la base de datos (Supabase)

### 3.1 Crear el proyecto en Supabase

1. Inicia sesión en [supabase.com](https://supabase.com) y crea un nuevo proyecto.
2. Anota las siguientes credenciales desde **Project Settings**:
   - **Project URL** (ej. `https://xxxx.supabase.co`)
   - **Anon/Public Key**
   - **Database URL** (en *Settings → Database → Connection string → URI*)
   - **JWKS URL**: `https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json`
   - **JWT Issuer**: `https://<project-ref>.supabase.co/auth/v1`

### 3.2 Crear las tablas

1. En el panel de Supabase, ve a **SQL Editor**.
2. Copia y ejecuta el contenido de **`DB_Backup/FULL_SCHEMA_CURRENT.sql`**.
3. (Opcional) Para cargar restaurantes y menús de prueba, ejecuta también **`DB_Backup/seed_demo.sql`**.

### 3.3 Configurar autenticación

En **Authentication → Settings** de Supabase:
- Habilita el proveedor **Email** (activo por defecto).
- Desactiva "Confirm email" si quieres registro instantáneo en desarrollo.

---

## 4. Configurar el backend (API)

### 4.1 Crear el archivo `.env`

```bash
cp apps/api/.env.example apps/api/.env
```

Edita `apps/api/.env` con tus datos reales:

```env
NODE_ENV=development
PORT=3001
CORS_ORIGIN=http://localhost:4200

# Supabase Postgres — Project Settings → Database → URI
DATABASE_URL=postgresql://postgres.<project-ref>:<password>@<host>:5432/postgres

# Supabase Auth
SUPABASE_JWKS_URL=https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json
SUPABASE_JWT_ISSUER=https://<project-ref>.supabase.co/auth/v1
SUPABASE_JWT_AUDIENCE=authenticated
```

---

## 5. Configurar el frontend (Angular)

Edita el archivo de entorno de desarrollo:

**`apps/web/src/environments/environment.development.ts`**

```typescript
export const environment = {
  production: false,
  supabaseUrl: 'https://<project-ref>.supabase.co',
  supabaseAnonKey: '<anon-public-key>',
  apiBaseUrl: 'http://localhost:3001'
};
```

> Los valores de `supabaseUrl` y `supabaseAnonKey` se obtienen en **Project Settings → API** en Supabase.

---

## 6. Iniciar el proyecto

Abre **dos terminales** de forma simultánea.

### Terminal 1 — Backend (API)

```bash
cd apps/api
npm run dev
```

El servidor se inicia en `http://localhost:3001`.
Verifica que esté corriendo con:

```bash
curl http://localhost:3001/health
# Respuesta esperada: {"status":"ok", ...}
```

### Terminal 2 — Frontend (Angular)

```bash
cd apps/web
npm start
```

La aplicación se abre en `http://localhost:4200`.

---

## 7. Credenciales de acceso de ejemplo

Para probar la plataforma necesitas crear usuarios con distintos roles. Usa el registro normal en la app y asigna el rol desde Supabase o crea los usuarios directamente.

> **Nota:** el rol se asigna en la tabla `users` de Supabase. Al registrarse, el sistema guarda el perfil con el rol elegido en el formulario de onboarding.

### Usuarios de prueba sugeridos

Regístrate en `/auth/register` con los siguientes correos (usa contraseñas que recuerdes):

| Rol | Email de ejemplo | Descripción |
|-----|-----------------|-------------|
| `client` | `cliente@test.com` | Puede explorar restaurantes y hacer pedidos |
| `restaurant` | `restaurante@test.com` | Gestiona un negocio, menú y pedidos entrantes |
| `driver` | `repartidor@test.com` | Acepta entregas y actualiza su ubicación en tiempo real |
| `admin` | `admin@test.com` | Acceso total al panel de administración |

---

## 8. Flujo de prueba sugerido

Sigue este orden para probar todos los roles de punta a punta:

### Paso 1 — Configurar el restaurante
1. Inicia sesión con la cuenta `restaurant`.
2. En el onboarding, escribe el nombre del negocio y busca la dirección en el mapa.
3. Agrega al menos 2 productos desde **Menú → Nuevo Platillo**.
4. Activa el negocio con el botón "Activar Servicio".

### Paso 2 — Hacer un pedido (cliente)
1. Inicia sesión con la cuenta `client`.
2. Abre **Explorar** y selecciona el restaurante creado.
3. Agrega productos al carrito y pulsa **Ir al Checkout**.
4. Ajusta la ubicación de entrega en el mapa y confirma el pedido.
5. Ve a **Mis Pedidos** — el pedido aparece en estado `PENDING`.

### Paso 3 — Aceptar y preparar el pedido (restaurante)
1. Inicia sesión con la cuenta `restaurant`.
2. En **Pedidos**, aparece el pedido con estado `PENDING`.
3. Pulsa **Aceptar** → el estado cambia a `ACCEPTED`.
4. Cuando el platillo esté listo, pulsa **Listo para Entrega** → `READY_FOR_PICKUP`.

### Paso 4 — Entregar el pedido (repartidor)
1. Inicia sesión con la cuenta `driver`.
2. En **Servicios**, aparece el pedido disponible con el mapa del trayecto.
3. Pulsa **Aceptar Entrega** → el pedido queda en estado `ASSIGNED`.
4. Pulsa **Iniciar Ruta y GPS** → activa la transmisión GPS en tiempo real (`IN_TRANSIT`).
5. En el mapa del cliente y del restaurante se ve el ícono del repartidor moviéndose.
6. Pulsa **Confirmar Entrega** → estado final `DELIVERED`.

### Paso 5 — Verificar en tiempo real (cliente)
1. Durante el Paso 4, el cliente puede ver en **Mis Pedidos** cómo el estado cambia y el repartidor se mueve en el mapa en vivo.

### Paso 6 — Administración
1. Inicia sesión con la cuenta `admin`.
2. Revisa métricas generales, usuarios y pedidos en el panel de administración.

---

## 9. Solución de problemas comunes

| Problema | Causa probable | Solución |
|----------|---------------|----------|
| `Error connecting to database` | `DATABASE_URL` incorrecta | Verifica la URL en Supabase → Settings → Database |
| `JWT verification failed` | `SUPABASE_JWKS_URL` mal configurada | Revisa que el `<project-ref>` sea correcto |
| Pedido no aparece en restaurante | El usuario no tiene rol `restaurant` | Verifica la tabla `users` en Supabase |
| Mapa no carga | Sin conexión a internet (usa OpenStreetMap) | Verifica conexión; el mapa requiere acceso a tiles externos |
| `CORS` en desarrollo | `CORS_ORIGIN` no coincide | Asegúrate que `CORS_ORIGIN=http://localhost:4200` en el `.env` |
| GPS no funciona | El navegador bloquea geolocalización | Usa Chrome/Firefox y permite la geolocalización |

---

*E4 Delivery Platform — Arquitectura de Software — 2026*
