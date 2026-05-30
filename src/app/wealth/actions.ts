"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addWealthItemForUser,
  isAppError,
  parseWealthCategory,
  parseWealthRecordType,
  removeWealthItemForUser,
  saveWealthSettingsForUser,
  updateWealthItemForUser,
} from "@/lib/services";
import { createClient } from "@/lib/supabase/server";

export async function saveWealthSettingsAction(formData: FormData) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await saveWealthSettingsForUser(supabase, user, {
      baseCurrency: getString(formData, "base_currency"),
      monthlyExpensesEstimate: getOptionalNumber(formData, "monthly_expenses_estimate"),
    });

    revalidatePath("/wealth");
  } catch (error) {
    redirect(wealthMessageUrl("error", getActionErrorMessage(error)));
  }

  redirect(wealthMessageUrl("notice", "Wealth settings saved"));
}

export async function addWealthItemAction(formData: FormData) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await addWealthItemForUser(supabase, user, parseWealthItemForm(formData));
    revalidatePath("/wealth");
  } catch (error) {
    redirect(wealthMessageUrl("error", getActionErrorMessage(error)));
  }

  redirect(wealthMessageUrl("notice", "Entry added"));
}

export async function updateWealthItemAction(formData: FormData) {
  const itemId = getNumber(formData, "item_id");

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await updateWealthItemForUser(supabase, user, itemId, parseWealthItemForm(formData));
    revalidatePath("/wealth");
  } catch (error) {
    redirect(wealthMessageUrl("error", getActionErrorMessage(error)));
  }

  redirect(wealthMessageUrl("notice", "Entry updated"));
}

export async function removeWealthItemAction(formData: FormData) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await removeWealthItemForUser(supabase, user, getNumber(formData, "item_id"));
    revalidatePath("/wealth");
  } catch (error) {
    redirect(wealthMessageUrl("error", getActionErrorMessage(error)));
  }

  redirect(wealthMessageUrl("notice", "Entry removed"));
}

function parseWealthItemForm(formData: FormData) {
  const recordType = parseWealthRecordType(getString(formData, "record_type"));
  const category = parseWealthCategory(recordType, getString(formData, "category"));

  return {
    recordType,
    category,
    subcategory: getString(formData, "subcategory"),
    name: getString(formData, "name"),
    currentValue: getNumber(formData, "current_value"),
    interestRate: getOptionalNumber(formData, "interest_rate"),
    monthlyPayment: getOptionalNumber(formData, "monthly_payment"),
    asOfDate: getString(formData, "as_of_date") || new Date().toISOString().slice(0, 10),
    notes: getString(formData, "notes") || null,
  };
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
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getActionErrorMessage(error: unknown) {
  if (isAppError(error)) {
    return error.message;
  }

  if (error instanceof Error && /relation .* does not exist/i.test(error.message)) {
    return "Run src/lib/supabase/wealth.sql in Supabase before using Wealth Manager";
  }

  return "Something went wrong. Please try again.";
}

function wealthMessageUrl(type: "error" | "notice", message: string) {
  const params = new URLSearchParams({ [type]: message });
  return `/wealth?${params.toString()}`;
}
