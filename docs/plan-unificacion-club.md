# Plan de unificación del Club de beneficios

Objetivo: **una sola moneda (puntos), un solo sistema de niveles y un solo sistema de misiones**, sin perder datos de producción.

> Nada de este plan borra datos por sí solo. Cada paso que elimina tablas exige respaldo previo y se hace después de un periodo de convivencia.

---

## 1. Cómo está hoy (octubre 2026)

### Lo que realmente funciona para el cliente

| Pieza | Modelo vivo | Quién lo usa |
|---|---|---|
| Puntos | `UserPoints.puntos` (canje) + `UserPoints.experiencia` (nivel) + `PointsHistory` | `lib/loyalty/loyaltyEngine.ts` (`addPoints`), cita completada, referidos, misiones |
| Niveles | `LoyaltyLevel` (por negocio) | `lib/loyalty/levelEngine.ts`, app del cliente |
| Temporadas | `LoyaltySeason` (por negocio) | panel y app del cliente |
| Premios | `LoyaltyReward` + `LoyaltyRedemption` | canje en la app del cliente |
| Cupones | `Coupon` + `ClientCoupon` | misiones, niveles, promociones |
| Referidos | `ReferralCampaign`, `ReferralCode`, `ReferralEvent`, `ReferralReward` | `loyaltyEngine` y `lib/referrals.ts` |

### Cuatro sistemas de misiones que se pisan

| Sistema | Modelos | Estado |
|---|---|---|
| A. Misiones del negocio | `Campaign` + `Quest` + `QuestProgress` (motor `questEngine.ts`) | El asistente del panel las creaba, el motor les daba puntos, **pero no aparecían ni en el panel ni en la app del cliente**. Corregido. |
| B. Catálogo Citiox | `MissionDefinition` + `MissionRewardDefinition` + `MissionPublication` + `BusinessMission` + `BusinessMissionProgress` | Es lo que veía el cliente. Se **instalaba solo en todos los negocios**, incluso las que exigen un premio del negocio. Corregido: ahora esas quedan pendientes hasta que el dueño elige el premio. |
| C. Misiones globales para clientes | `ClientGlobalCampaign` + `ClientGlobalQuestProgress` | Sin uso en el código revisado. |
| D. Misiones Citiox para negocios | `GlobalMission` + `BusinessGlobalMission` + `GlobalMissionRewardHistory` | Vivo: es "Gana días gratis". Se queda, es otro público (negocios). |

### Tres sistemas de niveles y tres de temporadas

- Niveles: `LoyaltyLevel` (vivo), `GlobalLevel` (+ `GlobalLevelPresentation`, `GlobalLevelReward`, `GlobalLevelHistory`) y `LevelTier` + `UserLevel`.
  - **Error encontrado:** el panel mostraba los `GlobalLevel` heredados, pero el motor sube de nivel a los clientes con `LoyaltyLevel`. El dueño veía unos niveles y sus clientes tenían otros. Corregido: si el negocio tiene niveles propios, el panel muestra esos.
- Temporadas: `LoyaltySeason` (vivo), `Season`, `GlobalSeason`.
- Herencia "Club Citiox": `BusinessInheritance` + `ClubResolver` + `/admin/club` (pantalla huérfana, no está en el menú).

### Monedas con distintos nombres

"Diamantes", "puntos", "XP", "cashback" y "créditos". En la base son lo mismo: `puntos` y `experiencia` suben juntos al ganar. **La app del cliente ya dice "puntos" en todos lados.**

---

## 2. Lo que ya se hizo (sin migraciones ni borrado)

1. **Activación en 1 minuto** (`/api/admin/club/quick-start` y `components/admin/ClubQuickStart.tsx`).
   - Hay plantillas por tipo de negocio en `lib/loyalty/clubPresets.ts`.
   - Cada plantilla crea las reglas de puntos, 3 niveles, misiones y 3 premios.
   - No toca lo que el negocio ya tenga.
2. **Las misiones del negocio (sistema A) ahora se ven** en el panel y en la app del cliente, junto a las del catálogo Citiox.
3. Las misiones del catálogo que **exigen premio del negocio ya no se activan solas**.
4. **Quitar una misión del catálogo la archiva** (`ENDED`) en vez de borrarla. Antes se volvía a instalar sola en la siguiente carga.
5. **Niveles coherentes:** el panel muestra los niveles que usa el motor.
6. **Recomendar a un amigo** ahora publica el evento `REFERRAL_COMPLETED`, así que las misiones de referidos pueden avanzar.
7. **"Puntos" en toda la app del cliente.**
8. **Cifras inventadas fuera:** se quitaron el "ROI" fijo (32.5%) de la API y las cifras falsas del panel.

---

## 3. Lo que falta, en orden de impacto

### Prioridad 1: conectar ventas al club

Hoy **solo las citas completadas suman puntos solas** (además de las asistencias del gimnasio y las reseñas). Las ventas en caja (`/api/[slug]/pos/checkout`), los pedidos en línea y las órdenes de lavandería no identifican al cliente, así que no suman.

1. **Caja (POS):** pedir el teléfono del cliente (opcional) y buscar o crear el `Usuario`. Al cobrar:
   - llamar `addPoints(userId, negocioId, puntosPorCompra, 'COMPRA', ventaId)`;
   - publicar `ORDER_COMPLETED` con `monto`.
2. **Pedidos en línea y mesa:** al marcar un pedido como entregado o pagado, hacer lo mismo (el cliente ya está identificado).
3. **Lavandería:** publicar `LAUNDRY_ORDER_COMPLETED` al entregar.
4. **Regla nueva:** `puntosPorDolar` en la configuración, por ejemplo 1 punto por cada $1.

### Prioridad 2: un solo sistema de misiones

Propuesta: **`Quest` es la misión canónica** (ya tiene motor, progreso, reglas, cadenas y segmentación).

1. Cuando el negocio instala una misión del catálogo Citiox, se **copia como `Quest`**:
   - `origen = 'PLANTILLA'`, con `templateIdOrigen` y `templateVersionOrigen`;
   - el premio lo elige el negocio en ese momento.
2. **Migración de datos:**
   - por cada `BusinessMission` activa, crear su `Quest` equivalente;
   - copiar `BusinessMissionProgress` a `QuestProgress` (mismo `userId`, `progresoActual` y estado).
3. Convivencia de 30 días con ambos leyendo. Después, dejar de llamar `BusinessMissionService.processUserProgress` y `ensureAllMissionsInstalledForNegocio`.
4. **Retirar** `BusinessMission`, `BusinessMissionProgress` y `MissionPublication`. `MissionDefinition` queda solo como catálogo, o se reemplaza por `QuestTemplate`, que ya existe.
5. **Retirar** el sistema C (`ClientGlobalCampaign` y `ClientGlobalQuestProgress`). Las "misiones de red" del Pasaporte Citiox se diseñan aparte, con premios pagados por Citiox o por negocios aliados.

### Prioridad 3: niveles y temporadas

1. `LoyaltyLevel` canónico. `GlobalLevel` queda solo como plantilla del superadmin para negocios nuevos.
2. Migrar la segmentación por nivel de `Quest.segmentacion.level`: hoy lee `UserLevel` y `LevelTier`, debe leer `UserPoints.NivelActual`. Lo mismo para la acción `UP_LEVEL` de `rewardEngine.ts`. Luego **retirar** `LevelTier` y `UserLevel`.
3. `LoyaltySeason` canónico por negocio. `Season` y `GlobalSeason` se reservan para el futuro **ranking mensual de negocios** (Citiox → negocios).
4. Retirar `BusinessInheritance`, `ClubResolver` y la pantalla `/admin/club` cuando nada los lea.

### Prioridad 4: una sola moneda en todo el código

- `RewardCatalog` de tipo `XP` o `DIAMONDS` debe otorgar `puntos` vía `addPoints`.
- En textos del panel y del superadmin, cambiar "diamantes" y "XP" por "puntos".
- `cashback` y `Wallet` solo si un negocio realmente lo pide (es saldo en dinero, otra cosa).

### Prioridad 5: modelos candidatos a eliminar

Sin uso en el código revisado: `QuestParticipant`, `UserStreak` (solo se lee), `Season`, `ClientGlobalCampaign`, `ClientGlobalQuestProgress`, `QuestPack`, `Leaderboard`, `UserWallet`.

> Antes de borrar, buscar en **todo** el repositorio (`rg "nombreModelo"`, incluyendo `scripts/` y `prisma/`) y revisar si las tablas tienen filas en producción.

---

## 4. Procedimiento seguro para cada eliminación

1. Respaldo completo de la base de producción (`pg_dump`).
2. Script de migración idempotente en `scripts/`. Se prueba primero en una copia de producción.
3. Desplegar el código que deja de **escribir** en el modelo viejo.
4. Esperar 2 a 4 semanas y verificar que no llegan escrituras nuevas.
5. Migración Prisma que elimina el modelo.

---

## 5. Notas de seguridad encontradas de paso

- `/api/admin/misiones/process` no exige sesión. Solo procesa eventos ya guardados y marcados como procesados, así que el riesgo es bajo. Aun así, conviene protegerlo con un secreto interno (`x-internal-key`).
- La app del cliente pide iniciar sesión antes de mostrar el club. Mostrar misiones y premios **antes** del inicio de sesión, en modo vista, ayudaría a que más clientes se registren.
