import React, { useState, useEffect } from 'react';
import './PWAInstallPrompt.css';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  // Detect mobile device
  const isMobile = () => {
    return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  // Detect iOS specifically
  const checkIsIOS = () => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  };

  // Check if running as PWA (already installed)
  const isPWA = () => {
    return window.matchMedia('(display-mode: standalone)').matches ||
           (window.navigator as any).standalone === true;
  };

  useEffect(() => {
    const iosDevice = checkIsIOS();
    setIsIOS(iosDevice);

    // Only show prompt on mobile devices and not if already installed as PWA
    if (!isMobile() || isPWA()) {
      return;
    }

    // For iOS devices, show the prompt immediately since they don't support beforeinstallprompt
    if (iosDevice) {
      setShowPrompt(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show the install prompt only on mobile
      if (isMobile()) {
        setShowPrompt(true);
      }
    };

    const handleAppInstalled = () => {
      // Hide the install prompt
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      // On iOS, we can't programmatically install, so we'll show instructions
      // The UI will change to show iOS-specific instructions
      return;
    }

    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    // Reset the deferred prompt variable
    setDeferredPrompt(null);
    setShowPrompt(false);

    // Log the result
    console.log(`User response to the install prompt: ${outcome}`);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  // Don't show prompt if not mobile, already installed as PWA, or if prompt is not set to show
  if (!isMobile() || isPWA() || !showPrompt) return null;

  return (
    <div className="pwa-install-prompt">
      <div className="pwa-install-content">
        <div className="pwa-install-icon">
          <img src="/brain-logo.png" alt="Spoonfeeder Logo" />
        </div>
        <div className="pwa-install-text">
          {isIOS ? (
            <>
              <h3>Add to Home Screen</h3>
              <p>Tap the share button below, then "Add to Home Screen" for the full app experience!</p>
            </>
          ) : (
            <>
              <h3>Install Spoonfeeder</h3>
              <p>Get the full app experience with offline access and faster loading!</p>
            </>
          )}
        </div>
        <div className="pwa-install-buttons">
          {isIOS ? (
            <>
              <button onClick={handleInstallClick} className="pwa-install-ios-instruction">
                Add to Home Screen
              </button>
              <button onClick={handleDismiss} className="pwa-install-dismiss">
                Not now
              </button>
            </>
          ) : (
            <>
              <button onClick={handleInstallClick} className="pwa-install-accept">
                Install
              </button>
              <button onClick={handleDismiss} className="pwa-install-dismiss">
                Not now
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;