import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import * as XLSX from 'xlsx';

// Normaliza el tipo de negocio a una clave conocida
function normalizeBusinessType(rawType?: string | null): string {
    if (!rawType) return 'GENERAL';
    const upper = rawType.toUpperCase().trim();

    if (
        upper.includes('RESTAURANT') || 
        upper.includes('GASTRONOMIA') || 
        upper.includes('PINCHOS') || 
        upper.includes('BAR') || 
        upper.includes('COMIDA') ||
        upper.includes('PARRILLA') ||
        upper.includes('BURGER') ||
        upper.includes('PIZZA')
    ) {
        return 'RESTAURANTE';
    }

    if (
        upper.includes('SHOE') || 
        upper.includes('LAVADO') || 
        upper.includes('LAVANDERIA') || 
        upper.includes('SNEAKER') ||
        upper.includes('CLEAN')
    ) {
        return 'SHOE_CARE';
    }

    if (
        upper.includes('SPA') || 
        upper.includes('BELLEZA') || 
        upper.includes('ESTETICA') || 
        upper.includes('BARBER') || 
        upper.includes('PELUQUERIA') ||
        upper.includes('NAILS')
    ) {
        return 'BELLEZA_SPA';
    }

    if (
        upper.includes('CANCHA') || 
        upper.includes('SPORT') || 
        upper.includes('PADEL') || 
        upper.includes('FUTBOL') ||
        upper.includes('DEPORTE')
    ) {
        return 'DEPORTES_CANCHAS';
    }

    if (
        upper.includes('MINIMARKET') || 
        upper.includes('SUPER') || 
        upper.includes('ABARROTE') || 
        upper.includes('FARMACIA') ||
        upper.includes('BODEGA')
    ) {
        return 'MINIMARKET';
    }

    if (
        upper.includes('TIENDA') || 
        upper.includes('STORE') || 
        upper.includes('ROPA') || 
        upper.includes('MODA') || 
        upper.includes('CALZADO') ||
        upper.includes('ECOMMERCE')
    ) {
        return 'TIENDA_MODA';
    }

    return 'GENERAL';
}

function getTemplateDataForBusinessType(typeKey: string) {
    switch (typeKey) {
        // ─────────────────────────────────────────────────────────────
        // 1. RESTAURANTE / GASTRONOMÍA / PINCHOS / BAR
        // ─────────────────────────────────────────────────────────────
        case 'RESTAURANTE':
            return {
                label: 'Restaurante / Gastronomía',
                fileSuffix: 'restaurante_gastronomia',
                sampleData: [
                    {
                        'SKU': 'PLT-001',
                        'Nombre': 'Hamburguesa Artesanal Doble Carne',
                        'Precio': 8.50,
                        'Precio Comparacion': 10.00,
                        'Categoria': 'Hamburguesas',
                        'Stock': 99,
                        'Descripcion': 'Doble carne 150g de res angus, queso cheddar fundido, tocineta crujiente y cebolla caramelizada.',
                        'Imagen Principal': 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800',
                        'Imagen 2': '',
                        'Activo': 'SI',
                        'Lleva Empaque': 'SI',
                        'Precio Empaque': 0.50,
                        'Variante Nombre': 'Término 3/4 con Papas Rústicas',
                        'Variante SKU': 'PLT-001-3Q',
                        'Variante Precio': 8.50,
                        'Variante Stock': 50,
                        'Color': '',
                        'Talla': ''
                    },
                    {
                        'SKU': 'PNC-002',
                        'Nombre': 'Pincho Mixto de Lomo y Pollo',
                        'Precio': 5.50,
                        'Precio Comparacion': 6.50,
                        'Categoria': 'Pinchos a la Parrilla',
                        'Stock': 80,
                        'Descripcion': 'Brocheta de lomo de res marinado con chimichurri casero, pechuga de pollo, pimientos y cebolla perla asada.',
                        'Imagen Principal': 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
                        'Imagen 2': '',
                        'Activo': 'SI',
                        'Lleva Empaque': 'SI',
                        'Precio Empaque': 0.25,
                        'Variante Nombre': '',
                        'Variante SKU': '',
                        'Variante Precio': '',
                        'Variante Stock': '',
                        'Color': '',
                        'Talla': ''
                    },
                    {
                        'SKU': 'BEB-003',
                        'Nombre': 'Cerveza Artesanal IPA 330ml',
                        'Precio': 4.00,
                        'Precio Comparacion': 4.50,
                        'Categoria': 'Bebidas & Licores',
                        'Stock': 120,
                        'Descripcion': 'Cerveza rubia aromática con notas cítricas y amargor balanceado de lúpulos seleccionados.',
                        'Imagen Principal': 'https://images.unsplash.com/photo-1608270199464-9f2cb42750e3?w=800',
                        'Imagen 2': '',
                        'Activo': 'SI',
                        'Lleva Empaque': 'NO',
                        'Precio Empaque': 0.00,
                        'Variante Nombre': '',
                        'Variante SKU': '',
                        'Variante Precio': '',
                        'Variante Stock': '',
                        'Color': '',
                        'Talla': ''
                    }
                ],
                instructionsData: [
                    { 'Campo': 'Nombre', 'Obligatorio': 'SÍ', 'Detalle': 'Nombre visible del plato, bebida o combo en el menú digital.' },
                    { 'Campo': 'Precio', 'Obligatorio': 'SÍ', 'Detalle': 'Precio de venta al público en número decimal (ej: 8.50).' },
                    { 'Campo': 'SKU', 'Obligatorio': 'RECOMENDADO', 'Detalle': 'Código de referencia interno para actualizar platos sin duplicarlos (ej: PLT-001).' },
                    { 'Campo': 'Categoria', 'Obligatorio': 'SÍ', 'Detalle': 'Sección del menú (ej: Hamburguesas, Pinchos, Bebidas, Postres). Si no existe, se crea sola.' },
                    { 'Campo': 'Lleva Empaque', 'Obligatorio': 'NO', 'Detalle': '"SI" si el producto para delivery/para llevar requiere empaque térmico o desechable.' },
                    { 'Campo': 'Precio Empaque', 'Obligatorio': 'NO', 'Detalle': 'Costo adicional por empaque para llevar (ej: 0.50).' },
                    { 'Campo': 'Imagen Principal', 'Obligatorio': 'NO', 'Detalle': 'URL de imagen del plato en alta resolución (HTTPS).' }
                ]
            };

        // ─────────────────────────────────────────────────────────────
        // 2. SHOE CARE / LAVANDERÍA / LIMPIEZA
        // ─────────────────────────────────────────────────────────────
        case 'SHOE_CARE':
            return {
                label: 'Calzado / Lavandería / Shoe Care',
                fileSuffix: 'shoe_care_lavanderia',
                sampleData: [
                    {
                        'SKU': 'KIT-001',
                        'Nombre': 'Kit Completo de Limpieza para Sneakers',
                        'Precio': 18.00,
                        'Precio Comparacion': 22.50,
                        'Categoria': 'Kits de Limpieza',
                        'Stock': 45,
                        'Descripcion': 'Incluye solución limpiadora 150ml biodegradable, cepillo de cerdas medianas y toalla de microfibra premium.',
                        'Imagen Principal': 'https://images.unsplash.com/photo-1600185365926-3a2ce3cdb9eb?w=800',
                        'Imagen 2': '',
                        'Activo': 'SI',
                        'Lleva Empaque': 'NO',
                        'Precio Empaque': 0,
                        'Variante Nombre': '',
                        'Variante SKU': '',
                        'Variante Precio': '',
                        'Variante Stock': '',
                        'Color': '',
                        'Talla': ''
                    },
                    {
                        'SKU': 'REP-002',
                        'Nombre': 'Spray Hidrofóbico Repelente de Manchas 200ml',
                        'Precio': 14.50,
                        'Precio Comparacion': 17.00,
                        'Categoria': 'Protección & Repelentes',
                        'Stock': 60,
                        'Descripcion': 'Capa protectora impermeable de nanotecnología para gamuza, nobuck, lona y cueros finos.',
                        'Imagen Principal': 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800',
                        'Imagen 2': '',
                        'Activo': 'SI',
                        'Lleva Empaque': 'NO',
                        'Precio Empaque': 0,
                        'Variante Nombre': '',
                        'Variante SKU': '',
                        'Variante Precio': '',
                        'Variante Stock': '',
                        'Color': '',
                        'Talla': ''
                    },
                    {
                        'SKU': 'CEP-003',
                        'Nombre': 'Cepillo de Madera Cerdas de Caballo',
                        'Precio': 7.50,
                        'Precio Comparacion': 9.00,
                        'Categoria': 'Cepillos y Accesorios',
                        'Stock': 80,
                        'Descripcion': 'Cepillo de pelo natural ideal para remoción de polvo y cuidado delicado de materiales prémium.',
                        'Imagen Principal': 'https://images.unsplash.com/photo-1584735935682-2f2b69dff9d2?w=800',
                        'Imagen 2': '',
                        'Activo': 'SI',
                        'Lleva Empaque': 'NO',
                        'Precio Empaque': 0,
                        'Variante Nombre': '',
                        'Variante SKU': '',
                        'Variante Precio': '',
                        'Variante Stock': '',
                        'Color': '',
                        'Talla': ''
                    }
                ],
                instructionsData: [
                    { 'Campo': 'Nombre', 'Obligatorio': 'SÍ', 'Detalle': 'Nombre del producto o kit de cuidado.' },
                    { 'Campo': 'Precio', 'Obligatorio': 'SÍ', 'Detalle': 'Precio de venta al público en dólares (ej: 18.00).' },
                    { 'Campo': 'SKU', 'Obligatorio': 'RECOMENDADO', 'Detalle': 'Código de identificación único para control de existencias.' },
                    { 'Campo': 'Categoria', 'Obligatorio': 'SÍ', 'Detalle': 'Kits de Limpieza, Protección, Cepillos, Hormas, Cordones.' },
                    { 'Campo': 'Stock', 'Obligatorio': 'NO', 'Detalle': 'Cantidad de unidades en bodega o tienda física.' }
                ]
            };

        // ─────────────────────────────────────────────────────────────
        // 3. BELLEZA / SPA / PELUQUERÍA / BARBERÍA
        // ─────────────────────────────────────────────────────────────
        case 'BELLEZA_SPA':
            return {
                label: 'Belleza / Spa / Barbería',
                fileSuffix: 'belleza_spa_barberia',
                sampleData: [
                    {
                        'SKU': 'CAP-001',
                        'Nombre': 'Cera Moldeadora Efecto Mate 100g',
                        'Precio': 12.00,
                        'Precio Comparacion': 15.00,
                        'Categoria': 'Cuidado Capilar & Peinado',
                        'Stock': 50,
                        'Descripcion': 'Fijación fuerte y acabado natural sin brillo. Fórmula base de agua de fácil remoción al lavar.',
                        'Imagen Principal': 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=800',
                        'Imagen 2': '',
                        'Activo': 'SI',
                        'Lleva Empaque': 'NO',
                        'Precio Empaque': 0,
                        'Variante Nombre': '',
                        'Variante SKU': '',
                        'Variante Precio': '',
                        'Variante Stock': '',
                        'Color': '',
                        'Talla': ''
                    },
                    {
                        'SKU': 'FAC-002',
                        'Nombre': 'Serum Facial Hidratante con Ácido Hialurónico 30ml',
                        'Precio': 24.50,
                        'Precio Comparacion': 29.90,
                        'Categoria': 'Cuidado Facial',
                        'Stock': 35,
                        'Descripcion': 'Tratamiento intensivo con vitamina C y ácido hialurónico puro que aporta luminosidad y elasticidad.',
                        'Imagen Principal': 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800',
                        'Imagen 2': '',
                        'Activo': 'SI',
                        'Lleva Empaque': 'NO',
                        'Precio Empaque': 0,
                        'Variante Nombre': '',
                        'Variante SKU': '',
                        'Variante Precio': '',
                        'Variante Stock': '',
                        'Color': '',
                        'Talla': ''
                    },
                    {
                        'SKU': 'BAR-003',
                        'Nombre': 'Aceite Esencial Nutritivo para Barba 50ml',
                        'Precio': 11.00,
                        'Precio Comparacion': 13.50,
                        'Categoria': 'Barba & Bigote',
                        'Stock': 60,
                        'Descripcion': 'Aceites botánicos de jojoba y argán con fragancia amaderada para suavizar la barba y cuidar la piel.',
                        'Imagen Principal': 'https://images.unsplash.com/photo-1608248597359-009b0b46244a?w=800',
                        'Imagen 2': '',
                        'Activo': 'SI',
                        'Lleva Empaque': 'NO',
                        'Precio Empaque': 0,
                        'Variante Nombre': '',
                        'Variante SKU': '',
                        'Variante Precio': '',
                        'Variante Stock': '',
                        'Color': '',
                        'Talla': ''
                    }
                ],
                instructionsData: [
                    { 'Campo': 'Nombre', 'Obligatorio': 'SÍ', 'Detalle': 'Nombre visible del producto cosmético o tratamiento.' },
                    { 'Campo': 'Precio', 'Obligatorio': 'SÍ', 'Detalle': 'Precio de venta al público (ej: 12.00).' },
                    { 'Campo': 'SKU', 'Obligatorio': 'RECOMENDADO', 'Detalle': 'Código de referencia interno.' },
                    { 'Campo': 'Categoria', 'Obligatorio': 'SÍ', 'Detalle': 'Cuidado Capilar, Cuidado Facial, Barba, Tratamientos, etc.' }
                ]
            };

        // ─────────────────────────────────────────────────────────────
        // 4. DEPORTES / CANCHAS / PÁDEL / FÚTBOL
        // ─────────────────────────────────────────────────────────────
        case 'DEPORTES_CANCHAS':
            return {
                label: 'Canchas & Deportes',
                fileSuffix: 'canchas_deportes',
                sampleData: [
                    {
                        'SKU': 'ALQ-001',
                        'Nombre': 'Alquiler Balón Oficial de Fútbol #5',
                        'Precio': 3.00,
                        'Precio Comparacion': 4.00,
                        'Categoria': 'Alquiler de Material',
                        'Stock': 20,
                        'Descripcion': 'Balón reglamentario de alta resistencia para césped sintético y natural.',
                        'Imagen Principal': 'https://images.unsplash.com/photo-1551958219-acbc608c6377?w=800',
                        'Imagen 2': '',
                        'Activo': 'SI',
                        'Lleva Empaque': 'NO',
                        'Precio Empaque': 0,
                        'Variante Nombre': '',
                        'Variante SKU': '',
                        'Variante Precio': '',
                        'Variante Stock': '',
                        'Color': '',
                        'Talla': ''
                    },
                    {
                        'SKU': 'PAD-002',
                        'Nombre': 'Alquiler Pala de Pádel Carbono Pro',
                        'Precio': 4.50,
                        'Precio Comparacion': 6.00,
                        'Categoria': 'Alquiler de Material',
                        'Stock': 16,
                        'Descripcion': 'Pala de balance medio y caras de fibra de carbono 3K para máxima precisión.',
                        'Imagen Principal': 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800',
                        'Imagen 2': '',
                        'Activo': 'SI',
                        'Lleva Empaque': 'NO',
                        'Precio Empaque': 0,
                        'Variante Nombre': '',
                        'Variante SKU': '',
                        'Variante Precio': '',
                        'Variante Stock': '',
                        'Color': '',
                        'Talla': ''
                    },
                    {
                        'SKU': 'BEB-003',
                        'Nombre': 'Bebida Isotónica Hidratante 600ml',
                        'Precio': 2.00,
                        'Precio Comparacion': 2.50,
                        'Categoria': 'Bebidas & Cafetería',
                        'Stock': 100,
                        'Descripcion': 'Bebida rehidratante con electrolitos sabor frutas tropicales.',
                        'Imagen Principal': 'https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=800',
                        'Imagen 2': '',
                        'Activo': 'SI',
                        'Lleva Empaque': 'NO',
                        'Precio Empaque': 0,
                        'Variante Nombre': '',
                        'Variante SKU': '',
                        'Variante Precio': '',
                        'Variante Stock': '',
                        'Color': '',
                        'Talla': ''
                    },
                    {
                        'SKU': 'TUB-004',
                        'Nombre': 'Tubo de 3 Pelotas de Pádel Oficiales',
                        'Precio': 7.00,
                        'Precio Comparacion': 8.50,
                        'Categoria': 'Venta de Artículos',
                        'Stock': 45,
                        'Descripcion': 'Pelotas presurizadas de alta durabilidad y bote constante homologadas.',
                        'Imagen Principal': 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?w=800',
                        'Imagen 2': '',
                        'Activo': 'SI',
                        'Lleva Empaque': 'NO',
                        'Precio Empaque': 0,
                        'Variante Nombre': '',
                        'Variante SKU': '',
                        'Variante Precio': '',
                        'Variante Stock': '',
                        'Color': '',
                        'Talla': ''
                    }
                ],
                instructionsData: [
                    { 'Campo': 'Nombre', 'Obligatorio': 'SÍ', 'Detalle': 'Nombre del artículo de alquiler o venta en el complejo deportivo.' },
                    { 'Campo': 'Precio', 'Obligatorio': 'SÍ', 'Detalle': 'Precio por unidad o sesión.' },
                    { 'Campo': 'Categoria', 'Obligatorio': 'SÍ', 'Detalle': 'Alquiler de Material, Bebidas, Artículos Deportivos, Snacks.' }
                ]
            };

        // ─────────────────────────────────────────────────────────────
        // 5. MINIMARKET / SUPERMERCADO / FARMACIA
        // ─────────────────────────────────────────────────────────────
        case 'MINIMARKET':
            return {
                label: 'Minimarket & Abarrotes',
                fileSuffix: 'minimarket_abarrotes',
                sampleData: [
                    {
                        'SKU': 'ABR-001',
                        'Nombre': 'Café Tostado y Molido Gourmet 500g',
                        'Precio': 6.80,
                        'Precio Comparacion': 7.50,
                        'Categoria': 'Café y Despensa',
                        'Stock': 60,
                        'Descripcion': 'Café de altura 100% arábica con aroma intenso y notas a chocolate.',
                        'Imagen Principal': 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800',
                        'Imagen 2': '',
                        'Activo': 'SI',
                        'Lleva Empaque': 'NO',
                        'Precio Empaque': 0,
                        'Variante Nombre': '',
                        'Variante SKU': '',
                        'Variante Precio': '',
                        'Variante Stock': '',
                        'Color': '',
                        'Talla': ''
                    },
                    {
                        'SKU': 'SNK-002',
                        'Nombre': 'Snack Mix de Frutos Secos y Semillas 200g',
                        'Precio': 3.50,
                        'Precio Comparacion': 4.20,
                        'Categoria': 'Snacks & Dulces',
                        'Stock': 85,
                        'Descripcion': 'Mix energético de almendras tostadas, nueces, arándanos y semillas de girasol.',
                        'Imagen Principal': 'https://images.unsplash.com/photo-1509722747041-616f39b57569?w=800',
                        'Imagen 2': '',
                        'Activo': 'SI',
                        'Lleva Empaque': 'NO',
                        'Precio Empaque': 0,
                        'Variante Nombre': '',
                        'Variante SKU': '',
                        'Variante Precio': '',
                        'Variante Stock': '',
                        'Color': '',
                        'Talla': ''
                    }
                ],
                instructionsData: [
                    { 'Campo': 'Nombre', 'Obligatorio': 'SÍ', 'Detalle': 'Nombre comercial del producto con contenido/gramaje.' },
                    { 'Campo': 'Precio', 'Obligatorio': 'SÍ', 'Detalle': 'Precio unitario de venta.' },
                    { 'Campo': 'SKU', 'Obligatorio': 'RECOMENDADO', 'Detalle': 'Código de barras interno o código de producto.' },
                    { 'Campo': 'Categoria', 'Obligatorio': 'SÍ', 'Detalle': 'Lácteos, Bebidas, Abarrotes, Snacks, Limpieza del Hogar.' }
                ]
            };

        // ─────────────────────────────────────────────────────────────
        // 6. TIENDA / MODA / ROPA / CALZADO
        // ─────────────────────────────────────────────────────────────
        case 'TIENDA_MODA':
        default:
            return {
                label: 'Tienda / Moda / Ropa',
                fileSuffix: 'tienda_moda_calzado',
                sampleData: [
                    {
                        'SKU': 'CAM-001',
                        'Nombre': 'Camiseta Oversize Heavyweight 240g',
                        'Precio': 22.00,
                        'Precio Comparacion': 28.00,
                        'Categoria': 'Camisetas',
                        'Stock': 45,
                        'Descripcion': 'Camiseta de corte relajado confeccionada en 100% algodón peinado de alto gramaje.',
                        'Imagen Principal': 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=800',
                        'Imagen 2': '',
                        'Activo': 'SI',
                        'Lleva Empaque': 'NO',
                        'Precio Empaque': 0,
                        'Variante Nombre': 'Talla M / Negro Washed',
                        'Variante SKU': 'CAM-001-M-BLK',
                        'Variante Precio': 22.00,
                        'Variante Stock': 20,
                        'Color': 'Negro',
                        'Talla': 'M'
                    },
                    {
                        'SKU': 'ZAP-002',
                        'Nombre': 'Zapatillas Urbanas Street Runner',
                        'Precio': 65.00,
                        'Precio Comparacion': 79.99,
                        'Categoria': 'Calzado',
                        'Stock': 30,
                        'Descripcion': 'Zapatillas deportivas urbanas con suela ergonómica de EVA y capellada transpirable.',
                        'Imagen Principal': 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800',
                        'Imagen 2': '',
                        'Activo': 'SI',
                        'Lleva Empaque': 'NO',
                        'Precio Empaque': 0,
                        'Variante Nombre': 'Talla 41 / Blanco con Rojo',
                        'Variante SKU': 'ZAP-002-41-WHR',
                        'Variante Precio': 65.00,
                        'Variante Stock': 10,
                        'Color': 'Blanco',
                        'Talla': '41'
                    },
                    {
                        'SKU': 'GOR-003',
                        'Nombre': 'Gorra Snapback Urbana Citiox',
                        'Precio': 16.50,
                        'Precio Comparacion': 20.00,
                        'Categoria': 'Accesorios',
                        'Stock': 60,
                        'Descripcion': 'Gorra 6 paneles estructurada con bordado frontal de alta definición y broche ajustable.',
                        'Imagen Principal': 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800',
                        'Imagen 2': '',
                        'Activo': 'SI',
                        'Lleva Empaque': 'SI',
                        'Precio Empaque': 0.50,
                        'Variante Nombre': '',
                        'Variante SKU': '',
                        'Variante Precio': '',
                        'Variante Stock': '',
                        'Color': 'Azul Marino',
                        'Talla': 'Única'
                    }
                ],
                instructionsData: [
                    { 'Campo': 'Nombre', 'Obligatorio': 'SÍ', 'Detalle': 'Nombre visible del producto en el catálogo y tienda online.' },
                    { 'Campo': 'Precio', 'Obligatorio': 'SÍ', 'Detalle': 'Precio de venta numérico (ej: 22.00).' },
                    { 'Campo': 'SKU', 'Obligatorio': 'RECOMENDADO', 'Detalle': 'Código único para identificar y actualizar productos sin duplicarlos.' },
                    { 'Campo': 'Categoria', 'Obligatorio': 'SÍ', 'Detalle': 'Camisetas, Calzado, Accesorios, Pantalones, etc.' },
                    { 'Campo': 'Variante Nombre', 'Obligatorio': 'NO', 'Detalle': 'Si el producto tiene tallas o colores, indica aquí la combinación (ej: Talla M / Negro).' },
                    { 'Campo': 'Color', 'Obligatorio': 'NO', 'Detalle': 'Color específico de la variante.' },
                    { 'Campo': 'Talla', 'Obligatorio': 'NO', 'Detalle': 'Talla de la variante (S, M, L, XL, 41, etc.).' },
                    { 'Campo': 'Stock', 'Obligatorio': 'NO', 'Detalle': 'Inventario total o por variante.' }
                ]
            };
    }
}

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const negocioId = (session.user as any).negocioId;

    const { searchParams } = new URL(req.url);
    const format = (searchParams.get('format') || 'xlsx').toLowerCase();

    // 1. Detectar tipo de negocio (por parámetro o por la BD de la sesión)
    let businessType = 'TIENDA_MODA';
    const explicitType = searchParams.get('tipoNegocio');

    if (explicitType) {
        businessType = normalizeBusinessType(explicitType);
    } else if (negocioId) {
        try {
            const biz = await (prisma as any).negocio.findUnique({
                where: { id: negocioId },
                select: { tipoNegocio: true, configuracion: true }
            });
            if (biz) {
                let cfgTipo = '';
                if (typeof biz.configuracion === 'string') {
                    try { cfgTipo = JSON.parse(biz.configuracion).tipoNegocio; } catch (_) {}
                } else if (biz.configuracion) {
                    cfgTipo = (biz.configuracion as any).tipoNegocio;
                }
                businessType = normalizeBusinessType(cfgTipo || biz.tipoNegocio);
            }
        } catch (err) {
            console.error('[TEMPLATE_GET_BIZ_ERROR]', err);
        }
    }

    const templateMeta = getTemplateDataForBusinessType(businessType);
    const filenameBase = `plantilla_catalogo_${templateMeta.fileSuffix}`;

    // 2. Generar CSV si se solicitó
    if (format === 'csv') {
        const worksheet = XLSX.utils.json_to_sheet(templateMeta.sampleData);
        const csvOutput = XLSX.utils.sheet_to_csv(worksheet, { FS: ',' });
        return new NextResponse(csvOutput, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filenameBase}.csv"`
            }
        });
    }

    // 3. Generar XLSX con hoja de productos e instrucciones
    const workbook = XLSX.utils.book_new();
    const dataSheet = XLSX.utils.json_to_sheet(templateMeta.sampleData);
    const instructionsSheet = XLSX.utils.json_to_sheet(templateMeta.instructionsData);

    // Ajuste de ancho de columnas para mejor visualización
    dataSheet['!cols'] = [
        { wch: 14 }, // SKU
        { wch: 38 }, // Nombre
        { wch: 10 }, // Precio
        { wch: 18 }, // Precio Comparacion
        { wch: 22 }, // Categoria
        { wch: 10 }, // Stock
        { wch: 45 }, // Descripcion
        { wch: 40 }, // Imagen Principal
        { wch: 25 }, // Imagen 2
        { wch: 10 }, // Activo
        { wch: 14 }, // Lleva Empaque
        { wch: 14 }, // Precio Empaque
        { wch: 28 }, // Variante Nombre
        { wch: 18 }, // Variante SKU
        { wch: 14 }, // Variante Precio
        { wch: 14 }, // Variante Stock
        { wch: 14 }, // Color
        { wch: 12 }  // Talla
    ];

    instructionsSheet['!cols'] = [
        { wch: 20 },
        { wch: 16 },
        { wch: 80 }
    ];

    XLSX.utils.book_append_sheet(workbook, dataSheet, 'Productos');
    XLSX.utils.book_append_sheet(workbook, instructionsSheet, 'Instrucciones');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buffer, {
        status: 200,
        headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename="${filenameBase}.xlsx"`
        }
    });
}
