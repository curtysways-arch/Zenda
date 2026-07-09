import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const userEmail = session.user.email || "";

    // 1. Obtener detalles del usuario actual
    const user = await prisma.usuario.findFirst({
      where: { email: userEmail },
      include: {
        Negocio: {
          include: { Suscripcion: { include: { Plan: true } } },
        },
      },
    });

    if (!user) {
      // Intentar buscar en AdminUser por si es del equipo interno
      const adminUser = await prisma.adminUser.findUnique({
        where: { email: userEmail },
        include: { rol: true },
      });

      if (!adminUser) {
        return NextResponse.json([]);
      }

      // Si es AdminUser, buscar comunicaciones activas internas
      const internalCampaigns = await prisma.globalCommunication.findMany({
        where: {
          estado: "ENVIADO",
          OR: [
            { canales: { contains: "BANNER" } },
            { canales: { contains: "POPUP" } },
          ],
        },
        orderBy: { createdAt: "desc" },
      });

      const matched: any[] = [];
      for (const campaign of internalCampaigns) {
        try {
          const filters = JSON.parse(campaign.destinatarios);
          if (filters.type === "INTERNO" || filters.type === "VENDEDORES" || filters.type === "SOPORTE" || filters.type === "MARKETING") {
            let roleNames: string[] = [];
            if (filters.type === "VENDEDORES") roleNames = ["Ventas"];
            else if (filters.type === "SOPORTE") roleNames = ["Soporte"];
            else if (filters.type === "MARKETING") roleNames = ["Marketing"];
            else if (filters.rolesInternos) roleNames = filters.rolesInternos;

            if (roleNames.length === 0 || roleNames.includes(adminUser.rol.nombre)) {
              matched.push({
                id: campaign.id,
                titulo: campaign.titulo,
                subtitulo: campaign.subtitulo,
                contenido: campaign.contenido,
                imagenUrl: campaign.imagenUrl,
                icono: campaign.icono,
                color: campaign.color,
                prioridad: campaign.prioridad,
                tipo: campaign.tipo,
                canales: JSON.parse(campaign.canales),
                popupConfig: campaign.popupConfig ? JSON.parse(campaign.popupConfig) : null,
              });
            }
          }
        } catch (_) {}
      }

      return NextResponse.json(matched);
    }

    // 2. Obtener todas las campañas de comunicación activas que tengan BANNER o POPUP
    const campaigns = await prisma.globalCommunication.findMany({
      where: {
        estado: "ENVIADO",
        OR: [
          { canales: { contains: "BANNER" } },
          { canales: { contains: "POPUP" } },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    const matchedCampaigns: any[] = [];

    for (const campaign of campaigns) {
      try {
        const filters = JSON.parse(campaign.destinatarios);
        
        // Matcher
        let isMatch = true;

        if (filters.type === "INTERNO" || filters.type === "VENDEDORES" || filters.type === "SOPORTE" || filters.type === "MARKETING") {
          isMatch = false;
        } else if (filters.type === "ESPECIFICO_NEGOCIO" && filters.negocioId && user.negocioId !== filters.negocioId) {
          isMatch = false;
        } else if (filters.type === "ESPECIFICO_USUARIO" && filters.userIds && !filters.userIds.includes(user.id)) {
          isMatch = false;
        } else if (filters.type === "ADMINS" && user.role !== "ADMIN") {
          isMatch = false;
        } else if (filters.type === "STAFF" && !["STAFF", "PROFESOR"].includes(user.role)) {
          isMatch = false;
        } else if (filters.type === "CLIENTES" && user.role !== "USER") {
          isMatch = false;
        }

        if (isMatch && user.Negocio) {
          if (filters.type === "PREMIUM" && user.Negocio.Suscripcion?.Plan?.isFree) isMatch = false;
          if (filters.type === "TRIAL" && user.Negocio.Suscripcion?.estado !== "trial") isMatch = false;
          if (filters.type === "VENCIDOS" && user.Negocio.Suscripcion?.estado !== "expired") isMatch = false;
          if (filters.type === "ACTIVOS" && user.Negocio.estado !== "ACTIVO") isMatch = false;
          if (filters.type === "SUSPENDIDOS" && user.Negocio.estado !== "SUSPENDIDO") isMatch = false;

          if (filters.ciudad && user.Negocio.ciudad?.toLowerCase() !== filters.ciudad.toLowerCase()) isMatch = false;
          if (filters.planId && user.Negocio.Suscripcion?.planId !== filters.planId) isMatch = false;
        }

        if (isMatch) {
          // Reemplazo de variables dinámicas
          const plan = user.Negocio?.Suscripcion?.Plan?.name || "Ninguno";
          const vto = user.Negocio?.Suscripcion?.fechaFin ? user.Negocio.Suscripcion.fechaFin.toLocaleDateString() : "N/A";
          
          let inferredPais = "Desconocido";
          const cleanPhone = user.phone ? user.phone.replace(/\D/g, '') : "";
          if (cleanPhone.startsWith("593")) inferredPais = "Ecuador";
          else if (cleanPhone.startsWith("57")) inferredPais = "Colombia";
          else if (cleanPhone.startsWith("54")) inferredPais = "Argentina";

          const variables = {
            nombre: user.nombre || "Usuario",
            negocio: user.Negocio?.nombre || "",
            plan: plan,
            fecha_vencimiento: vto,
            reservas: 0,
            ciudad: user.Negocio?.ciudad || "",
            pais: inferredPais,
          };

          matchedCampaigns.push({
            id: campaign.id,
            titulo: parseVariables(campaign.titulo, variables),
            subtitulo: campaign.subtitulo ? parseVariables(campaign.subtitulo, variables) : null,
            contenido: parseVariables(campaign.contenido, variables),
            imagenUrl: campaign.imagenUrl,
            icono: campaign.icono,
            color: campaign.color,
            prioridad: campaign.prioridad,
            tipo: campaign.tipo,
            canales: JSON.parse(campaign.canales),
            popupConfig: campaign.popupConfig ? JSON.parse(campaign.popupConfig) : null,
          });
        }
      } catch (e) {
        console.error("Error parsing filters or matching active communication:", e);
      }
    }

    return NextResponse.json(matchedCampaigns);
  } catch (error: any) {
    console.error("GET Active Communications Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function parseVariables(text: string, vars: any): string {
  if (!text) return "";
  let result = text;
  for (const [key, value] of Object.entries(vars)) {
    const regex = new RegExp(`\\{\\{${key}\\}\\}`, "gi");
    result = result.replace(regex, String(value ?? ""));
  }
  return result;
}
