/**
 * PWA Installation Logic for Cancha
 * Manages the beforeinstallprompt event and provides methods to trigger installation.
 */

// Extend the Window interface to include the beforeinstallprompt event
declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installationListeners: Array<(available: boolean) => void> = [];
let initialized = false;
let installedListeners: Array<() => void> = [];

// ── Contexto de instalación según la ruta ───────────────────────────
// Cada parte de Citiox se instala como una app distinta (manifest propio).

export type PwaContextKind = 'business' | 'admin' | 'superadmin' | 'driver' | 'none';
export interface PwaContext {
  kind: PwaContextKind;
  slug: string | null;
  /** Clave para recordar "ya la instalé" / "no me interesa" por app */
  key: string;
}

/** Rutas de primer nivel que no son páginas de un negocio. */
export const NON_BUSINESS_ROUTES = [
  'admin', 'superadmin', 'driver', 'login', 'register', 'olvide-password',
  'api', 'checkin', 'reserva', 'profesor', 'canchas', 'restaurantes',
  'lavanderias', 'tiendas', 'servicios', 'demo', 'demo-lavado', 'lavado',
  'precios', 'planes', 'terminos', 'privacidad', 'blog', 'ayuda', 'contacto',
];

export const getPwaContext = (pathname: string | null | undefined): PwaContext => {
  const segments = (pathname || '').split('/').filter(Boolean);
  const first = segments[0];
  if (!first) return { kind: 'none', slug: null, key: 'none' };
  if (first === 'admin') return { kind: 'admin', slug: null, key: 'admin' };
  if (first === 'superadmin') return { kind: 'superadmin', slug: null, key: 'superadmin' };
  if (first === 'driver') return { kind: 'driver', slug: null, key: 'driver' };
  if (NON_BUSINESS_ROUTES.includes(first)) return { kind: 'none', slug: null, key: 'none' };
  return { kind: 'business', slug: first, key: `negocio:${first}` };
};

const DISMISS_DAYS = 14;
const lsKey = (kind: 'dismissed' | 'installed', key: string) => `citiox.pwa.${kind}.${key}`;

/** El usuario cerró el aviso: no volver a mostrarlo en esta app por unos días. */
export const markPromptDismissed = (key: string) => {
  try { localStorage.setItem(lsKey('dismissed', key), String(Date.now())); } catch (_) {}
};

/** La instaló desde este navegador: no volver a ofrecerla aquí. */
export const markAppInstalled = (key: string) => {
  try { localStorage.setItem(lsKey('installed', key), '1'); } catch (_) {}
};

export const shouldSkipPrompt = (key: string): boolean => {
  try {
    if (localStorage.getItem(lsKey('installed', key)) === '1') return true;
    const t = Number(localStorage.getItem(lsKey('dismissed', key)) || 0);
    return Boolean(t && Date.now() - t < DISMISS_DAYS * 24 * 60 * 60 * 1000);
  } catch (_) {
    return false;
  }
};

/** Avisar cuando el navegador confirma que se instaló la app. */
export const onAppInstalled = (cb: () => void) => {
  installedListeners.push(cb);
  return () => { installedListeners = installedListeners.filter(l => l !== cb); };
};

/**
 * Initializes listeners for PWA installation events.
 */
export const initPWAInstall = () => {
  if (typeof window === 'undefined' || initialized) return;
  initialized = true;

  // Limpiar cualquier flag viejo de localStorage que causaba falsos positivos
  try {
    if (!window.matchMedia('(display-mode: standalone)').matches && !(window.navigator as any).standalone) {
      localStorage.removeItem('pwa_installed');
    }
  } catch (_) {}

  // Listen for the prompt event
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the default browser prompt
    e.preventDefault();
    // Save the event for later use
    deferredPrompt = e;
    try {
      localStorage.removeItem('pwa_installed');
    } catch (_) {}
    // Notify listeners that installation is available
    notifyListeners(true);
  });

  // Listen for the app installed event
  window.addEventListener('appinstalled', () => {
    // Clear the deferred prompt
    deferredPrompt = null;
    try {
      localStorage.removeItem('pwa_installed');
    } catch (_) {}
    // Notify listeners that installation is no longer available
    notifyListeners(false);
    installedListeners.forEach(l => l());
  });
};

/**
 * Triggers the PWA installation dialog.
 */
export const installPWA = async (): Promise<boolean> => {
  if (!deferredPrompt) {
    console.warn('Installation prompt not available yet');
    return false;
  }

  // Show the native prompt
  deferredPrompt.prompt();

  // Wait for the user's choice
  const { outcome } = await deferredPrompt.userChoice;
  console.log(`User response to installation prompt: ${outcome}`);

  // Reset the deferred prompt
  deferredPrompt = null;
  notifyListeners(false);

  return outcome === 'accepted';
};

/**
 * Checks if the app is currently running in standalone mode (installed and opened as app).
 */
export const isPWAInstalled = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const isStandalone = 
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://');
  
  return Boolean(isStandalone);
};

/**
 * Checks if the installation prompt is currently available.
 */
export const isInstallAvailable = (): boolean => {
  return deferredPrompt !== null;
};

/**
 * Adds a listener to be notified when the installation availability changes.
 */
export const addInstallationListener = (callback: (available: boolean) => void) => {
  installationListeners.push(callback);
  // Call immediately with current state
  callback(deferredPrompt !== null);
};

/**
 * Removes a previously added listener.
 */
export const removeInstallationListener = (callback: (available: boolean) => void) => {
  installationListeners = installationListeners.filter(l => l !== callback);
};

const notifyListeners = (available: boolean) => {
  installationListeners.forEach(l => l(available));
};
