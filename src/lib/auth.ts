import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { AuthOptions } from "next-auth";

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
                    };
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

                // AUTO-REPARACIÓN: Si la sesión no tiene negocioId (token viejo),
                // lo recuperamos directamente de la BD con el id del usuario
                if (!token.negocioId && token.id) {
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
