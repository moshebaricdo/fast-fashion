"use client";

import { useRef, useState } from "react";
import type { PendingClothingItem } from "@/types/wardrobe";
import { BulkUploadReview } from "./BulkUploadReview";

export interface BulkUploadTriggerProps {
  onConfirm: (items: PendingClothingItem[]) => void;
  className?: string;
  label?: string;
}

export function BulkUploadTrigger({
  onConfirm,
  className = "",
  label = "Bulk upload",
}: BulkUploadTriggerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [reviewOpen, setReviewOpen] = useState(false);

  const openPicker = () => {
    inputRef.current?.click();
  };

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const images = Array.from(fileList).filter((file) =>
      file.type.startsWith("image/"),
    );

    if (images.length === 0) return;

    setSelectedFiles(images);
    setReviewOpen(true);

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const handleClose = () => {
    setReviewOpen(false);
    setSelectedFiles([]);
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => handleFiles(event.target.files)}
      />

      <button
        type="button"
        onClick={openPicker}
        className={
          className ||
          "inline-flex items-center justify-center rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-800 transition hover:border-stone-400 hover:bg-stone-50"
        }
      >
        {label}
      </button>

      <BulkUploadReview
        files={selectedFiles}
        open={reviewOpen}
        onClose={handleClose}
        onConfirm={onConfirm}
      />
    </>
  );
}
