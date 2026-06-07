"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Plus, X } from "@/components/icons";
import { useCallback, useEffect, useRef, useState } from "react";

export interface UploadStagingProps {
  files: File[];
  open: boolean;
  onClose: () => void;
  onConfirm: (files: File[]) => void;
  onAddMore: (files: File[]) => void;
}

interface StagedFile {
  id: string;
  file: File;
  previewUrl: string;
}

function createStagedFile(file: File): StagedFile {
  return {
    id: crypto.randomUUID(),
    file,
    previewUrl: URL.createObjectURL(file),
  };
}

export function UploadStaging({
  files,
  open,
  onClose,
  onConfirm,
  onAddMore,
}: UploadStagingProps) {
  const shouldReduceMotion = useReducedMotion();
  const addMoreRef = useRef<HTMLInputElement>(null);
  const [staged, setStaged] = useState<StagedFile[]>([]);

  const revokeAll = useCallback((entries: StagedFile[]) => {
    entries.forEach((entry) => URL.revokeObjectURL(entry.previewUrl));
  }, []);

  useEffect(() => {
    if (!open) {
      setStaged((current) => {
        revokeAll(current);
        return [];
      });
      return;
    }

    const images = files.filter((file) => file.type.startsWith("image/"));
    setStaged((current) => {
      revokeAll(current);
      return images.map(createStagedFile);
    });
  }, [files, open, revokeAll]);

  const handleClose = () => {
    revokeAll(staged);
    setStaged([]);
    onClose();
  };

  const removeFile = (id: string) => {
    setStaged((current) => {
      const target = current.find((entry) => entry.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((entry) => entry.id !== id);
    });
  };

  const handleAddMore = (fileList: FileList | null) => {
    if (!fileList?.length) return;
    const images = Array.from(fileList).filter((file) =>
      file.type.startsWith("image/"),
    );
    if (images.length === 0) return;

    setStaged((current) => [...current, ...images.map(createStagedFile)]);
    onAddMore(images);

    if (addMoreRef.current) addMoreRef.current.value = "";
  };

  const handleConfirm = () => {
    if (staged.length === 0) return;
    onConfirm(staged.map((entry) => entry.file));
    revokeAll(staged);
    setStaged([]);
  };

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
            onClick={handleClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="upload-staging-title"
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
            className="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-stone/20 bg-white shadow-2xl sm:rounded-3xl"
          >
            <header className="flex items-center justify-between border-b border-stone/15 px-5 py-4">
              <div>
                <h2
                  id="upload-staging-title"
                  className="font-semibold text-xl text-off-black"
                >
                  Add to wardrobe
                </h2>
                <p className="mt-0.5 text-sm text-taupe">
                  {staged.length} photo{staged.length === 1 ? "" : "s"} selected
                </p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-full p-2 text-taupe transition-colors hover:bg-stone/10 hover:text-espresso"
                aria-label="Close"
              >
                <X size={20} strokeWidth={1.75} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {staged.length === 0 ? (
                <p className="py-8 text-center text-sm text-taupe">
                  No images selected. Choose photos to continue.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {staged.map((entry) => (
                    <div
                      key={entry.id}
                      className="group relative aspect-square overflow-hidden rounded-lg bg-stone/10"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={entry.previewUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeFile(entry.id)}
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-espresso/80 text-cream opacity-90 transition-opacity hover:opacity-100"
                        aria-label="Remove image"
                      >
                        <X size={14} strokeWidth={2} />
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => addMoreRef.current?.click()}
                    className="flex aspect-square items-center justify-center rounded-lg border border-dashed border-stone/35 bg-white/50 text-taupe transition-colors hover:border-mushroom hover:text-espresso"
                    aria-label="Add more photos"
                  >
                    <Plus size={24} strokeWidth={1.75} />
                  </button>
                </div>
              )}
            </div>

            <footer className="flex items-center justify-between gap-3 border-t border-stone/15 px-5 py-4">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-full px-4 py-2 text-sm text-taupe transition-colors hover:text-espresso"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={staged.length === 0}
                className="rounded-full bg-espresso px-5 py-2.5 text-sm font-medium text-cream transition-transform duration-150 ease-out hover:bg-off-black active:scale-[0.97] disabled:opacity-50"
              >
                Continue to tagging
              </button>
            </footer>

            <input
              ref={addMoreRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleAddMore(e.target.files)}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
