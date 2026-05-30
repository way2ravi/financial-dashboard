import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";
import type {
  WealthCategory,
  WealthItem,
  WealthRecordType,
  WealthUserSettings,
} from "@/lib/types/wealth";
import { mapWealthItem, mapWealthUserSettings } from "./mappers";

type DbClient = SupabaseClient<Database>;

export async function getWealthUserSettings(
  supabase: DbClient,
  userId: string
): Promise<WealthUserSettings | null> {
  const { data, error } = await supabase
    .from("wealth_user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapWealthUserSettings(data) : null;
}

export async function upsertWealthUserSettings(
  supabase: DbClient,
  input: {
    userId: string;
    baseCurrency: string;
    monthlyExpensesEstimate: number | null;
  }
): Promise<WealthUserSettings> {
  const { data, error } = await supabase
    .from("wealth_user_settings")
    .upsert(
      {
        user_id: input.userId,
        base_currency: input.baseCurrency,
        monthly_expenses_estimate: input.monthlyExpensesEstimate,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapWealthUserSettings(data);
}

export async function getWealthItemsForUser(
  supabase: DbClient,
  userId: string
): Promise<WealthItem[]> {
  const { data, error } = await supabase
    .from("wealth_items")
    .select("*")
    .eq("user_id", userId)
    .order("record_type", { ascending: true })
    .order("category", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapWealthItem);
}

export async function createWealthItem(
  supabase: DbClient,
  input: {
    userId: string;
    recordType: WealthRecordType;
    category: WealthCategory;
    subcategory: string;
    name: string;
    currentValue: number;
    interestRate?: number | null;
    monthlyPayment?: number | null;
    asOfDate: string;
    notes?: string | null;
  }
): Promise<WealthItem> {
  const { data, error } = await supabase
    .from("wealth_items")
    .insert({
      user_id: input.userId,
      record_type: input.recordType,
      category: input.category,
      subcategory: input.subcategory,
      name: input.name,
      current_value: input.currentValue,
      interest_rate: input.interestRate ?? null,
      monthly_payment: input.monthlyPayment ?? null,
      as_of_date: input.asOfDate,
      notes: input.notes ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapWealthItem(data);
}

export async function updateWealthItem(
  supabase: DbClient,
  userId: string,
  itemId: number,
  input: {
    recordType: WealthRecordType;
    category: WealthCategory;
    subcategory: string;
    name: string;
    currentValue: number;
    interestRate?: number | null;
    monthlyPayment?: number | null;
    asOfDate: string;
    notes?: string | null;
  }
): Promise<WealthItem> {
  const { data, error } = await supabase
    .from("wealth_items")
    .update({
      record_type: input.recordType,
      category: input.category,
      subcategory: input.subcategory,
      name: input.name,
      current_value: input.currentValue,
      interest_rate: input.interestRate ?? null,
      monthly_payment: input.monthlyPayment ?? null,
      as_of_date: input.asOfDate,
      notes: input.notes ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId)
    .eq("user_id", userId)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return mapWealthItem(data);
}

export async function deleteWealthItem(
  supabase: DbClient,
  userId: string,
  itemId: number
): Promise<void> {
  const { error } = await supabase
    .from("wealth_items")
    .delete()
    .eq("id", itemId)
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

export async function getWealthItemById(
  supabase: DbClient,
  userId: string,
  itemId: number
): Promise<WealthItem | null> {
  const { data, error } = await supabase
    .from("wealth_items")
    .select("*")
    .eq("id", itemId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ? mapWealthItem(data) : null;
}
