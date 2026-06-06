"use client";

import { useMemo, useState } from "react";
import { formatCurrency, formatNumber } from "@/components/dashboard/format";
import type { PortfolioAssetClass, PortfolioTransactionType } from "@/lib/types";

type Props = {
  action: (formData: FormData) => void | Promise<void>;
  assetClass: PortfolioAssetClass;
  assetName: string;
  assetSymbol: string;
  averageCost: number;
  costBasis: number;
  currency: string;
  currentPrice: number | null;
  portfolioId: number;
  quantity: number;
  today: string;
};

export function PortfolioScenarioForm({
  action,
  assetClass,
  assetName,
  assetSymbol,
  averageCost,
  costBasis,
  currency,
  currentPrice,
  portfolioId,
  quantity,
  today,
}: Props) {
  const valuationOnly = assetClass === "real_estate" || assetClass === "other";
  const [transactionType, setTransactionType] =
    useState<PortfolioTransactionType>(valuationOnly ? "valuation" : "buy");
  const [entryQuantity, setEntryQuantity] = useState(
    valuationOnly ? String(quantity || 1) : assetClass === "stocks" ? "" : String(quantity || 1)
  );
  const [price, setPrice] = useState(
    currentPrice === null ? "" : String(currentPrice)
  );
  const [fees, setFees] = useState("0");

  const parsedQuantity = parseNumber(entryQuantity);
  const parsedPrice = parseNumber(price);
  const parsedFees = transactionType === "valuation" ? 0 : parseNumber(fees);

  const projection = useMemo(() => {
    if (parsedQuantity <= 0 || parsedPrice < 0 || parsedFees < 0) {
      return null;
    }

    if (transactionType === "buy") {
      const projectedQuantity = quantity + parsedQuantity;
      const projectedCostBasis =
        costBasis + parsedQuantity * parsedPrice + parsedFees;
      const projectedAverageCost =
        projectedQuantity > 0 ? projectedCostBasis / projectedQuantity : 0;
      const projectedValue =
        projectedQuantity * (currentPrice === null ? parsedPrice : currentPrice);

      return {
        projectedAverageCost,
        projectedCostBasis,
        projectedQuantity,
        projectedProfitLoss: projectedValue - projectedCostBasis,
        projectedValue,
      };
    }

    if (transactionType === "sell") {
      const sellQuantity = Math.min(parsedQuantity, quantity);
      const projectedQuantity = quantity - sellQuantity;
      const removedCost = averageCost * sellQuantity;
      const projectedCostBasis = Math.max(costBasis - removedCost, 0);
      const projectedValue =
        projectedQuantity * (currentPrice === null ? parsedPrice : currentPrice);
      const realizedProfitLoss =
        sellQuantity * parsedPrice - parsedFees - removedCost;

      return {
        projectedAverageCost:
          projectedQuantity > 0 ? projectedCostBasis / projectedQuantity : 0,
        projectedCostBasis,
        projectedQuantity,
        projectedProfitLoss: projectedValue - projectedCostBasis,
        projectedValue,
        realizedProfitLoss,
      };
    }

    const projectedValue = quantity * parsedPrice;

    return {
      projectedAverageCost: averageCost,
      projectedCostBasis: costBasis,
      projectedQuantity: quantity,
      projectedProfitLoss: projectedValue - costBasis,
      projectedValue,
    };
  }, [
    averageCost,
    costBasis,
    currentPrice,
    parsedFees,
    parsedPrice,
    parsedQuantity,
    quantity,
    transactionType,
  ]);

  return (
    <form action={action} className="rounded-lg border app-subtle p-3">
      <input name="portfolio_id" type="hidden" value={portfolioId} />
      <input name="transaction_type" type="hidden" value={transactionType} />
      <input name="asset_name" type="hidden" value={assetName} />
      <input name="symbol" type="hidden" value={assetSymbol} />
      {valuationOnly ? <input name="quantity" type="hidden" value={entryQuantity} /> : null}
      {valuationOnly ? <input name="fees" type="hidden" value="0" /> : null}

      {valuationOnly ? (
        <div>
          <h3 className="text-sm font-semibold app-heading">
            Update valuation for {assetName}
          </h3>
          <p className="mt-1 text-xs app-muted">
            This records the latest value for this asset without changing quantity or cost basis.
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <ModeButton
            active={transactionType === "buy"}
            label="Buy"
            onClick={() => setTransactionType("buy")}
          />
          <ModeButton
            active={transactionType === "sell"}
            label="Sell"
            onClick={() => setTransactionType("sell")}
          />
          {assetClass !== "stocks" ? (
            <ModeButton
              active={transactionType === "valuation"}
              label="Update value"
              onClick={() => {
                setTransactionType("valuation");
                setEntryQuantity(String(quantity || 1));
                setFees("0");
              }}
            />
          ) : null}
        </div>
      )}

      <div className={`mt-3 grid gap-2 ${valuationOnly ? "md:grid-cols-3" : "md:grid-cols-5"}`}>
        <input
          name="trade_date"
          type="date"
          required
          defaultValue={today}
          className="h-9 rounded-lg border app-input px-3 text-xs outline-none"
        />
        {!valuationOnly ? (
          <input
            name="quantity"
            type="number"
            step="0.0001"
            min="0"
            required
            value={entryQuantity}
            onChange={(event) => setEntryQuantity(event.target.value)}
            placeholder="Quantity"
            className="h-9 rounded-lg border app-input px-3 text-xs outline-none"
          />
        ) : null}
        <input
          name="price"
          type="number"
          step="0.01"
          min="0"
          required
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          placeholder={
            valuationOnly
              ? "New valuation"
              : transactionType === "valuation"
                ? "New value / unit"
                : "Price"
          }
          className="h-9 rounded-lg border app-input px-3 text-xs outline-none"
        />
        {!valuationOnly ? (
          <input
            name="fees"
            type="number"
            step="0.01"
            min="0"
            value={fees}
            onChange={(event) => setFees(event.target.value)}
            disabled={transactionType === "valuation"}
            placeholder="Fees"
            className="h-9 rounded-lg border app-input px-3 text-xs outline-none disabled:opacity-60"
          />
        ) : null}
        <input
          name="notes"
          placeholder="Notes"
          className="h-9 rounded-lg border app-input px-3 text-xs outline-none"
        />
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        <PreviewMetric
          label="Quantity"
          value={projection ? formatNumber(projection.projectedQuantity, 4) : "-"}
        />
        <PreviewMetric
          label="Avg cost"
          value={
            projection
              ? formatCurrency(projection.projectedAverageCost, false, currency)
              : "-"
          }
        />
        <PreviewMetric
          label="Cost basis"
          value={
            projection
              ? formatCurrency(projection.projectedCostBasis, false, currency)
              : "-"
          }
        />
        <PreviewMetric
          label={transactionType === "sell" ? "Realized P/L" : "Projected P/L"}
          tone={(projection?.projectedProfitLoss ?? 0) >= 0 ? "positive" : "negative"}
          value={
            projection
              ? formatCurrency(
                  projection.realizedProfitLoss ?? projection.projectedProfitLoss,
                  false,
                  currency
                )
              : "-"
          }
        />
        <button
          type="submit"
          className="h-9 rounded-lg app-primary-button px-4 text-xs font-semibold"
        >
          {valuationOnly ? "Save valuation" : "Add entry"}
        </button>
      </div>
    </form>
  );
}

function ModeButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-8 rounded-lg border px-3 text-xs font-semibold ${
        active ? "app-primary-button" : "app-secondary-button"
      }`}
    >
      {label}
    </button>
  );
}

function PreviewMetric({
  label,
  tone,
  value,
}: {
  label: string;
  tone?: "positive" | "negative";
  value: string;
}) {
  const toneClass =
    tone === "positive"
      ? "app-positive"
      : tone === "negative"
        ? "app-negative"
        : "app-heading";

  return (
    <div className="rounded-lg border app-subtle px-3 py-2">
      <div className="text-[11px] font-medium uppercase tracking-normal app-muted">
        {label}
      </div>
      <div className={`mt-1 text-sm font-semibold ${toneClass}`}>{value}</div>
    </div>
  );
}

function parseNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}
