import { useState } from 'react';

export function useSidebarState(key: string) {
  const [isOpen, setIsOpen] = useState<boolean>(() => {
    const stored = localStorage.getItem(key);
    return stored === null ? true : stored === 'true';
  });

  const toggle = (value?: boolean) => {
    const next = value !== undefined ? value : !isOpen;
    setIsOpen(next);
    localStorage.setItem(key, String(next));
  };

  return [isOpen, toggle] as const;
}
