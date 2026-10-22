"use client";

import { useState, useEffect } from "react";
import { X, Share, PlusSquare, Download } from "lucide-react";
import { usePathname } from "next/navigation";
import {
  addInstallationListener,
  removeInstallationListener,
  installPWA,
  isPWAInstalled,
  getPwaContext,
  shouldSkipPrompt,
  markPromptDismissed,
  markAppInstalled,
  onAppInstalled,
  type PwaContext,
} from "@/lib/pwa-install";

/**
 * Aviso "Instala la app".
 *
 * - Página de un negocio (/slug): app de ESE negocio, con su logo y nombre.
 * - Admin (/admin): app Citiox para negocios.
 * - Superadmin (/superadmin): app Citiox Superadmin.
 * - Repartidores (/driver): app Citiox Driver.
 * - Login, registro, directorios, etc.: no se muestra.
 *
 * Solo aparece si la app aún no está instalada: en Android/Chrome el navegador
 * avisa (beforeinstallprompt) únicamente cuando esa app no está instalada; en
 * iPhone se muestran las instrucciones salvo que ya se abra como app.
 * Si el usuario lo cierra, no vuelve a salir para esa app en 14 días.
 */

type Brand = { name: string; logo: string; color: string; tagline: string };

const CITIOX_COLOR = "#0891b2";

function citioxBrand(kind: PwaContext["kind"]): Brand | null {
  if (kind === "admin") {
    return {
      name: "Citiox para negocios",
      logo: "/citiox-icon.png",
      color: CITIOX_COLOR,
      tagline: "Tu agenda, clientes y ventas en el celular, con avisos de cada nueva reserva.",
    };
  }
  if (kind === "superadmin") {
    return {
      name: "Citiox Superadmin",
      logo: "/citiox-icon.png",
      color: "#4f46e5",
      tagline: "Controla negocios, pagos y solicitudes desde el celular.",
    };
  }
  if (kind === "driver") {
    return {
      name: "Citiox Driver",
      logo: "/citiox-driver-logo.png",
      color: CITIOX_COLOR,
      tagline: "Recibe tus entregas y navega a cada pedido.",
    };
  }
  return null;
}

function businessTagline(tipo: string, slug: string): string {
  const t = (tipo || "").toUpperCase();
  if (["SHOE_CARE", "LAVANDERIA"].includes(t) || slug.includes("lavado")) return "Sigue tu orden en tiempo real y recibe avisos.";
  if (["RESTAURANT", "RESTAURANTE", "FOOD", "PINCHOS", "CAFETERIA"].includes(t)) return "Pide en un toque y sigue tu pedido en vivo.";
  if (["CANCHAS", "SPORTS", "PADEL"].includes(t)) return "Reserva tu cancha en segundos y recibe recordatorios.";
  if (["GYM", "GIMNASIO", "FITNESS"].includes(t)) return "Tu carnet QR y tu membresía siempre a mano.";
  if (["PRODUCTOS", "TIENDA", "STORE", "ECOMMERCE"].includes(t)) return "Compra más rápido y sigue tus pedidos.";
  return "Reserva en segundos, acumula puntos y recibe recordatorios.";
}

export default function PWAInstallPrompt() {
  const pathname = usePathname();
  const ctx = getPwaContext(pathname);

  const [brand, setBrand] = useState<Brand | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // 1) Marca según la app de esta página
  useEffect(() => {
    setIsVisible(false);
    setBrand(null);
    if (ctx.kind === "none") return;

    if (ctx.kind !== "business") {
      setBrand(citioxBrand(ctx.kind));
      return;
    }

    let cancelled = false;
    fetch(`/api/public/negocio/${encodeURIComponent(ctx.slug || "")}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        // Si no es un negocio real (ruta desconocida), no se muestra nada
        if (cancelled || !data?.nombre) return;
        setBrand({
          name: data.nombre,
          logo: data.logoUrl || "",
          color: data.colorPrimario || CITIOX_COLOR,
          tagline: businessTagline(data.tipoNegocio || data.tipo || "", ctx.slug || ""),
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [ctx.key]); // eslint-disable-line react-hooks/exhaustive-deps

  // 2) ¿Se puede instalar aquí y ahora?
  useEffect(() => {
    if (ctx.kind === "none") return;
    // Dentro de una vista previa (iframe) o ya abierta como app: nunca
    if (window.self !== window.top || isPWAInstalled()) return;

    const ios = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    setIsIOS(ios);

    const handleAvailability = (available: boolean) => setCanInstall(available);
    addInstallationListener(handleAvailability);
    const offInstalled = onAppInstalled(() => {
      markAppInstalled(ctx.key);
      setIsVisible(false);
    });
    return () => {
      removeInstallationListener(handleAvailability);
      offInstalled();
    };
  }, [ctx.key]); // eslint-disable-line react-hooks/exhaustive-deps

  // 3) Mostrar con una pequeña espera, solo si hay marca y se puede instalar
  useEffect(() => {
    if (!brand || ctx.kind === "none") return;
    if (!(canInstall || isIOS)) return;
    if (shouldSkipPrompt(ctx.key)) return;
    const timer = setTimeout(() => setIsVisible(true), isIOS ? 7000 : 4000);
    return () => clearTimeout(timer);
  }, [brand, canInstall, isIOS, ctx.key, ctx.kind]);

  const close = () => {
    markPromptDismissed(ctx.key);
    setIsVisible(false);
  };

  const handleInstallClick = async () => {
    const accepted = await installPWA();
    if (accepted) {
      markAppInstalled(ctx.key);
      setIsVisible(false);
    }
  };

  if (!isVisible || !brand) return null;

  return (
    <div
      role="dialog"
      aria-label={`Instalar ${brand.name}`}
      className="fixed bottom-24 left-4 right-4 md:bottom-6 md:left-auto md:right-6 md:w-[22rem] z-[9999] max-w-sm mx-auto md:mx-0 animate-in slide-in-from-bottom-6 fade-in duration-500"
    >
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="size-12 rounded-xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden shrink-0">
            {brand.logo ? (
              <img src={brand.logo} alt="" className="w-full h-full object-contain" />
            ) : (
              <span className="w-full h-full flex items-center justify-center text-white text-lg font-bold" style={{ backgroundColor: brand.color }}>
                {brand.name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-500">Instala la app</p>
            <h4 className="text-[15px] font-semibold text-slate-900 leading-tight truncate">{brand.name}</h4>
            <p className="text-xs text-slate-600 mt-1 leading-snug">{brand.tagline}</p>
          </div>

          <button
            type="button"
            onClick={close}
            className="text-slate-400 hover:text-slate-700 p-1 -mr-1 -mt-1 shrink-0"
            aria-label="Ahora no"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-3">
          {canInstall && !isIOS ? (
            <button
              type="button"
              onClick={handleInstallClick}
              className="w-full text-white py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold hover:brightness-110 active:scale-[0.98] transition"
              style={{ backgroundColor: brand.color }}
            >
              <Download size={16} />
              Instalar gratis
            </button>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-700 flex items-center justify-center gap-2 flex-wrap">
              Toca <Share size={14} className="text-blue-600" /> <strong>Compartir</strong> y luego
              <PlusSquare size={14} className="text-slate-700" /> <strong>Agregar a inicio</strong>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
