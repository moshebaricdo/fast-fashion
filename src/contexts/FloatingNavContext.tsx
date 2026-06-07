"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type ItemDetailNavActions = {
  onEdit: () => void;
  onDelete: () => void;
};

type FloatingNavContextValue = {
  mode: "tabs" | "item-detail";
  itemActions: ItemDetailNavActions | null;
  registerItemActions: (actions: ItemDetailNavActions) => void;
  clearItemActions: () => void;
};

const FloatingNavContext = createContext<FloatingNavContextValue | null>(null);

export function FloatingNavProvider({ children }: { children: ReactNode }) {
  const [itemActions, setItemActions] = useState<ItemDetailNavActions | null>(
    null,
  );

  const registerItemActions = useCallback((actions: ItemDetailNavActions) => {
    setItemActions(actions);
  }, []);

  const clearItemActions = useCallback(() => {
    setItemActions(null);
  }, []);

  const value = useMemo(
    () => ({
      mode: itemActions ? ("item-detail" as const) : ("tabs" as const),
      itemActions,
      registerItemActions,
      clearItemActions,
    }),
    [itemActions, registerItemActions, clearItemActions],
  );

  return (
    <FloatingNavContext.Provider value={value}>
      {children}
    </FloatingNavContext.Provider>
  );
}

export function useFloatingNav() {
  const ctx = useContext(FloatingNavContext);
  if (!ctx) {
    throw new Error("useFloatingNav must be used within FloatingNavProvider");
  }
  return ctx;
}

export function useItemDetailNav(actions: ItemDetailNavActions | null) {
  const { registerItemActions, clearItemActions } = useFloatingNav();

  useLayoutEffect(() => {
    if (actions) {
      registerItemActions(actions);
      return () => clearItemActions();
    }
    clearItemActions();
  }, [actions, registerItemActions, clearItemActions]);
}
