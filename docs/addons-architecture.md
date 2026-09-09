# Arquitectura Canónica del Subsistema de Add-ons — Citiox SaaS

## 1. Resumen Ejecutivo
El subsistema de Add-ons de Citiox ha sido reestructurado como un motor canónico, universal, persistente, multi-tenant y auditable. Reemplaza el almacenamiento volátil en memoria y las mutaciones en `customFeatures` por modelos relacionales estrictos en Prisma ORM, respetando la inmutabilidad de precios para Socios Fundadores (`lockedPrice`) y garantizando períodos de gracia al corte en cancelaciones.

---

## 2. Modelo Relacional de Datos (Prisma ORM)

```prisma
enum AddonType {
  CAPABILITY
  LIMIT
}

enum SubscriptionAddonStatus {
  ACTIVE
  PAUSED
  CANCELLED
}

enum SubscriptionAddonAction {
  PURCHASE
  CANCEL_SCHEDULED
  CANCEL_IMMEDIATE
  UPDATE_QUANTITY
  PAUSE
  RESUME
}

model Addon {
  id                  String              @id @default(uuid())
  code                String              @unique
  name                String
  description         String?
  priceMonthly        Float
  type                AddonType
  targetKey           String
  amount              Int?
  stackable           Boolean             @default(false)
  maxQuantity         Int?
  active              Boolean             @default(true)
  createdAt           DateTime            @default(now())
  updatedAt           DateTime            @updatedAt

  subscriptionAddons  SubscriptionAddon[]
}

model SubscriptionAddon {
  id                  String                    @id @default(uuid())
  subscriptionId      String
  addonId             String
  status              SubscriptionAddonStatus   @default(ACTIVE)
  quantity            Int                       @default(1)
  priceContracted     Float
  billingCycle        String                    @default("monthly")
  cancelAtPeriodEnd   Boolean                   @default(false)
  effectiveUntil      DateTime?
  startedAt           DateTime                  @default(now())
  cancelledAt         DateTime?
  updatedAt           DateTime                  @updatedAt

  subscription        Suscripcion               @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)
  addon               Addon                     @relation(fields: [addonId], references: [id])
  history             SubscriptionAddonHistory[]

  @@unique([subscriptionId, addonId])
}

model SubscriptionAddonHistory {
  id                  String                   @id @default(uuid())
  subscriptionAddonId String?
  subscriptionId      String?
  addonId             String?
  action              SubscriptionAddonAction
  performedBy         String                   @default("SYSTEM")
  quantityBefore      Int?
  quantityAfter       Int?
  priceBefore         Float?
  priceAfter          Float?
  statusBefore        String?
  statusAfter         String?
  reason              String?
  createdAt           DateTime                 @default(now())

  subscriptionAddon   SubscriptionAddon?       @relation(fields: [subscriptionAddonId], references: [id], onDelete: SetNull)
}
```

---

## 3. Catálogo Canónico de 10 Add-ons

| Código | Nombre | Tipo | targetKey | Monto | Acumulable | Precio ($/m) |
|---|---|---|---|---|---|---|
| `ADDON_ECOMMERCE` | Tienda Online & Catálogo Digital | CAPABILITY | `ECOMMERCE` | — | No | $15.00 |
| `ADDON_DELIVERY` | Despacho y Gestión de Delivery | CAPABILITY | `DELIVERY` | — | No | $12.00 |
| `ADDON_PROMOTIONS` | Motor de Promociones y Cupones | CAPABILITY | `PROMOTIONS` | — | No | $9.00 |
| `ADDON_COMMUNICATION_CENTER` | Centro de Comunicaciones WhatsApp | CAPABILITY | `COMMUNICATION_CENTER` | — | No | $15.00 |
| `ADDON_API_ACCESS` | Acceso a API & Webhooks | CAPABILITY | `API_ACCESS` | — | No | $25.00 |
| `ADDON_BRANCH_EXTRA` | Sucursal Adicional | LIMIT | `MAX_BRANCHES` | +1 | Sí (Sin Máx) | $10.00 |
| `ADDON_USER_EXTRA` | Usuario Adicional de Sistema | LIMIT | `MAX_USERS` | +1 | Sí (Sin Máx) | $5.00 |
| `ADDON_STAFF_EXTRA` | Profesional o Personal Adicional | LIMIT | `MAX_STAFF` | +1 | Sí (Sin Máx) | $5.00 |
| `ADDON_APPOINTMENTS_EXTRA` | Paquete de 500 Citas / Reservas | LIMIT | `MAX_APPOINTMENTS_MONTHLY` | +500 | Sí (Sin Máx) | $9.00 |
| `ADDON_ORDERS_EXTRA` | Paquete de 500 Órdenes / Ventas | LIMIT | `MAX_ORDERS_MONTHLY` | +500 | Sí (Sin Máx) | $9.00 |

> [!IMPORTANT]
> **Preservación de Lógica de Negocio**: `ADDON_APPOINTMENTS_EXTRA` y `ADDON_ORDERS_EXTRA` son entidades comerciales distintas. En negocios gastronómicos rige `MAX_ORDERS_MONTHLY`, mientras que en canchas y spas rige `MAX_APPOINTMENTS_MONTHLY`.

---

## 4. Reglas Comerciales y Financieras

### 4.1. Inmutabilidad Absoluta de Socios Fundadores
- El campo `Suscripcion.lockedPrice` representa un contrato histórico inalterable.
- Los Add-ons **NUNCA** suman ni alteran `lockedPrice` en la base de datos.
- La facturación consolidada mensual se calcula exclusivamente en tiempo de ejecución:
  $$\text{Total Mensual} = (\text{lockedPrice} \ ?? \ \text{plan.price}) + \sum (\text{addon.priceContracted} \times \text{quantity})$$

### 4.2. Fijación de Precios Server-Side
- Al contratar un Add-on, el precio se lee directamente de `Addon.priceMonthly` en el servidor y se congela en `SubscriptionAddon.priceContracted`.
- Si un Superadmin sube el precio del catálogo más tarde, los contratos existentes respetan el `priceContracted` contratado.

### 4.3. Cancelación con Período de Gracia
- Al solicitar cancelación (`POST /api/admin/addons/[id]/cancel`), no se destruye el registro.
- Se marca `cancelAtPeriodEnd = true` y `effectiveUntil = subscription.fechaFin`.
- `EntitlementsService` garantiza que el cliente siga disfrutando del Add-on hasta la fecha de expiración pagada.

### 4.4. Protección de Renovaciones y Downgrades
- En `src/app/api/admin/billing/approve/route.ts` y en `src/lib/cron.ts` se eliminó la asignación destructiva `customFeatures: null`.
- Al expirar un trial o período de gracia, los contratos de add-ons pasan a `status: 'PAUSED'`.

---

## 5. Endpoints de la API

### Superadmin
- `GET /api/superadmin/addons`: Lista todos los add-ons ordenados por estado.
- `POST /api/superadmin/addons`: Crea un nuevo add-on con validación de código único.
- `GET /api/superadmin/addons/[id]`: Obtiene un add-on por ID o Código.
- `PATCH /api/superadmin/addons/[id]`: Actualiza metadatos y precio (código inmutable).
- `DELETE /api/superadmin/addons/[id]`: Desactiva lógicamente el add-on (`active: false`, soft-delete).

### Negocio
- `GET /api/admin/addons`: Obtiene `{ availableAddons, activeSubscriptions, pricingDetails }` con cálculo en vivo de disponibilidad y razones de no elegibilidad.
- `POST /api/admin/addons/purchase`: Contrata un add-on fijando precio contractual server-side.
- `PATCH /api/admin/addons/[id]`: Modifica cantidad para add-ons acumulables (`stackable`).
- `POST /api/admin/addons/[id]/cancel`: Programa cancelación al corte del ciclo de facturación.

---

## 6. Pruebas Automatizadas
La suite canónica en `src/scripts/test_addons_canonical.ts` valida:
1. Catálogo inicial y tipos canónicos.
2. Contratación de capacidades y activación inmediata en `EntitlementsService`.
3. Contratación de límites y aumento dinámico sin solapamientos.
4. Inmutabilidad de `lockedPrice` para Fundadores.
5. Período de gracia en cancelación programada.
6. Auditoría y trazabilidad en `SubscriptionAddonHistory`.
