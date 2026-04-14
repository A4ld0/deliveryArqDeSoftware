# Backlog Tecnico - MVP Delivery

## Sprint 0 - Base (esta entrega)
- [x] Monorepo con `apps/api` y `apps/web`
- [x] Backend Express + TypeScript con arquitectura modular por capas
- [x] Esquema SQL inicial para Supabase/Postgres
- [x] RBAC base (`client`, `driver`, `restaurant`, `admin`)
- [x] SSE base para notificaciones de estado

## Sprint 1 - Auth y perfiles
- [x] Integrar flujo real de login/signup desde frontend con Supabase Auth
- [x] Pantalla de onboarding para crear perfil en `/auth/profile`
- [x] Guards por rol en Angular

## Sprint 2 - Catalogo y menu
- [x] Modulo cliente: listar restaurantes y productos
- [ ] Modulo restaurante: CRUD de menu
- [ ] Validaciones de disponibilidad de productos

## Sprint 3 - Pedidos end-to-end
- [x] Carrito y checkout (pago simulado)
- [x] Crear pedido con `POST /orders`
- [ ] Flujo restaurante: aceptar/rechazar/listo para recoger
- [ ] Flujo repartidor: aceptar entrega -> en transito -> entregado

## Sprint 4 - Operacion y soporte
- [x] Incidencias (`/incidents`) - vista base
- [x] Admin: gestion de usuarios y estados - vista base
- [ ] Dashboard basico de metricas (cantidad de pedidos por estado)

## Sprint 5 - Calidad y cierre
- [ ] Cobertura de pruebas backend >= 70% en modulos criticos
- [ ] Pruebas E2E de flujos principales
- [ ] Hardening seguridad (rate limiting, logs estructurados, auditoria)
- [ ] Ajuste final de SRS/SPMP/SDD para trazabilidad 1:1
