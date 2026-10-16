"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type DrawerNavigationContextValue = {
  requestDismiss: (href: string) => void;
  registerDismissHandler: (handler: ((href: string) => void) | null) => void;
  overlayActive: boolean;
  setOverlayActive: (active: boolean) => void;
};

export const DrawerNavigationContext =
  createContext<DrawerNavigationContextValue | null>(null);

export function DrawerNavigationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [handler, setHandler] = useState<
    ((href: string) => void) | null
  >(null);
  const [overlayActive, setOverlayActive] = useState(false);

  const registerDismissHandler = useCallback(
    (next: ((href: string) => void) | null) => {
      setHandler(() => next);
    },
    [],
  );

  const requestDismiss = useCallback(
    (href: string) => {
      handler?.(href);
    },
    [handler],
  );

  const value = useMemo(
    () => ({
      requestDismiss,
      registerDismissHandler,
      overlayActive,
      setOverlayActive,
    }),
    [requestDismiss, registerDismissHandler, overlayActive],
  );

  return (
    <DrawerNavigationContext.Provider value={value}>
      {children}
    </DrawerNavigationContext.Provider>
  );
}

export function useDrawerNavigation() {
  const ctx = useContext(DrawerNavigationContext);
  if (!ctx) {
    throw new Error(
      "useDrawerNavigation must be used within DrawerNavigationProvider",
    );
  }
  return ctx;
}

export function useDrawerDismiss(fallbackHref: string) {
  const ctx = useContext(DrawerNavigationContext);
  const router = useRouter();

  return useCallback(() => {
    if (ctx) {
      ctx.requestDismiss(fallbackHref);
      return;
    }
    router.push(fallbackHref);
  }, [ctx, fallbackHref, router]);
}

export function useDrawerOverlayActive() {
  return useContext(DrawerNavigationContext)?.overlayActive ?? false;
}
