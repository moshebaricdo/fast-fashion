"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import { v4 as uuid } from "uuid";
import { cropImageToSquare } from "@/lib/cropImage";
import { requestClothingTag } from "@/lib/tagClothingClient";
import type {
  ClothingCategory,
  ClothingColor,
  ClothingPurpose,
  ClothingSubcategory,
  PendingClothingItem,
  TagResult,
} from "@/types/wardrobe";
import {
  CLOTHING_CATEGORIES,
  CLOTHING_COLORS,
  CLOTHING_PURPOSES,
  SUBCATEGORIES_BY_CATEGORY,
} from "@/types/wardrobe";

type ReviewStatus = "pending" | "tagging" | "tagged" | "failed" | "manual";

interface ReviewItem {
  id: string;
  file: File;
  previewUrl: string;
  status: ReviewStatus;
  tag: TagResult;
  error?: string;
}

export interface BulkUploadReviewProps {
  files: File[];
  open: boolean;
  onClose: () => void;
  onConfirm: (items: PendingClothingItem[]) => void;
}

const LOW_CONFIDENCE_THRESHOLD = 0.6;

const EMPTY_TAG: TagResult = {
  name: "",
  category: "top",
  subcategory: "t-shirt",
  color: "black",
  purpose: "casual",
  confidence: 0,
};

function createReviewItem(file: File): ReviewItem {
  return {
    id: uuid(),
    file,
    previewUrl: URL.createObjectURL(file),
    status: "pending",
    tag: { ...EMPTY_TAG },
  };
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1 block text-sm font-medium text-stone-700">
      {children}
    </label>
  );
}

function SelectField<T extends string>({
  value,
  options,
  onChange,
  disabled,
}: {
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value as T)}
      className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 outline-none transition focus:border-stone-400 disabled:opacity-60"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function ReviewRow({
  item,
  onChange,
  onRetag,
}: {
  item: ReviewItem;
  onChange: (id: string, tag: TagResult) => void;
  onRetag: (id: string) => void;
}) {
  const subcategoryOptions = SUBCATEGORIES_BY_CATEGORY[item.tag.category];
  const isLoading = item.status === "tagging" || item.status === "pending";
  const showManualFallback = item.status === "failed" || item.status === "manual";
  const isLowConfidence =
    item.status === "tagged" &&
    item.tag.confidence > 0 &&
    item.tag.confidence < LOW_CONFIDENCE_THRESHOLD;

  const update = (patch: Partial<TagResult>) => {
    onChange(item.id, { ...item.tag, ...patch });
  };

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="rounded-2xl border border-stone-200/80 bg-[#faf8f5] p-4 shadow-[0_1px_0_rgba(28,25,23,0.04)]"
    >
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative h-36 w-full shrink-0 overflow-hidden rounded-xl bg-stone-100 sm:h-32 sm:w-28">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.previewUrl}
            alt={item.tag.name || item.file.name}
            className="h-full w-full object-cover"
          />
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-stone-900/35 backdrop-blur-[1px]">
              <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-stone-700">
                Tagging…
              </span>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          {showManualFallback && (
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-sm text-amber-900">
              AI tagging unavailable — fill in details manually or retry.
              {item.error ? (
                <span className="mt-1 block text-xs text-amber-800/80">
                  {item.error}
                </span>
              ) : null}
            </div>
          )}

          {isLowConfidence && (
            <div className="rounded-xl border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-sm text-amber-900">
              Low confidence — please review tags before saving.
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FieldLabel>Name</FieldLabel>
              <input
                type="text"
                value={item.tag.name}
                placeholder="e.g. washed brown jeans"
                onChange={(event) => update({ name: event.target.value })}
                className="w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900 outline-none transition focus:border-stone-400"
              />
            </div>

            <div>
              <FieldLabel>Category</FieldLabel>
              <SelectField
                value={item.tag.category}
                options={CLOTHING_CATEGORIES}
                onChange={(category: ClothingCategory) => {
                  const nextSubcategory = SUBCATEGORIES_BY_CATEGORY[category][0];
                  update({ category, subcategory: nextSubcategory });
                }}
              />
            </div>

            <div>
              <FieldLabel>Subcategory</FieldLabel>
              <SelectField
                value={item.tag.subcategory}
                options={subcategoryOptions}
                onChange={(subcategory: ClothingSubcategory) =>
                  update({ subcategory })
                }
              />
            </div>

            <div>
              <FieldLabel>Color</FieldLabel>
              <SelectField
                value={item.tag.color}
                options={CLOTHING_COLORS}
                onChange={(color: ClothingColor) => update({ color })}
              />
            </div>

            <div>
              <FieldLabel>Purpose</FieldLabel>
              <SelectField
                value={item.tag.purpose}
                options={CLOTHING_PURPOSES}
                onChange={(purpose: ClothingPurpose) => update({ purpose })}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => onRetag(item.id)}
              disabled={isLoading}
              className="rounded-full border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 transition hover:border-stone-400 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Retag with AI
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

export function BulkUploadReview({
  files,
  open,
  onClose,
  onConfirm,
}: BulkUploadReviewProps) {
  const [items, setItems] = useState<ReviewItem[]>([]);

  const tagItem = useCallback(async (id: string, file: File) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? { ...item, status: "tagging", error: undefined }
          : item,
      ),
    );

    try {
      const { tag } = await requestClothingTag(file);
      setItems((current) =>
        current.map((item) =>
          item.id === id ? { ...item, status: "tagged", tag } : item,
        ),
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Tagging failed";
      setItems((current) =>
        current.map((item) =>
          item.id === id
            ? {
                ...item,
                status: "manual",
                tag: { ...EMPTY_TAG },
                error: message,
              }
            : item,
        ),
      );
    }
  }, []);

  useEffect(() => {
    if (!open || files.length === 0) return;

    const nextItems = files.map(createReviewItem);
    setItems(nextItems);

    void Promise.all(
      nextItems.map((item) => tagItem(item.id, item.file)),
    );
  }, [files, open, tagItem]);

  const revokePreviewUrls = useCallback((entries: ReviewItem[]) => {
    entries.forEach((item) => URL.revokeObjectURL(item.previewUrl));
  }, []);

  const readyCount = useMemo(
    () =>
      items.filter(
        (item) =>
          item.status === "tagged" ||
          item.status === "manual" ||
          item.status === "failed",
      ).length,
    [items],
  );

  const canSave =
    items.length > 0 &&
    readyCount === items.length &&
    items.every((item) => item.tag.name.trim().length > 0);

  const isTagging = items.some(
    (item) => item.status === "tagging" || item.status === "pending",
  );

  const handleChange = (id: string, tag: TagResult) => {
    setItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              tag,
              status: item.status === "tagged" ? "tagged" : "manual",
            }
          : item,
      ),
    );
  };

  const handleClose = () => {
    revokePreviewUrls(items);
    onClose();
  };

  const handleConfirm = async () => {
    if (!canSave) return;

    const pending = await Promise.all(
      items.map(async (item) => ({
        imageUrl: await cropImageToSquare(item.file),
        name: item.tag.name.trim(),
        category: item.tag.category,
        subcategory: item.tag.subcategory,
        color: item.tag.color,
        purpose: item.tag.purpose,
      })),
    );

    onConfirm(pending);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
      <motion.button
        type="button"
        aria-label="Close bulk upload review"
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
      />

      <motion.section
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-upload-title"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
        className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-stone-200 bg-[#f7f4ef] shadow-2xl sm:rounded-3xl"
      >
        <header className="border-b border-stone-200/80 px-5 py-4">
          <h2
            id="bulk-upload-title"
            className="font-serif text-2xl text-stone-900"
          >
            Review & edit tags
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            {items.length} item{items.length === 1 ? "" : "s"} — nothing saves
            until you confirm.
          </p>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          <AnimatePresence initial={false}>
            {items.map((item) => (
              <ReviewRow
                key={item.id}
                item={item}
                onChange={handleChange}
                onRetag={(id) => {
                  const target = items.find((entry) => entry.id === id);
                  if (target) void tagItem(id, target.file);
                }}
              />
            ))}
          </AnimatePresence>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-stone-200/80 bg-[#f3efe8] px-5 py-4">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full px-4 py-2 text-sm font-medium text-stone-600 transition hover:bg-stone-200/60"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={!canSave || isTagging}
            className="rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-[#f7f4ef] transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-45"
          >
            {isTagging
              ? "Tagging items…"
              : `Save ${items.length} item${items.length === 1 ? "" : "s"}`}
          </button>
        </footer>
      </motion.section>
    </div>
  );
}
