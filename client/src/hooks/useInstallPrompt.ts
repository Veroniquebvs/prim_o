import { useSyncExternalStore } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/**
 * Module-level (not component-level) state: `beforeinstallprompt` fires once, early in the
 * session, as soon as the browser decides the app is installable — usually well before the
 * user ever navigates to the Settings page. A listener registered inside a component's
 * useEffect only starts listening once that component mounts, so it misses the event almost
 * every time. Registering here instead means the listener is live as soon as this module is
 * first imported (bundled eagerly with the app), so the event is caught no matter which page
 * the user is on when it fires.
 */
let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installed = isStandalone();
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((cb) => cb());
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e as BeforeInstallPromptEvent;
  notify();
});

window.addEventListener('appinstalled', () => {
  installed = true;
  deferredPrompt = null;
  notify();
});

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

/**
 * Exposes the browser's native PWA install prompt (Chrome/Edge on Android/desktop).
 * Safari/iOS never fires `beforeinstallprompt` — canInstall stays false there and callers
 * should fall back to manual "Add to Home Screen" instructions.
 */
export function useInstallPrompt() {
  const canInstall = useSyncExternalStore(subscribe, () => deferredPrompt !== null);
  const isInstalled = useSyncExternalStore(subscribe, () => installed);

  async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
    if (!deferredPrompt) return 'unavailable';
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    notify();
    return outcome;
  }

  return { canInstall, isInstalled, promptInstall };
}
