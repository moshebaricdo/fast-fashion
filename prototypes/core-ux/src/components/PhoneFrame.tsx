import { useEffect, type ReactNode } from "react";
import { useStudio } from "../studio";
import { DebugPanel } from "./DebugPanel";

export function PhoneFrame({ children }: { children: ReactNode }) {
  const { toggleDebug } = useStudio();

  useEffect(() => {
    const active = new Set<number>();
    const down = (event: PointerEvent) => {
      active.add(event.pointerId);
      if (active.size >= 3) toggleDebug();
    };
    const up = (event: PointerEvent) => active.delete(event.pointerId);
    window.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [toggleDebug]);

  return (
    <div className="stage">
      <div className="device">
        {children}
        <DebugPanel />
      </div>
    </div>
  );
}
