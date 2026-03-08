import { useState, useEffect } from 'react';
import { HiDownload, HiX } from 'react-icons/hi';
import { IoShareOutline } from 'react-icons/io5';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Already installed as PWA — don't show
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) return;

    // Already dismissed this session
    if (sessionStorage.getItem('pwa-install-dismissed')) return;

    // Detect iOS (Safari doesn't fire beforeinstallprompt)
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(ios);

    if (ios) {
      // On iOS, show after a short delay
      const t = setTimeout(() => setShow(true), 2500);
      return () => clearTimeout(t);
    }

    // Android / Desktop Chrome
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setShow(false);
      setDeferredPrompt(null);
    });
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShow(false);
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    setShow(false);
    sessionStorage.setItem('pwa-install-dismissed', '1');
  };

  if (!show) return null;

  /* ── iOS : instructions manuelles ── */
  if (isIOS) {
    return (
      <div className="fixed bottom-6 left-3 right-3 z-[9999] mx-auto max-w-[280px]
                      sm:left-auto sm:right-5 sm:bottom-5
                      bg-gray-900/95 backdrop-blur-md text-white rounded-xl shadow-2xl
                      p-3 flex items-start gap-2.5 animate-slide-up">
        <div className="flex-shrink-0 w-7 h-7 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center mt-0.5">
          <IoShareOutline className="w-3.5 h-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-xs">Installer StyleFlow</p>
          <p className="text-[11px] text-gray-400 mt-0.5 leading-snug">
            Appuyez sur <IoShareOutline className="inline w-3 h-3 -mt-px" /> puis <strong>« Sur l'écran d'accueil »</strong>
          </p>
        </div>
        <button onClick={dismiss} className="p-0.5 text-gray-500 hover:text-white flex-shrink-0">
          <HiX className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  /* ── Android / Desktop : compact pill ── */
  return (
    <div className="fixed z-[9999] animate-slide-up
                    bottom-6 left-3 right-3 mx-auto max-w-[260px]
                    sm:left-auto sm:right-5 sm:bottom-5 sm:max-w-[240px]">
      <div className="bg-gray-900/95 backdrop-blur-md text-white rounded-xl shadow-2xl
                      p-2.5 flex items-center gap-2">
        <div className="flex-shrink-0 w-7 h-7 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
          <HiDownload className="w-3.5 h-3.5" />
        </div>
        <p className="flex-1 font-semibold text-xs truncate">StyleFlow</p>
        <button onClick={handleInstall}
                className="px-2.5 py-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-[11px] font-semibold
                           hover:opacity-90 transition-opacity flex-shrink-0">
          Installer
        </button>
        <button onClick={dismiss} className="p-0.5 text-gray-500 hover:text-white flex-shrink-0">
          <HiX className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
