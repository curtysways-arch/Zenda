import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { AuthOptions } from "next-auth";

// ─────────────────────────────────────────────────────────────────────────────
// auth.ts — NextAuth con soporte dual: AdminUser (RBAC) y Usuario (negocio)
//
// Flujo de autenticación:
//   1. Buscar primero en AdminUser (equipo interno del SaaS)
//   2. Si no existe, buscar en Usuario (administradores de negocios)
//
// Compatibilidad total con el sistema existente.
// ─────────────────────────────────────────────────────────────────────────────

export const authOptions: AuthOptions = {
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email", placeholder: "admin@spa.com" },
                password: { label: "Contraseña", type: "password" }
            },
            async authorize(credentials) {
                try {
                    if (!credentials?.email || !credentials?.password) {
                        return null;
                    }

                    // ── Paso 1: Verificar si es un AdminUser (equipo interno del SaaS) ──
                    try {
                        const adminUser = await prisma.adminUser.findUnique({
                            where: { email: credentials.email },
                            include: {
                                rol: {
                                    include: {
                                        permisos: {
                                            include: { permiso: true }
                                        }
                                    }
                                }
                            }
                        });

                        if (adminUser && adminUser.activo && adminUser.password) {
                            const isPasswordCorrect = await bcrypt.compare(credentials.password, adminUser.password);
                            if (isPasswordCorrect) {
                                // Verificar que no esté bloqueado/suspendido
                                if (['BLOQUEADO', 'SUSPENDIDO'].includes(adminUser.estado)) {
                                    console.error("Auth AdminUser: cuenta bloqueada/suspendida:", credentials.email);
                                    return null;
                                }

                                // Extraer lista de permisos del rol
                                const permisos = adminUser.rol?.permisos.map(rp => rp.permiso.codigo) || [];

                                // Registrar último acceso
                                await prisma.adminUser.update({
                                    where: { id: adminUser.id },
                                    data: { ultimaAccion: new Date() }
                                }).catch(() => {}); // no bloquear el login si falla

                                console.log("✅ Auth AdminUser OK:", credentials.email, "rol:", adminUser.rol?.nombre);

                                return {
                                    id: adminUser.id,
                                    email: adminUser.email,
                                    name: `${adminUser.nombre} ${adminUser.apellido || ''}`.trim(),
                                    // Compatibilidad: rol "SUPERADMIN" para el sistema existente
                                    role: 'SUPERADMIN',
                                    roles: ['SUPERADMIN'],
                                    // Campos propios del AdminUser
                                    isAdminUser: true,
                                    adminRolNombre: adminUser.rol?.nombre || null,
                                    adminRolColor: adminUser.rol?.color || null,
                                    adminRolIcono: adminUser.rol?.icono || null,
                                    adminRolJerarquia: adminUser.rol?.jerarquia || 999,
                                    permisos,
                                    scope: adminUser.scope || 'GLOBAL',
                                    estado: adminUser.estado,
                                    // Campos de compatibilidad con el sistema anterior
                                    negocioId: null,
                                    slug: null,
                                    isDemo: false,
                                    staffId: null,
                                } as any;
                            }
                        }
                    } catch (adminErr) {
                        // Si la tabla AdminUser no existe aún (primer deploy), ignorar y continuar
                        if (!(adminErr as any)?.message?.includes('does not exist')) {
                            console.error("Auth AdminUser error:", adminErr);
                        }
                    }

                    // ── Paso 2: Verificar en Usuario (sistema original de negocios) ──
                    const user = await prisma.usuario.findUnique({
                        where: { email: credentials.email },
                    });

                    if (!user || !user.password) {
                        console.error("Auth: usuario no encontrado:", credentials.email);
                        return null;
                    }

                    const isPasswordCorrect = await bcrypt.compare(credentials.password, user.password);
                    if (!isPasswordCorrect) {
                        console.error("Auth: contraseña incorrecta:", credentials.email);
                        return null;
                    }

                    // Obtener slug del negocio
                    let slug: string | null = null;
                    let isDemo = false;
                    if (user.negocioId) {
                        try {
                            const negocio: any = await prisma.negocio.findUnique({
                                where: { id: user.negocioId },
                            });
                            slug = negocio?.slug || null;
                            isDemo = negocio?.isDemo || false;
                        } catch (e) {}
                    }

                    console.log("✅ Auth OK:", credentials.email, "negocioId:", user.negocioId);

                    return {
                        id: user.id,
                        email: user.email,
                        name: user.nombre,
                        negocioId: user.negocioId || null,
                        role: user.role || 'ADMIN_NEGOCIO',
                        roles: [user.role || 'ADMIN_NEGOCIO'],
                        slug,
                        isDemo,
                        staffId: null,
                        isAdminUser: false,
                    } as any;

                } catch (error) {
                    console.error("Auth error:", error);
                    return null;
                }
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }: any) {
            if (user) {
                token.id = user.id;
                token.negocioId = user.negocioId;
                token.role = user.role;
                token.roles = user.roles;
                token.slug = user.slug;
                token.isDemo = user.isDemo;
                token.staffId = user.staffId;
                // Campos AdminUser
                token.isAdminUser = user.isAdminUser || false;
                token.adminRolNombre = user.adminRolNombre || null;
                token.adminRolColor = user.adminRolColor || null;
                token.adminRolIcono = user.adminRolIcono || null;
                token.adminRolJerarquia = user.adminRolJerarquia || null;
                token.permisos = user.permisos || [];
                token.scope = user.scope || null;
                token.estado = user.estado || null;
            }
            return token;
        },
        async session({ session, token }: any) {
            if (token) {
                session.user.id = token.id;
                session.user.negocioId = token.negocioId;
                session.user.role = token.role;
                session.user.roles = token.roles;
                session.user.slug = token.slug;
                session.user.isDemo = token.isDemo;
                session.user.staffId = token.staffId;
                // Campos AdminUser en sesión
                session.user.isAdminUser = token.isAdminUser || false;
                session.user.adminRolNombre = token.adminRolNombre || null;
                session.user.adminRolColor = token.adminRolColor || null;
                session.user.adminRolIcono = token.adminRolIcono || null;
                session.user.adminRolJerarquia = token.adminRolJerarquia || null;
                session.user.permisos = token.permisos || [];
                session.user.scope = token.scope || null;
                session.user.estado = token.estado || null;

                // AUTO-REPARACIÓN: Si la sesión no tiene negocioId (token viejo),
                // lo recuperamos directamente de la BD con el id del usuario
                if (!token.negocioId && token.id && !token.isAdminUser) {
                    try {
                        const freshUser = await prisma.usuario.findUnique({
                            where: { id: token.id },
                        });
                        if (freshUser?.negocioId) {
                            session.user.negocioId = freshUser.negocioId;
                            console.log("🔧 Auto-reparación negocioId:", freshUser.negocioId);

                            // Obtener slug del negocio también
                            const negocio: any = await prisma.negocio.findUnique({
                                where: { id: freshUser.negocioId },
                            });
                            session.user.slug = negocio?.slug || null;
                        }
                    } catch (e) {
                        console.error("Session repair error:", e);
                    }
                }
            }
            return session;
        }
    },
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
    },
    secret: process.env.NEXTAUTH_SECRET,
};
