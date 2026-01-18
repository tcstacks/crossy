'use client';

import { useState } from 'react';
import { X, Download } from 'lucide-react';
import { usePWAInstall } from '@/hooks/usePWAInstall';

export function InstallPrompt() {
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();
  const [isDismissed, setIsDismissed] = useState(false);

  if (!isInstallable || isInstalled || isDismissed) {
    return null;
  }

  const handleInstall = async () => {
    const installed = await promptInstall();
    if (!installed) {
      setIsDismissed(true);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6">
      <div className="mx-auto max-w-2xl rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 p-4 shadow-lg">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <Download className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-white">
              Install Crossy
            </h3>
            <p className="mt-1 text-sm text-white/90">
              Install our app for a better experience. Play offline, get push notifications, and enjoy faster loading times.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={handleInstall}
                className="rounded-md bg-white px-4 py-2 text-sm font-medium text-violet-600 hover:bg-white/90 transition-colors"
              >
                Install App
              </button>
              <button
                onClick={handleDismiss}
                className="rounded-md bg-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/30 transition-colors"
              >
                Maybe Later
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-white/80 hover:text-white transition-colors"
            aria-label="Dismiss install prompt"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
