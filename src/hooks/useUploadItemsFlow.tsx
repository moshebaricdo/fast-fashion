"use client";

import { useCallback, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import {
  UploadStagingPanel,
  type UploadStagingPhase,
} from "@/components/UploadStaging/UploadStagingPanel";
import { cropFilesToSquare } from "@/lib/cropImage";
import { saveItem } from "@/lib/storage";
import type { PendingClothingItem } from "@/types/wardrobe";

interface UseUploadItemsFlowOptions {
  onItemsSaved?: () => void;
  cancelViaHeader?: boolean;
}

export function useUploadItemsFlow(options?: UseUploadItemsFlowOptions) {
  const { onItemsSaved, cancelViaHeader = false } = options ?? {};
  const fileInputRef = useRef<HTMLInputElement>(null);
  const headerActionRef = useRef<() => void>(() => {});
  const [pickedFiles, setPickedFiles] = useState<File[]>([]);
  const [stagingOpen, setStagingOpen] = useState(false);
  const [stagingLocked, setStagingLocked] = useState(false);
  const [stagingPhase, setStagingPhase] =
    useState<UploadStagingPhase>("staging");

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const closeStaging = useCallback(() => {
    setStagingOpen(false);
    setPickedFiles([]);
    setStagingLocked(false);
    setStagingPhase("staging");
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

  const onHeaderAction = useCallback(() => {
    headerActionRef.current();
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
      onPhaseChange={setStagingPhase}
      onRegisterHeaderAction={(action) => {
        headerActionRef.current = action;
      }}
      cancelViaHeader={cancelViaHeader}
    />
  );

  return {
    openFilePicker,
    fileInput,
    stagingOpen,
    stagingLocked,
    stagingPhase,
    closeStaging,
    onHeaderAction,
    stagingPanel,
  };
}
