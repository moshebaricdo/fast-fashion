export const spring = { type: "spring" as const, duration: 0.34, bounce: 0.16 };

export function tick(ms = 12) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* iOS Safari has no vibrate */
  }
}

export function stopped(target: EventTarget | null): boolean {
  return Boolean((target as HTMLElement | null)?.closest?.("[data-gesture-stop]"));
}
