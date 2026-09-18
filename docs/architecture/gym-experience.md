# Arquitectura Canónica — Vertical Gimnasio (Citiox)

## 1. Visión General & Filosofía
El vertical **GIMNASIO** en Citiox modela negocios basados en socios, membresías periódicas, control de acceso físico/digital, tornos de entrada y fidelización de deportistas.

A diferencia del flujo de reservas por cita (`Cliente → Servicio → Cita`), el flujo del gimnasio es estrictamente:
```text
Cliente → MembershipPlan → Membership → Access → Attendance → Renewal
```

## 2. Los 5 Pilares Arquitectónicos

### Pilar 1: BusinessType & PlanFamily
- **BusinessType**: `GIMNASIO` (`slug: gimnasio`).
- **PlanFamily**: `GIMNASIO` (`slug: gimnasios`).
- **SaaS Base Plans**:
  - `plan_gym_inicio`: Hasta 200 socios activos.
  - `plan_gym_crecimiento`: Hasta 1,000 socios activos.
  - `plan_gym_pro`: Socios activos ilimitados.

### Pilar 2: Blueprint & Entitlements
- **Blueprint**: `GYM_BLUEPRINT_MANIFEST` registrado en `src/core/blueprints/BlueprintManifests.ts` con aliases `GYM`, `GIMNASIO`, `FITNESS`.
- **Capabilities Activadas**:
  - `MEMBERSHIPS`: Catálogo de planes y suscripciones de socios.
  - `ACCESS`: Torno y control de entrada en tiempo real.
  - `ATTENDANCE`: Registro de asistencias, horas pico y aforo.
  - `CLASSES`: Gestión de entrenamientos y clases grupales.
  - `TRAINERS`: Monitores, personal trainer y asignación de coaches.
  - `LOYALTY`: Retos deportivos, rachas y gamificación con misiones.
- **Capabilities Inactivadas**:
  - `TABLES`, `KITCHEN`, `COURTS`, `CLINICAL_RECORDS`, `APPOINTMENTS`.

### Pilar 3: Modelo de Datos (Prisma)
- `MembershipPlan`: Planes comerciales ofertados por el gimnasio (nombre, descripción, duración en días, precio, cuota de inscripción, beneficios, límite de accesos, etc.).
- `Membership`: Instancia activa o histórica de un socio con un plan (fecha inicio, fecha fin, congelamientos, motivo de cancelación, precio bloqueado para renovaciones).
- `GymAccessLog`: Registro inmutable de cada intento de acceso en torno o recepción (`GRANTED` o `DENIED`, motivo de denegación, método QR/PIN/NFC/Desk).
- `GymAttendance`: Asistencia confirmada del socio, vinculada a auditoría y despachadora del evento `GYM_ATTENDANCE` para gamificación en el EventBus.

### Pilar 4: Experiencia Administrativa (/admin)
- **Torno & Recepción** (`/admin/accesos`): Escaneo continuo con pistola lectora de código de barras o ingreso rápido, feedback visual de pantalla completa (Verde = Acceso Permitido con días restantes; Rojo = Denegado con motivo), y sintetizador auditivo Web Audio API de baja latencia sin dependencias de audio externas.
- **Socios & Membresías** (`/admin/socios` y `/admin/membresias`): Listado paginado de socios, estados (`ACTIVE`, `EXPIRING`, `EXPIRED`, `FROZEN`), modales de congelamiento con reactivación automática por días, y renovación con conservación de historial previo.
- **Planes Comerciales** (`/admin/membresias/planes`): Creación y edición de tarifas y beneficios.
- **Asistencias** (`/admin/asistencias`): Bitácora histórica, métricas de asistencia del día/mes, socios únicos y check-in manual de recepción.

### Pilar 5: Experiencia del Socio (PWA Móvil)
- **Landing Deportiva** (`/[slug]`): Hero deportivo, selector de planes mensuales/trimestrales/anuales, instalaciones y checkout con enrolamiento directo de socio.
- **Carnet Digital** (`/[slug]/mi-membresia`): Tarjeta VIP digital con días restantes, estado de vigencia, beneficios del plan y renovación en un clic.
- **Mi QR de Entrada** (`/[slug]/mi-qr`): QR de alta densidad y contraste para pasar en tornos y lectores ópticos, reloj en tiempo real anti-capturas y validación visual.
- **Mis Asistencias** (`/[slug]/asistencias`): Contador de días entrenados en el mes, racha y bitácora de constancia física.
- **Barra de Navegación Móvil** (`PublicMobileNav`): 5 accesos adaptados (Inicio, Mi Membresía, QR Central Flotante, Asistencias, Perfil).

## 3. Seguridad, Multi-Tenant & Aislamiento
- Todos los endpoints validan `businessId` y token de sesión administrativa o del socio.
- Cero impacto o regresión en verticales existentes (Restaurantes, Canchas, Clínicas Dentales, Tiendas, Servicios de Citas).