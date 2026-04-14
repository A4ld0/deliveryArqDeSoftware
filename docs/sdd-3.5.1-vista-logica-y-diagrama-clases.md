# SDD - 3.5.1 Logical View (propuesta final)

## 3.5.1 Logical View

La Vista Logica describe la estructura funcional del sistema de delivery a nivel de dominio, mostrando las entidades principales y sus relaciones para soportar autenticacion, catalogo, pedidos, entrega, pagos simulados e incidencias.

El sistema se organiza en los siguientes modulos de dominio:

- `Users`: gestiona perfil, rol y estado de cuenta para control RBAC.
- `Restaurants`: administra el comercio y su menu.
- `Orders`: gestiona carrito, checkout, items y ciclo de vida del pedido.
- `Deliveries`: administra la asignacion del repartidor y estados de entrega.
- `Payments`: registra transacciones simuladas y reembolsos simulados.
- `Incidents`: registra y da seguimiento a incidencias asociadas a pedidos.

### Reglas de negocio reflejadas en el modelo

- Un `User` puede ser `client`, `restaurant`, `driver` o `admin`.
- Un restaurante tiene un unico propietario (`owner_user_id`) y multiples productos.
- Un pedido pertenece a un cliente y a un restaurante.
- Un pedido contiene uno o mas `OrderItem`.
- Un pedido puede tener una sola asignacion de entrega activa (`DeliveryAssignment`) para cumplir BR-01.
- El flujo de estado del pedido sigue BR-02:
  `PENDING -> ACCEPTED/REJECTED -> READY_FOR_PICKUP -> ASSIGNED -> IN_TRANSIT -> DELIVERED` (o `CANCELLED` segun reglas).
- Los pagos son simulados (`SIMULATED_APPROVED`, `SIMULATED_REFUNDED`).
- Las incidencias se vinculan a un pedido y son reportadas por usuarios relacionados al pedido o por admin.

### Alineacion con alcance MVP actual

- Geolocalizacion en asignacion de repartidor se considera extension futura y no requisito obligatorio del MVP implementado.
- Integracion de pasarela de pago real queda fuera de alcance; el sistema usa pagos simulados.

## 3.5.1.1 Diagrama de Clases (UML)

```mermaid
classDiagram

class UserRole {
  <<enumeration>>
  client
  restaurant
  driver
  admin
}

class OrderStatus {
  <<enumeration>>
  PENDING
  ACCEPTED
  REJECTED
  READY_FOR_PICKUP
  ASSIGNED
  IN_TRANSIT
  DELIVERED
  CANCELLED
}

class PaymentStatus {
  <<enumeration>>
  SIMULATED_APPROVED
  SIMULATED_REFUNDED
}

class IncidentStatus {
  <<enumeration>>
  OPEN
  IN_REVIEW
  RESOLVED
  CLOSED
}

class User {
  +uuid auth_user_id
  +string email
  +string full_name
  +UserRole role
  +string phone
  +string address
  +boolean is_active
  +datetime created_at
  +datetime updated_at
}

class Restaurant {
  +bigint id
  +uuid owner_user_id
  +string name
  +string description
  +string address
  +string phone
  +boolean is_open
  +datetime created_at
  +datetime updated_at
}

class Product {
  +bigint id
  +bigint restaurant_id
  +string name
  +string description
  +decimal price
  +string category
  +string image_url
  +boolean available
  +datetime created_at
}

class Order {
  +bigint id
  +uuid customer_id
  +bigint restaurant_id
  +OrderStatus status
  +decimal subtotal
  +decimal delivery_fee
  +decimal total
  +string delivery_address
  +string cancellation_reason
  +datetime created_at
  +datetime updated_at
}

class OrderItem {
  +bigint id
  +bigint order_id
  +bigint product_id
  +int quantity
  +decimal unit_price
  +decimal line_total
}

class Payment {
  +bigint id
  +bigint order_id
  +string payment_method
  +PaymentStatus payment_status
  +decimal amount
  +datetime paid_at
}

class DeliveryAssignment {
  +bigint id
  +bigint order_id
  +uuid driver_id
  +OrderStatus status
  +datetime assigned_at
  +datetime picked_up_at
  +datetime delivered_at
}

class OrderStatusHistory {
  +bigint id
  +bigint order_id
  +OrderStatus status
  +uuid changed_by
  +string notes
  +datetime created_at
}

class Incident {
  +bigint id
  +bigint order_id
  +uuid reported_by
  +string title
  +string description
  +IncidentStatus status
  +datetime created_at
  +datetime updated_at
}

User "1" --> "0..1" Restaurant : owns
Restaurant "1" --> "0..*" Product : publishes

User "1" --> "0..*" Order : creates
Restaurant "1" --> "0..*" Order : receives

Order "1" --> "1..*" OrderItem : contains
Product "1" --> "0..*" OrderItem : referenced_by

Order "1" --> "0..1" Payment : has

Order "1" --> "0..1" DeliveryAssignment : assigned_to
User "1" --> "0..*" DeliveryAssignment : drives

Order "1" --> "0..*" OrderStatusHistory : transitions
User "1" --> "0..*" OrderStatusHistory : changed_by

Order "1" --> "0..*" Incident : linked_to
User "1" --> "0..*" Incident : reports
```

## Nota de uso en el SDD

Este bloque puede insertarse directamente en la seccion `3.5.1 Logical View` del SDD. Si el formato final del documento requiere imagen UML en lugar de Mermaid, este mismo modelo puede exportarse a PlantUML o draw.io manteniendo identicas entidades y cardinalidades.
