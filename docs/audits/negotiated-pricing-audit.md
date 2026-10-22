# AUDITORÍA TÉCNICA CANÓNICA — SISTEMA DE PRECIOS NEGOCIADOS POR SUSCRIPCIÓN EN CITIOX

**Fecha:** 5 de Octubre de 2026  
**Entorno auditado:** Local / Workspace `curtysways-arch/Zenda` & BD SQLite `dev.db` (compatible con PostgreSQL producción)  
**Modalidad:** EXCLUSIVAMENTE AUDITORÍA (Fase 1 de Análisis Técnico — Cero modificaciones destructivas a esquemas, código o datos de producción)

---

## 1. Resumen Ejecutivo

La presente auditoría técnica canónica examinó de forma exhaustiva el estado de los modelos de datos, servicios de pricing, APIs de suscripción, flujos de facturación (Billing) y asistentes de aprovisionamiento de negocios en Citiox.

El objetivo central es diseñar e implementar un sistema de **precios negociados por suscripción** (permanentes y temporales por número de ciclos de facturación), respetando estrictamente la regla arquitectónica de **NO mutar `Plan.price`** y **NO crear planes duplicados ni espurios** en el catálogo de Citiox.

### Hallazgos Principales:
1. **Catálogo de Planes Limpio:**
   - La tabla `Plan` almacena correctamente el precio oficial de lista en `Plan.price` (ej. $19.99, $39.99). Actualmente hay 24 planes canónicos asociados a sus respectivas `PlanFamily` (Citas & Servicios, Restaurantes, Canchas, Lavanderías, Tiendas, Dentistas).
   - `Plan.price` no debe ser tocado jamás por una negociación individual con un cliente.
2. **Uso Actual y Restricción de `lockedPrice`:**
   - En el modelo `Suscripcion`, existe el campo `lockedPrice: Float?`.
   - Actualmente, `lockedPrice` está fuertemente acoplado al concepto de **Socio Fundador** (`isFounder: true`, `founderPosition: Int?`). En `ProvisioningEngine.ts` (línea 367) y en `AppDeliveryWizard.tsx` (línea 1142), `lockedPrice` se asigna exclusivamente cuando `isFounder === true` para garantizar tarifa congelada de por vida.
   - Si se utilizara `lockedPrice` a secas para una negociación temporal de 1 ciclo ($5 por 1 mes), el sistema lo congelaría indefinidamente como permanente, rompiendo el ciclo de cobro posterior y generando un riesgo financiero crítico.
3. **Cálculo de Precio Efectivo Actual:**
   - En `src/lib/services/planService.ts` existe la función `getEffectiveSubscriptionPrice`:
     ```ts
     if (subscription?.lockedPrice !== null && subscription?.lockedPrice !== undefined) {
         return Number(subscription.lockedPrice);
     }
     // Soporte legado para customFeatures.specialPrice
     ...
     return plan?.price !== undefined ? Number(plan.price) : 0;
     ```
   - No existe soporte para ciclo actual, número de ciclos restantes, expiración de override temporal ni retorno automático al precio del Plan vigente.
4. **Vulnerabilidades en Billing y Pagos:**
   - En `src/app/api/billing/request-upgrade/route.ts` (línea 53), el monto del pago se toma del `body.monto` enviado por el frontend (`monto !== undefined ? Number(monto) : plan.price`), permitiendo potencialmente que un cliente altere el monto si no hay validación server-side.
   - En `src/app/api/admin/plan/solicitar/route.ts` (línea 70), se asume ciegamente `planSolicitado.price`, ignorando si el cliente tenía un precio especial negociado o tarifa Founder.
   - En `src/app/superadmin/suscripciones/route.ts` (líneas 74-76), el cálculo de upgrade/downgrade compara directamente `newPlan.price > currentSub.Plan.price` sin contemplar precios efectivos ni schedules.
5. **Inexistencia de Modelo de Overrides / Schedules:**
   - No existe en Prisma ningún modelo para registrar precios pactados temporales por ciclos (`SubscriptionPricingOverride` o `SubscriptionPriceSchedule`).
   - No existe una tabla de auditoría dedicada a cambios de precio comercial (`SubscriptionPricingAudit`), dependiendo únicamente de `SubscriptionHistory` (que solo registra cambios de `plan_id` o `isFounder`).

---

## 2. Arquitectura y Modelos Existentes

De la inspección directa de `prisma/schema.prisma` (4,878 líneas):

### A. Modelo `Plan`
```prisma
model Plan {
  id              String      @id
  name            String
  price           Float       // Precio oficial de catálogo (ej. 19.99)
  trial_days      Int         @default(0)
  active          Boolean     @default(true)
  activo          Boolean     @default(true)
  slug            String?
  familyId        String?
  family          PlanFamily? @relation(fields: [familyId], references: [id], onDelete: SetNull)
  billingPeriod   String?     @default("monthly")
  currency        String?     @default("USD")
  // Entitlements y límites asociados
  planEntitlements PlanEntitlement[]
  planLimits       PlanLimit[]
  Suscripcion      Suscripcion[]
  ...
}
```
*Interpretación:* Representa la oferta canónica pública del producto. Permanece inmutable ante negociaciones individuales.

### B. Modelo `Suscripcion`
```prisma
model Suscripcion {
  id                    String              @id
  negocioId             String              @unique
  planId                String
  estado                String              @default("trial") // trial, active, payment_pending, canceled
  pagoPendiente         Boolean             @default(false)
  solicitudPlanId       String?
  metodoPago            String?
  fechaInicio           DateTime            @default(now())
  fechaFin              DateTime
  trial_inicio          DateTime?           @default(now())
  trial_fin             DateTime?
  renovacion_automatica Boolean             @default(true)
  createdAt             DateTime            @default(now())
  updatedAt             DateTime
  customFeatures        Json?
  isFounder             Boolean             @default(false)
  founderPosition       Int?
  lockedPrice           Float?              // Tarifa congelada
  Negocio               Negocio             @relation(fields: [negocioId], references: [id])
  Plan                  Plan                @relation(fields: [planId], references: [id])
  subscriptionAddons    SubscriptionAddon[]
}
```
*Interpretación:* Entidad vincular entre el `Negocio` y el `Plan`. Los campos `isFounder`, `founderPosition` y `lockedPrice` son utilizados conjuntamente por el programa de Socios Fundadores.

### C. Modelo `SubscriptionHistory`
```prisma
model SubscriptionHistory {
  id               String   @id
  negocio_id       String
  plan_anterior_id String?
  plan_nuevo_id    String
  tipo_cambio      String   // upgrade, downgrade, renovacion, set_founder, remove_founder
  fecha_cambio     DateTime @default(now())
  admin_id         String?
}
```
*Interpretación:* Registra transiciones de planes y altas de fundador. No almacena precios anteriores, precios negociados, duración en ciclos ni motivos comerciales detallados.

### D. Modelo `SubscriptionAddon` y `Addon`
```prisma
model SubscriptionAddon {
  id               String   @id @default(uuid())
  subscriptionId   String
  addonId          String
  quantity         Int      @default(1)
  priceContracted  Float    // Inmutable al contratar
  currency         String   @default("USD")
  status           SubscriptionAddonStatus @default(ACTIVE)
  cancelAtPeriodEnd Boolean @default(false)
  effectiveUntil   DateTime?
  ...
}
```
*Interpretación:* Los Addons ya se calculan de manera modular y desacoplada del precio del Plan base. El total a facturar es `baseEffectivePrice + addonsTotal`.

---

## 3. Auditoría de Datos Reales en Base de Datos

Se ejecutó una inspección directa sobre la base de datos `dev.db`:
- **Total de suscripciones activas/registradas:** 7 suscripciones.
- **Suscripciones Founder:**
  - `Parrilla Don Julio 1790556203845`: `planId`: `plan_restaurante_crecimiento` ($19.99), `isFounder`: `true`, `founderPosition`: 1, `lockedPrice`: 10.00.
- **Suscripciones Regulares:**
  - 6 suscripciones en estado `trial` / `active`, con `isFounder: false`, `founderPosition: null`, `lockedPrice: null`.
- **Precios de Planes:** 24 planes activos con precios oficiales de $0 (Free), $7.99 (Inicio), $19.99 (Crecimiento), $29.99 / $39.99 (Pro) y $49.99 (Academia).
- **Conclusión sobre datos:** No existen datos corruptos ni colisiones previas. La condición de Founder de Don Julio debe quedar estrictamente intacta y protegida.

---

## 4. Auditoría de APIs y UI de Superadmin

### A. Flujo de Entrega de App (`AppDeliveryWizard.tsx` / `ProvisioningEngine.ts`)
- **Ruta UI:** `/superadmin/negocios/nuevo` o Asistente de Provisión.
- **Paso 2 (Planes & Licenciamiento):**
  - Muestra tarjetas de planes según la familia seleccionada.
  - Ofrece únicamente un checkbox: *"Registrar como Socio Fundador"*, el cual despliega los campos `founderPosition` y `lockedPrice` (default $10.00).
  - **Carencia:** No hay controles para que Superadmin elija:
    - ¿Aplicar precio negociado? (Sí / No)
    - Modalidad: Permanente vs Temporal por Ciclos (1 ciclo, 2 ciclos, 3 ciclos, 6 ciclos, Personalizado).
    - Monto negociado ($).
    - Comportamiento post-expiración: "Volver automáticamente al precio oficial".
- **Paso 5 (Resumen y Confirmación):**
  - Solo indica `Plan: Crecimiento` y `Estado Fundador: Sí ($10/mes) / No`.
  - **Carencia:** No muestra el desglose comercial canónico exigido (Precio oficial, Precio negociado, Duración, Precio después del período, Próxima renovación).

### B. Gestión de Suscripciones (`/superadmin/suscripciones` / `SuscripcionActions.tsx`)
- La tabla muestra la columna `Plan & Costo`:
  ```tsx
  <span>${sub.lockedPrice !== null ? sub.lockedPrice : (sub.plan?.price || 0)}</span>
  {sub.lockedPrice !== null && <span>Congelado</span>}
  ```
- **Carencia:** Si un negocio tiene una negociación temporal, la tabla no informa cuántos ciclos le restan (ej. "Ciclo 1 de 3"), qué precio tendrá al vencer la oferta, ni su estado comercial.
- En `SuscripcionActions.tsx`, el botón de acciones solo maneja renovación (+1 Mes), cambio de plan y Founder toggle, sin soporte para gestionar overrides comerciales.

---

## 5. Matriz de Prioridad Comercial y Resolución de Conflictos

El cálculo del precio efectivo debe respetar de forma determinista la siguiente jerarquía de precedencia:

```text
┌─────────────────────────────────────────────────────────────┐
│ 1. ¿Existe SubscriptionPricingOverride activo y vigente?   │
│    (Si es TEMPORARY: currentCycle <= totalCycles)          │
│    → Retorna: Override.amount (Source: "NEGOTIATED_PRICE")  │
└──────────────────────────────┬──────────────────────────────┘
                               │ NO
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. ¿Es Socio Fundador (isFounder=true && lockedPrice!=null)?│
│    → Retorna: Suscripcion.lockedPrice (Source: "FOUNDER")   │
└──────────────────────────────┬──────────────────────────────┘
                               │ NO
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. ¿Tiene precio permanente negociado en Suscripcion?       │
│    (lockedPrice!=null sin ser Founder)                      │
│    → Retorna: Suscripcion.lockedPrice (Source: "LOCKED_PRICE│
└──────────────────────────────┬──────────────────────────────┘
                               │ NO
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Precio oficial vigente del Plan de Catálogo             │
│    → Retorna: Plan.price (Source: "PLAN")                   │
└─────────────────────────────────────────────────────────────┘
                               +
┌─────────────────────────────────────────────────────────────┐
│ 5. Add-ons contratados activos                              │
│    → Total Facturable = BaseEffectivePrice + AddonsTotal    │
└─────────────────────────────────────────────────────────────┘
```

### Reglas críticas de interacción:
1. **Founder protegido:** Si un negocio es Founder con tarifa congelada de $10 y se le concede una promoción de $5 por 1 ciclo, durante el ciclo 1 paga $5. Al expirar el ciclo 1, el precio vuelve a su tarifa Founder ($10), **NUNCA** al precio regular de catálogo ($19.99).
2. **Futuro cambio de precio de lista:** Si un plan cuesta $19.99 y se pactan 2 ciclos a $5, y entretanto el catálogo actualiza el precio del plan a $24.99:
   - Ciclo 1: $5.00
   - Ciclo 2: $5.00
   - Ciclo 3 (expirado): $24.99 (toma el precio oficial vigente en ese momento).
3. **Cambio de Plan (Upgrade/Downgrade):** Si un cliente con descuento en "Crecimiento" cambia a "Pro", el override comercial asociado al plan anterior se cancela/finaliza, pasando inmediatamente a la tarifa del nuevo plan a menos que Superadmin aplique una negociación explícita sobre el nuevo plan.
4. **Trial:** El período de prueba (`trial_fin`) opera en paralelo; los ciclos de cobro efectivo inician tras el trial o aplican al primer cargo formal.

---

## 6. Propuesta Técnica Canónica

### A. Nuevos Modelos en Prisma (`prisma/schema.prisma`)

```prisma
model SubscriptionPricingOverride {
  id             String    @id @default(uuid())
  subscriptionId String
  type           String    // 'TEMPORARY' | 'PERMANENT'
  amount         Float     // Monto negociado pactado (ej. 5.00)
  currency       String    @default("USD")
  
  // Control de Ciclos
  totalCycles    Int?      // null si es PERMANENT, número entero >= 1 si es TEMPORARY
  currentCycle   Int       @default(1)
  
  // Validez temporal complementaria
  startAt        DateTime  @default(now())
  endAt          DateTime?
  status         String    @default("ACTIVE") // 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'SUPERSEDED'
  
  reason         String?   // Motivo comercial (ej. "Acuerdo comercial de bienvenida")
  createdBy      String?   // ID de usuario Superadmin responsable
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  subscription   Suscripcion @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)

  @@index([subscriptionId])
  @@index([status])
}

model SubscriptionPricingAudit {
  id             String    @id @default(uuid())
  subscriptionId String
  businessId     String
  action         String    // 'NEGOTIATED_PRICE_CREATED' | 'NEGOTIATED_PRICE_UPDATED' | 'NEGOTIATED_PRICE_CANCELLED' | 'NEGOTIATED_PRICE_EXPIRED' | 'NEGOTIATED_PRICE_APPLIED' | 'NEGOTIATED_PRICE_REVERTED'
  previousPrice  Float?
  newPrice       Float
  overrideType   String?   // 'TEMPORARY' | 'PERMANENT'
  durationCycles Int?
  cycleNumber    Int?
  reason         String?
  userId         String?
  createdAt      DateTime  @default(now())

  @@index([subscriptionId])
  @@index([businessId])
  @@index([createdAt])
}
```

Y en el modelo `Suscripcion` agregamos la relación bidireccional:
```prisma
pricingOverrides SubscriptionPricingOverride[]
```

### B. Servicio Central de Precios (`src/lib/services/pricingService.ts`)

Reemplaza/extiende la lógica dispersa mediante un único servicio unificado:

```ts
export interface EffectiveSubscriptionPriceResult {
  amount: number;
  currency: string;
  source: 'PLAN' | 'LOCKED_PRICE' | 'NEGOTIATED_PRICE' | 'FOUNDER';
  planPrice: number;
  negotiatedPrice?: number;
  cycleNumber?: number;
  totalCycles?: number | null;
  overrideType?: 'TEMPORARY' | 'PERMANENT';
  validFrom?: Date;
  validUntil?: Date;
  nextRenewalPrice: number;
  isFounder: boolean;
  addonsTotal: number;
  totalWithAddons: number;
}
```

Con los métodos principales:
- `getEffectiveSubscriptionPrice(subscriptionId: string)`
- `advanceSubscriptionCycle(subscriptionId: string)` (para ser invocado en cada renovación/aprobación de pago)
- `applyNegotiatedPrice(params: ApplyNegotiatedPriceParams)`
- `cancelNegotiatedPrice(subscriptionId: string, adminUserId: string, reason?: string)`

---

## 7. Archivos a Modificar / Crear

1. **Esquema de Base de Datos:**
   - `prisma/schema.prisma` (Agregar `SubscriptionPricingOverride`, `SubscriptionPricingAudit`, relación en `Suscripcion`).
2. **Servicios Core:**
   - `src/lib/services/pricingService.ts` (Nuevo motor canónico de cálculo de precio efectivo, ciclos y auditoría).
   - `src/lib/services/planService.ts` (Actualizar `getEffectiveSubscriptionPrice` y `getEffectiveSubscriptionPricingDetails` para delegar en `pricingService`).
   - `src/core/provisioning/ProvisioningEngine.ts` (Soportar `negotiatedPrice` en el payload y crear el override y auditoría correspondientes).
3. **APIs Backend:**
   - `src/app/api/superadmin/suscripciones/route.ts` (Integrar endpoints para crear/editar/cancelar precios negociados).
   - `src/app/api/admin/billing/approve/route.ts` (Al aprobar renovación, avanzar ciclo de negociación automáticamente y registrar auditoría).
   - `src/app/api/billing/request-upgrade/route.ts` y `src/app/api/admin/plan/solicitar/route.ts` (Calcular monto server-side con `pricingService`, eliminando montos arbitrarios del cliente).
4. **Interfaces de Usuario Superadmin:**
   - `src/components/superadmin/wizard/AppDeliveryWizard.tsx` (Agregar bloque de "Precio Negociado" con selector Permanente / N Ciclos y Resumen Comercial de renovación).
   - `src/app/superadmin/suscripciones/page.tsx` (Mostrar badge de "Precio Negociado", ciclo actual ej. "Ciclo 1 de 2", y próximo precio post-negociación).
   - `src/components/superadmin/SuscripcionActions.tsx` (Permitir a Superadmin editar o cancelar negociaciones con auditoría).
5. **Pruebas Automatizadas:**
   - `src/scripts/test_negotiated_pricing.ts` (Suite completa verificando los 12 casos de prueba solicitados: normal, permanente, temporal 1 ciclo, 3 ciclos, cambio de precio de lista, Founder intacto, Addons independientes, Trial inmutable, cambio de plan, multi-tenant y renovaciones automáticas).

---

## 8. Confirmación de Cero Impacto Destructivo

- No se modificó ningún archivo del sistema durante esta fase de auditoría.
- No se ejecutaron migraciones ni modificaciones en la base de datos de producción o local.
- Se respetó estrictamente la regla de negocio y de lenguaje en español.
