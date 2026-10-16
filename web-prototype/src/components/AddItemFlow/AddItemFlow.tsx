"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { v4 as uuidv4 } from "uuid";
import { tagClothing } from "@/lib/ai/tagClient";
import { saveItem, updateItem } from "@/lib/storage";
import type {
  Category,
  ClothingItem,
  ClothingTagSuggestion,
  Color,
  Purpose,
  Subcategory,
} from "@/types/wardrobe";
import {
  CATEGORIES,
  COLORS,
  PURPOSES,
  PURPOSE_LABELS,
  SLOT_LABELS,
  SUBCATEGORIES,
} from "@/types/wardrobe";

type FlowStep = "upload" | "tagging" | "review";

interface AddItemFlowProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  mode?: "add" | "retag";
  existingItem?: ClothingItem;
}

const DEFAULT_TAGS: ClothingTagSuggestion = {
  name: "",
  category: "top",
  subcategory: "t-shirt",
  color: "other",
  purpose: "casual",
  confidence: 0,
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read image"));
    reader.readAsDataURL(file);
  });
}

interface ReviewFormProps {
  imageUrl: string;
  tags: ClothingTagSuggestion;
  aiFailed: boolean;
  isRetagging: boolean;
  onChange: (tags: ClothingTagSuggestion) => void;
  onRetag: () => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}

function ReviewForm({
  imageUrl,
  tags,
  aiFailed,
  isRetagging,
  onChange,
  onRetag,
  onSave,
  onCancel,
  saving,
}: ReviewFormProps) {
  const set = <K extends keyof ClothingTagSuggestion>(
    key: K,
    value: ClothingTagSuggestion[K]
  ) => onChange({ ...tags, [key]: value });

  return (
    <div className="flex flex-col gap-5 sm:flex-row">
      <div className="mx-auto w-full max-w-[200px] shrink-0 overflow-hidden rounded-2xl border border-stone/20 bg-cream sm:mx-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt="Clothing preview"
          className="aspect-[4/5] w-full object-cover"
        />
      </div>

      <div className="flex flex-1 flex-col gap-4">
        {aiFailed && (
          <p className="rounded-xl border border-mushroom/40 bg-mushroom/10 px-3 py-2 text-sm text-espresso">
            AI tagging unavailable — fill in details manually.
          </p>
        )}

        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-espresso">
            Name
          </span>
          <input
            value={tags.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. washed brown jeans"
            className="rounded-xl border border-stone/25 bg-white px-3 py-2.5 text-off-black outline-none focus:border-olive/40"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-espresso">
              Category
            </span>
            <select
              value={tags.category}
              onChange={(e) => set("category", e.target.value as Category)}
              className="rounded-xl border border-stone/25 bg-white px-3 py-2.5 text-off-black outline-none focus:border-olive/40"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {SLOT_LABELS[c]}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-espresso">
              Subcategory
            </span>
            <select
              value={tags.subcategory}
              onChange={(e) =>
                set("subcategory", e.target.value as Subcategory)
              }
              className="rounded-xl border border-stone/25 bg-white px-3 py-2.5 text-off-black outline-none focus:border-olive/40"
            >
              {SUBCATEGORIES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-espresso">
              Color
            </span>
            <select
              value={tags.color}
              onChange={(e) => set("color", e.target.value as Color)}
              className="rounded-xl border border-stone/25 bg-white px-3 py-2.5 text-off-black outline-none focus:border-olive/40"
            >
              {COLORS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-espresso">
              Purpose
            </span>
            <select
              value={tags.purpose}
              onChange={(e) => set("purpose", e.target.value as Purpose)}
              className="rounded-xl border border-stone/25 bg-white px-3 py-2.5 text-off-black outline-none focus:border-olive/40"
            >
              {PURPOSES.map((p) => (
                <option key={p} value={p}>
                  {PURPOSE_LABELS[p]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={onRetag}
            disabled={isRetagging}
            className="rounded-full border border-stone/30 px-4 py-2 text-sm text-taupe transition-transform duration-150 ease-out hover:border-mushroom hover:text-espresso active:scale-[0.97] disabled:opacity-50"
          >
            {isRetagging ? "Retagging…" : "Retag with AI"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full px-4 py-2 text-sm text-taupe transition-colors hover:text-espresso"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || !tags.name.trim()}
            className="ml-auto rounded-full bg-espresso px-5 py-2 text-sm font-medium text-cream transition-transform duration-150 ease-out hover:bg-off-black active:scale-[0.97] disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save to wardrobe"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function AddItemFlow({
  open,
  onClose,
  onSaved,
  mode = "add",
  existingItem,
}: AddItemFlowProps) {
  const shouldReduceMotion = useReducedMotion();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<FlowStep>("upload");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [tags, setTags] = useState<ClothingTagSuggestion>(DEFAULT_TAGS);
  const [aiFailed, setAiFailed] = useState(false);
  const [isRetagging, setIsRetagging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStep("upload");
    setImageUrl(null);
    setTags(DEFAULT_TAGS);
    setAiFailed(false);
    setIsRetagging(false);
    setSaving(false);
    setEditingId(null);
  }, []);

  const runTagging = useCallback(async (dataUrl: string) => {
    setStep("tagging");
    setIsRetagging(true);
    const result = await tagClothing(dataUrl);

    if (result.success && result.data) {
      setTags(result.data);
      setAiFailed(false);
    } else {
      setTags({ ...DEFAULT_TAGS, name: "" });
      setAiFailed(true);
    }

    setIsRetagging(false);
    setStep("review");
  }, []);

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }

    if (mode === "retag" && existingItem) {
      setImageUrl(existingItem.imageUrl);
      setEditingId(existingItem.id);
      setTags({
        name: existingItem.name,
        category: existingItem.category,
        subcategory: existingItem.subcategory,
        color: existingItem.color,
        purpose: existingItem.purpose,
        confidence: 1,
      });
      void runTagging(existingItem.imageUrl);
    }
  }, [open, mode, existingItem, reset, runTagging]);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const dataUrl = await fileToDataUrl(file);
    setImageUrl(dataUrl);
    setEditingId(null);
    await runTagging(dataUrl);
  };

  const handleSave = async () => {
    if (!imageUrl || !tags.name.trim()) return;
    setSaving(true);

    const item: ClothingItem = {
      id: editingId ?? uuidv4(),
      imageUrl,
      name: tags.name.trim(),
      category: tags.category,
      subcategory: tags.subcategory,
      color: tags.color,
      purpose: tags.purpose,
      createdAt: existingItem?.createdAt ?? new Date().toISOString(),
    };

    if (editingId) {
      const { id: _id, createdAt: _createdAt, ...updates } = item;
      updateItem(editingId, updates);
    } else {
      saveItem(item);
    }

    setSaving(false);
    onSaved();
    onClose();
  };

  const handleRetag = async () => {
    if (!imageUrl) return;
    await runTagging(imageUrl);
  };

  const title =
    mode === "retag"
      ? "Retag item"
      : step === "upload"
        ? "Add item"
        : "Review tags";

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-espresso/30 backdrop-blur-[2px]"
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-item-title"
            initial={{
              opacity: 0,
              transform: shouldReduceMotion
                ? "none"
                : "translateY(100%) scale(0.98)",
            }}
            animate={{ opacity: 1, transform: "translateY(0) scale(1)" }}
            exit={{
              opacity: 0,
              transform: shouldReduceMotion
                ? "none"
                : "translateY(100%) scale(0.98)",
            }}
            transition={{
              duration: shouldReduceMotion ? 0 : 0.28,
              ease: [0.32, 0.72, 0, 1],
            }}
            className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-stone/20 bg-cream shadow-2xl sm:rounded-3xl"
          >
            <div className="flex items-center justify-between border-b border-stone/15 px-5 py-4">
              <h2
                id="add-item-title"
                className="font-display text-xl text-off-black"
              >
                {title}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full p-2 text-taupe transition-colors hover:bg-stone/10 hover:text-espresso"
                aria-label="Close dialog"
              >
                <svg viewBox="0 0 20 20" className="h-5 w-5" fill="currentColor">
                  <path d="M5.3 5.3a1 1 0 011.4 0L10 8.6l3.3-3.3a1 1 0 111.4 1.4L11.4 10l3.3 3.3a1 1 0 01-1.4 1.4L10 11.4l-3.3 3.3a1 1 0 01-1.4-1.4L8.6 10 5.3 6.7a1 1 0 010-1.4z" />
                </svg>
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-5">
              {step === "upload" && mode === "add" && (
                <div className="flex flex-col items-center gap-4 py-6 text-center">
                  <div className="flex h-24 w-24 items-center justify-center rounded-3xl border border-dashed border-stone/35 bg-white/60">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-10 w-10 text-mushroom"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path
                        d="M12 16V4m0 0l-4 4m4-4l4 4M4 20h16"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-display text-lg text-off-black">
                      Upload a photo
                    </p>
                    <p className="mt-1 text-sm text-taupe">
                      We&apos;ll suggest tags — you can edit before saving.
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleFile(file);
                      e.target.value = "";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-full bg-espresso px-6 py-3 text-sm font-medium text-cream transition-transform duration-150 ease-out active:scale-[0.97]"
                  >
                    Choose image
                  </button>
                </div>
              )}

              {step === "tagging" && (
                <div className="flex flex-col items-center gap-4 py-12">
                  {imageUrl && (
                    <div className="h-32 w-32 overflow-hidden rounded-2xl border border-stone/20">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrl}
                        alt=""
                        className="h-full w-full object-cover opacity-80"
                      />
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-taupe">
                    <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-stone/30 border-t-olive" />
                    Analyzing with AI…
                  </div>
                </div>
              )}

              {step === "review" && imageUrl && (
                <ReviewForm
                  imageUrl={imageUrl}
                  tags={tags}
                  aiFailed={aiFailed}
                  isRetagging={isRetagging}
                  onChange={setTags}
                  onRetag={() => void handleRetag()}
                  onSave={() => void handleSave()}
                  onCancel={onClose}
                  saving={saving}
                />
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
