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
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [copied, setCopied] = useState(false);

  // Detect mobile device
  const isMobile = () => {
    // Don't rely only on viewport width (iPad landscape can be >768).
    // iPadOS 13+ can report as Mac in userAgent, so we also include checkIsIOS().
    return checkIsIOS() || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  // Detect iOS specifically
  const checkIsIOS = () => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  };

  // Detect Safari on iOS (A2HS is most reliable there; in-app browsers can hide it)
  const isIOSSafari = () => {
    if (!checkIsIOS()) return false;
    const ua = navigator.userAgent;
    const isSafari = /Safari/i.test(ua);
    const isOtheriOSBrowser = /CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/i.test(ua);
    return isSafari && !isOtheriOSBrowser;
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
      // iOS doesn't allow triggering "Add to Home Screen" programmatically.
      // Show a clear inline instructions panel instead.
      setCopied(false);
      setShowIOSInstructions(true);
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

  const handleCopyLink = async () => {
    try {
      const url = window.location.href;
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // Fallback for older iOS Safari
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
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
              <p>On iPhone/iPad you must use the browser menu to add it. Tap below to see the steps.</p>
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

      {isIOS && showIOSInstructions && (
        <div className="pwa-ios-inline" role="region" aria-label="Add to Home Screen steps">
          <div className="pwa-ios-inline-header">
            <div className="pwa-ios-inline-title">Steps</div>
            <button
              className="pwa-ios-inline-close"
              onClick={() => setShowIOSInstructions(false)}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {!isIOSSafari() ? (
            <div className="pwa-ios-inline-note">
              You’re not in Safari. Open this site in <b>Safari</b> to see “Add to Home Screen”.
            </div>
          ) : null}

          <ol className="pwa-ios-steps">
            <li>Tap the <b>Share</b> button in your browser.</li>
            <li>Scroll and tap <b>Add to Home Screen</b>.</li>
            <li>Tap <b>Add</b>.</li>
          </ol>

          {!isIOSSafari() ? (
            <div className="pwa-ios-inline-actions">
              <button className="pwa-ios-secondary" onClick={handleCopyLink}>
                {copied ? 'Copied' : 'Copy Link'}
              </button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default PWAInstallPrompt;