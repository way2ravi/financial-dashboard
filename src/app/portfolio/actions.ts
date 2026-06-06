"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addTransactionForUser,
  createPortfolioForUser,
  isAppError,
  removeTransactionForUser,
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
      baseCurrency: getString(formData, "base_currency"),
      description: getString(formData, "description"),
    });

    revalidatePath("/portfolio");
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
      transactionType: getTransactionType(formData),
      tradeDate: getString(formData, "trade_date"),
      quantity: getNumber(formData, "quantity"),
      price: getNumber(formData, "price"),
      fees: getOptionalNumber(formData, "fees"),
      notes: getString(formData, "notes"),
    });

    revalidatePath("/portfolio");
  } catch (error) {
    redirect(portfolioMessageUrl("error", getActionErrorMessage(error), portfolioId));
  }

  redirect(portfolioMessageUrl("notice", "Trade added", portfolioId));
}

export async function removePortfolioTransactionAction(formData: FormData) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await removeTransactionForUser(supabase, user, getNumber(formData, "transaction_id"));
    revalidatePath("/portfolio");
  } catch (error) {
    redirect(portfolioMessageUrl("error", getActionErrorMessage(error)));
  }

  redirect(portfolioMessageUrl("notice", "Trade removed"));
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
  return getString(formData, "transaction_type") === "sell" ? "sell" : "buy";
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
  portfolioId?: number
) {
  const params = new URLSearchParams({ [type]: message });

  if (portfolioId) {
    params.set("portfolio", String(portfolioId));
  }

  return `/portfolio?${params.toString()}`;
}
