import { useState, useEffect } from 'react';
import { HiDownload, HiX } from 'react-icons/hi';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
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

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[9999] mx-auto max-w-md
                    bg-gray-900 text-white rounded-2xl shadow-2xl p-4
                    flex items-center gap-3 animate-slide-up">
      <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
        <HiDownload className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">Installer StyleFlow</p>
        <p className="text-xs text-gray-400">Accès rapide depuis votre écran d'accueil</p>
      </div>
      <button onClick={handleInstall}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-sm font-semibold
                         hover:opacity-90 transition-opacity flex-shrink-0">
        Installer
      </button>
      <button onClick={() => setShow(false)} className="p-1 text-gray-400 hover:text-white flex-shrink-0">
        <HiX className="w-4 h-4" />
      </button>
    </div>
  );
}
