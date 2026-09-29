// ============================================================
// Path: apps/web/src/components/pwa/install-prompt.tsx
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show after 5s if not dismissed before
      const dismissed = localStorage.getItem('sb_install_dismissed');
      if (!dismissed) setTimeout(() => setShow(true), 5000);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShow(false);
    }
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    setShow(false);
    localStorage.setItem('sb_install_dismissed', '1');
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-24 md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-80 z-50"
        >
          <div className="card-soft p-4 flex items-start gap-3 shadow-soft-lg">
            <div className="text-3xl">🐱</div>
            <div className="flex-1">
              <p className="font-semibold text-primary-800 text-sm">
                Study Buddy ইনস্টল করো
              </p>
              <p className="text-xs text-primary-500 mt-0.5">
                হোম স্ক্রিনে যোগ করে দ্রুত খোলো
              </p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" onClick={install} className="flex-1">
                  <Download size={14} />
                  ইনস্টল
                </Button>
                <Button size="sm" variant="soft" onClick={dismiss}>
                  <X size={14} />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}