import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { whatsappService } from "@/lib/whatsapp";
import nodemailer from "nodemailer";
import { NotificationService } from "@/lib/notifications/notificationService";

async function getSuperAdminSession() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;
  const roles = (session?.user as any)?.roles || [];
  const isSA = role === 'SUPERADMIN' || role === 'SUPER_ADMIN' || roles.includes('SUPERADMIN');
  if (!session || !isSA) {
    return null;
  }
  return session;
}

export async function POST(req: Request) {
  const session = await getSuperAdminSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { titulo, subtitulo, contenido, imagenUrl, icono, prioridad, canal, destinatario } = body;

    if (!titulo || !contenido || !canal || !destinatario) {
      return NextResponse.json({ error: "Campos requeridos faltantes" }, { status: 400 });
    }

    let success = false;
    let detail = "";

    if (canal === "WHATSAPP") {
      const cleanPhone = destinatario.replace(/\D/g, "");
      let msg = `*[VISTA PREVIA]*\n*${titulo}*\n`;
      if (subtitulo) msg += `_${subtitulo}_\n\n`;
      msg += contenido;
      if (imagenUrl) msg += `\n\n🖼 ${imagenUrl}`;

      await whatsappService.sendWhatsApp(cleanPhone, msg, true, "general");
      success = true;
    } else if (canal === "EMAIL") {
      const smtpHost = process.env.SMTP_HOST;
      const smtpPort = Number(process.env.SMTP_PORT || '587');
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;

      if (smtpHost && smtpUser && smtpPass) {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: { user: smtpUser, pass: smtpPass },
        });

        await transporter.sendMail({
          from: process.env.SMTP_FROM || '"Citiox Vista Previa" <noreply@citiox.com>',
          to: destinatario,
          subject: `[VISTA PREVIA] ${titulo}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ccc; border-radius: 8px;">
              <span style="background-color: #e0f2fe; color: #0369a1; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">VISTA PREVIA</span>
              <h2 style="color: #0ea5e9; margin-top: 10px;">${titulo}</h2>
              ${subtitulo ? `<p style="font-size: 16px; color: #64748b;">${subtitulo}</p>` : ''}
              <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
              <div style="font-size: 14px; line-height: 1.6; color: #334155;">
                ${contenido}
              </div>
              ${imagenUrl ? `<img src="${imagenUrl}" style="max-width:100%; border-radius:8px; margin-top:20px;" />` : ''}
            </div>
          `,
        });
        success = true;
      } else {
        detail = "SMTP no configurado en .env (Simulación exitosa)";
        console.log(`[SMTP TEST SEND MOCK] Destino: ${destinatario}, Título: ${titulo}`);
        success = true;
      }
    } else if (canal === "APP") {
      // Intentar encontrar un negocio de pruebas
      const testNegocio = await prisma.negocio.findFirst();
      if (testNegocio) {
        await NotificationService.createNotification({
          negocioId: testNegocio.id,
          userId: destinatario, // Asume que destinatario es un userId válido
          tipo: "NOTICIA",
          categoria: "NOTICIAS",
          titulo: `[VISTA PREVIA] ${titulo}`,
          descripcion: subtitulo || contenido.substring(0, 100),
          imagenUrl: imagenUrl || undefined,
          icono: icono || "Megaphone",
          prioridad: prioridad || "INFO",
          channels: ["APP"],
        });
        success = true;
      } else {
        detail = "No se encontró ningún negocio en BD para asociar la notificación.";
      }
    } else {
      detail = "Canal no soportado en Vista Previa.";
    }

    return NextResponse.json({ success, detail });
  } catch (error: any) {
    console.error("Test Send Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
