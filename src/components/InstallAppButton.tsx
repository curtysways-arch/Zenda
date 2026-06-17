'use client';

import React, { useEffect, useState } from 'react';
import { 
  addInstallationListener, 
  removeInstallationListener, 
  installPWA, 
  isPWAInstalled,
  isInstallAvailable 
} from '@/lib/pwa-install';
import { Download, Smartphone } from 'lucide-react';

interface InstallAppButtonProps {
  className?: string;
  variant?: 'minimal' | 'full';
  slug?: string;
}

const InstallAppButton: React.FC<InstallAppButtonProps> = ({ 
  className = "", 
  variant = 'full',
  slug = ""
}) => {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if installed on mount
    setIsInstalled(isPWAInstalled());

    // Listener for installation availability
    const handleAvailabilityChange = (available: boolean) => {
      setCanInstall(available);
      // Also update isInstalled in case it changed
      setIsInstalled(isPWAInstalled());
    };

    addInstallationListener(handleAvailabilityChange);

    return () => {
      removeInstallationListener(handleAvailabilityChange);
    };
  }, []);

  const handleInstallClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const success = await installPWA();
    if (success) {
      console.log('App installation successful');
      setIsInstalled(true);
      setCanInstall(false);
    }
  };

  // If already installed or installation not available, don't show the button
  if (isInstalled || !canInstall) {
    return null;
  }

  if (variant === 'minimal') {
    return (
      <button
        onClick={handleInstallClick}
        className={`flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm font-medium transition-all shadow-sm ${className}`}
      >
        <Download className="w-4 h-4" />
        Instalar
      </button>
    );
  }

  return (
    <div className={`p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl text-white shadow-xl ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            ¡Instalar App! 📲
          </h3>
          <p className="text-sm opacity-90 mt-1">
            Reserva más rápido y recibe recordatorios al instante instalando nuestra app.
          </p>
          <button
            onClick={handleInstallClick}
            className="mt-4 px-6 py-2.5 bg-white text-blue-600 font-bold rounded-xl hover:bg-opacity-90 active:scale-95 transition-all shadow-md w-full"
          >
            Instalar Gratis
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallAppButton;
