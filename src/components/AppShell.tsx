import type { CSSProperties, ReactNode } from "react";

import { APP_SHELL_MAX_WIDTH } from "@/lib/appContentWidth";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative mx-auto flex h-dvh max-h-dvh w-full min-w-0 flex-col overflow-hidden"
      style={
        {
          maxWidth: APP_SHELL_MAX_WIDTH,
          width: "100%",
          "--shell-max-width": `${APP_SHELL_MAX_WIDTH}px`,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}
