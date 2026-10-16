"use client";

import { useEffect, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ClothingCard } from "@/components/ClothingCard/ClothingCard";
import { itemMatchesPurpose } from "@/lib/shuffleOutfit";
import type { ClothingItem, Purpose, SlotKey } from "@/types/wardrobe";
import { PURPOSE_LABELS, SLOT_LABELS } from "@/types/wardrobe";

interface ItemPickerProps {
  open: boolean;
  slot: SlotKey | null;
  purpose: Purpose;
  items: ClothingItem[];
  selectedId?: string | null;
  onClose: () => void;
  onSelect: (item: ClothingItem) => void;
}

const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const EASE_DRAWER = [0.32, 0.72, 0, 1] as const;

function PickerPanel({
  slot,
  purpose,
  filteredItems,
  selectedId,
  onClose,
  onSelect,
}: {
  slot: SlotKey;
  purpose: Purpose;
  filteredItems: ClothingItem[];
  selectedId?: string | null;
  onClose: () => void;
  onSelect: (item: ClothingItem) => void;
}) {
  return (
    <>
      <div className="mx-auto mt-3 h-1 w-10 rounded-full bg-stone/40 md:hidden" />

      <header className="border-b border-stone/20 px-5 pb-4 pt-4 md:pt-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-taupe">
              Choose {SLOT_LABELS[slot].toLowerCase()}
            </p>
            <h2
              id="item-picker-title"
              className="mt-0.5 text-xl font-semibold text-off-black"
            >
              {PURPOSE_LABELS[purpose]} picks
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone/15 text-taupe transition-[transform,background-color] duration-150 ease-out hover:bg-stone/25 active:scale-[0.97]"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path
                d="M3 3l8 8M11 3l-8 8"
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <p className="mt-2 text-sm text-taupe">
          Showing {filteredItems.length} items for this slot and purpose.
        </p>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {filteredItems.length === 0 ? (
          <p className="py-8 text-center text-sm text-taupe">
            No items match this slot and purpose yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3 pb-4">
            {filteredItems.map((item) => (
              <ClothingCard
                key={item.id}
                item={item}
                compact
                selected={item.id === selectedId}
                onClick={() => {
                  onSelect(item);
                  onClose();
                }}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

export function ItemPicker({
  open,
  slot,
  purpose,
  items,
  selectedId,
  onClose,
  onSelect,
}: ItemPickerProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const filteredItems = useMemo(() => {
    if (!slot) return [];
    const category = slot === "layer" ? "top" : slot;

    return items.filter(
      (item) =>
        item.category === category &&
        itemMatchesPurpose(item.purpose, purpose),
    );
  }, [items, slot, purpose]);

  return (
    <AnimatePresence>
      {open && slot && (
        <>
          <motion.button
            type="button"
            aria-label="Close picker"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-off-black/40 backdrop-blur-[2px]"
          />

          {/* Mobile bottom sheet */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="item-picker-title"
            initial={{ opacity: 0, transform: "translateY(100%)" }}
            animate={{ opacity: 1, transform: "translateY(0)" }}
            exit={{ opacity: 0, transform: "translateY(100%)" }}
            transition={{ duration: 0.28, ease: EASE_DRAWER }}
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85vh] flex-col rounded-t-3xl bg-white shadow-2xl md:hidden"
          >
            <PickerPanel
              slot={slot}
              purpose={purpose}
              filteredItems={filteredItems}
              selectedId={selectedId}
              onClose={onClose}
              onSelect={onSelect}
            />
          </motion.div>

          {/* Desktop centered modal */}
          <div className="fixed inset-0 z-50 hidden items-center justify-center p-6 md:flex">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="item-picker-title"
              initial={{ opacity: 0, transform: "scale(0.95)" }}
              animate={{ opacity: 1, transform: "scale(1)" }}
              exit={{ opacity: 0, transform: "scale(0.97)" }}
              transition={{ duration: 0.22, ease: EASE_OUT }}
              className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl bg-white shadow-2xl"
            >
              <PickerPanel
                slot={slot}
                purpose={purpose}
                filteredItems={filteredItems}
                selectedId={selectedId}
                onClose={onClose}
                onSelect={onSelect}
              />
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
