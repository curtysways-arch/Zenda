# AUDITORÍA TÉCNICA CANÓNICA — ADD-ONS CITIOX

**Fecha:** 8 de Septiembre de 2026  
**Entorno auditado:** Local / Workspace `curtysways-arch/Zenda` & BD SQLite `dev.db`  
**Modalidad:** EXCLUSIVAMENTE AUDITORÍA (Solo lectura — Cero modificaciones a producción, esquemas o datos)

---

## 1. Resumen Ejecutivo

La presente auditoría técnica canónica examinó de forma exhaustiva el estado del subsistema de **Add-ons** en la plataforma Citiox. Se inspeccionaron modelos en Prisma Schema, tablas reales en base de datos SQLite, APIs administrativas y públicas, servicios de entitlements (`EntitlementsService`, `SubscriptionEngine`), la persistencia en `customFeatures`, los catálogos y componentes de Superadmin y Admin de Negocio.

### Hallazgos Principales:
1. **Doble Sistema Desacoplado y Huérfano:**
   - **En Prisma Schema:** Existen dos modelos declarados para Add-ons: `BusinessAddonCatalog` y `BusinessTypeAddon` (asociados a `BusinessType`). Sin embargo, **estas tablas están completamente vacías en la base de datos (0 registros)** y **ningún endpoint o servicio en todo el código fuente interactúa con ellos**. Son modelos declarativos sin implementación.
   - **En Memoria / Código TS:** Existen dos registros estáticos en memoria con catálogos divergentes:
     - `SYSTEM_ADDONS` en `src/core/entitlements/AddonRegistry.ts` (7 add-ons: `ADDON_ECOMMERCE`, `ADDON_DELIVERY`, `ADDON_PROMOTIONS`, `ADDON_BRANCH_EXTRA`, `ADDON_PROFESSIONAL_EXTRA`, `ADDON_APPOINTMENTS_EXTRA`, `ADDON_COMMUNICATION_CENTER`).
     - `SUBSCRIPTION_ADDONS` en `src/core/subscription/plans.ts` (8 add-ons con IDs en minúsculas: `extra_branch`, `extra_user`, `extra_employee`, `extra_transactions`, `extra_whatsapp`, `extra_ai`, `extra_storage`, `api_access`).
2. **Causa Raíz de "No se pueden editar los Add-ons":**
   - La pantalla de Superadmin (`/superadmin/addons`) consume la API `/api/superadmin/addons`.
   - Dicha API **solo implementa `GET` y `POST`**.
   - **No existe método `PUT`, `PATCH` ni `DELETE`**.
   - Al llamar a `POST`, la API guarda el add-on en `AddonRegistry.register()`, lo cual es una estructura en memoria (`Map<string, AddonDefinition>`). Al reiniciar el proceso de Node.js/Next.js, cualquier add-on creado o modificado desaparece.
   - En el frontend (`src/app/superadmin/addons/page.tsx`), **no existe modal ni botón de edición**, ni lógica para enviar modificaciones al backend.
3. **Persistencia de Add-ons Contratados:**
   - No existe tabla relacional `SubscriptionAddon`, `SuscripcionAddon` ni `BusinessAddon`.
   - Si un negocio adquiere un add-on, la plataforma depende exclusivamente de guardar su ID dentro del campo JSON semi-estructurado `Suscripcion.customFeatures` (ej. `{"addons": ["ADDON_COMMUNICATION_CENTER"]}`).
4. **Vulnerabilidad Crítica en Renovación y Downgrade:**
   - Múltiples flujos del sistema (`src/app/api/admin/billing/approve/route.ts` línea 91, y `src/lib/cron.ts` líneas 478 y 551) ejecutan `customFeatures: null` al aprobar renovaciones o aplicar downgrades automáticos, **lo cual borra de un plumazo todos los add-ons contratados por el cliente**.
5. **Inexistencia de Tienda Comercial:**
   - En el panel del Negocio (`/admin/plan`), la interfaz solo muestra límites de uso y cambio de plan base mediante `UpgradeModal`. **No existe catálogo, tienda, carrito, checkout ni mecanismo de autogestión de add-ons para el cliente**.

---

## 2. Modelos Prisma Existentes

De la inspección de `prisma/schema.prisma` (3,886 líneas):

### Modelos encontrados con la semántica "Addon":
1. **`BusinessAddonCatalog`** (líneas 3221–3231)
   - **Campos:** `id` (String UUID @id), `code` (String @unique), `name` (String), `description` (String?), `icon` (String @default("PlusCircle")), `price` (Float @default(0)), `createdAt` (DateTime @default(now())).
   - **Relaciones:** `typeLinks BusinessTypeAddon[]`.
   - **Estado:** Tabla creada en SQLite, pero **completamente vacía (0 filas)**. Código muerto (sin referencias en `src/`).
2. **`BusinessTypeAddon`** (líneas 3233–3244)
   - **Campos:** `id` (String UUID @id), `businessTypeId` (String), `addonId` (String), `enabled` (Boolean @default(true)), `createdAt` (DateTime @default(now())).
   - **Relaciones:** `@relation(fields: [businessTypeId], references: [id], onDelete: Cascade)` y `@relation(fields: [addonId], references: [BusinessAddonCatalog.id], onDelete: Cascade)`.
   - **Índices:** `@@unique([businessTypeId, addonId])`.
   - **Estado:** Tabla creada en SQLite, pero **completamente vacía (0 filas)**. Código muerto.

### Modelos Ausentes (Inexistentes en Prisma):
- `model Addon` ❌
- `model PlanAddon` ❌
- `model SubscriptionAddon` / `model SuscripcionAddon` ❌
- `model BusinessAddon` ❌
- `model AddonOrder` / `model AddonPayment` ❌

---

## 3. Datos Reales Encontrados

Ejecución de auditoría de solo lectura en `dev.db` (SQLite local):
- **Total de tablas:** 193 tablas.
- **Registros en `BusinessAddonCatalog`:** 0.
- **Registros en `BusinessTypeAddon`:** 0.
- **Planes totales en DB:** 29 planes (20 canónicos de las 5 familias + 9 planes legacy/demo).
- **Módulos canónicos en `BusinessModuleCatalog`:** 44 módulos registrados (incluyendo alias transversales).
- **Dependencias en `ModuleDependency`:** 9 dependencias canónicas estrictas.
- **Suscripciones registradas:** 13 suscripciones.
  - De las 13 suscripciones, solo 1 (`bceea0c8-e464-4a9e-b944-dd8bcef8f179`) tiene un valor en `customFeatures`: `{"courses_module": true}`.
  - Ninguna suscripción activa en la base de datos local tiene actualmente add-ons en `customFeatures.addons`.

---

## 4. APIs Existentes

| Ruta | Método | Archivo | Auth / Roles | Estado / Operación | Problema Detectado |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/superadmin/addons` | `GET` | `src/app/api/superadmin/addons/route.ts` | SUPERADMIN, ADMIN | Retorna `AddonRegistry.getAll()` | Lee de un `Map` estático en memoria RAM, no de la BD. |
| `/api/superadmin/addons` | `POST` | `src/app/api/superadmin/addons/route.ts` | Solo SUPERADMIN | Registra en `AddonRegistry.register()` | No persiste en Base de Datos. No valida si el `targetKey` existe en el catálogo canónico. Se pierde al reiniciar el server. |
| `/api/superadmin/addons/[id]` | `PUT/PATCH` | **NO EXISTE** | — | — | **No se pueden editar add-ons.** |
| `/api/superadmin/addons/[id]` | `DELETE` | **NO EXISTE** | — | — | **No se pueden eliminar add-ons.** |
| `/api/addons` (cliente) | `GET` | **NO EXISTE** | — | — | El negocio no tiene endpoint para consultar add-ons disponibles para su giro. |
| `/api/billing/addons/purchase` | `POST` | **NO EXISTE** | — | — | No existe endpoint de compra o contratación. |
| `/api/billing/addons/cancel` | `POST` | **NO EXISTE** | — | — | No existe endpoint de cancelación. |

---

## 5. Componentes Frontend

1. **`src/app/superadmin/addons/page.tsx`**:
   - Componente cliente de Superadmin (`'use client'`).
   - Muestra tarjetas de Add-ons iterando sobre la respuesta de `/api/superadmin/addons`.
   - Renderiza badges según el tipo: `⚡ Activador de Capacidad` (azul) o `📈 Extensión de Límite` (verde).
   - Posee un modal con formulario para **Crear Nuevo Add-on**, el cual envía un `POST` a `/api/superadmin/addons`.
   - **Carencia absoluta:** No dispone de botones "Editar", "Pausar", "Activar" ni "Eliminar". No maneja estados de edición ni campos de precio anual.
2. **`src/app/admin/plan/PlanDashboardClient.tsx`**:
   - Panel de control de plan del negocio.
   - Solo muestra medidores de consumo (Staff, Citas, Servicios, Sucursales) y botón para cambiar de plan general.
   - No tiene ninguna sección ni referencia a Add-ons o Módulos Adicionales.
3. **`src/components/ui/UpgradeModal.tsx`**:
   - Modal de pasarela/transferencia bancaria para el negocio.
   - Solo procesa upgrades de `planId`. No admite ítems adicionales ni conceptos de addons.

---

## 6. Superadmin

- **Visibilidad en navegación:** `SuperAdminSidebar.tsx` incluye el enlace `{ name: 'Add-ons', href: '/superadmin/addons', icon: Sliders }` en la línea 82.
- **Comportamiento:** La pantalla carga correctamente los 7 add-ons definidos en `AddonRegistry.ts`.
- **Fallas operativas:**
  - El Superadmin no puede editar el precio, nombre o descripción de ningún add-on.
  - Si el Superadmin crea un add-on nuevo desde el modal, este se guarda en la memoria del proceso. Cuando Next.js recompila o PM2 reinicia el cluster, el nuevo add-on desaparece.

---

## 7. Entitlements (`EntitlementsService`)

El archivo `src/core/entitlements/EntitlementsService.ts` implementa una integración funcional para Add-ons:

```typescript
// Líneas 327–363 de EntitlementsService.ts:
// 5. Procesar Add-ons contratados
const activeAddonsList: EffectiveEntitlements['addons'] = [];
const rawAddonEntries = customFeaturesObj.addons || [];
const limitAddonBonus: Record<string, number> = {
  branches: 0,
  professionals: 0,
  appointmentsMonthly: 0,
  products: 0
};

if (Array.isArray(rawAddonEntries)) {
  for (const entry of rawAddonEntries) {
    const addonId = typeof entry === 'string' ? entry : entry.id;
    const qty = typeof entry === 'object' && entry.quantity ? parseInt(entry.quantity, 10) : 1;
    const addonDef = AddonRegistry.get(addonId);

    if (addonDef && addonDef.active) {
      if (addonDef.type === 'CAPABILITY') {
        capabilities[addonDef.targetKey] = true;
      } else if (addonDef.type === 'LIMIT') {
        limitAddonBonus[addonDef.targetKey] = (limitAddonBonus[addonDef.targetKey] || 0) + ((addonDef.amount || 0) * qty);
      }
    }
  }
}
```

### Hallazgo:
- **`hasCapability()` SÍ respeta el Add-on:** Si en `customFeatures.addons` está `'ADDON_COMMUNICATION_CENTER'`, la capacidad `COMMUNICATION_CENTER` se vuelve `true` en runtime, permitiendo que el negocio use el módulo aunque su Plan base no lo incluya.
- **`checkLimit()` SÍ suma el bono de Add-on:** Si el negocio contrató `'ADDON_BRANCH_EXTRA'` con `amount: 1`, el límite efectivo de sucursales pasa de 1 a 2.
- **Limitación:** La lógica de límites en `EntitlementsService` está cableada a 4 claves fijas: `branches`, `professionals`, `appointmentsMonthly` y `products`.

---

## 8. `customFeatures`

`Suscripcion.customFeatures` es una columna `Json?` en la tabla `Suscripcion`.

### Auditoría de usos en el código:
| Archivo | Línea | Lectura / Escritura | Propósito |
| :--- | :--- | :--- | :--- |
| `src/core/entitlements/EntitlementsService.ts` | 283, 329 | Lectura | Extrae `addons`, `specialPrice` y banderas booleanas legacy. |
| `src/core/modules/LegacyCompatibilityResolver.ts` | 48–68 | Lectura | Mapea banderas legacy (`courses_module`, `loyalty_module`) a capacidades canónicas. |
| `src/core/subscription/SubscriptionEngine.ts` | 59–68 | Lectura | Extrae `customFeatures.addons` para el motor alternativo. |
| `src/lib/services/planService.ts` | 43–48, 167 | Lectura / Preservación | Lee precio especial y preserva el blob durante cambios de plan. |
| `src/scripts/migration_snapshot.ts` | 49, 121 | Lectura | Monitorea la inmutabilidad de `customFeatures` en migraciones. |
| `src/app/api/admin/billing/approve/route.ts` | 91 | **ESCRITURA DESTRUCTIVA** | **Sobrescribe `customFeatures: null` al aprobar pagos de renovación/upgrade.** |
| `src/lib/cron.ts` | 478, 551 | **ESCRITURA DESTRUCTIVA** | **Sobrescribe `customFeatures: null` al vencer trial o período de gracia.** |

---

## 9. `Plan.features`

- En el modelo `Plan` de Prisma existe la columna `features Json?` (línea 503).
- **Inspección de datos:** En todos los 20 planes canónicos creados en la base de datos, `Plan.features` es `null`.
- Los planes modernos de Citiox se gobiernan exclusivamente mediante las relaciones `PlanEntitlement` y `PlanLimit`.
- `Plan.features` es un remanente legacy del generador inicial de esquemas y está en desuso operativo.

---

## 10. Precios

- En `AddonRegistry.ts`, los precios están **hardcodeados** en memoria como números flotantes:
  - `ADDON_ECOMMERCE`: \$15.00/mes
  - `ADDON_DELIVERY`: \$12.00/mes
  - `ADDON_PROMOTIONS`: \$8.00/mes
  - `ADDON_BRANCH_EXTRA`: \$10.00/mes
  - `ADDON_PROFESSIONAL_EXTRA`: \$7.00/mes
  - `ADDON_APPOINTMENTS_EXTRA`: \$9.00/mes
  - `ADDON_COMMUNICATION_CENTER`: \$12.00/mes
- En `SUBSCRIPTION_ADDONS` (`plans.ts`), los precios son diferentes:
  - `extra_branch`: \$10
  - `extra_user`: \$5
  - `extra_employee`: \$5
  - `extra_transactions`: \$15
  - `extra_whatsapp`: \$12
  - `extra_ai`: \$10
  - `extra_storage`: \$8
  - `api_access`: \$25
- **No existe soporte para monedas múltiples, descuentos anuales ni prorrateo de cobro.**

---

## 11. Dependencias

- `ModuleDependency` en Prisma valida dependencias entre módulos canónicos (ej. `KDS -> ORDERS`, `COMMUNICATION_CENTER -> CUSTOMERS`).
- La API de Planes (`/api/superadmin/planes`) valida estrictamente estas dependencias al crear o editar un Plan.
- **En Add-ons NO existe ninguna validación de dependencias:** Si un negocio en Plan Inicio contrata `ADDON_COMMUNICATION_CENTER` sin tener el módulo `CUSTOMERS` activo, el sistema no lo valida ni en backend ni en frontend.

---

## 12. Seguridad y Multi-tenancy

- `/api/superadmin/addons` valida rol de sesión (`SUPERADMIN`), pero al no existir persistencia en base de datos, no hay riesgo de inyección SQL ni de fuga multi-tenant de catálogo.
- La consulta de entitlements (`EntitlementsService.resolve(businessId)`) sí aísla por `businessId`.
- **Riesgo:** Un negocio podría inyectar manualmente add-ons en `customFeatures` si existiera una API desprotegida de actualización de perfil de negocio. Actualmente la actualización de `customFeatures` no está expuesta en los endpoints de admin de negocio (`/api/negocio`).

---

## 13. Compatibilidad con Founders y `lockedPrice`

- La regla canónica de Citiox exige que ningún Add-on altere `isFounder`, `founderPosition` ni `lockedPrice`.
- La función de resolución de precio comercial `getEffectiveSubscriptionPrice` (`src/lib/services/planService.ts`):
  ```typescript
  export function getEffectiveSubscriptionPrice(subscription: any): number {
      if (subscription?.lockedPrice !== null && subscription?.lockedPrice !== undefined) {
          return Number(subscription.lockedPrice);
      }
      // ...
  }
  ```
- **Hallazgo:** El sistema de planes respeta el `lockedPrice` del Plan base. Sin embargo, no existe ninguna estructura que calcule el cobro mensual combinado (`Plan Base + Suma de Add-ons`). Si un Founder contrata un Add-on, no hay forma actual de facturarle el adicional sin alterar el precio de la suscripción.

---

## 14. Historial y Auditoría

- `SubscriptionHistory` (tabla en DB) solo almacena: `negocio_id`, `plan_anterior_id`, `plan_nuevo_id`, `tipo_cambio` y `fecha_cambio`.
- `PlanAuditLog` solo registra cambios en `Plan` y `PlanFamily`.
- **No existe ningún registro de auditoría para Add-ons:** No se registra cuándo se contrató un add-on, quién lo autorizó, qué precio se pactó, cuándo se pausó o canceló.

---

## 15. Matriz de Add-ons Existentes

| ID / Código | Nombre | Precio Mensual | Tipo | targetKey | Monto / Bono | Stackable | Fuente Actual | Persistencia BD | Implementación Real |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- | :---: | :--- |
| `ADDON_ECOMMERCE` | E-commerce Tienda Online | \$15.00 | CAPABILITY | `ECOMMERCE` | — | No | `AddonRegistry.ts` | ❌ No | Solo en memoria TS |
| `ADDON_DELIVERY` | Delivery & Rastreo GPS | \$12.00 | CAPABILITY | `DELIVERY` | — | No | `AddonRegistry.ts` | ❌ No | Solo en memoria TS |
| `ADDON_PROMOTIONS` | Promociones & Descuentos | \$8.00 | CAPABILITY | `PROMOTIONS` | — | No | `AddonRegistry.ts` | ❌ No | Solo en memoria TS |
| `ADDON_BRANCH_EXTRA` | Sucursal Adicional | \$10.00 | LIMIT | `branches` | +1 | Sí (Máx 10) | `AddonRegistry.ts` | ❌ No | Resuelto en `EntitlementsService` |
| `ADDON_PROFESSIONAL_EXTRA` | Profesional Extra | \$7.00 | LIMIT | `professionals` | +3 | Sí (Máx 10) | `AddonRegistry.ts` | ❌ No | Resuelto en `EntitlementsService` |
| `ADDON_APPOINTMENTS_EXTRA` | Pack 500 Citas Mensuales | \$9.00 | LIMIT | `appointmentsMonthly` | +500 | Sí (Máx 5) | `AddonRegistry.ts` | ❌ No | Resuelto en `EntitlementsService` |
| `ADDON_COMMUNICATION_CENTER` | Centro de Comunicaciones | \$12.00 | CAPABILITY | `COMMUNICATION_CENTER` | — | No | `AddonRegistry.ts` | ❌ No | Resuelto en `EntitlementsService` |
| `extra_branch` | Sucursal Adicional (Legacy) | \$10.00 | LIMIT | `branches` | +1 | — | `plans.ts` | ❌ No | Resuelto en `SubscriptionEngine` |
| `extra_user` | Usuario Adicional | \$5.00 | LIMIT | `users` | +1 | — | `plans.ts` | ❌ No | Resuelto en `SubscriptionEngine` |
| `extra_employee` | Profesional Adicional | \$5.00 | LIMIT | `employees` | +1 | — | `plans.ts` | ❌ No | Resuelto en `SubscriptionEngine` |
| `extra_transactions` | Pack +1,000 Transacciones | \$15.00 | LIMIT | `transactions` | +1000 | — | `plans.ts` | ❌ No | Resuelto en `SubscriptionEngine` |
| `extra_whatsapp` | Pack +1,000 WhatsApp | \$12.00 | LIMIT | `whatsappMessages` | +1000 | — | `plans.ts` | ❌ No | Resuelto en `SubscriptionEngine` |
| `extra_ai` | Pack +500 Créditos IA | \$10.00 | LIMIT | `aiCredits` | +500 | — | `plans.ts` | ❌ No | Resuelto en `SubscriptionEngine` |
| `extra_storage` | Pack +10 GB Espacio | \$8.00 | LIMIT | `storageMB` | +10240 | — | `plans.ts` | ❌ No | Resuelto en `SubscriptionEngine` |
| `api_access` | Acceso a API & Webhooks | \$25.00 | CAPABILITY | `api` | — | — | `plans.ts` | ❌ No | Resuelto en `SubscriptionEngine` |

---

## 16. Matriz de Código

| Archivo | Líneas Relevantes | Componente | Uso / Rol | Estado | Acción Futura Recomendada |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `src/core/entitlements/AddonRegistry.ts` | 10–118 | `AddonRegistry` | Catálogo central en memoria TS | 🟡 Parcial | Reemplazar por repositorio que lea de la BD persistente. |
| `src/core/subscription/plans.ts` | 182–240 | `SUBSCRIPTION_ADDONS` | Segundo catálogo en memoria TS | 🔴 Duplicado | Eliminar progresivamente y unificar en el catálogo canónico. |
| `src/core/entitlements/EntitlementsService.ts` | 327–372 | `EntitlementsService.resolve` | Lee addons de `customFeatures` y suma bonos | 🟢 Funciona | Mantener lógica de resolución, pero leyendo de tabla `SubscriptionAddon`. |
| `src/app/api/superadmin/addons/route.ts` | 8–58 | API Superadmin | GET y POST en memoria | 🔴 Incompleto | Migrar a Prisma DB y agregar endpoints `PUT`, `PATCH` y `DELETE`. |
| `src/app/superadmin/addons/page.tsx` | 1–282 | UI Superadmin | Listado y Modal de creación | 🟡 Parcial | Conectar con endpoints completos (edición, switch de estado, eliminación). |
| `src/app/admin/plan/PlanDashboardClient.tsx` | 1–457 | UI Admin Negocio | Dashboard de Plan | ⚫ Inexistente | Agregar pestaña o sección "Módulos & Add-ons Disponibles". |
| `src/app/api/admin/billing/approve/route.ts` | 91 | API Billing | Aprueba pagos de suscripción | 🔴 Riesgoso | **Eliminar `customFeatures: null`** para evitar borrado de add-ons activos. |
| `src/lib/cron.ts` | 478, 551 | Cron de Expiración | Degrada planes expirados | 🔴 Riesgoso | **Eliminar `customFeatures: null`** para no destruir add-ons al cambiar de estado. |
| `prisma/schema.prisma` | 3221–3244 | Esquema Prisma | Modelos `BusinessAddonCatalog` | 🟠 Huérfano | Refactorizar o reemplazar por el modelo canónico definitivo. |

---

## 17. Matriz de Riesgos

| Riesgo | Severidad | Evidencia en Código | Impacto | Recomendación |
| :--- | :---: | :--- | :--- | :--- |
| **Borrado de Add-ons en Renovaciones / Downgrades** | **CRITICAL** | `approve/route.ts:91` y `cron.ts:478,551` ejecutan `customFeatures: null` | El cliente paga por un add-on y al mes siguiente, al renovar o expirar el plan, se le desactivan todos los add-ons adquiridos. | Proteger incondicionalmente `customFeatures` o aislar los add-ons en una tabla propia desacoplada. |
| **Pérdida de Add-ons al Reiniciar el Servidor** | **HIGH** | `AddonRegistry.register()` en `api/superadmin/addons/route.ts:52` solo muta un `Map` en RAM. | Cualquier add-on creado o configurado por el Superadmin se pierde en el siguiente deploy o restart de PM2. | Persistir el catálogo de Add-ons en SQLite/PostgreSQL vía Prisma. |
| **Divergencia de Catálogos (Dos Fuentes de Verdad)** | **HIGH** | `AddonRegistry.ts` vs `plans.ts (SUBSCRIPTION_ADDONS)` con códigos y precios distintos. | Confusión en el equipo y comportamiento errático dependiendo de qué motor (`EntitlementsService` o `SubscriptionEngine`) resuelva la consulta. | Establecer una única fuente canónica de Add-ons. |
| **Falta de Validación de Dependencias** | **MEDIUM** | `EntitlementsService.ts` activa la capacidad del add-on sin chequear `ModuleDependency`. | Un negocio podría activar `KDS` sin tener `ORDERS`, provocando errores de runtime en pantallas que asumen dependencias cumplidas. | Validar prerrequisitos canónicos antes de permitir la contratación de un add-on. |
| **Imposibilidad de Facturación Combinada** | **MEDIUM** | `Suscripcion.lockedPrice` y `Plan.price` no contemplan cobros adicionales recurrentes. | Imposibilidad de cobrar pasarelas o conciliar transferencias que sumen Plan + Add-ons. | Calcular `effectiveMonthlyTotal = basePrice + sum(activeAddons.price)`. |

---

## 18. Elementos Reutilizables vs. Modificables vs. Eliminables

### Reutilizables (Conservar):
- La lógica de resolución en `EntitlementsService.ts` (líneas 327–372): La separación matemática entre `CAPABILITY` (desbloquea módulo booleano) y `LIMIT` (suma bono cuantitativo a los límites base) está muy bien diseñada y es de alto rendimiento.
- El diseño visual y componentes UI de `src/app/superadmin/addons/page.tsx` (tarjetas, colores, badges de capacidad y límite).
- El concepto de `SYSTEM_ADDONS` con metadatos claros (`targetKey`, `amount`, `stackable`, `maxQuantity`).

### Modificables (Refactorizar):
- Las rutas de Superadmin (`/api/superadmin/addons`): Agregar soporte para persistencia en base de datos, actualización (`PATCH`) y desactivación (`DELETE / soft-delete`).
- `src/app/superadmin/addons/page.tsx`: Agregar modal de edición y switch interactivo de activación/desactivación.
- Proteger `src/app/api/admin/billing/approve/route.ts` y `src/lib/cron.ts` para que jamás limpien `customFeatures` ni borren add-ons contratados.

### Eliminables Eventualmente:
- `SUBSCRIPTION_ADDONS` en `src/core/subscription/plans.ts` (modelo paralelo obsoleto).
- El uso de `customFeatures` para almacenar add-ons (debe quedar solo como adaptador de compatibilidad de lectura hacia atrás).
- Los modelos sin uso `BusinessAddonCatalog` y `BusinessTypeAddon` en Prisma si se decide adoptar el modelo definitivo de `Addon` universal.

---

## 19. Arquitectura Actual vs. Arquitectura Objetivo Propuesta

### Arquitectura Actual (Fragmentada):
```text
[Superadmin UI] ──(POST)──> [/api/superadmin/addons] ──> [RAM: AddonRegistry (Map)]
                                                                  │ (Se pierde en reboot)
[Base de Datos] ──> [Suscripcion.customFeatures.addons] ──────────┘
                                │
                     [EntitlementsService]
                                │
               (Evalúa capacidades y bonos de límite)
```

### Arquitectura Objetivo Recomendada (Canónica y Persistente):
```text
                    ┌─────────────────────────┐
                    │      ADD-ON CATALOG     │ (Tabla Prisma: Addon)
                    │  - id / code            │
                    │  - name / description   │
                    │  - type: CAPABILITY |   │
                    │         LIMIT           │
                    │  - targetKey            │
                    │  - amount / stackable   │
                    │  - priceMonthly         │
                    │  - active: boolean      │
                    └────────────┬────────────┘
                                 │
                   ┌─────────────┴─────────────┐
                   │                           │
          [Superadmin CRUD]           [Tienda Admin Negocio]
          (Gestión global)            (Catálogo y Contratación)
                   │                           │
                   └─────────────┬─────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │    SUBSCRIPTION ADDON   │ (Tabla Prisma: SubscriptionAddon)
                    │  - id                   │
                    │  - subscriptionId       │
                    │  - addonId              │
                    │  - quantity             │
                    │  - priceContracted      │
                    │  - status: ACTIVE | ... │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │   EntitlementsService   │
                    │  Base Plan (Entitlement/│
                    │             Limit)      │
                    │             +           │
                    │  Purchased Add-ons      │
                    │             ↓           │
                    │   Effective Capabilities│
                    │   Effective Limits      │
                    └─────────────────────────┘
```

---

## 20. Conclusión y Respuestas a las Preguntas Clave

1. **¿Dónde están almacenados actualmente los Add-ons?**  
   El catálogo de Add-ons está almacenado en memoria estática en TypeScript (`AddonRegistry.ts` y `plans.ts`). Los add-ons contratados por negocios se almacenan en el campo JSON `Suscripcion.customFeatures`. En la base de datos existen tablas vacías (`BusinessAddonCatalog`, `BusinessTypeAddon`) que no se utilizan.
2. **¿Cuántos existen?**  
   7 en `AddonRegistry.ts` y 8 en `plans.ts` (en total 15 definiciones conceptuales con solapamientos).
3. **¿Cuáles existen?**  
   `ADDON_ECOMMERCE`, `ADDON_DELIVERY`, `ADDON_PROMOTIONS`, `ADDON_BRANCH_EXTRA`, `ADDON_PROFESSIONAL_EXTRA`, `ADDON_APPOINTMENTS_EXTRA`, `ADDON_COMMUNICATION_CENTER` (en AddonRegistry); `extra_branch`, `extra_user`, `extra_employee`, `extra_transactions`, `extra_whatsapp`, `extra_ai`, `extra_storage`, `api_access` (en plans.ts).
4. **¿Qué precios tienen?**  
   Varían entre \$5.00/mes (usuarios/empleados extra) y \$25.00/mes (API/Webhooks), hardcodeados en código.
5. **¿Se pueden editar?**  
   **No.** No existe UI de edición ni API PUT/PATCH.
6. **¿Por qué no se pueden editar?**  
   Porque la API `/api/superadmin/addons` carece de métodos `PUT`/`PATCH`, no interactúa con una base de datos y la vista en `page.tsx` no implementa ningún botón ni modal de modificación.
7. **¿Dónde aparecen en Superadmin?**  
   En la ruta `/superadmin/addons`.
8. **¿Por qué no aparecen en el panel del cliente?**  
   Porque no existe ninguna pantalla, componente ni endpoint de tienda de Add-ons para el rol Admin del negocio.
9. **¿Existe API CRUD?**  
   Solo existe `CR` en memoria (`GET` y `POST`). No existe `Update` ni `Delete`.
10. **¿Existe compra / cancelación?**  
    **No.** No existen flujos comerciales ni pasarelas conectadas para Add-ons.
11. **¿Afectan realmente los entitlements y límites?**  
    **Sí, en runtime:** Si se inyecta manualmente un Add-on en `customFeatures.addons`, `EntitlementsService.resolve()` activa la capacidad o suma el bono al límite correspondiente.
12. **¿Hay riesgo para Founders o `lockedPrice`?**  
    No alteran `lockedPrice`, pero el sistema actual destruye los add-ons en `customFeatures` al procesar renovaciones o vencimientos mediante `cron.ts` y `approve/route.ts`.
