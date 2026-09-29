// ============================================================
// Path: apps/web/src/lib/hooks/use-confetti.tsx
// ============================================================

'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { Confetti } from '@/components/effects/confetti';

interface ConfettiContextValue {
  fire: () => void;
}

const ConfettiContext = createContext<ConfettiContextValue>({
  fire: () => {},
});

export function ConfettiProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState(false);

  const fire = useCallback(() => {
    setActive(false);
    // small delay so repeated fires re-render
    setTimeout(() => setActive(true), 10);
  }, []);

  return (
    <ConfettiContext.Provider value={{ fire }}>
      {children}
      <Confetti active={active} />
    </ConfettiContext.Provider>
  );
}

export function useConfetti() {
  return useContext(ConfettiContext);
}