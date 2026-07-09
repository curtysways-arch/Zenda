import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    try {
        const body = await req.json();
        const { messages, context } = body as {
            messages: { role: 'user' | 'model'; text: string }[];
            context: {
                fecha: string;
                negocio: string;
                citas: {
                    hora: string;
                    servicio: string;
                    cliente: string;
                    especialista: string;
                    estado: string;
                    duracion: number;
                }[];
                stats: {
                    programadas: number;
                    confirmadas: number;
                    pendientes: number;
                    finalizadas: number;
                };
            };
        };

        const systemPrompt = `Eres Zenda AI, el asistente inteligente integrado en la plataforma de gestión de spa y bienestar Zenda. Hablas siempre en español, eres amable, profesional y muy conciso.

TU CONTEXTO DE HOY (${context.fecha}):
Negocio: ${context.negocio}
Citas del día:
- Programadas: ${context.stats.programadas}
- Confirmadas: ${context.stats.confirmadas}
- Pendientes: ${context.stats.pendientes}
- Finalizadas: ${context.stats.finalizadas}

DETALLE DE CITAS:
${context.citas.length > 0
    ? context.citas.map(c =>
        `• ${c.hora} — ${c.servicio} | Cliente: ${c.cliente} | Especialista: ${c.especialista} | Estado: ${c.estado} | ${c.duracion} min`
    ).join('\n')
    : '(No hay citas agendadas para hoy)'}

CON ESTA INFORMACIÓN PUEDES:
- Analizar la carga de trabajo del día
- Identificar citas pendientes de confirmar
- Sugerir cómo optimizar los horarios
- Redactar mensajes de recordatorio para clientes
- Dar consejos de gestión del negocio
- Responder preguntas sobre las citas del día

REGLAS:
- Responde siempre en español
- Sé breve y directo (máx 3-4 oraciones por respuesta)
- Si te preguntan algo fuera de tu contexto, explica amablemente que solo puedes ayudar con la gestión de la agenda
- Usa emojis ocasionalmente para hacer la conversación más amena
- No inventes datos que no tengas`;

        // Construir el historial de conversación para Gemini
        const geminiContents = messages.map(m => ({
            role: m.role,
            parts: [{ text: m.text }]
        }));

        const payload = {
            system_instruction: {
                parts: [{ text: systemPrompt }]
            },
            contents: geminiContents,
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 512,
                topP: 0.95,
            }
        };

        if (!GEMINI_API_KEY) {
            // Fallback sin API key: respuesta simulada útil
            const lastMsg = messages[messages.length - 1]?.text || '';
            const { programadas, confirmadas, pendientes, finalizadas } = context.stats;

            let fallback = `Hoy tienes **${programadas} citas** programadas: ${confirmadas} confirmadas, ${pendientes} pendientes de confirmar y ${finalizadas} finalizadas. `;
            if (pendientes > 0) fallback += `⚠️ Hay ${pendientes} cita(s) sin confirmar — te recomiendo contactar a esos clientes.`;
            else if (programadas === 0) fallback += `📅 No tienes citas para hoy. ¡Buen momento para ponerse al día con tareas administrativas!`;
            else fallback += `✅ Todo bajo control por ahora.`;

            if (lastMsg.toLowerCase().includes('recordatorio') || lastMsg.toLowerCase().includes('mensaje')) {
                const cita = context.citas[0];
                if (cita) {
                    fallback = `Aquí un mensaje de recordatorio para ${cita.cliente}: \n\n"Hola ${cita.cliente}, te recordamos tu cita de *${cita.servicio}* hoy a las *${cita.hora}*. ¡Te esperamos! 💆‍♀️"`;
                }
            }

            return NextResponse.json({ text: fallback, fallback: true });
        }

        const geminiRes = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!geminiRes.ok) {
            const err = await geminiRes.text();
            console.error('Gemini error:', err);
            return NextResponse.json({ error: 'Error de IA', detail: err }, { status: 500 });
        }

        const data = await geminiRes.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No pude generar una respuesta.';

        return NextResponse.json({ text });
    } catch (err: any) {
        console.error('AI Assistant error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
