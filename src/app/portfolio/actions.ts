"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addTransactionForUser,
  createPortfolioForUser,
  isAppError,
  removePortfolioForUser,
  removeTransactionForUser,
  updatePortfolioForUser,
  updateTransactionForUser,
} from "@/lib/services";
import { createClient } from "@/lib/supabase/server";
import type { PortfolioTransactionType } from "@/lib/types";

export async function createPortfolioAction(formData: FormData) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await createPortfolioForUser(supabase, user, {
      name: getString(formData, "name"),
      assetClass: getString(formData, "asset_class"),
      baseCurrency: getString(formData, "base_currency"),
      description: getString(formData, "description"),
    });

    revalidatePath("/portfolio");
    revalidatePath("/wealth");
  } catch (error) {
    redirect(portfolioMessageUrl("error", getActionErrorMessage(error)));
  }

  redirect(portfolioMessageUrl("notice", "Portfolio created"));
}

export async function addPortfolioTransactionAction(formData: FormData) {
  const portfolioId = getNumber(formData, "portfolio_id");

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await addTransactionForUser(supabase, user, {
      portfolioId,
      symbol: getString(formData, "symbol"),
      assetName: getString(formData, "asset_name"),
      transactionType: getTransactionType(formData),
      tradeDate: getString(formData, "trade_date"),
      quantity: getNumber(formData, "quantity"),
      price: getNumber(formData, "price"),
      fees: getOptionalNumber(formData, "fees"),
      notes: getString(formData, "notes"),
    });

    revalidatePath("/portfolio");
    revalidatePath("/wealth");
  } catch (error) {
    redirect(portfolioMessageUrl("error", getActionErrorMessage(error), portfolioId));
  }

  redirect(portfolioMessageUrl("notice", "Trade added", portfolioId));
}

export async function updatePortfolioAction(formData: FormData) {
  const portfolioId = getNumber(formData, "portfolio_id");

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await updatePortfolioForUser(supabase, user, portfolioId, {
      name: getString(formData, "name"),
      baseCurrency: getString(formData, "base_currency"),
      description: getString(formData, "description"),
    });

    revalidatePath("/portfolio");
    revalidatePath("/wealth");
  } catch (error) {
    redirect(portfolioMessageUrl("error", getActionErrorMessage(error), portfolioId));
  }

  redirect(portfolioMessageUrl("notice", "Portfolio updated", portfolioId));
}

export async function removePortfolioAction(formData: FormData) {
  const portfolioId = getNumber(formData, "portfolio_id");

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await removePortfolioForUser(supabase, user, portfolioId);

    revalidatePath("/portfolio");
    revalidatePath("/wealth");
  } catch (error) {
    redirect(portfolioMessageUrl("error", getActionErrorMessage(error), portfolioId));
  }

  redirect(portfolioMessageUrl("notice", "Portfolio removed"));
}

export async function updatePortfolioTransactionAction(formData: FormData) {
  const portfolioId = getNumber(formData, "portfolio_id");

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await updateTransactionForUser(
      supabase,
      user,
      getNumber(formData, "transaction_id"),
      {
        portfolioId,
        symbol: getString(formData, "symbol"),
        assetName: getString(formData, "asset_name"),
        transactionType: getTransactionType(formData),
        tradeDate: getString(formData, "trade_date"),
        quantity: getNumber(formData, "quantity"),
        price: getNumber(formData, "price"),
        fees: getOptionalNumber(formData, "fees"),
        notes: getString(formData, "notes"),
      }
    );

    revalidatePath("/portfolio");
    revalidatePath("/wealth");
  } catch (error) {
    redirect(portfolioMessageUrl("error", getActionErrorMessage(error), portfolioId));
  }

  redirect(portfolioMessageUrl("notice", "Trade updated", portfolioId));
}

export async function removePortfolioTransactionAction(formData: FormData) {
  const portfolioId = getNumber(formData, "portfolio_id");
  const historyAsset = getString(formData, "history_asset");

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await removeTransactionForUser(supabase, user, getNumber(formData, "transaction_id"));
    revalidatePath("/portfolio");
    revalidatePath("/wealth");
  } catch (error) {
    redirect(
      portfolioMessageUrl("error", getActionErrorMessage(error), portfolioId, historyAsset)
    );
  }

  redirect(portfolioMessageUrl("notice", "Trade removed", portfolioId, historyAsset));
}

function getString(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function getNumber(formData: FormData, name: string) {
  const value = Number(getString(formData, name));
  return Number.isFinite(value) ? value : 0;
}

function getOptionalNumber(formData: FormData, name: string) {
  const value = getString(formData, name);
  if (!value) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getTransactionType(formData: FormData): PortfolioTransactionType {
  const value = getString(formData, "transaction_type");

  if (value === "sell" || value === "valuation") {
    return value;
  }

  return "buy";
}

function getActionErrorMessage(error: unknown) {
  if (isAppError(error)) {
    return error.message;
  }

  if (error instanceof Error && error.message.includes("duplicate key")) {
    return "That portfolio already exists";
  }

  return "Something went wrong. Please try again.";
}

function portfolioMessageUrl(
  type: "error" | "notice",
  message: string,
  portfolioId?: number,
  historyAsset?: string
) {
  const params = new URLSearchParams({ [type]: message });

  if (portfolioId) {
    params.set("portfolio", String(portfolioId));
  }

  if (historyAsset) {
    params.set("history_asset", historyAsset);
  }

  return `/portfolio?${params.toString()}`;
}
