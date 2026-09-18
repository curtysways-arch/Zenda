# CITIox — AUDITORÍA DEL VERTICAL GIMNASIO & FITNESS

**Fecha**: 18 de Septiembre de 2026  
**Documento**: `docs/audits/gym-experience-audit.md`  
**Estado**: Completado  
**Objetivo**: Evaluar la arquitectura existente de Citiox (Prisma, Core Blueprints, Capabilities, Entitlements, Runtime, Modules, Experiencias, Eventos y Base de Datos) antes de la implementación del vertical GIMNASIO, garantizando aislamiento estricto y reutilización del Core sin duplicaciones.

---

## 1. RESUMEN EJECUTIVO

Citiox cuenta con una arquitectura canónica modular basada en 5 pilares:
1. **BusinessType & PlanFamily** (clasificación y empaquetado comercial SaaS).
2. **BusinessBlueprint** (declaración composicional de capacidades y configuración predeterminada).
3. **Capabilities & Entitlements** (derechos efectivos, control de acceso RBAC y límites por suscripción).
4. **Experience Engine & Registry** (resolución dinámica de interfaces públicas, administrativas y dashboards).
5. **EventBus & MissionEngine** (automatización desacoplada, fidelización, recompensas y gamificación).

### Hallazgos Críticos de la Auditoría:
* **Falta del vertical GIMNASIO en el Core**: Actualmente no existen `BusinessType = GIMNASIO`, `PlanFamily = GIMNASIO`, ni `Blueprint = GYM`. Los negocios de entrenamiento existentes (como `vortex-fitness`) están clasificados erróneamente como `tipoNegocio = 'RESERVA'` y asignados al `BusinessType = 'citas'` ("Citas con Profesional"), obligándolos a operar con la lógica de citas/agenda por horas y servicios individuales en vez del modelo de Membresías y Accesos.
* **Modelos de Datos de Membresía Inexistentes**: En `schema.prisma` no existen los modelos `MembershipPlan` ni `Membership`. 
* **Modelo `Attendance` existente reservado para Cursos**: En `schema.prisma` existe un modelo denominado `Attendance` (líneas 39-47), pero está rígidamente acoplado a `CourseEnrollment` y `CourseSchedule` (Módulo Academia / Cursos Deportivos), careciendo de `businessId`, `customerId`, `membershipId`, métodos de acceso, etc. Modificar este modelo de forma destructiva rompería la compatibilidad con el módulo de Cursos/Academia. Por lo tanto, para el vertical gimnasio se deben crear modelos limpios y aditivos: `MembershipPlan`, `Membership`, `GymAccessLog` (o `GymAccess`) y `GymAttendance`.
* **Clientes y Staff Universales Disponibles**: Citiox ya cuenta con `model Cliente` y `model Usuario` para los clientes/socios, y `model Staff` para profesionales/entrenadores. **NO** se deben crear `GymCustomer` ni `GymStaff`.
* **EventBus y MissionEngine listos**: El sistema de eventos (`src/lib/growth/eventBus.ts`, `questEngine.ts`, `businessMissionService.ts`) ya define y procesa el evento canónico `GYM_ATTENDANCE` y `MEMBERSHIP_PURCHASED` con soporte de idempotencia por `(negocioId, eventType, entityId)`.
* **Librerías de QR disponibles**: El proyecto ya tiene instalado `qrcode.react` (`QRCodeSVG`) para generación de códigos QR de acceso seguros en frontend.

---

## 2. AUDITORÍA DETALLADA POR COMPONENTE

### 2.1 Prisma Schema & Modelos de Datos

| Concepto Requerido | Estado Actual en Prisma | Decisión de Diseño / Acción Canónica |
| :--- | :--- | :--- |
| **MembershipPlan** | ❌ No existe | Crear `model MembershipPlan`: planes comerciales del gimnasio (mensual, trimestral, anual, personalizado), precio histórico, duración en días, beneficios JSON, reglas de acceso, `businessId`. |
| **Membership** | ❌ No existe | Crear `model Membership`: membresía adquirida por un `Cliente`, con `status` (`PENDING_PAYMENT`, `ACTIVE`, `EXPIRED`, `FROZEN`, `CANCELLED`), `startAt`, `endAt`, `price` histórico, `paymentStatus`, `frozenAt`, `freezeReason`, `unfrozenAt`, etc. |
| **Access Validation** | ❌ No existe | Crear `model GymAccessLog`: registro de validación de acceso / intento de ingreso (código QR o manual), resultado (`GRANTED`, `DENIED`), motivo de rechazo si aplica, `businessId`, `branchId`. |
| **Attendance** | ⚠️ Existe para Academia (`CourseEnrollment`) | Crear `model GymAttendance`: registro efectivo de asistencia presencial al gimnasio vinculada al socio (`Cliente`), membresía y acceso, con `method` (`QR`, `MANUAL`, `NFC`, `TURNSTILE`), `checkedInAt`, `checkedOutAt`, `branchId` y `metadata`. Preserva intacto el modelo `Attendance` de cursos. |
| **Customer / Socio** | ✅ Existe `model Cliente` y `model Usuario` | **Reutilizar 100%**: Asociar `Cliente` con `Membership[]` y `GymAttendance[]`. Un cliente puede tener múltiples membresías en su historial sin destruir registros pasados. |
| **Trainers / Entrenadores** | ✅ Existe `model Staff` | **Reutilizar 100%**: Usar `Staff` con `role = "ENTRENADOR"` o coach, especialidades y horarios (`StaffSchedule`). No crear modelo paralelo. |
| **Classes / Clases** | ✅ Existe `model Course` y `CourseSchedule` | **Reutilizar cuando aplique**: Si el gimnasio activa la capability `CLASSES`, reutilizar la infraestructura existente de clases grupales/talleres sin forzar citas individuales. |
| **Payments** | ✅ Existe `model Payment`, `OrderPayment`, `PaymentMethod` | **Reutilizar 100%**: Registrar pagos de membresías respetando el historial inmutable y conectando a métodos de pago activos del negocio. |
| **AuditLog** | ✅ Existe `model AdminAuditLog` | **Reutilizar 100%**: Registrar auditoría de cambios en membresías (congelamientos, renovaciones, cancelaciones, accesos manuales). |
| **Branch (Multisucursal)**| ✅ Existe `model Branch` | **Reutilizar 100%**: Membresías, accesos y asistencias soportarán `branchId` opcional/asignado sin romper aislamiento de negocio. |

---

### 2.2 BusinessType & PlanFamily (Nivel Plataforma SaaS)

#### Estado Actual en Base de Datos (`dev.db`):
* **PlanFamilies registradas**:
  1. `RESTAURANTE` (`restaurantes`)
  2. `SERVICIOS` (`servicios`)
  3. `CANCHAS` (`canchas`)
  4. `LAVANDERIA` (`lavanderias`)
  5. `TIENDA` (`tiendas`)
  6. `DENTISTA` (`dentistas`)
* **BusinessTypes registrados**:
  * `citas` (Citas con Profesional -> PlanFamily: `SERVICIOS`)
  * `restaurante` (Restaurante & Gastronomía -> PlanFamily: `RESTAURANTE`)
  * `ecommerce` (Tienda & E-commerce -> PlanFamily: `TIENDA`)
  * `canchas` (Canchas & Clubes Deportivos -> PlanFamily: `CANCHAS`)
  * `lavanderia` (Lavandería & Cuidado -> PlanFamily: `LAVANDERIA`)
  * `dental` (Clínicas Dentales & Odontología -> PlanFamily: `DENTISTA`)

#### Negocio Demo Existente: `vortex-fitness`:
* Actualmente configurado con:
  * `slug`: "vortex-fitness"
  * `nombre`: "Vortex Fitness Club"
  * `tipoNegocio`: "RESERVA"
  * `businessTypeId`: "c7872b18-3c45-4982-89b1-b86d9a26c5f2" (asociado erróneamente a Citas)
  * `configuracion`: `{"tipoNegocio": "Gimnasio", ...}`
* **Diagnóstico**: `vortex-fitness` está forzado a comportarse como un salón de belleza/spa de citas porque no existía el vertical nativo. La implementación canónica le permitirá operar con el runtime de gimnasio puro.

#### Acciones Canónicas Requeridas:
1. Crear `PlanFamily` con `code = 'GIMNASIO'`, `name = 'Gimnasios & Fitness'`, `slug = 'gimnasios'`, `icon = 'Dumbbell'`.
2. Crear `BusinessType` con `slug = 'gimnasio'`, `name = 'Gimnasio & Centro Fitness'`, `color = '#EA580C'`, `resourceType = 'INFRASTRUCTURE'`, enlazado a la nueva `PlanFamily`.
3. Crear planes SaaS base en la familia (Inicio, Crecimiento, Pro) con límites universales vía `PlanLimit` (`MAX_MEMBERS`, etc.) configurables desde el Plan Builder sin hardcoding.

---

### 2.3 Blueprint & Capabilities

#### Capacidades Canónicas para Gimnasio:
* En `src/core/capabilities/types.ts`:
  * Ya existe: `MEMBERSHIPS: 'memberships'`.
  * Incorporar claves oficiales complementarias si no están presentes: `MEMBERSHIP_PLANS`, `ACCESS`, `ATTENDANCE`, `CLASSES`, `TRAINERS`.
* En `src/core/blueprints/BlueprintManifests.ts`:
  * Crear `GYM_BLUEPRINT_MANIFEST`:
    ```ts
    export const GYM_BLUEPRINT_MANIFEST: BlueprintManifest = {
      id: 'GYM',
      version: '1.0.0',
      name: 'Blueprint Gimnasio & Centro Fitness',
      description: 'Gestión integral de socios, membresías recurrentes, control de accesos QR y asistencias',
      capabilities: [
        { id: 'memberships', version: '1.0.0', enabled: true, configuration: {}, dependencies: [] },
        { id: 'attendance', version: '1.0.0', enabled: true, configuration: { duplicateWindowMinutes: 5 }, dependencies: ['memberships'] }
      ],
      defaultConfiguration: {
        allowFreezing: true,
        maxFreezeDaysPerYear: 30,
        accessGracePeriodDays: 0,
        duplicateScanWindowSeconds: 60
      }
    };
    ```
  * Registrar en `ALL_BLUEPRINT_MANIFESTS` con claves: `GYM`, `GIMNASIO`, `FITNESS`.

#### EntitlementsService & Presets:
* En `src/core/entitlements/EntitlementsService.ts`:
  * Actualizar `getPresetCapabilities()` para reconocer `isGym`:
    ```ts
    if (isGym) {
      return {
        MEMBERSHIPS: true,
        MEMBERSHIP_PLANS: true,
        ACCESS: true,
        ATTENDANCE: true,
        PAYMENTS: true,
        PROMOTIONS: true,
        LOYALTY: true,
        REPORTS: true,
        CUSTOMERS: true,
        CLASSES: false, // Opcional según plan
        TRAINERS: false, // Opcional según plan
        APPOINTMENTS: false,
        SERVICES: false,
        TABLES: false,
        KITCHEN: false,
        DELIVERY: false,
        DISPATCH: false,
        COURTS: false,
        INVENTORY: false
      };
    }
    ```

---

### 2.4 Module Catalog & Sidebar Dinámico

#### Module Catalog (`src/core/modules/`):
* En `src/core/modules/types.ts`: agregar `'GYM'` a `BusinessModuleType`.
* En `src/core/modules/registry.ts`: registrar el módulo `GYM` con sus iconos, navegación declarativa y addons compatibles (`loyalty`, `whatsapp`, `promotions`).

#### Admin Sidebar (`src/components/admin/AdminSidebar.tsx`):
* Reconocer cuando un negocio tiene activas las capabilities del gimnasio (`isGymBiz = capabilities.memberships`).
* Renderizar las secciones especializadas de gimnasio:
  * **GESTIÓN DE SOCIOS & MEMBRESÍAS**:
    * Inicio / Dashboard (`/admin`)
    * Socios (`/admin/socios` o pestaña especializada en `/admin/clientes`)
    * Membresías (`/admin/membresias`)
    * Planes (`/admin/membresias/planes`)
    * Control de Acceso (`/admin/accesos`)
    * Asistencias (`/admin/asistencias`)
  * **CATÁLOGO & CLASES** (si `CLASSES` o `TRAINERS` está activo):
    * Clases Grupales (`/admin/clases`)
    * Entrenadores (`/admin/staff`)
  * **MARKETING & CRECIMIENTO**:
    * Promociones (`/admin/promociones`)
    * Club de Beneficios / Misiones (`/admin/misiones`)
  * **ADMINISTRACIÓN**:
    * Pagos (`/admin/caja`)
    * Reportes de Gimnasio (`/admin/reportes`)
    * Configuración (`/admin/config`)

---

### 2.5 Experience Pack & Public Landing

#### Despacho en `src/app/[slug]/page.tsx`:
* Detectar si el negocio corresponde al vertical `GIMNASIO` (vía `blueprintId === 'GYM'`, `tipoNegocio === 'GIMNASIO'`, o configuración del negocio).
* Resolver y renderizar el componente especializado `GymLanding`:
  * **Hero Deportivo & Premium**: Título impactante ("TU MEJOR VERSIÓN COMIENZA AQUÍ" o configurable en `heroTitulo`), beneficios en pill badges, CTA primario "Ver membresías", CTA secundario "Conocer el gimnasio".
  * **Planes de Membresía**: Sección estelar dinámica consultando `MembershipPlan` (Mensual, Trimestral, Anual, etc.) con precios reales, lista de beneficios, badge destacado y botón de compra/adquisición.
  * **Beneficios de las Instalaciones**: Zona de pesas, cardio, vestidores, regaderas, etc.
  * **Clases y Entrenadores**: Presentación de clases grupales y coaches (si están habilitados).
  * **Promociones Activas**: Conexión al sistema universal de `Promotion`.
  * **Testimonios & Ubicación**: Horarios y mapa.
  * **CTA Final de Cierre**: "Elige tu membresía y comienza hoy".

#### Experiencia del Socio (Miembro / Member Portal):
* `/[slug]/mi-membresia`: Visualización de membresía activa, fecha de vencimiento, barra de progreso de días restantes, beneficios y opción de renovación.
* `/[slug]/mi-qr`: Generación de código QR seguro para escaneo en recepción.
* `/[slug]/asistencias`: Historial de registros de asistencias del socio.
* `/[slug]/misiones`: Progreso de metas deportivas y recompensas desbloqueadas.

---

### 2.6 Control de Acceso, Asistencias & Idempotencia

#### Flujo de Validación de Acceso:
```text
Socio presenta QR (o Recepcionista busca por Cédula/Nombre)
                     ↓
POST /api/admin/gym/access/validate
                     ↓
Validar Tenant: negocioId autenticado coincide
                     ↓
Buscar Cliente y Membresía más reciente
                     ↓
¿Membresía existe y status == ACTIVE y now() <= endAt?
    ├── NO: Registrar GymAccessLog(DENIED, motivo) → Retornar 403 con motivo claro (Vencida, Congelada, etc.)
    └── SÍ:
         ↓
         ¿Escaneo duplicado en los últimos X segundos (ej. 60s)?
             ├── SÍ: Retornar advertencia "Acceso ya registrado hace instantes" (Prevenir doble asistencia)
             └── NO:
                  ↓
                  Crear GymAccessLog(GRANTED)
                  Crear GymAttendance(checkedInAt = now, method = 'QR')
                  Auditar en AdminAuditLog(ATTENDANCE_REGISTERED)
                  Publicar evento GYM_ATTENDANCE al EventBus
                  MissionEngine procesa avance de misiones deportivas
                  Retornar 200 { access: 'GRANTED', member: { ... } }
```

---

### 2.7 Integración con MissionEngine (Gamificación & Fidelización)

* Citiox ya posee en `src/lib/growth/eventBus.ts` la definición del evento `'GYM_ATTENDANCE'`.
* El `questEngine.ts` y `businessMissionService.ts` ya reconocen `GYM_ATTENDANCE` y lo vinculan a misiones tipo:
  * "Registra 5 asistencias al gimnasio".
  * "Completa 10 entrenamientos este mes".
  * "Asiste 3 veces por semana".
* La emisión se realiza mediante:
  ```ts
  await publishBusinessEvent({
    negocioId,
    userId: cliente.id,
    eventType: 'GYM_ATTENDANCE',
    entityId: attendance.id,
    cantidad: 1,
    metadata: { method: 'QR', membershipId: membership.id }
  });
  ```
* Se garantiza cero duplicación de progreso y premios gracias a la idempotencia por `(negocioId, eventType, entityId)`.

---

### 2.8 Seguridad Multi-Tenant & Aislamiento

* Todas las consultas y mutaciones de membresías, planes, accesos y asistencias validarán estrictamente la pertenencia al `negocioId` de la sesión activa (`session.user.negocioId`).
* Las rutas de cliente validarán que el cliente pertenezca al `negocioId` del slug correspondiente.
* Ningún gimnasio podrá visualizar ni alterar socios, planes o accesos de otro gimnasio.
* No se tocan modelos clínicos (`ClinicalRecord`, `DentalRecord`, `Odontogram`).
* No se tocan modelos de otros verticales (`RestaurantTable`, `ResourceScheduleGrid`, etc.).
* No se alteran suscripciones existentes ni datos de fundadores (`isFounder`, `lockedPrice`, `founderPosition`).

---

## 3. CONCLUSIÓN DE LA AUDITORÍA

La infraestructura de Citiox está excepcionalmente preparada para recibir el vertical GIMNASIO mediante una extensión canónica:
1. **Adición limpia a Prisma**: Modelos `MembershipPlan`, `Membership`, `GymAccessLog`, `GymAttendance` con claves foráneas adecuadas e índices de alto rendimiento.
2. **Registro canónico en Core**: `GYM_BLUEPRINT_MANIFEST`, presets en `EntitlementsService`, módulo en `MODULE_REGISTRY`, y adaptación de `BusinessModuleResolver` y `LegacyRuntimeAdapter`.
3. **Módulo modular en `src/modules/gym`**: Landing pública, portal de socio, escáner de recepción y dashboard de KPIs operacionales.
4. **Seed canónico**: Registro de `PlanFamily` GIMNASIO y `BusinessType` GIMNASIO en la base de datos sin afectar datos existentes.

---
*Fin del documento de auditoría.*
