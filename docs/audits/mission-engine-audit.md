# Auditoría Canónica del Sistema de Misiones, Recompensas y Gamificación de Citiox

**Fecha de Auditoría:** 18 de Septiembre de 2026  
**Objetivo:** Evaluar la arquitectura actual de misiones, eventos, progreso y recompensas en Citiox para diseñar el **Mission Engine Universal desacoplado** que opere uniformemente en todas las verticales de negocio (Servicios/Citas, Canchas Deportivas, Lavandería/Shoe Care, Tiendas/E-commerce, Restaurantes, Gimnasios y futuras expansiones).

---

## 1. Arquitectura Actual

El sistema de gamificación y misiones de Citiox se encuentra actualmente compuesto por tres capas históricas que conviven de forma híbrida:

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             FUENTES DE EVENTOS                                   │
│  - Citas completadas (Appointments)                                              │
│  - Perfil de cliente actualizado                                                 │
│  - Reseña enviada                                                                │
└──────────────────────────────────────┬───────────────────────────────────────────┘
                                       │ publishGrowthEvent()
                                       ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                         EVENT BUS / LOG DE AUDITORÍA                             │
│  - QuestEventLog (persistencia del payload y estado procesado)                   │
│  - DomainEvent (Event Store para agregados de dominio)                           │
│  - Llamada HTTP asíncrona no bloqueante a /api/admin/misiones/process            │
└──────────────────────────────────────┬───────────────────────────────────────────┘
                                       │
                    ┌──────────────────┴──────────────────┐
                    ▼                                     ▼
┌──────────────────────────────────────┐┌──────────────────────────────────────────┐
│      MOTOR LEGACY (QuestEngine)      ││    MOTOR CANÓNICO (BusinessMissionService)│
│ - Modelo: Quest / QuestProgress      ││ - Modelo: MissionDefinition              │
│ - Cantidad fija (+1 por evento)      ││ - BusinessMission / BMProgress           │
│ - Filtro acoplado: servicioId, monto ││ - Catálogo global + instalación local    │
│ - Recompensas: JSON 'acciones'       ││ - RewardCatalog + RewardDispatcher       │
└──────────────────────────────────────┘└──────────────────────────────────────────┘
                    │                                     │
                    ▼                                     ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                     RECOMPENSAS, WALLET Y REDENCIONES                            │
│  - WalletService: XP, Diamantes, Cashback, Puntos Temporada                      │
│  - CouponHandler: ClientCoupon (asociado a cupones locales)                      │
│  - GiftHandler: LoyaltyReward + LoyaltyRedemption (Códigos QR / Claim Codes)     │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### Problemas Estructurales Identificados:
1. **Dispersión de Modelos**: Coexisten `Quest` (sistema legacy creado por negocio o clonado de plantillas) y `BusinessMission` (misiones canónicas creadas en Superadmin mediante `MissionDefinition` e instaladas por negocio).
2. **Dependencia Exclusiva de Citas**: Prácticamente el único evento del ciclo de vida operativo que emite al bus de misiones es `BOOKING_COMPLETED` desde `src/lib/loyalty/loyaltyEngine.ts`. Los pedidos de restaurante, ventas de tienda, órdenes de lavandería/calzado y reservas de canchas no emiten eventos canónicos de negocio al motor de misiones.
3. **Avance Rígido (Sólo Conteos Unitarios +1)**: Tanto `QuestEngine` como `BusinessMissionService` hacen `nuevoProgreso = progress.progresoActual + 1`. No existe agregación por monto gastado (`AMOUNT`: ej. acumular \$50 en compras) ni por cantidad de ítems (`QUANTITY`: ej. lavar 5 pares de zapatos o reservar 3 horas de cancha).
4. **Falta de Idempotencia Canónica**: Si un evento se reintenta o se dispara dos veces (por ejemplo, doble llamada al actualizar estado de una orden), el usuario recibe doble avance y potencialmente dobles recompensas, debido a la ausencia de una clave única de idempotencia `(negocioId, eventType, entityId)`.
5. **Ciclo de Vida de Recompensas No Homogéneo**: Los premios otorgados por misiones terminan o bien como saldo en `UserPoints` / `Wallet`, o como `ClientCoupon`, o como `LoyaltyRedemption`. Falta una entidad canónica unificada `UserReward` con máquina de estados estricta (`AVAILABLE` ➔ `RESERVED` ➔ `REDEEMED` / `EXPIRED`).

---

## 2. Modelos Existentes en Prisma

### 2.1 Modelos de Misiones
* **`MissionDefinition`**:
  - Catálogo maestro global de misiones (creado por Superadmin).
  - Campos: `id`, `nombre`, `descripcion`, `categoria`, `dificultad`, `triggerEvent`, `cantidadMeta`, `condicionesExtra` (JSON), `requiresBusinessReward`, `status` (DRAFT, PUBLISHED, ARCHIVED).
* **`BusinessMission`**:
  - Representa la suscripción/instalación de una `MissionDefinition` por parte de un negocio específico (`negocioId`).
  - Campos: `id`, `missionDefinitionId`, `negocioId`, `rewardConfiguration` (JSON de premio local), `status` (ACTIVE, PAUSED, ENDED, PENDING_REWARD).
* **`BusinessMissionProgress`**:
  - Progreso por usuario en una `BusinessMission`.
  - Campos: `id`, `businessMissionId`, `userId`, `progresoActual`, `progresoRequerido`, `estado` (`EN_PROGRESO`, `COMPLETADA`, `RECOMPENSADA`), `recompensaDada`.
* **`Quest` (Legacy)**:
  - Misión independiente por negocio.
  - Campos: `id`, `negocioId`, `campaignId`, `nombre`, `triggerEvent`, `servicioId`, `montoMinimo`, `cantidadMeta`, `condicionesExtra`, `acciones` (JSON), `repetible`, `xp`.
* **`QuestProgress` (Legacy)**:
  - Progreso por usuario y `questId`.
  - Campos: `id`, `questId`, `userId`, `progresoActual`, `progresoRequerido`, `estado` (`EN_PROGRESO`, `COMPLETADA`, `RECLAMADA`).
* **`QuestEventLog`**:
  - Bitácora de eventos recibidos por el bus: `id`, `negocioId`, `userId`, `eventType`, `payload` (JSON), `procesado` (boolean).
* **`GlobalMission` & `BusinessGlobalMission`**:
  - Misiones B2B dirigidas al dueño del negocio (completar perfil, crear 3 servicios, etc.), no para el cliente final.

### 2.2 Modelos de Recompensas y Puntos
* **`RewardCatalog`**:
  - Catálogo de premios de plataforma y recompensas configurables (`handler`, `provider`, `config`, `valor`, `tipo`).
* **`MissionRewardDefinition`**:
  - Enlace n-a-n entre `MissionDefinition` y `RewardCatalog`.
* **`UserPoints`**:
  - Balance de puntos de fidelización, experiencia acumulada y cashback por usuario en cada negocio (`userId`, `negocioId`, `puntos`, `experiencia`, `cashback`).
* **`PointsHistory`**:
  - Movimientos de acumulación y deducción de puntos (`concepto`, `referenciaId`, `puntos`).
* **`ClientCoupon`**:
  - Cupones personales asignados al cliente derivados de misiones o campañas (`codigo`, `descuento`, `tipo`, `estado`).
* **`LoyaltyReward` & `LoyaltyRedemption`**:
  - Premios físicos o servicios gratis canjeables mediante código QR (`claimToken`), código manual (`claimCode`) y validación de staff (`estado`: `DISPONIBLE`, `PENDIENTE_ENTREGA`, `CANJEADO`, etc.).

---

## 3. APIs Actuales

| Endpoint | Método | Función | Estado |
| :--- | :--- | :--- | :--- |
| `/api/admin/misiones/process` | `POST` | Procesa un `QuestEventLog` llamando a `processGrowthEventLog()`. | Activo pero sólo procesa conteos unitarios. |
| `/api/admin/misiones` | `GET`, `POST` | Admin de negocio: CRUD de misiones legacy (`Quest`). | Funcional para citas; no adaptado a todas las verticales. |
| `/api/admin/misiones-citiox` | `GET`, `POST` | Admin de negocio: Listado de `BusinessMission` instaladas y configuración de premio propio. | Canónico moderno. |
| `/api/superadmin/mission-definitions` | `GET`, `POST`, `PUT` | Superadmin: Creación y publicación de `MissionDefinition` globales. | Canónico moderno. |
| `/api/public/[slug]/misiones` | `GET` | App del cliente: Consulta misiones disponibles, progreso del usuario, niveles y puntos. | Agrupa híbrido `BusinessMission` + `Quest`. |
| `/api/shoe-care/orders/[id]/status` | `PUT` | Cambia estado de orden de calzado/lavandería. | **No emite eventos de negocio** al bus. |
| `/api/admin/pedidos` | `PUT` | Cambia estado de órdenes de tienda o restaurante (`ENTREGADO`). | Emite a `coreEventBus` legacy, pero **no al bus de misiones**. |
| `/api/appointments/[id]/status` | `PUT` | Completa una cita médica o de salón. | Emite `BOOKING_COMPLETED` al bus de misiones vía `loyaltyEngine`. |

---

## 4. Eventos Actuales y Brecha Multivertical

### Eventos Definidos en `GrowthEventType`
Actualmente el enum define tipos como:
`USER_REGISTERED`, `USER_LOGIN`, `BOOKING_COMPLETED`, `BOOKING_CANCELLED`, `PAYMENT_APPROVED`, `REVIEW_CREATED`, `REFERRAL_COMPLETED`, `CHECKIN`, `PROFILE_COMPLETED`, `RESERVATION_COMPLETED`, `QUEST_COMPLETED`, `XP_GAINED`.

### Brecha Detectada:
1. **Canchas (`canchas`)**: Se reservan mediante `Service` y `Appointment`. Al completarse disparan `BOOKING_COMPLETED`, pero la misión no distingue limpiamente si fue una hora de fútbol o un corte de cabello a menos que se filtre por un `servicioId` específico hardcodeado.
2. **Lavandería / Calzado (`shoe-care` / `lavado`)**: Administradas mediante `Pedido` con `extraInfo` específico (`repartidorNombre`, `fotosRecepcion`, etc.). Al marcar la entrega **no se dispara ningún evento**.
3. **Tienda y Restaurante (`pedidos`)**: Administradas mediante `Pedido` y `PedidoItem`. Al finalizar el pedido no se dispara evento de misión con la lista de productos o el monto total consumido.
4. **Gimnasio (`gym` / `cursos`)**: Administrado con `Attendance` y `CourseEnrollment`. Las asistencias registradas no notifican al bus de misiones.

---

## 5. Lógica de Progreso Actual

En `src/lib/growth/questEngine.ts` y `src/lib/growth/businessMissionService.ts`:

```typescript
// Lógica actual en ambos motores:
const nuevoProgreso = progress.progresoActual + 1;
const completada = nuevoProgreso >= progress.progresoRequerido;
```

### Limitaciones Críticas:
1. **Falta de Modos de Agregación (`COUNT`, `QUANTITY`, `AMOUNT`)**:
   - Para misiones como *"Gasta \$100 en el restaurante"*, el incremento debe ser `payload.montoTotal` (`AMOUNT`).
   - Para misiones como *"Lava 3 pares de zapatos"*, el incremento debe ser `payload.itemsCount` o la sumatoria de items (`QUANTITY`).
   - Para misiones como *"Ven a entrenar 5 días"*, el incremento es `+1` (`COUNT`).
2. **Evaluación de Filtros Condicionales Débil**:
   - `ConditionEvaluator` en `missionEngine.ts` sólo evalúa operadores planos (`==`, `>`, `<`, `CONTAINS`) sobre el primer nivel del payload. No soporta filtros anidados (ej. `payload.items.some(i => i.categoria === 'BEBIDAS')`).
3. **Carrera e Idempotencia**:
   - `QuestEventLog` no vincula el `entityId` del evento fuente (ej. `orderId` o `appointmentId`). Una re-emisión manual o por webhook acumula progreso repetido.

---

## 6. Recompensas y Canjes Actuales

La entrega de premios está gestionada por `RewardDispatcher` mediante handlers específicos:
* `WalletHandler`: Suma `DIAMONDS`, `XP`, `CASHBACK` o `SEASON_POINTS` llamando a `WalletService.addFunds()`.
* `CouponHandler`: Genera un registro en `ClientCoupon` para el usuario y negocio.
* `GiftHandler`: Crea una redención física en `LoyaltyRedemption` y asigna `claimCode` y `claimToken` QR para validación presencial.
* `BadgeHandler`: Asigna un `UserBadge`.
* `FreeDaysHandler`: Agrega días de suscripción al negocio (para misiones B2B).

### Estado de Canjes:
* El módulo de premios físicos con QR ya cuenta con auditoría robusta (`LoyaltyRedemption` con escaneo, entrega por staff y token firmado).
* El flujo de cupones se integra directamente con el checkout de citas y tienda.

---

## 7. Dependencias por Tipo de Negocio (Verticales)

Actualmente las misiones **no deben tener bifurcaciones** tipo:
```typescript
if (businessType === 'RESTAURANT') { ... }
else if (businessType === 'LAVANDERIA') { ... }
```
La solución canónica consiste en normalizar los eventos de negocio al emitirse:
* Un evento canónico universal `BusinessEvent`:
  ```typescript
  interface BusinessEvent {
    eventId: string;          // UUID para idempotencia
    negocioId: string;
    userId: string;
    eventType: string;        // APPOINTMENT_COMPLETED, ORDER_COMPLETED, RESERVATION_COMPLETED, CHECKIN_COMPLETED, etc.
    entityId: string;         // appointmentId, orderId, attendanceId
    monto?: number;           // Para agregación AMOUNT
    cantidad?: number;        // Para agregación QUANTITY
    metadata: Record<string, any>; // Atributos para ConditionEvaluator
    timestamp: Date;
  }
  ```
* Cada subsistema de la aplicación (citas, canchas, lavandería, restaurante, tienda, gimnasio) publica este evento al finalizar su ciclo operativo. El `MissionEngine` evalúa las condiciones de la misión contra este evento de manera agnóstica.

---

## 8. Código Reutilizable, Adaptable y Seguro de Eliminar

### ✅ Código Reutilizable (Mantener y Aprovechar):
* `src/lib/growth/rewardDispatcher.ts`: Toda la fábrica de handlers (`WalletHandler`, `CouponHandler`, `GiftHandler`, `BadgeHandler`) está madura y probada.
* `src/lib/growth/walletService.ts`: Gestión transaccional de XP, diamantes y balances.
* `src/lib/growth/ruleEngine.ts` y `ConditionEvaluator`: Reglas de comparación lógica.
* Modelos `MissionDefinition`, `BusinessMission`, `BusinessMissionProgress`, `RewardCatalog`, `LoyaltyRedemption`, `UserPoints`.

### 🔄 Código a Adaptar:
* `src/lib/growth/businessMissionService.ts`:
  - Agregar soporte para tipos de agregación (`COUNT`, `QUANTITY`, `AMOUNT`).
  - Agregar verificación de idempotencia por `(negocioId, eventType, entityId)`.
* `src/lib/growth/eventBus.ts`:
  - Unificar la firma y garantizar que reciba `entityId`, `amount`, `quantity` y metadatos estructurados.
* Controladores operativos:
  - `src/app/api/appointments/[id]/status/route.ts`: emitir evento canónico universal.
  - `src/app/api/admin/pedidos/route.ts`: emitir `ORDER_COMPLETED` al llegar a `ENTREGADO` / `FINALIZADO`.
  - `src/app/api/shoe-care/orders/[id]/status/route.ts`: emitir `LAUNDRY_ORDER_COMPLETED` al llegar a `ENTREGADO`.
  - Subsistemas de reservas de canchas y gimnasio: emitir sus respectivos eventos canónicos.

### ⚠️ Código Legacy a Preservar por Compatibilidad (Sin Eliminar):
* `Quest` y `QuestProgress`: Clientes existentes que tengan misiones creadas en el modelo antiguo deben seguir funcionando transparentemente. El despachador debe evaluar tanto las `BusinessMission` modernas como las `Quest` legadas sin romper bases de datos ni migraciones históricas.

---

## 9. Riesgos de Migración y Mitigaciones

1. **Riesgo de Inconsistencia de Datos en Producción**:
   - Modificar las columnas existentes de `BusinessMissionProgress` podría generar fallas con datos previos.
   - *Mitigación*: Mantener compatibilidad hacia atrás; los campos nuevos o cálculos se agregan de forma opcional con valores por defecto seguros.
2. **Doble Acreditación de Puntos o Recompensas**:
   - *Mitigación*: Implementar tabla o registro de idempotencia `MissionEventDeduplication` o verificar `QuestEventLog` con clave única antes de procesar el incremento de progreso.
3. **Rendimiento y Bloqueo en Operaciones Críticas**:
   - La entrega de un pedido o el check-in de una cita no debe ralentizarse por la evaluación de misiones.
   - *Mitigación*: Emisión asíncrona no bloqueante (fire-and-forget o background queue en Node.js).

---

## 10. Conclusión

La base del sistema de misiones (`MissionDefinition` + `BusinessMission` + `RewardDispatcher`) tiene un diseño conceptual sólido pero incompleto en su integración con las distintas verticales de negocio y limitado a conteos simples de +1.

Con la implementación del **Mission Engine Canónico Universal**, cualquier vertical podrá disparar eventos de negocio estandarizados, y los negocios podrán activar misiones como:
- *Citas*: "Completa 3 citas de odontología/barbería".
- *Canchas*: "Reserva 5 horas de cancha de fútbol o pádel".
- *Lavandería*: "Lava 4 pares de sneakers o acumula \$30 en servicio de tintorería".
- *Tienda/Restaurante*: "Gasta \$50 en compras de la tienda" o "Pide 3 veces a domicilio".
- *Gimnasio*: "Asiste a 12 clases en el mes".

Todo esto dentro de **un único motor universal**, sin duplicar lógica por vertical.
