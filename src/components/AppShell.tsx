import type { CSSProperties, ReactNode } from "react";

import { APP_SHELL_MAX_WIDTH } from "@/lib/appContentWidth";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div
      className="relative mx-auto flex min-h-full w-full min-w-0 flex-col"
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
