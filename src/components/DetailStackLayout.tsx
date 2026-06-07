"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  usePathname,
  useRouter,
  useSelectedLayoutSegments,
} from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { useDrawerNavigation } from "@/contexts/DrawerNavigationContext";
import { APP_SHELL_MAX_WIDTH } from "@/lib/appContentWidth";
import {
  DRAWER_SHEET_MS,
  drawerClosed,
  drawerOpen,
  listUnderlay,
  sheetTransition,
} from "@/lib/motion";
import { isDrawerPath } from "@/lib/navigation";

interface DetailStackLayoutProps {
  list: ReactNode;
  detail: ReactNode;
  rootPath: string;
}

function drawerDepth(pathname: string, rootPath: string): number {
  const pathParts = pathname.split("/").filter(Boolean).length;
  const rootParts = rootPath.split("/").filter(Boolean).length;
  return pathParts - rootParts;
}

function hasDetailContent(detail: ReactNode): boolean {
  return detail != null && detail !== false;
}

export function DetailStackLayout({
  list,
  detail,
  rootPath,
}: DetailStackLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const listSegments = useSelectedLayoutSegments();
  const detailSegments = useSelectedLayoutSegments("detail");
  const shouldReduceMotion = useReducedMotion();
  const { registerDismissHandler, setOverlayActive } = useDrawerNavigation();

  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const detailRef = useRef(detail);
  const finishingRef = useRef(false);

  if (hasDetailContent(detail)) {
    detailRef.current = detail;
  }

  const depth = drawerDepth(pathname, rootPath);
  const listDepth = listSegments.length;

  const isSoftOverlay =
    isDrawerPath(pathname, rootPath) &&
    detailSegments.length > 0 &&
    depth > listDepth;

  const overlayContent =
    (isSoftOverlay && detail) || (pendingHref && detailRef.current) || null;
  const isClosing = Boolean(pendingHref);
  const showOverlay = Boolean(overlayContent) && (isSoftOverlay || isClosing);
  const listDimmed = isSoftOverlay && !isClosing;

  // Next.js requires every parallel slot to stay mounted. When the main slot
  // already resolved the drawer page, keep @detail in the tree but hidden.
  const hideDuplicateDetail =
    hasDetailContent(detail) && !showOverlay && depth <= listDepth;

  useEffect(() => {
    setOverlayActive(isSoftOverlay);
    return () => setOverlayActive(false);
  }, [isSoftOverlay, setOverlayActive]);

  const completeDismiss = useCallback(
    (href: string) => {
      if (shouldReduceMotion || !isSoftOverlay) {
        router.push(href);
        return;
      }
      finishingRef.current = false;
      setPendingHref(href);
    },
    [isSoftOverlay, router, shouldReduceMotion],
  );

  useEffect(() => {
    registerDismissHandler(completeDismiss);
    return () => registerDismissHandler(null);
  }, [completeDismiss, registerDismissHandler]);

  const finishDismiss = useCallback(() => {
    if (!pendingHref || finishingRef.current) return;
    finishingRef.current = true;
    const href = pendingHref;
    setPendingHref(null);
    router.push(href);
  }, [pendingHref, router]);

  useEffect(() => {
    if (!pendingHref) return;
    const timer = window.setTimeout(finishDismiss, DRAWER_SHEET_MS + 40);
    return () => window.clearTimeout(timer);
  }, [pendingHref, finishDismiss]);

  const listBody = listDimmed ? (
    <motion.div
      className="min-h-full"
      initial={false}
      animate={listUnderlay}
      transition={sheetTransition}
    >
      {list}
    </motion.div>
  ) : (
    <div className="min-h-full">{list}</div>
  );

  if (shouldReduceMotion) {
    return (
      <>
        {list}
        {hideDuplicateDetail ? (
          <div hidden aria-hidden>
            {detail}
          </div>
        ) : (
          detail
        )}
      </>
    );
  }

  return (
    <div className="relative min-h-full min-w-0 flex-1">
      {listBody}

      {!showOverlay && hideDuplicateDetail ? (
        <div hidden aria-hidden>
          {detail}
        </div>
      ) : null}

      <AnimatePresence initial={false} mode="sync">
        {showOverlay && overlayContent ? (
          <div className="pointer-events-none fixed inset-0 z-20 flex justify-center">
            <motion.div
              key={pathname}
              className="pointer-events-auto flex h-full flex-col overflow-hidden bg-background"
              style={{
                width: "100%",
                maxWidth: APP_SHELL_MAX_WIDTH,
                willChange: "transform",
              }}
              initial={drawerClosed}
              animate={isClosing ? drawerClosed : drawerOpen}
              exit={drawerClosed}
              transition={sheetTransition}
              onAnimationComplete={() => {
                if (isClosing && pendingHref) {
                  finishDismiss();
                }
              }}
            >
              {overlayContent}
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
