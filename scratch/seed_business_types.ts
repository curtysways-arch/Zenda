import prisma from '../src/lib/prisma';

async function seedBusinessTypes() {
  console.log("🌱 Iniciando Seeding de Business Types...");

  const typesData = [
    {
      slug: "citas",
      name: "Citas con Profesional",
      description: "Servicios agendados con profesionales por tiempo determinado (Barberías, Spas, Médicos).",
      icon: "Calendar",
      color: "#7C3AED",
      resourceType: "HUMAN",
      landingThemeId: "modern",
      adminThemeId: "sidebar",
      uiLabels: { recurso: "Profesional", reserva: "Cita", cliente: "Cliente", agenda: "Agenda" },
      capabilities: ["booking", "crm", "loyalty", "whatsapp", "ai_assistant"],
      states: [
        { name: "Disponible", slug: "disponible", color: "#10B981", icon: "CheckCircle", tipo: "INICIAL", sortOrder: 1 },
        { name: "Confirmada", slug: "confirmada", color: "#3B82F6", icon: "Calendar", tipo: "NORMAL", sortOrder: 2 },
        { name: "En Atención", slug: "en_atencion", color: "#8B5CF6", icon: "Clock", tipo: "NORMAL", sortOrder: 3 },
        { name: "Finalizada", slug: "finalizada", color: "#64748B", icon: "Check", tipo: "FINAL", sortOrder: 4 },
        { name: "Cancelada", slug: "cancelada", color: "#EF4444", icon: "XCircle", tipo: "CANCELACION", sortOrder: 5 },
        { name: "No Asistió", slug: "no_asistio", color: "#F97316", icon: "AlertTriangle", tipo: "CANCELACION", sortOrder: 6 }
      ],
      profiles: [
        { name: "Barbería & Peluquería", description: "Cortes, afeitados y tratamiento de barba.", icon: "Scissors" },
        { name: "Spa & Centro Estético", description: "Masajes, limpieza facial y cuidado personal.", icon: "Sparkles" },
        { name: "Consultorio Médico", description: "Consultas de medicina general y especialidades.", icon: "Stethoscope" },
        { name: "Odontología & Salud Dental", description: "Profilaxis, tratamientos y estética dental.", icon: "Activity" },
        { name: "Psicología & Terapia", description: "Sesiones de terapia individual y de pareja.", icon: "Brain" },
        { name: "Nutrición & Fisioterapia", description: "Evaluaciones corporales y sesiones de rehabilitación.", icon: "Heart" }
      ]
    },
    {
      slug: "reservas",
      name: "Reserva de Infraestructura & Canchas",
      description: "Alquiler por bloques de tiempo de canchas deportivas, salas, salones o instalaciones.",
      icon: "Dribbble",
      color: "#10B981",
      resourceType: "INFRASTRUCTURE",
      landingThemeId: "sports-v2",
      adminThemeId: "sports-admin",
      uiLabels: { recurso: "Cancha", reserva: "Reserva", cliente: "Jugador", agenda: "Tablero de Canchas" },
      capabilities: ["booking", "crm", "inventory", "loyalty", "whatsapp", "memberships"],
      states: [
        { name: "Disponible", slug: "disponible", color: "#10B981", icon: "CheckCircle", tipo: "INICIAL", sortOrder: 1 },
        { name: "Reserva Pendiente", slug: "reserva_pendiente", color: "#F59E0B", icon: "Clock", tipo: "NORMAL", sortOrder: 2 },
        { name: "Confirmada", slug: "confirmada", color: "#3B82F6", icon: "CalendarCheck", tipo: "NORMAL", sortOrder: 3 },
        { name: "En Juego", slug: "en_juego", color: "#10B981", icon: "Play", tipo: "NORMAL", sortOrder: 4 },
        { name: "Finalizada", slug: "finalizada", color: "#64748B", icon: "Check", tipo: "FINAL", sortOrder: 5 },
        { name: "Cancelada", slug: "cancelada", color: "#EF4444", icon: "XCircle", tipo: "CANCELACION", sortOrder: 6 }
      ],
      profiles: [
        { name: "Club Deportivo / Canchas de Pádel", description: "Canchas de cristal, torneos y reserva de horarios.", icon: "Dribbble" },
        { name: "Complejo de Fútbol Sintético", description: "Canchas de fútbol 5, 7 y 11 con iluminación.", icon: "Trophy" },
        { name: "Salón de Eventos & Fiestas", description: "Reserva de espacios para celebraciones.", icon: "Building" },
        { name: "Coworking & Salas de Reunión", description: "Reserva de escritorios y salas equipadas.", icon: "Briefcase" }
      ]
    },
    {
      slug: "ordenes-servicio",
      name: "Órdenes de Servicio & Lavado",
      description: "Artículos o prendas físicas recibidas para procesamiento, lavado o reparación con entrega local/domicilio.",
      icon: "Shirt",
      color: "#06B6D4",
      resourceType: "PHYSICAL_ITEM",
      landingThemeId: "laundry-minimal",
      adminThemeId: "service-kanban",
      uiLabels: { recurso: "Artículo", reserva: "Orden", cliente: "Cliente", agenda: "Tablero Kanban" },
      capabilities: ["service", "crm", "inventory", "whatsapp", "loyalty"],
      states: [
        { name: "Recibido", slug: "recibido", color: "#06B6D4", icon: "Inbox", tipo: "INICIAL", sortOrder: 1 },
        { name: "En Lavado / Proceso", slug: "en_proceso", color: "#F59E0B", icon: "RefreshCw", tipo: "NORMAL", sortOrder: 2 },
        { name: "Listo para Entrega", slug: "listo_para_entrega", color: "#10B981", icon: "CheckCircle2", tipo: "NORMAL", sortOrder: 3 },
        { name: "Entregado", slug: "entregado", color: "#64748B", icon: "PackageCheck", tipo: "FINAL", sortOrder: 4 },
        { name: "Cancelado", slug: "cancelado", color: "#EF4444", icon: "XCircle", tipo: "CANCELACION", sortOrder: 5 }
      ],
      profiles: [
        { name: "Lavado de Zapatos & Restauración", description: "Limpieza profunda, pintura y renovación de calzado.", icon: "Footprints" },
        { name: "Lavandería & Tintorería", description: "Lavado por kilos, al seco y planchado.", icon: "Shirt" },
        { name: "Taller de Calzado & Sastrería", description: "Reparación y modificación de prendas.", icon: "Scissors" },
        { name: "Reparación de Celulares & Tech", description: "Diagnóstico técnico y cambio de repuestos.", icon: "Smartphone" }
      ]
    },
    {
      slug: "comandas",
      name: "Comandas de Cocina & Gastro",
      description: "Venta de comida lista, comanda para cocina, despacho a mesa o pedido para empacar/domicilio.",
      icon: "Utensils",
      color: "#F59E0B",
      resourceType: "NONE",
      landingThemeId: "restaurant-modern",
      adminThemeId: "restaurant-admin",
      uiLabels: { recurso: "Mesa / Combo", reserva: "Comanda", cliente: "Comensal", agenda: "Monitor KDS" },
      capabilities: ["orders", "inventory", "crm", "whatsapp"],
      states: [
        { name: "Pedido Recibido", slug: "pedido_recibido", color: "#F59E0B", icon: "Bell", tipo: "INICIAL", sortOrder: 1 },
        { name: "En Preparación / Empaque", slug: "en_preparacion", color: "#8B5CF6", icon: "Flame", tipo: "NORMAL", sortOrder: 2 },
        { name: "Listo para Servir / Retirar", slug: "listo_para_servir", color: "#10B981", icon: "Check", tipo: "NORMAL", sortOrder: 3 },
        { name: "Entregado", slug: "entregado", color: "#64748B", icon: "CheckCircle", tipo: "FINAL", sortOrder: 4 },
        { name: "Cancelado", slug: "cancelado", color: "#EF4444", icon: "XCircle", tipo: "CANCELACION", sortOrder: 5 }
      ],
      profiles: [
        { name: "Restaurante & Bar", description: "Servicio a la mesa, cocina en tiempo real y bebidas.", icon: "Utensils" },
        { name: "Food Truck & Pinchos", description: "Comida lista empaquetada para llevar o delivery.", icon: "Package" },
        { name: "Cafetería & Pastelería", description: "Bebidas calientes, postres y bocadillos.", icon: "Coffee" }
      ]
    },
    {
      slug: "ecommerce",
      name: "Tienda & E-commerce",
      description: "Catálogo de productos físicos online con carrito de compras y gestión de despacho.",
      icon: "ShoppingBag",
      color: "#EC4899",
      resourceType: "NONE",
      landingThemeId: "ecommerce-modern",
      adminThemeId: "ecommerce-admin",
      uiLabels: { recurso: "Producto", reserva: "Orden", cliente: "Comprador", agenda: "Catálogo & Envíos" },
      capabilities: ["orders", "inventory", "crm", "loyalty", "whatsapp"],
      states: [
        { name: "Orden Recibida", slug: "orden_recibida", color: "#EC4899", icon: "ShoppingBag", tipo: "INICIAL", sortOrder: 1 },
        { name: "Pago Confirmado", slug: "pago_confirmado", color: "#3B82F6", icon: "CreditCard", tipo: "NORMAL", sortOrder: 2 },
        { name: "Empacado", slug: "empacado", color: "#8B5CF6", icon: "Package", tipo: "NORMAL", sortOrder: 3 },
        { name: "En Camino / Despachado", slug: "en_camino", color: "#06B6D4", icon: "Truck", tipo: "NORMAL", sortOrder: 4 },
        { name: "Entregado", slug: "entregado", color: "#64748B", icon: "CheckCircle", tipo: "FINAL", sortOrder: 5 },
        { name: "Cancelado", slug: "cancelado", color: "#EF4444", icon: "XCircle", tipo: "CANCELACION", sortOrder: 6 }
      ],
      profiles: [
        { name: "Tienda de Ropa & Moda", description: "Catálogo de prendas, tallas y colores.", icon: "Shirt" },
        { name: "Catálogo de Productos Físicos", description: "Venta de artículos con stock e inventario.", icon: "ShoppingBag" },
        { name: "Venta Directa & Distribuidores", description: "Ventas al por mayor o catálogo privado.", icon: "Boxes" }
      ]
    }
  ];

  for (const item of typesData) {
    console.log(`📌 Procesando Business Type: ${item.name}`);

    // Upsert BusinessType
    const bt = await prisma.businessType.upsert({
      where: { slug: item.slug },
      update: {
        name: item.name,
        description: item.description,
        icon: item.icon,
        color: item.color,
        resourceType: item.resourceType,
        landingThemeId: item.landingThemeId,
        adminThemeId: item.adminThemeId,
        uiLabels: item.uiLabels
      },
      create: {
        slug: item.slug,
        name: item.name,
        description: item.description,
        icon: item.icon,
        color: item.color,
        resourceType: item.resourceType,
        landingThemeId: item.landingThemeId,
        adminThemeId: item.adminThemeId,
        uiLabels: item.uiLabels
      }
    });

    // Seeding States
    for (const st of item.states) {
      await prisma.businessTypeState.upsert({
        where: {
          businessTypeId_slug: { businessTypeId: bt.id, slug: st.slug }
        },
        update: {
          name: st.name,
          color: st.color,
          icon: st.icon,
          tipo: st.tipo,
          sortOrder: st.sortOrder
        },
        create: {
          businessTypeId: bt.id,
          name: st.name,
          slug: st.slug,
          color: st.color,
          icon: st.icon,
          tipo: st.tipo,
          sortOrder: st.sortOrder
        }
      });
    }

    // Seeding Capabilities
    for (const cap of item.capabilities) {
      await prisma.businessTypeCapability.upsert({
        where: {
          businessTypeId_capability: { businessTypeId: bt.id, capability: cap }
        },
        update: { active: true },
        create: {
          businessTypeId: bt.id,
          capability: cap,
          active: true
        }
      });
    }

    // Seeding Profiles
    for (const prof of item.profiles) {
      const existingProfile = await prisma.businessProfile.findFirst({
        where: { businessTypeId: bt.id, name: prof.name }
      });

      if (!existingProfile) {
        await prisma.businessProfile.create({
          data: {
            businessTypeId: bt.id,
            name: prof.name,
            description: prof.description,
            icon: prof.icon
          }
        });
      }
    }
  }

  // Vincular el negocio demo-canchas al BusinessType "reservas" de manera retrocompatible
  const reservasBt = await prisma.businessType.findUnique({ where: { slug: "reservas" } });
  if (reservasBt) {
    await prisma.negocio.updateMany({
      where: { slug: "demo-canchas" },
      data: { businessTypeId: reservasBt.id }
    });
    console.log("⚽ demo-canchas vinculado al BusinessType 'reservas' con éxito");
  }

  console.log("✅ Seeding de Business Types completado exitosamente");
}

seedBusinessTypes()
  .catch((e) => {
    console.error("❌ Error en seeding de Business Types:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
