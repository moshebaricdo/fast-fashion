"use client";

import type { ReactNode } from "react";
import { PullToDismiss } from "@/components/ui/PullToDismiss";

interface DetailScreenProps {
  onDismiss: () => void;
  children: ReactNode;
}

/** Scrollable drawer chrome — sheet motion is handled by DetailStackLayout. */
export function DetailScreen({ onDismiss, children }: DetailScreenProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PullToDismiss onDismiss={onDismiss}>
        <div className="min-h-full">{children}</div>
      </PullToDismiss>
    </div>
  );
}

export const DETAIL_SCREEN_EXIT_MS = 260;
