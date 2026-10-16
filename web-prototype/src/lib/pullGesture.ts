import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";

/** Locks page scroll while a pull gesture is active (prevents rubber-banding on iOS). */
export function lockPageScrollWhileDragging(active: boolean): void {
  if (typeof document === "undefined") return;

  const { body } = document;
  if (active) {
    body.dataset.pullGestureLock = "1";
    body.style.overscrollBehavior = "none";
    body.style.touchAction = "none";
  } else if (body.dataset.pullGestureLock) {
    delete body.dataset.pullGestureLock;
    body.style.overscrollBehavior = "";
    body.style.touchAction = "";
  }
}

const INTERACTIVE_SELECTOR =
  "button, input, select, textarea, label, [role='button'], [contenteditable='true']";

export function isInteractivePullTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(target.closest(INTERACTIVE_SELECTOR));
}

type PullGestureConfig = {
  enabled?: boolean;
  threshold?: number;
  slop?: number;
  applyResistance: (delta: number) => number;
  onTrigger: () => void;
  canStart?: () => boolean;
  onThresholdCross?: () => void;
};

type PullGestureBindings = {
  pull: number;
  dragging: boolean;
  rootRef: RefObject<HTMLDivElement | null>;
  onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
};

export function usePullGesture({
  enabled = true,
  threshold = 72,
  slop = 10,
  applyResistance,
  onTrigger,
  canStart,
  onThresholdCross,
}: PullGestureConfig): PullGestureBindings {
  const rootRef = useRef<HTMLDivElement>(null);
  const [pull, setPull] = useState(0);
  const [dragging, setDragging] = useState(false);

  const pullRef = useRef(0);
  const startYRef = useRef(0);
  const startXRef = useRef(0);
  const activeRef = useRef(false);
  const pendingRef = useRef(false);
  const crossedRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);

  useEffect(() => {
    lockPageScrollWhileDragging(dragging);
    return () => lockPageScrollWhileDragging(false);
  }, [dragging]);

  const resetGesture = useCallback(() => {
    activeRef.current = false;
    pendingRef.current = false;
    crossedRef.current = false;
    pointerIdRef.current = null;
    setDragging(false);
  }, []);

  const releaseCapture = useCallback((pointerId: number | null) => {
    const root = rootRef.current;
    if (!root || pointerId === null) return;
    if (root.hasPointerCapture(pointerId)) {
      root.releasePointerCapture(pointerId);
    }
  }, []);

  const updatePull = useCallback(
    (clientY: number) => {
      const delta = clientY - startYRef.current;
      if (delta <= 2) return;

      const next = applyResistance(delta);
      pullRef.current = next;
      setPull(next);

      if (next >= threshold && !crossedRef.current) {
        crossedRef.current = true;
        onThresholdCross?.();
      }
    },
    [applyResistance, onThresholdCross, threshold],
  );

  const finishGesture = useCallback(() => {
    const currentPull = pullRef.current;
    const shouldTrigger = currentPull >= threshold;
    const didPull = activeRef.current && currentPull > slop;
    const pointerId = pointerIdRef.current;

    resetGesture();
    pullRef.current = 0;
    setPull(0);
    releaseCapture(pointerId);

    if (didPull) {
      const blockClick = (clickEvent: Event) => {
        clickEvent.preventDefault();
        clickEvent.stopPropagation();
      };
      document.addEventListener("click", blockClick, {
        capture: true,
        once: true,
      });
    }

    if (shouldTrigger) {
      onTrigger();
    }
  }, [onTrigger, releaseCapture, resetGesture, slop, threshold]);

  const cancelGesture = useCallback(() => {
    releaseCapture(pointerIdRef.current);
    resetGesture();
    pullRef.current = 0;
    setPull(0);
  }, [releaseCapture, resetGesture]);

  const handlePointerMove = useCallback(
    (clientX: number, clientY: number, pointerId: number) => {
      if (!pendingRef.current && !activeRef.current) return;

      const deltaY = clientY - startYRef.current;
      const deltaX = clientX - startXRef.current;

      if (pendingRef.current && !activeRef.current) {
        if (canStart && !canStart()) {
          pendingRef.current = false;
          releaseCapture(pointerId);
          pointerIdRef.current = null;
          return;
        }

        if (deltaY > slop && deltaY > Math.abs(deltaX)) {
          activeRef.current = true;
          pendingRef.current = false;
          setDragging(true);
          updatePull(clientY);
          return;
        }

        if (Math.abs(deltaX) > slop || deltaY < -slop) {
          pendingRef.current = false;
          releaseCapture(pointerId);
          pointerIdRef.current = null;
        }
        return;
      }

      if (!activeRef.current) return;

      if (deltaY > 0) {
        updatePull(clientY);
      }
    },
    [canStart, releaseCapture, slop, updatePull],
  );

  useEffect(() => {
    if (!enabled) return;

    const onWindowPointerMove = (event: PointerEvent) => {
      if (pointerIdRef.current !== event.pointerId) return;
      if (!pendingRef.current && !activeRef.current) return;

      if (activeRef.current) {
        event.preventDefault();
      }

      handlePointerMove(event.clientX, event.clientY, event.pointerId);
    };

    const onWindowPointerEnd = (event: PointerEvent) => {
      if (pointerIdRef.current !== event.pointerId) return;

      if (pendingRef.current && !activeRef.current) {
        pendingRef.current = false;
        releaseCapture(event.pointerId);
        pointerIdRef.current = null;
        return;
      }

      if (!activeRef.current) return;
      finishGesture();
    };

    window.addEventListener("pointermove", onWindowPointerMove, {
      passive: false,
    });
    window.addEventListener("pointerup", onWindowPointerEnd);
    window.addEventListener("pointercancel", onWindowPointerEnd);

    return () => {
      window.removeEventListener("pointermove", onWindowPointerMove);
      window.removeEventListener("pointerup", onWindowPointerEnd);
      window.removeEventListener("pointercancel", onWindowPointerEnd);
    };
  }, [enabled, finishGesture, handlePointerMove, releaseCapture]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!enabled || event.button !== 0) return;
      if (isInteractivePullTarget(event.target)) return;
      if (canStart && !canStart()) return;

      pendingRef.current = true;
      crossedRef.current = false;
      pointerIdRef.current = event.pointerId;
      startYRef.current = event.clientY;
      startXRef.current = event.clientX;

      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [canStart, enabled],
  );

  return {
    pull,
    dragging,
    rootRef,
    onPointerDown,
  };
}
