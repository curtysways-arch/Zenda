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

/**
 * Initializes listeners for PWA installation events.
 */
export const initPWAInstall = () => {
  if (typeof window === 'undefined') return;

  // Listen for the prompt event
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the default browser prompt
    e.preventDefault();
    // Save the event for later use
    deferredPrompt = e;
    // Notify listeners that installation is available
    notifyListeners(true);
  });

  // Listen for the app installed event
  window.addEventListener('appinstalled', () => {
    // Clear the deferred prompt
    deferredPrompt = null;
    // Save status in localStorage
    localStorage.setItem('pwa_installed', 'true');
    // Notify listeners that installation is no longer available
    notifyListeners(false);
    console.log('PWA was installed');
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
 * Checks if the app is currently running in standalone mode (installed).
 */
export const isPWAInstalled = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const wasInstalled = localStorage.getItem('pwa_installed') === 'true';
  
  return isStandalone || wasInstalled;
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
