import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import crypto from "crypto";

export const DEFAULT_GUIAS = [
    {
        id: "guia-variantes-inventario",
        slug: "variantes-e-inventario",
        title: "Guía de Variantes, Matriz de Atributos e Inventario",
        category: "Productos & Catálogo",
        icon: "Layers",
        summary: "Aprende a configurar productos simples o con variantes (talla, color, peso) y gestionar el stock por sucursal.",
        content: `### 1. ¿Qué es un Producto Simple vs. Producto con Variantes?
- **Producto Simple**: Es aquel que se vende en una única presentación sin opciones de selección (por ejemplo, una botella de agua de 500ml o una gorra de talla única).
- **Producto con Variantes**: Es un producto que tiene diferentes opciones seleccionables por el cliente antes de agregarlo al carrito (por ejemplo, una camiseta con opciones de Color: Negro/Blanco y Talla: S/M/L).

---

### 2. Cómo Crear Variantes en Citiox
1. Al crear o editar un producto, activa la casilla **"¿Tiene variantes?"**.
2. En la sección **Matriz de Variantes**:
   - Define las dimensiones (ejemplo: *Color*, *Talla*, *Material*).
   - Escribe los valores separados por Enter (ejemplo: *Negro*, *Azul*, *Rojo*).
3. Haz clic en **"Generar Combinaciones"**: el sistema calculará automáticamente todas las variantes resultantes (ej: Negro-S, Negro-M, Azul-S, etc.).
4. Podrás asignarle a cada variante su propio:
   - **Precio específico** (o heredar el precio base).
   - **SKU independiente** para control de código de barras.
   - **Stock disponible** por combinación.

---

### 3. Control de Stock y Estado
- Si dejas el campo de stock en blanco o defines stock global, el producto se considerará con disponibilidad continua.
- Si defines un número de stock, la tienda online descontará automáticamente una unidad con cada compra y evitará pedidos cuando llegue a 0.`,
        updatedAt: new Date().toISOString()
    },
    {
        id: "guia-resenas-social-proof",
        slug: "resenas-y-social-proof",
        title: "Opiniones Verificadas, Reseñas y Social Proof",
        category: "Marketing & Conversión",
        icon: "Star",
        summary: "Maximiza la confianza de tus compradores mostrando opiniones destacadas y permitiendo reseñas reales.",
        content: `### 1. La importancia de las opiniones
Las tiendas con al menos 3 opiniones verificadas aumentan su tasa de conversión en más de un **270%**. 

---

### 2. Cómo gestionar opiniones desde el Administrador
1. Entra a editar cualquier producto y ve a la sección **"5. Ficha técnica y detalles"**.
2. Desplázate hasta **"Opiniones de Clientes Verificadas"**.
3. Puedes:
   - Ajustar el **Rating promedio** (de 1.0 a 5.0 estrellas).
   - Definir el **Número Total de Opiniones** que verán tus visitantes.
   - Usar el botón **"+ Agregar Nueva Opinión"** para añadir testimonios reales de tus clientes de WhatsApp o Instagram.
   - Calificar con estrellas cada opinión y escribir el nombre del autor.

---

### 3. Comentarios Reales de Clientes en la Tienda
Tus clientes que visiten la tienda online pueden hacer clic en la pestaña **"Reseñas"** de cualquier producto y presionar **"Escribir una opinión"** para enviar su testimonio en vivo.`,
        updatedAt: new Date().toISOString()
    }
];

export async function GET() {
    try {
        const config = await prisma.globalConfig.findUnique({
            where: { clave: "GUIAS_PLATAFORMA" }
        });

        if (!config || !config.valor) {
            return NextResponse.json({ success: true, guias: DEFAULT_GUIAS });
        }

        try {
            const parsed = JSON.parse(config.valor);
            return NextResponse.json({
                success: true,
                guias: Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_GUIAS
            });
        } catch {
            return NextResponse.json({ success: true, guias: DEFAULT_GUIAS });
        }
    } catch (error: any) {
        console.error("Error al obtener guías:", error);
        return NextResponse.json({ error: "Error al cargar las guías" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        const user = session?.user as any;
        const isSuperAdmin = user?.role === "SUPER_ADMIN" || user?.roles?.includes("SUPERADMIN") || user?.isAdminUser === true;

        if (!isSuperAdmin) {
            return NextResponse.json({ error: "No autorizado. Solo SuperAdmin puede gestionar guías." }, { status: 403 });
        }

        const body = await req.json();
        const { guias } = body;

        if (!Array.isArray(guias)) {
            return NextResponse.json({ error: "Formato inválido. Se espera un array de guías." }, { status: 400 });
        }

        await prisma.globalConfig.upsert({
            where: { clave: "GUIAS_PLATAFORMA" },
            update: { valor: JSON.stringify(guias) },
            create: {
                id: crypto.randomUUID(),
                clave: "GUIAS_PLATAFORMA",
                valor: JSON.stringify(guias)
            }
        });

        return NextResponse.json({ success: true, message: "Guías actualizadas exitosamente", guias });
    } catch (error: any) {
        console.error("Error al guardar guías:", error);
        return NextResponse.json({ error: "Error al guardar guías" }, { status: 500 });
    }
}
