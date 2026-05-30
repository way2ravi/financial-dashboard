"use client";

import { useMemo, useState } from "react";
import type { WealthItem } from "@/lib/types/wealth";
import {
  wealthAssetSubcategories,
  wealthLiabilitySubcategories,
  type WealthAssetCategory,
  type WealthCategory,
  type WealthLiabilityCategory,
  type WealthRecordType,
} from "@/lib/types/wealth";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  submitLabel: string;
  item?: WealthItem | null;
};

export function WealthItemForm({ action, submitLabel, item }: Props) {
  const [recordType, setRecordType] = useState<WealthRecordType>(
    item?.recordType ?? "asset"
  );
  const [category, setCategory] = useState<WealthCategory>(
    item?.category ?? defaultCategory("asset")
  );

  const subcategoryOptions = useMemo(() => getSubcategoryOptions(recordType, category), [
    recordType,
    category,
  ]);

  return (
    <form action={action} className="space-y-2">
      {item ? <input type="hidden" name="item_id" value={item.id} /> : null}

      <label className="block text-xs font-medium app-muted">
        Type
        <select
          name="record_type"
          value={recordType}
          onChange={(event) => {
            const nextType = event.target.value === "liability" ? "liability" : "asset";
            setRecordType(nextType);
            setCategory(defaultCategory(nextType));
          }}
          className="mt-1 h-9 w-full rounded-lg border app-input px-3 text-xs outline-none"
        >
          <option value="asset">Asset</option>
          <option value="liability">Liability (loan / debt)</option>
        </select>
      </label>

      <label className="block text-xs font-medium app-muted">
        Category
        <select
          name="category"
          value={category}
          onChange={(event) => setCategory(event.target.value as WealthCategory)}
          className="mt-1 h-9 w-full rounded-lg border app-input px-3 text-xs outline-none"
        >
          {getCategoryOptions(recordType).map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-xs font-medium app-muted">
        Subcategory
        <select
          name="subcategory"
          key={`${recordType}-${category}`}
          defaultValue={item?.subcategory ?? subcategoryOptions[0]?.id}
          className="mt-1 h-9 w-full rounded-lg border app-input px-3 text-xs outline-none"
        >
          {subcategoryOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-xs font-medium app-muted">
        Name
        <input
          name="name"
          required
          defaultValue={item?.name ?? ""}
          placeholder="Primary home, Chase savings, Visa card"
          className="mt-1 h-9 w-full rounded-lg border app-input px-3 text-xs outline-none"
        />
      </label>

      <label className="block text-xs font-medium app-muted">
        Current value
        <input
          name="current_value"
          type="number"
          min="0.01"
          step="0.01"
          required
          defaultValue={item?.currentValue ?? ""}
          placeholder="50000"
          className="mt-1 h-9 w-full rounded-lg border app-input px-3 text-xs outline-none"
        />
      </label>

      {recordType === "liability" ? (
        <>
          <label className="block text-xs font-medium app-muted">
            Interest rate (% APR)
            <input
              name="interest_rate"
              type="number"
              min="0"
              step="0.01"
              defaultValue={item?.interestRate ?? ""}
              placeholder="18.5"
              className="mt-1 h-9 w-full rounded-lg border app-input px-3 text-xs outline-none"
            />
          </label>
          <label className="block text-xs font-medium app-muted">
            Monthly payment
            <input
              name="monthly_payment"
              type="number"
              min="0"
              step="0.01"
              defaultValue={item?.monthlyPayment ?? ""}
              placeholder="350"
              className="mt-1 h-9 w-full rounded-lg border app-input px-3 text-xs outline-none"
            />
          </label>
        </>
      ) : null}

      <label className="block text-xs font-medium app-muted">
        As of date
        <input
          name="as_of_date"
          type="date"
          required
          defaultValue={item?.asOfDate ?? new Date().toISOString().slice(0, 10)}
          className="mt-1 h-9 w-full rounded-lg border app-input px-3 text-xs outline-none"
        />
      </label>

      <label className="block text-xs font-medium app-muted">
        Notes
        <textarea
          name="notes"
          rows={2}
          defaultValue={item?.notes ?? ""}
          placeholder="Optional details"
          className="mt-1 w-full rounded-lg border app-input px-3 py-2 text-xs outline-none"
        />
      </label>

      <button
        type="submit"
        className="h-9 w-full rounded-lg app-primary-button px-4 text-xs font-semibold"
      >
        {submitLabel}
      </button>
    </form>
  );
}

function defaultCategory(recordType: WealthRecordType): WealthCategory {
  return recordType === "liability" ? "loan" : "liquid";
}

function getCategoryOptions(recordType: WealthRecordType) {
  if (recordType === "asset") {
    return [
      { id: "liquid", label: "Liquid asset" },
      { id: "fixed", label: "Fixed asset" },
      { id: "investment", label: "Investment" },
    ];
  }

  return [
    { id: "loan", label: "Loan" },
    { id: "overdraft", label: "Overdraft" },
    { id: "credit_card", label: "Credit card" },
    { id: "other_debt", label: "Other debt" },
  ];
}

function getSubcategoryOptions(recordType: WealthRecordType, category: string) {
  if (recordType === "asset") {
    const assetCategory = category as WealthAssetCategory;
    if (assetCategory in wealthAssetSubcategories) {
      return wealthAssetSubcategories[assetCategory];
    }

    return wealthAssetSubcategories.liquid;
  }

  const liabilityCategory = category as WealthLiabilityCategory;
  if (liabilityCategory in wealthLiabilitySubcategories) {
    return wealthLiabilitySubcategories[liabilityCategory];
  }

  return wealthLiabilitySubcategories.loan;
}
