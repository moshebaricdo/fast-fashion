"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Plus, X } from "@/components/icons";
import { requestClothingTag } from "@/lib/tagClothingClient";
import type { PendingClothingItem, TagResult } from "@/types/wardrobe";
import { useCallback, useEffect, useRef, useState } from "react";
import { cropImageToSquare } from "@/lib/cropImage";

export type UploadStagingPhase = "staging" | "analyzing" | "success";

export interface UploadStagingPanelProps {
  files: File[];
  open: boolean;
  onClose: () => void;
  onSaved: (items: PendingClothingItem[]) => void;
  onAddMore: (files: File[]) => void;
  onLockChange?: (locked: boolean) => void;
  onPhaseChange?: (phase: UploadStagingPhase) => void;
  onRegisterHeaderAction?: (action: () => void) => void;
  /** When true, dismiss/abort is handled by the toolbar header button */
  cancelViaHeader?: boolean;
}

type FlowPhase = UploadStagingPhase;

type AnalysisStatus = "idle" | "analyzing" | "done" | "failed";

interface StagedFile {
  id: string;
  file: File;
  previewUrl: string;
  imageDataUrl?: string;
  analysisStatus: AnalysisStatus;
  tag?: TagResult;
}

const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const SUCCESS_AUTO_CLOSE_MS = 2000;

const FALLBACK_TAG: TagResult = {
  name: "",
  category: "top",
  subcategory: "t-shirt",
  color: "black",
  purpose: "casual",
  confidence: 0,
};

const TILE_CLASS = "relative size-11 shrink-0 overflow-hidden rounded-lg";
const PRIMARY_BUTTON =
  "w-full rounded-full bg-off-black px-3 py-2.5 text-sm font-medium text-white transition-[transform,opacity] duration-150 hover:bg-off-black/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40";

function createStagedFile(file: File): StagedFile {
  return {
    id: crypto.randomUUID(),
    file,
    previewUrl: URL.createObjectURL(file),
    analysisStatus: "idle",
  };
}

function fallbackName(file: File): string {
  const base = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ").trim();
  return base || "New item";
}

function ImageTile({
  entry,
  phase,
  shimmerDelay,
  onRemove,
}: {
  entry: StagedFile;
  phase: FlowPhase;
  shimmerDelay?: number;
  onRemove?: (id: string) => void;
}) {
  const showShimmer =
    phase === "analyzing" && entry.analysisStatus === "analyzing";
  const showCheck =
    phase === "success" ||
    (phase === "analyzing" && entry.analysisStatus === "done");

  return (
    <div className={`${TILE_CLASS} bg-stone/8 ring-1 ring-stone/10`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={entry.previewUrl}
        alt=""
        className="h-full w-full object-cover"
      />

      {showShimmer && (
        <div
          className="ai-image-shimmer absolute inset-0"
          style={
            shimmerDelay
              ? ({
                  ["--shimmer-delay" as string]: `${shimmerDelay}ms`,
                } as React.CSSProperties)
              : undefined
          }
          aria-hidden="true"
        />
      )}

      <AnimatePresence>
        {showCheck && (
          <motion.div
            key="check"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
            className="absolute inset-0 flex items-center justify-center bg-off-black/20"
            aria-hidden="true"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/95 text-olive shadow-sm">
              <Check size={11} strokeWidth={2.5} />
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {phase === "staging" && onRemove && (
        <button
          type="button"
          onClick={() => onRemove(entry.id)}
          className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-off-black/75 text-white"
          aria-label="Remove image"
        >
          <X size={10} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}

export function UploadStagingPanel({
  files,
  open,
  onClose,
  onSaved,
  onAddMore,
  onLockChange,
  onPhaseChange,
  onRegisterHeaderAction,
  cancelViaHeader = false,
}: UploadStagingPanelProps) {
  const addMoreRef = useRef<HTMLInputElement>(null);
  const analysisRunRef = useRef(0);
  const successTimerRef = useRef<number | null>(null);
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const [phase, setPhase] = useState<FlowPhase>("staging");
  const [savedCount, setSavedCount] = useState(0);

  const isLocked = phase === "analyzing" || phase === "success";

  const revokeAll = useCallback((entries: StagedFile[]) => {
    entries.forEach((entry) => URL.revokeObjectURL(entry.previewUrl));
  }, []);

  const reset = useCallback(() => {
    analysisRunRef.current += 1;
    if (successTimerRef.current !== null) {
      window.clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
    setPhase("staging");
    setSavedCount(0);
    setStaged((current) => {
      revokeAll(current);
      return [];
    });
  }, [revokeAll]);

  useEffect(() => {
    onLockChange?.(isLocked);
  }, [isLocked, onLockChange]);

  useEffect(() => {
    onPhaseChange?.(phase);
  }, [onPhaseChange, phase]);

  useEffect(() => {
    if (!open) {
      reset();
      return;
    }

    const images = files.filter((file) => file.type.startsWith("image/"));
    setStaged((current) => {
      revokeAll(current);
      return images.map(createStagedFile);
    });
    setPhase("staging");
    setSavedCount(0);
  }, [files, open, reset, revokeAll]);

  useEffect(
    () => () => {
      if (successTimerRef.current !== null) {
        window.clearTimeout(successTimerRef.current);
      }
    },
    [],
  );

  const handleClose = () => {
    if (isLocked) return;
    revokeAll(staged);
    setStaged([]);
    setPhase("staging");
    onClose();
  };

  const removeFile = (id: string) => {
    if (isLocked) return;
    setStaged((current) => {
      const target = current.find((entry) => entry.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((entry) => entry.id !== id);
    });
  };

  const handleAddMore = (fileList: FileList | null) => {
    if (!fileList?.length || isLocked) return;
    const images = Array.from(fileList).filter((file) =>
      file.type.startsWith("image/"),
    );
    if (images.length === 0) return;

    setStaged((current) => [...current, ...images.map(createStagedFile)]);
    onAddMore(images);

    if (addMoreRef.current) addMoreRef.current.value = "";
  };

  const buildPendingItems = useCallback(
    (entries: StagedFile[]): PendingClothingItem[] =>
      entries.map((entry) => {
        const tag = entry.tag ?? FALLBACK_TAG;
        const name = tag.name.trim() || fallbackName(entry.file);

        return {
          imageUrl: entry.imageDataUrl ?? entry.previewUrl,
          name,
          category: tag.category,
          subcategory: tag.subcategory,
          color: tag.color,
          purpose: tag.purpose,
        };
      }),
    [],
  );

  const runAnalysis = useCallback(
    async (entries: StagedFile[]) => {
      const runId = ++analysisRunRef.current;
      setPhase("analyzing");

      const withImages: StagedFile[] = [];
      for (const entry of entries) {
        if (runId !== analysisRunRef.current) return;
        try {
          const imageDataUrl = await cropImageToSquare(entry.file);
          withImages.push({ ...entry, imageDataUrl });
        } catch {
          withImages.push({ ...entry, imageDataUrl: entry.previewUrl });
        }
      }

      setStaged(
        withImages.map((entry) => ({
          ...entry,
          analysisStatus: "analyzing",
          tag: undefined,
        })),
      );

      const analyzed: StagedFile[] = [];
      for (const entry of withImages) {
        if (runId !== analysisRunRef.current) return;

        setStaged((current) =>
          current.map((item) =>
            item.id === entry.id
              ? { ...item, analysisStatus: "analyzing" }
              : item,
          ),
        );

        try {
          const { tag } = await requestClothingTag(entry.file);
          if (runId !== analysisRunRef.current) return;

          const nextEntry: StagedFile = {
            ...entry,
            analysisStatus: "done",
            tag,
          };
          analyzed.push(nextEntry);

          setStaged((current) =>
            current.map((item) => (item.id === entry.id ? nextEntry : item)),
          );
        } catch {
          if (runId !== analysisRunRef.current) return;

          const nextEntry: StagedFile = {
            ...entry,
            analysisStatus: "failed",
            tag: {
              ...FALLBACK_TAG,
              name: fallbackName(entry.file),
            },
          };
          analyzed.push(nextEntry);

          setStaged((current) =>
            current.map((item) => (item.id === entry.id ? nextEntry : item)),
          );
        }
      }

      if (runId !== analysisRunRef.current) return;

      const pending = buildPendingItems(analyzed);
      onSaved(pending);
      setSavedCount(pending.length);
      setPhase("success");

      successTimerRef.current = window.setTimeout(() => {
        if (runId !== analysisRunRef.current) return;
        revokeAll(analyzed);
        setStaged([]);
        setPhase("staging");
        onClose();
      }, SUCCESS_AUTO_CLOSE_MS);
    },
    [buildPendingItems, onClose, onSaved, revokeAll],
  );

  const handleConfirm = () => {
    if (staged.length === 0 || isLocked) return;
    void runAnalysis([...staged]);
  };

  const handleAbortAnalysis = () => {
    analysisRunRef.current += 1;
    if (successTimerRef.current !== null) {
      window.clearTimeout(successTimerRef.current);
      successTimerRef.current = null;
    }
    setPhase("staging");
    setSavedCount(0);
    setStaged((current) =>
      current.map((entry) => ({
        ...entry,
        analysisStatus: "idle",
        tag: undefined,
        imageDataUrl: undefined,
      })),
    );
  };

  useEffect(() => {
    if (!onRegisterHeaderAction) return;
    onRegisterHeaderAction(() => {
      if (phase === "analyzing") handleAbortAnalysis();
      else if (phase === "success") onClose();
      else if (phase === "staging") handleClose();
    });
  }, [onRegisterHeaderAction, onClose, phase, staged]);

  if (!open) return null;

  const savedLabel = savedCount === 1 ? "item" : "items";

  return (
    <div>
      <p className="text-base font-medium text-off-black">Add to wardrobe</p>

      {staged.length === 0 ? (
        <p className="mt-[18px] py-2 text-center text-sm text-taupe">
          No images selected. Choose photos to continue.
        </p>
      ) : (
        <div className="mt-[18px] flex flex-wrap gap-1.5">
          {staged.map((entry, index) => (
            <ImageTile
              key={entry.id}
              entry={entry}
              phase={phase}
              shimmerDelay={index * 180}
              onRemove={removeFile}
            />
          ))}

          {phase === "staging" && (
            <button
              type="button"
              onClick={() => addMoreRef.current?.click()}
              className={`${TILE_CLASS} flex items-center justify-center border border-dashed border-stone/30 text-taupe transition-[transform,border-color,color] duration-150 hover:border-stone/45 hover:text-off-black active:scale-[0.97]`}
              aria-label="Add more photos"
            >
              <Plus size={18} strokeWidth={1.75} />
            </button>
          )}
        </div>
      )}

      <AnimatePresence mode="wait" initial={false}>
        {phase === "staging" ? (
          <motion.div
            key="staging-footer"
            className="mt-5"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: EASE_OUT }}
          >
            <button
              type="button"
              onClick={handleConfirm}
              disabled={staged.length === 0}
              className={PRIMARY_BUTTON}
            >
              Add {staged.length > 0 ? staged.length : ""}{" "}
              {staged.length === 1 ? "item" : "items"}
            </button>
          </motion.div>
        ) : phase === "analyzing" ? (
          <motion.div
            key="analyzing-footer"
            className="mt-5"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: EASE_OUT }}
          >
            <button
              type="button"
              onClick={handleAbortAnalysis}
              className={PRIMARY_BUTTON}
            >
              Cancel
            </button>
          </motion.div>
        ) : phase === "success" ? (
          <motion.div
            key="success-footer"
            className="mt-5"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.16, ease: EASE_OUT }}
          >
            <button
              type="button"
              disabled
              className={`${PRIMARY_BUTTON} inline-flex items-center justify-center gap-2`}
            >
              <Check size={16} strokeWidth={2.25} />
              {savedCount} {savedLabel} added
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <input
        ref={addMoreRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleAddMore(e.target.files)}
      />
    </div>
  );
}
