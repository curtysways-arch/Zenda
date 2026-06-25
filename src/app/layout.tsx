import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import BackButtonHandler from "@/components/BackButtonHandler";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://citiox.com'),
    title: "CitiOx - Booking & App Solutions",
    description: "Gestión inteligente de reservas, citas y clientes para todo tipo de negocios.",
    manifest: "/manifest.json",
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
        title: "CitiOx",
    },
    formatDetection: {
        telephone: false,
    },
    openGraph: {
        title: "CitiOx - Booking & App Solutions",
        description: "Gestión inteligente de reservas, citas y clientes para todo tipo de negocios.",
        images: ["/logo-citiox.png"],
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "CitiOx - Booking & App Solutions",
        description: "Gestión inteligente de reservas, citas y clientes para todo tipo de negocios.",
        images: ["/logo-citiox.png"],
    },
};

export const viewport = {
    themeColor: "#ffffff",
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};

export const dynamic = 'force-dynamic';

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="es" suppressHydrationWarning>
            <body className={inter.className}>
                <Providers>
                    <BackButtonHandler />
                    {children}
                </Providers>
            </body>
        </html>
    );
}
