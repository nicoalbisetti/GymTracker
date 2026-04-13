import { useState, useEffect } from 'react';
import { X, Share, PlusSquare } from 'lucide-react';

type Platform = 'ios' | 'android' | 'desktop' | 'installed' | 'unknown';

function detectPlatform(): Platform {
  if (window.matchMedia('(display-mode: standalone)').matches) return 'installed';
  if ((navigator as unknown as { standalone?: boolean }).standalone === true) return 'installed';

  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/android/i.test(ua)) return 'android';
  if (/macintosh|windows|linux/i.test(ua)) return 'desktop';
  return 'unknown';
}

export default function InstallPrompt() {
  const [platform, setPlatform] = useState<Platform>('unknown');
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const p = detectPlatform();
    setPlatform(p);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (p === 'android') setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);

    if (p === 'ios' && !localStorage.getItem('pwa-install-dismissed')) {
      setVisible(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    const prompt = deferredPrompt as unknown as {
      prompt: () => void;
      userChoice: Promise<{ outcome: string }>;
    };
    prompt.prompt();
    await prompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  }

  function handleDismiss() {
    setVisible(false);
    localStorage.setItem('pwa-install-dismissed', '1');
  }

  if (!visible || platform === 'installed' || platform === 'desktop') return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 max-w-lg mx-auto">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            {platform === 'android' && (
              <>
                <p className="font-semibold text-white text-sm">Instalá GymTracker</p>
                <p className="text-slate-400 text-xs mt-1">
                  Agregala a tu pantalla de inicio para acceso rápido.
                </p>
              </>
            )}
            {platform === 'ios' && (
              <>
                <p className="font-semibold text-white text-sm">Instalá GymTracker</p>
                <p className="text-slate-400 text-xs mt-1.5 flex items-center gap-1 flex-wrap">
                  Tocá
                  <Share size={13} className="inline text-slate-300 shrink-0" />
                  y luego
                  <span className="inline-flex items-center gap-1">
                    <PlusSquare size={13} className="text-slate-300 shrink-0" />
                    "Añadir a pantalla de inicio"
                  </span>
                </p>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {platform === 'android' && (
              <button
                onClick={handleInstall}
                className="px-3 py-1.5 bg-primary-500 text-white text-sm font-medium rounded-xl"
              >
                Instalar
              </button>
            )}
            <button
              onClick={handleDismiss}
              className="text-slate-500 p-1 rounded-lg active:text-slate-300"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
