"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Shirt } from "@/components/icons";
import { WardrobeEmptyState } from "@/components/EmptyState/WardrobeEmptyState";
import { InventoryToolbar } from "@/components/Inventory/InventoryToolbar";
import { InventoryGrid } from "@/components/InventoryGrid/InventoryGrid";
import { useUploadItemsFlow } from "@/hooks/useUploadItemsFlow";
import { filterItems } from "@/lib/filterItems";
import { getItems } from "@/lib/storage";
import type { ClothingItem } from "@/types/wardrobe";
import { EMPTY_FILTERS } from "@/types/wardrobe";

export default function InventoryPage() {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const refreshItems = useCallback(() => {
    setItems(getItems());
  }, []);

  const upload = useUploadItemsFlow({
    onItemsSaved: refreshItems,
    cancelViaHeader: true,
  });

  useEffect(() => {
    refreshItems();
  }, [refreshItems]);

  const filteredItems = useMemo(
    () => filterItems(items, filters),
    [items, filters],
  );

  const isWardrobeEmpty = items.length === 0;

  return (
    <div className="relative min-h-full min-w-0">
      <InventoryToolbar
        filters={filters}
        onFiltersChange={setFilters}
        onAddClick={upload.openFilePicker}
        uploadStaging={{
          open: upload.stagingOpen,
          locked: upload.stagingLocked,
          phase: upload.stagingPhase,
          onClose: upload.closeStaging,
          onHeaderAction: upload.onHeaderAction,
          panel: upload.stagingPanel,
        }}
      />

      {isWardrobeEmpty ? (
        <WardrobeEmptyState
          icon={Shirt}
          description="Add photos of your clothes to build your digital wardrobe."
          onAction={upload.openFilePicker}
        />
      ) : (
        <div className="px-4 pb-4">
          <InventoryGrid items={filteredItems} />
        </div>
      )}

      {upload.fileInput}
    </div>
  );
}
