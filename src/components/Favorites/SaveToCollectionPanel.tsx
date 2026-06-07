"use client";

import { Plus } from "@/components/icons";
import type { Collection } from "@/types/wardrobe";
import { useMemo, useState } from "react";

interface SaveToCollectionPanelProps {
  collections: Collection[];
  onSelectCollection: (collectionId: string) => void;
  onCreateCollection: (name: string) => void;
  /** When true, only creates a collection without implying an outfit save. */
  createOnly?: boolean;
}

const headingClass = "text-base font-medium text-off-black";

export function SaveToCollectionPanel({
  collections,
  onSelectCollection,
  onCreateCollection,
  createOnly = false,
}: SaveToCollectionPanelProps) {
  const [creatingNew, setCreatingNew] = useState(
    createOnly || collections.length === 0,
  );
  const [draftName, setDraftName] = useState("");

  const existingNames = useMemo(
    () => new Set(collections.map((collection) => collection.name.toLowerCase())),
    [collections],
  );

  const trimmedDraft = draftName.trim();
  const canCreate =
    trimmedDraft.length > 0 &&
    !existingNames.has(trimmedDraft.toLowerCase());

  const handleCreate = () => {
    if (!canCreate) return;
    onCreateCollection(trimmedDraft);
    setDraftName("");
    if (!createOnly) {
      setCreatingNew(false);
    }
  };

  const showCreateForm = createOnly || collections.length === 0 || creatingNew;
  const createLabel = createOnly ? "Create" : "Create & save";

  return (
    <div className="space-y-4">
      {collections.length > 0 && !showCreateForm ? (
        <>
          <div className="space-y-1.5">
            <p className={headingClass}>Save to collection</p>
            <div className="space-y-1">
              {collections.map((collection) => (
                <button
                  key={collection.id}
                  type="button"
                  onClick={() => onSelectCollection(collection.id)}
                  className="flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm font-medium text-off-black transition-colors duration-150 hover:bg-stone/8 active:bg-stone/12"
                >
                  {collection.name}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setCreatingNew(true);
              setDraftName("");
            }}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-stone/20 px-3 py-2.5 text-sm font-medium text-off-black transition-[transform,background-color,border-color] duration-150 hover:border-stone/35 hover:bg-stone/5 active:scale-[0.99]"
          >
            <Plus size={15} strokeWidth={1.75} />
            New collection
          </button>
        </>
      ) : (
        <div>
          <p className={headingClass}>
            {collections.length === 0 && !createOnly
              ? "Create your first collection"
              : "New collection"}
          </p>
          <input
            id="collection-name"
            type="text"
            value={draftName}
            onChange={(event) => setDraftName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleCreate();
              }
            }}
            placeholder="Collection name"
            aria-label="Collection name"
            className="mt-[18px] h-10 w-full rounded-full border border-stone/25 bg-white px-3.5 text-sm text-off-black placeholder:text-stone focus:border-stone/45 focus:outline-none"
          />

          <div className="mt-5 flex gap-2">
            {collections.length > 0 && !createOnly ? (
              <button
                type="button"
                onClick={() => {
                  setCreatingNew(false);
                  setDraftName("");
                }}
                className="flex-1 rounded-full border border-stone/20 px-3 py-2.5 text-sm font-medium text-off-black transition-colors duration-150 hover:bg-stone/5"
              >
                Cancel
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleCreate}
              disabled={!canCreate}
              className="flex-1 rounded-full bg-off-black px-3 py-2.5 text-sm font-medium text-white transition-[transform,opacity] duration-150 hover:bg-off-black/90 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {createLabel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
