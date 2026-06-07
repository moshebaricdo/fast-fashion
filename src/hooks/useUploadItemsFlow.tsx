"use client";

import { useCallback, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import { UploadStagingPanel } from "@/components/UploadStaging/UploadStagingPanel";
import { cropFilesToSquare } from "@/lib/cropImage";
import { saveItem } from "@/lib/storage";
import type { PendingClothingItem } from "@/types/wardrobe";

export function useUploadItemsFlow(onItemsSaved?: () => void) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pickedFiles, setPickedFiles] = useState<File[]>([]);
  const [stagingOpen, setStagingOpen] = useState(false);
  const [stagingLocked, setStagingLocked] = useState(false);

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const closeStaging = useCallback(() => {
    setStagingOpen(false);
    setPickedFiles([]);
    setStagingLocked(false);
  }, []);

  const handleFilesPicked = useCallback(async (fileList: FileList | null) => {
    if (!fileList?.length) return;

    const images = Array.from(fileList).filter((file) =>
      file.type.startsWith("image/"),
    );
    if (images.length === 0) return;

    const cropped = await cropFilesToSquare(images);
    setPickedFiles(cropped);
    setStagingOpen(true);

    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleSaved = useCallback(
    (pending: PendingClothingItem[]) => {
      pending.forEach((item) =>
        saveItem({
          ...item,
          id: uuid(),
          createdAt: new Date().toISOString(),
        }),
      );
      onItemsSaved?.();
      closeStaging();
    },
    [closeStaging, onItemsSaved],
  );

  const handleAddMore = useCallback((files: File[]) => {
    void cropFilesToSquare(files).then((cropped) =>
      setPickedFiles((current) => [...current, ...cropped]),
    );
  }, []);

  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      multiple
      className="hidden"
      onChange={(e) => void handleFilesPicked(e.target.files)}
    />
  );

  const stagingPanel = (
    <UploadStagingPanel
      files={pickedFiles}
      open={stagingOpen}
      onClose={closeStaging}
      onSaved={handleSaved}
      onAddMore={handleAddMore}
      onLockChange={setStagingLocked}
    />
  );

  return {
    openFilePicker,
    fileInput,
    stagingOpen,
    stagingLocked,
    closeStaging,
    stagingPanel,
  };
}
