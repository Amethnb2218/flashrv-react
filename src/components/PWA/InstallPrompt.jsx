import { useState, useEffect } from 'react'
import { HiDownload, HiX, HiPlus, HiDotsVertical } from 'react-icons/hi'
import { IoShareOutline } from 'react-icons/io5'

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [show, setShow] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)
  const [showGuide, setShowGuide] = useState(false)

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
    if (isStandalone) return

    if (sessionStorage.getItem('pwa-install-dismissed')) return

    const ua = navigator.userAgent
    const ios = /iPad|iPhone|iPod/.test(ua) && !window.MSStream
    const android = /Android/i.test(ua)

    setIsIOS(ios)
    setIsAndroid(android)

    if (ios) {
      const t = setTimeout(() => setShow(true), 2200)
      return () => clearTimeout(t)
    }

    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShow(true)
    }

    const onInstalled = () => {
      setShow(false)
      setShowGuide(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', onInstalled)

    const fallback = setTimeout(() => setShow(true), 2800)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', onInstalled)
      clearTimeout(fallback)
    }
  }, [])

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') {
        setShow(false)
        setShowGuide(false)
      }
      setDeferredPrompt(null)
      return
    }

    // No native prompt available (Safari/iOS or some Android browsers):
    // show a custom in-app guide instead of browser alert popups.
    setShowGuide(true)
  }

  const dismiss = () => {
    setShow(false)
    setShowGuide(false)
    sessionStorage.setItem('pwa-install-dismissed', '1')
  }

  if (!show) return null

  const renderGuideTitle = isIOS ? "Installer Jolof'Era sur iPhone" : "Installer Jolof'Era"

  return (
    <>
      <div
        className="fixed z-[9999] animate-slide-up bottom-6 left-3 right-3 mx-auto max-w-[280px] sm:left-auto sm:right-5 sm:bottom-5 sm:max-w-[260px]"
      >
        <div
          className="bg-primary-100/95 backdrop-blur-md text-primary-800 rounded-xl shadow-lg border border-primary-200 p-2.5 flex items-center gap-2 cursor-pointer"
          onClick={handleInstall}
        >
          <div className="flex-shrink-0 w-7 h-7 bg-primary-200 rounded-lg flex items-center justify-center">
            <HiDownload className="w-3.5 h-3.5 text-primary-600" />
          </div>
          <p className="flex-1 font-semibold text-xs truncate text-primary-900">Jolof'Era</p>
          <span className="px-2.5 py-1 bg-primary-700 hover:bg-primary-600 text-white rounded-lg text-[11px] font-semibold transition-colors flex-shrink-0">
            Installer
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation()
              dismiss()
            }}
            className="p-0.5 text-primary-400 hover:text-primary-700 flex-shrink-0"
            aria-label="Fermer"
          >
            <HiX className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {showGuide && (
        <>
          <div
            className="fixed inset-0 z-[9998] bg-black/45 backdrop-blur-sm"
            onClick={() => setShowGuide(false)}
          />
          <div className="fixed z-[9999] left-3 right-3 bottom-6 mx-auto max-w-[360px] bg-white text-primary-800 rounded-2xl shadow-2xl border border-primary-200 p-4 animate-slide-up">
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-sm text-primary-900">{renderGuideTitle}</p>
              <button onClick={() => setShowGuide(false)} className="p-1 text-primary-400 hover:text-primary-700" aria-label="Fermer les instructions">
                <HiX className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 bg-primary-900 text-white rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5">1</span>
                  <p className="text-xs text-primary-600 leading-relaxed">
                    Appuyez sur l'icone <IoShareOutline className="inline w-4 h-4 text-primary-700 -mt-0.5 mx-0.5" />
                    <strong className="text-primary-800">Partager</strong> en bas de Safari
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 bg-primary-900 text-white rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5">2</span>
                  <p className="text-xs text-primary-600 leading-relaxed">
                    Faites defiler et appuyez sur
                    <HiPlus className="inline w-3.5 h-3.5 text-primary-800 -mt-0.5 mx-0.5" />
                    <strong className="text-primary-800">Sur l'ecran d'accueil</strong>
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 bg-primary-900 text-white rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5">3</span>
                  <p className="text-xs text-primary-600 leading-relaxed">
                    Appuyez sur <strong className="text-primary-800">Ajouter</strong> en haut a droite
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 bg-primary-900 text-white rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5">1</span>
                  <p className="text-xs text-primary-600 leading-relaxed">
                    Ouvrez le menu du navigateur
                    <HiDotsVertical className="inline w-3.5 h-3.5 text-primary-800 -mt-0.5 mx-0.5" />
                    en haut a droite
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 bg-primary-900 text-white rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5">2</span>
                  <p className="text-xs text-primary-600 leading-relaxed">
                    Appuyez sur <strong className="text-primary-800">Installer l'application</strong>
                    {isAndroid ? " ou Ajouter a l'ecran d'accueil" : ''}
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 bg-primary-900 text-white rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5">3</span>
                  <p className="text-xs text-primary-600 leading-relaxed">
                    Confirmez en appuyant sur <strong className="text-primary-800">Installer</strong>
                  </p>
                </div>
              </div>
            )}

            <div className="mt-3 pt-3 border-t border-primary-100 text-center">
              <p className="text-[10px] text-primary-400">
                L'installation directe depend du navigateur. Cette methode fonctionne partout.
              </p>
            </div>
          </div>
        </>
      )}
    </>
  )
}
