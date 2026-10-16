"use client";

import {
  Heart,
  HeartFilled,
  LayoutGrid,
  LayoutGridFilled,
  Pencil,
  Shirt,
  ShirtFilled,
  Trash2,
  X,
} from "@/components/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useLayoutEffect,
  useRef,
  useState,
  type ComponentType,
  type Ref,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { LucideProps } from "lucide-react";

import { useFloatingNav } from "@/contexts/FloatingNavContext";
import { Icon } from "@/components/ui/Icon";
import {
  navMorphTransition,
  navPillTransition,
} from "@/lib/motion";
import { FLOATING_NAV_IOS_LIFT } from "@/lib/navLayout";

type NavIcon = ComponentType<LucideProps>;

type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
  activeIcon: NavIcon;
  match: (pathname: string) => boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "OOTD",
    icon: Shirt,
    activeIcon: ShirtFilled,
    match: (pathname) => pathname === "/",
  },
  {
    href: "/inventory",
    label: "Inventory",
    icon: LayoutGrid,
    activeIcon: LayoutGridFilled,
    match: (pathname) =>
      pathname === "/inventory" || pathname.startsWith("/inventory/"),
  },
  {
    href: "/favorites",
    label: "Favorites",
    icon: Heart,
    activeIcon: HeartFilled,
    match: (pathname) => pathname.startsWith("/favorites"),
  },
];

const NAV_ICON_SIZE = 18;

const REDUCED_MOTION = { duration: 0.12 };

function isDetailActionRoute(pathname: string): boolean {
  return (
    /^\/inventory\/[^/]+$/.test(pathname) ||
    /^\/favorites\/[^/]+(\/[^/]+)?$/.test(pathname)
  );
}

type TabButtonProps = {
  href: string;
  label: string;
  icon: NavIcon;
  activeIcon: NavIcon;
  active: boolean;
  ref?: Ref<HTMLAnchorElement>;
};

function TabButton({
  href,
  label,
  icon: TabIcon,
  activeIcon: TabActiveIcon,
  active,
  ref,
}: TabButtonProps) {
  const DisplayIcon = active ? TabActiveIcon : TabIcon;

  return (
    <Link
      ref={ref}
      href={href}
      className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full transition-[transform,color] duration-150 ease-out active:scale-[0.97] ${
        active ? "text-off-black" : "text-stone hover:text-off-black"
      }`}
      aria-current={active ? "page" : undefined}
      aria-label={label}
    >
      <Icon icon={DisplayIcon} size={NAV_ICON_SIZE} strokeWidth={1.5} />
    </Link>
  );
}

function IconActionButton({
  label,
  icon: ActionIcon,
  onClick,
  disabled = false,
}: {
  label: string;
  icon: typeof Pencil;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-full text-off-black transition-[transform,background-color,color] duration-150 ease-out hover:bg-stone/10 active:scale-[0.97] disabled:opacity-40"
    >
      <Icon icon={ActionIcon} size={20} strokeWidth={1.75} />
    </button>
  );
}

function TabNav({ pathname }: { pathname: string }) {
  const shouldReduceMotion = useReducedMotion();
  const tabListRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [indicator, setIndicator] = useState<{
    x: number;
    width: number;
  } | null>(null);

  const activeIndex = NAV_ITEMS.findIndex((item) => item.match(pathname));

  useLayoutEffect(() => {
    const list = tabListRef.current;
    if (!list || activeIndex < 0) return;

    const update = () => {
      const activeTab = tabRefs.current[activeIndex];
      if (!activeTab) return;
      setIndicator({
        x: activeTab.offsetLeft,
        width: activeTab.offsetWidth,
      });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(list);
    return () => observer.disconnect();
  }, [activeIndex, pathname]);

  return (
    <div ref={tabListRef} className="relative flex items-center gap-1.5">
      {activeIndex >= 0 && indicator && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute top-0 h-10 rounded-full bg-stone/10"
          initial={false}
          animate={{
            x: indicator.x,
            width: indicator.width,
          }}
          transition={shouldReduceMotion ? REDUCED_MOTION : navPillTransition}
        />
      )}

      {NAV_ITEMS.map((item, index) => (
        <TabButton
          key={item.href}
          ref={(node) => {
            tabRefs.current[index] = node;
          }}
          href={item.href}
          label={item.label}
          icon={item.icon}
          activeIcon={item.activeIcon}
          active={item.match(pathname)}
        />
      ))}
    </div>
  );
}

export default function FloatingNav() {
  const pathname = usePathname();
  const { itemActions, clearItemActions } = useFloatingNav();
  const shouldReduceMotion = useReducedMotion();

  const isDetailActions = isDetailActionRoute(pathname);
  const actionsReady = Boolean(itemActions);

  useLayoutEffect(() => {
    if (!isDetailActions) clearItemActions();
  }, [isDetailActions, clearItemActions]);

  const pillTransition = shouldReduceMotion ? REDUCED_MOTION : navPillTransition;
  const contentTransition = shouldReduceMotion
    ? REDUCED_MOTION
    : navMorphTransition;

  const contentInitial = { opacity: 0, transform: "scale(0.96)" };
  const contentAnimate = { opacity: 1, transform: "scale(1)" };
  const contentExit = { opacity: 0, transform: "scale(0.97)" };

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 md:pb-4"
      style={{
        paddingBottom: `calc(0.75rem + env(safe-area-inset-bottom) + ${FLOATING_NAV_IOS_LIFT})`,
      }}
    >
      <motion.nav
        layout
        aria-label={isDetailActions ? "Detail actions" : "Main navigation"}
        transition={pillTransition}
        className="pointer-events-auto flex items-center gap-1.5 overflow-hidden rounded-full border border-stone/12 bg-white/97 px-2 py-1.5 shadow-[0_2px_16px_rgba(0,0,0,0.1)] backdrop-blur-xl backdrop-saturate-150"
      >
        <AnimatePresence mode="wait" initial={false}>
          {isDetailActions ? (
            <motion.div
              key="item-actions"
              layout="position"
              initial={shouldReduceMotion ? { opacity: 0 } : contentInitial}
              animate={shouldReduceMotion ? { opacity: 1 } : contentAnimate}
              exit={shouldReduceMotion ? { opacity: 0 } : contentExit}
              transition={contentTransition}
              className="flex items-center gap-1.5"
            >
              <IconActionButton
                label={itemActions?.editing ? "Cancel editing" : "Edit"}
                icon={itemActions?.editing ? X : Pencil}
                onClick={() =>
                  itemActions?.editing
                    ? itemActions.onCancel?.()
                    : itemActions?.onEdit()
                }
                disabled={!actionsReady}
              />
              <IconActionButton
                label="Delete"
                icon={Trash2}
                onClick={() => itemActions?.onDelete()}
                disabled={!actionsReady}
              />
            </motion.div>
          ) : (
            <motion.div
              key="tabs"
              layout="position"
              initial={shouldReduceMotion ? { opacity: 0 } : contentInitial}
              animate={shouldReduceMotion ? { opacity: 1 } : contentAnimate}
              exit={shouldReduceMotion ? { opacity: 0 } : contentExit}
              transition={contentTransition}
            >
              <TabNav pathname={pathname} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>
    </div>
  );
}
