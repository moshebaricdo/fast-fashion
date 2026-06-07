"use client";

import { ArrowLeft } from "@/components/icons";
import { DrawerPageShell } from "@/components/DrawerPageShell";
import { FoundInFitsSection } from "@/components/Inventory/FoundInFitsSection";
import { DetailScreen } from "@/components/ui/DetailScreen";
import { InlineEditableTitle } from "@/components/ui/InlineEditableTitle";
import { SquareImage } from "@/components/ui/SquareImage";
import { StickyChrome } from "@/components/ui/StickyChrome";
import { ToolbarIconButton } from "@/components/ui/ToolbarIconButton";
import { useItemDetailNav } from "@/contexts/FloatingNavContext";
import { useDrawerDismiss } from "@/contexts/DrawerNavigationContext";
import { getFavoriteOutfitsForItem } from "@/lib/favorites";
import {
  resolveInventoryItemReturnPath,
  RETURN_PATH_PARAM,
} from "@/lib/navigation";
import { deleteItem, getItemById, updateItem } from "@/lib/storage";
import type {
  Category,
  ClothingItem,
  Color,
  Purpose,
  Subcategory,
} from "@/types/wardrobe";
import {
  CATEGORIES,
  COLORS,
  COLOR_SWATCHES,
  PURPOSES,
  PURPOSE_LABELS,
  SLOT_LABELS,
  SUBCATEGORIES_BY_CATEGORY,
} from "@/types/wardrobe";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function InventoryItemDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const id = typeof params.id === "string" ? params.id : "";
  const returnPath = resolveInventoryItemReturnPath(
    searchParams.get(RETURN_PATH_PARAM),
  );

  const [item, setItem] = useState<ClothingItem | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [draft, setDraft] = useState({
    name: "",
    category: "top" as Category,
    subcategory: "t-shirt" as Subcategory,
    color: "other" as Color,
    purpose: "casual" as Purpose,
  });

  const loadItem = useCallback(() => {
    const found = getItemById(id);
    setItem(found);
    if (found) {
      setDraft({
        name: found.name,
        category: found.category,
        subcategory: found.subcategory,
        color: found.color,
        purpose: found.purpose,
      });
    }
  }, [id]);

  useEffect(() => {
    loadItem();
  }, [loadItem]);

  const dismiss = useDrawerDismiss(returnPath);

  const requestClose = useCallback(() => {
    if (editing && item) {
      setEditing(false);
      setDraft({
        name: item.name,
        category: item.category,
        subcategory: item.subcategory,
        color: item.color,
        purpose: item.purpose,
      });
      return;
    }

    dismiss();
  }, [dismiss, editing, item]);

  const handleDelete = useCallback(() => {
    if (!item) return;
    if (!window.confirm("Remove this item from your wardrobe?")) return;
    deleteItem(item.id);
    dismiss();
  }, [item, dismiss]);

  const handleEdit = useCallback(() => {
    setEditing(true);
  }, []);

  const navActions = useMemo(
    () =>
      item
        ? {
            onEdit: handleEdit,
            onDelete: handleDelete,
          }
        : null,
    [item, handleEdit, handleDelete],
  );

  useItemDetailNav(navActions);

  const handleSave = () => {
    if (!item || !draft.name.trim()) return;
    setSaving(true);

    const updated = updateItem(item.id, {
      name: draft.name.trim(),
      category: draft.category,
      subcategory: draft.subcategory,
      color: draft.color,
      purpose: draft.purpose,
    });

    if (updated) {
      setItem(updated);
      setEditing(false);
    }

    setSaving(false);
  };

  const subcategoryOptions = SUBCATEGORIES_BY_CATEGORY[draft.category];

  const outfitsWithItem = useMemo(
    () => (item ? getFavoriteOutfitsForItem(item.id) : []),
    [item],
  );

  if (!item) {
    return (
      <DrawerPageShell>
        <DetailScreen onDismiss={requestClose}>
          <div className="flex min-h-full flex-col">
            <StickyChrome className="shrink-0">
              <div className="px-4">
                <ToolbarIconButton
                  label="Back"
                  icon={ArrowLeft}
                  onClick={requestClose}
                  variant="secondary"
                />
              </div>
            </StickyChrome>
            <p className="px-4 py-6 text-xl font-semibold text-off-black">
              Item not found
            </p>
          </div>
        </DetailScreen>
      </DrawerPageShell>
    );
  }

  const swatch = COLOR_SWATCHES[item.color];

  return (
    <DrawerPageShell>
      <DetailScreen onDismiss={requestClose}>
        <StickyChrome className="shrink-0">
          <div className="px-4">
            <ToolbarIconButton
              label="Back"
              icon={ArrowLeft}
              onClick={requestClose}
              variant="secondary"
            />
          </div>
        </StickyChrome>

        <div className="px-4 pb-6">
          <div className="md:grid md:grid-cols-2 md:items-center md:gap-12">
            <div className="min-w-0">
              <SquareImage
                src={item.imageUrl}
                alt={item.name}
                rounded="2xl"
                className="ring-1 ring-stone/10"
              />
            </div>

            <div className="min-w-0">
              <InlineEditableTitle
                value={draft.name}
                onChange={(name) =>
                  setDraft((current) => ({ ...current, name }))
                }
                editing={editing}
                autoFocus={editing}
                className="mt-4 text-lg font-semibold leading-snug tracking-tight text-off-black md:mt-0"
              />

              <div className={editing ? "mt-4 space-y-4 md:mt-4" : "mt-3 md:mt-4"}>
                {editing ? (
                  <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-off-black">
                      Category
                    </span>
                    <select
                      value={draft.category}
                      onChange={(e) => {
                        const category = e.target.value as Category;
                        const subcategory = SUBCATEGORIES_BY_CATEGORY[category][0];
                        setDraft((current) => ({
                          ...current,
                          category,
                          subcategory,
                        }));
                      }}
                      className="rounded-xl border border-stone/20 bg-white px-3 py-2.5 text-off-black outline-none focus:border-stone/40"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {SLOT_LABELS[c]}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-off-black">
                      Subcategory
                    </span>
                    <select
                      value={draft.subcategory}
                      onChange={(e) =>
                        setDraft((current) => ({
                          ...current,
                          subcategory: e.target.value as Subcategory,
                        }))
                      }
                      className="rounded-xl border border-stone/20 bg-white px-3 py-2.5 text-off-black outline-none focus:border-stone/40"
                    >
                      {subcategoryOptions.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-off-black">Color</span>
                    <select
                      value={draft.color}
                      onChange={(e) =>
                        setDraft((current) => ({
                          ...current,
                          color: e.target.value as Color,
                        }))
                      }
                      className="rounded-xl border border-stone/20 bg-white px-3 py-2.5 text-off-black outline-none focus:border-stone/40"
                    >
                      {COLORS.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-off-black">
                      Purpose
                    </span>
                    <select
                      value={draft.purpose}
                      onChange={(e) =>
                        setDraft((current) => ({
                          ...current,
                          purpose: e.target.value as Purpose,
                        }))
                      }
                      className="rounded-xl border border-stone/20 bg-white px-3 py-2.5 text-off-black outline-none focus:border-stone/40"
                    >
                      {PURPOSES.map((p) => (
                        <option key={p} value={p}>
                          {PURPOSE_LABELS[p]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving || !draft.name.trim()}
                  className="w-full rounded-full bg-off-black py-3 text-sm font-medium text-white transition-transform duration-150 ease-out active:scale-[0.97] disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            ) : (
              <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                <div>
                  <dt className="text-stone">Category</dt>
                  <dd className="mt-0.5 capitalize text-off-black">
                    {SLOT_LABELS[item.category]}
                  </dd>
                </div>
                <div>
                  <dt className="text-stone">Subcategory</dt>
                  <dd className="mt-0.5 capitalize text-off-black">
                    {item.subcategory}
                  </dd>
                </div>
                <div>
                  <dt className="text-stone">Color</dt>
                  <dd className="mt-0.5 inline-flex items-center gap-2 capitalize text-off-black">
                    <span
                      className="h-3 w-3 rounded-full border border-stone/20"
                      style={{ backgroundColor: swatch }}
                    />
                    {item.color}
                  </dd>
                </div>
                <div>
                  <dt className="text-stone">Purpose</dt>
                  <dd className="mt-0.5 capitalize text-off-black">
                    {PURPOSE_LABELS[item.purpose]}
                  </dd>
                </div>
              </dl>
            )}
              </div>
            </div>
          </div>

          {!editing ? (
            <FoundInFitsSection outfits={outfitsWithItem} />
          ) : null}
        </div>
    </DetailScreen>
    </DrawerPageShell>
  );
}
