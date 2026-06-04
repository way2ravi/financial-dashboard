"use client";

import Link from "next/link";
import { useState } from "react";
import type { WealthItem, WealthRecordType } from "@/lib/types/wealth";
import { WealthItemForm } from "./WealthItemForm";

type Props = {
  addAction: (formData: FormData) => void | Promise<void>;
  editingItem?: WealthItem | null;
  updateAction: (formData: FormData) => void | Promise<void>;
};

export function WealthEntryModal({ addAction, editingItem, updateAction }: Props) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [entryType, setEntryType] = useState<WealthRecordType>("asset");
  const isEditing = Boolean(editingItem);
  const isOpen = isEditing || isAddOpen;
  const activeEntryType = editingItem?.recordType ?? entryType;

  function openEntry(type: WealthRecordType) {
    setEntryType(type);
    setIsAddOpen(true);
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => openEntry("asset")}
          className="h-9 rounded-lg app-primary-button px-3 text-xs font-semibold"
        >
          Add asset
        </button>
        <button
          type="button"
          onClick={() => openEntry("liability")}
          className="h-9 rounded-lg border app-border-soft px-3 text-xs font-semibold app-heading hover:bg-[var(--app-surface-muted)]"
        >
          Add liability
        </button>
      </div>

      {isOpen ? (
        <div
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 px-4 py-6 backdrop-blur-sm sm:items-center"
          role="dialog"
        >
          <section className="max-h-[calc(100vh-3rem)] w-full max-w-2xl overflow-y-auto rounded-lg border app-surface shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b app-border-soft app-surface px-4 py-3">
              <div>
                <h2 className="text-sm font-semibold app-heading">
                  {editingItem
                    ? "Edit balance-sheet entry"
                    : activeEntryType === "asset"
                      ? "Add asset"
                      : "Add liability"}
                </h2>
                <p className="mt-1 text-xs app-muted">
                  Record the latest value so net worth, charts, and guidance stay current.
                </p>
              </div>
              {editingItem ? (
                <Link
                  href="/wealth"
                  className="rounded-md border app-border-soft px-2.5 py-1.5 text-xs font-semibold app-muted hover:app-heading"
                >
                  Close
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="rounded-md border app-border-soft px-2.5 py-1.5 text-xs font-semibold app-muted hover:app-heading"
                >
                  Close
                </button>
              )}
            </div>

            <div className="p-4">
              <WealthItemForm
                key={editingItem?.id ?? entryType}
                action={editingItem ? updateAction : addAction}
                initialRecordType={activeEntryType}
                item={editingItem}
                submitLabel={editingItem ? "Update entry" : "Save entry"}
              />
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
