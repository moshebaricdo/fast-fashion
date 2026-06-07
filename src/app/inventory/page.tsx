"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import { BulkUploadReview } from "@/components/BulkUploadReview";
import { InventoryToolbar } from "@/components/Inventory/InventoryToolbar";
import { InventoryGrid } from "@/components/InventoryGrid/InventoryGrid";
import { UploadStaging } from "@/components/UploadStaging/UploadStaging";
import { cropFilesToSquare } from "@/lib/cropImage";
import { filterItems } from "@/lib/filterItems";
import { getItems, saveItem } from "@/lib/storage";
import type { ClothingItem, PendingClothingItem } from "@/types/wardrobe";
import { EMPTY_FILTERS } from "@/types/wardrobe";

export default function InventoryPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [pickedFiles, setPickedFiles] = useState<File[]>([]);
  const [stagingOpen, setStagingOpen] = useState(false);
  const [reviewFiles, setReviewFiles] = useState<File[]>([]);
  const [reviewOpen, setReviewOpen] = useState(false);

  const refreshItems = useCallback(() => {
    setItems(getItems());
  }, []);

  useEffect(() => {
    refreshItems();
  }, [refreshItems]);

  const filteredItems = useMemo(
    () => filterItems(items, filters),
    [items, filters],
  );

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFilesPicked = async (fileList: FileList | null) => {
    if (!fileList?.length) return;

    const images = Array.from(fileList).filter((file) =>
      file.type.startsWith("image/"),
    );
    if (images.length === 0) return;

    const cropped = await cropFilesToSquare(images);
    setPickedFiles(cropped);
    setStagingOpen(true);

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleStagingConfirm = (files: File[]) => {
    setStagingOpen(false);
    setPickedFiles([]);
    setReviewFiles(files);
    setReviewOpen(true);
  };

  const handleStagingClose = () => {
    setStagingOpen(false);
    setPickedFiles([]);
  };

  const handleReviewClose = () => {
    setReviewOpen(false);
    setReviewFiles([]);
  };

  const handleReviewConfirm = (pending: PendingClothingItem[]) => {
    pending.forEach((item) =>
      saveItem({
        ...item,
        id: uuid(),
        createdAt: new Date().toISOString(),
      }),
    );
    refreshItems();
    handleReviewClose();
  };

  return (
    <div className="relative min-h-full min-w-0">
      <InventoryToolbar
        filters={filters}
        onFiltersChange={setFilters}
        onAddClick={openFilePicker}
      />

      <div className="px-4 pb-4">
        <InventoryGrid items={filteredItems} />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => void handleFilesPicked(e.target.files)}
      />

      <UploadStaging
        files={pickedFiles}
        open={stagingOpen}
        onClose={handleStagingClose}
        onConfirm={handleStagingConfirm}
        onAddMore={(files) =>
          void cropFilesToSquare(files).then((cropped) =>
            setPickedFiles((current) => [...current, ...cropped]),
          )
        }
      />

      <BulkUploadReview
        files={reviewFiles}
        open={reviewOpen}
        onClose={handleReviewClose}
        onConfirm={(items) => void handleReviewConfirm(items)}
      />
    </div>
  );
}
