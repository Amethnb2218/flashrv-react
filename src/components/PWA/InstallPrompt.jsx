import { useState, useEffect } from 'react';
import { HiDownload, HiX } from 'react-icons/hi';
import { IoShareOutline } from 'react-icons/io5';
import { HiPlus } from 'react-icons/hi';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [expanded, setExpanded] = useState(false);

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

    // Fallback: if beforeinstallprompt doesn't fire after 3s, show anyway
    const fallback = setTimeout(() => setShow(true), 3000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      clearTimeout(fallback);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setShow(false);
      setDeferredPrompt(null);
    } else {
      // Fallback: open in browser so the user can use the browser menu to install
      const ua = navigator.userAgent.toLowerCase();
      if (ua.includes('android')) {
        alert('Pour installer StyleFlow :\nOuvrez le menu du navigateur (⋮) puis appuyez sur « Ajouter à l\'écran d\'accueil »');
      } else {
        alert('Pour installer StyleFlow :\nOuvrez le menu du navigateur puis « Installer l\'application » ou « Ajouter à l\'écran d\'accueil »');
      }
    }
  };

  const dismiss = () => {
    setShow(false);
    sessionStorage.setItem('pwa-install-dismissed', '1');
  };

  if (!show) return null;

  /* ── iOS : instructions interactives ── */
  if (isIOS) {
    if (!expanded) {
      return (
        <div className="fixed bottom-6 left-3 right-3 z-[9999] mx-auto max-w-[280px]
                        sm:left-auto sm:right-5 sm:bottom-5
                        bg-gray-100/95 backdrop-blur-md text-gray-800 rounded-xl shadow-lg border border-gray-200
                        p-2.5 flex items-center gap-2 animate-slide-up cursor-pointer"
             onClick={() => setExpanded(true)}>
          <div className="flex-shrink-0 w-7 h-7 bg-gray-200 rounded-lg flex items-center justify-center">
            <HiDownload className="w-3.5 h-3.5 text-gray-600" />
          </div>
          <p className="flex-1 font-semibold text-xs text-gray-900 truncate">StyleFlow</p>
          <span className="px-2.5 py-1 bg-gray-700 text-white rounded-lg text-[11px] font-semibold flex-shrink-0">
            Installer
          </span>
          <button onClick={(e) => { e.stopPropagation(); dismiss(); }} className="p-0.5 text-gray-400 hover:text-gray-700 flex-shrink-0">
            <HiX className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    }

    /* Expanded iOS guide */
    return (
      <>
        <div className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm" onClick={() => setExpanded(false)} />
        <div className="fixed bottom-6 left-3 right-3 z-[9999] mx-auto max-w-[300px]
                        sm:left-auto sm:right-5 sm:bottom-5
                        bg-white text-gray-800 rounded-2xl shadow-2xl border border-gray-200
                        p-4 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold text-sm text-gray-900">Installer StyleFlow</p>
            <button onClick={dismiss} className="p-1 text-gray-400 hover:text-gray-700">
              <HiX className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-3">
            <div className="flex items-start gap-2.5">
              <span className="flex-shrink-0 w-5 h-5 bg-gray-900 text-white rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5">1</span>
              <p className="text-xs text-gray-600 leading-relaxed">
                Appuyez sur l'icône <IoShareOutline className="inline w-4 h-4 text-blue-500 -mt-0.5 mx-0.5" /> <strong className="text-gray-800">Partager</strong> en bas de Safari
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="flex-shrink-0 w-5 h-5 bg-gray-900 text-white rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5">2</span>
              <p className="text-xs text-gray-600 leading-relaxed">
                Faites défiler et appuyez sur <HiPlus className="inline w-3.5 h-3.5 text-gray-800 -mt-0.5 mx-0.5" /> <strong className="text-gray-800">Sur l'écran d'accueil</strong>
              </p>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="flex-shrink-0 w-5 h-5 bg-gray-900 text-white rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5">3</span>
              <p className="text-xs text-gray-600 leading-relaxed">
                Appuyez sur <strong className="text-gray-800">Ajouter</strong> en haut à droite
              </p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 text-center">
            <p className="text-[10px] text-gray-400">Ouvrez cette page dans Safari si vous utilisez un autre navigateur</p>
          </div>
        </div>
      </>
    );
  }

  /* ── Android / Desktop : compact pill ── */
  return (
    <div className="fixed z-[9999] animate-slide-up
                    bottom-6 left-3 right-3 mx-auto max-w-[260px]
                    sm:left-auto sm:right-5 sm:bottom-5 sm:max-w-[240px]">
      <div className="bg-gray-100/95 backdrop-blur-md text-gray-800 rounded-xl shadow-lg border border-gray-200
                      p-2.5 flex items-center gap-2 cursor-pointer" onClick={handleInstall}>
        <div className="flex-shrink-0 w-7 h-7 bg-gray-200 rounded-lg flex items-center justify-center">
          <HiDownload className="w-3.5 h-3.5 text-gray-600" />
        </div>
        <p className="flex-1 font-semibold text-xs truncate text-gray-900">StyleFlow</p>
        <span className="px-2.5 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-[11px] font-semibold
                           transition-colors flex-shrink-0">
          Installer
        </span>
        <button onClick={(e) => { e.stopPropagation(); dismiss(); }} className="p-0.5 text-gray-400 hover:text-gray-700 flex-shrink-0">
          <HiX className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
