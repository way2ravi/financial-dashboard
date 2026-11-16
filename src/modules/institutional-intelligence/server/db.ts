import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Json } from "@/lib/types/database";
import type {
  Filing,
  Holding,
  Institution,
  Security,
  Identifier,
  CorporateAction,
  PriceBar,
  Alert,
  JobLog,
  Score,
} from "../types";

type Table<T> = {
  Row: T;
  Insert: Partial<T>;
  Update: Partial<T>;
  Relationships: [];
};
export type ResearchDatabase = {
  public: {
    Tables: {
      ii_owner_access: Table<{ user_id: string }>;
      ii_securities: Table<Security>;
      ii_institutions: Table<Institution>;
      ii_filings: Table<Filing>;
      ii_holdings: Table<Holding>;
      ii_identifiers: Table<Identifier>;
      ii_corporate_actions: Table<CorporateAction>;
      ii_prices: Table<PriceBar>;
      ii_watchlist: Table<{ user_id: string; ticker: string }>;
      ii_alerts: Table<Alert>;
      ii_ingestion_logs: Table<JobLog>;
      ii_scores: Table<{
        fingerprint: string;
        ticker: string;
        report_date: string;
        score: Score;
      }>;
      ii_settings: Table<{
        id: number;
        weights: Record<string, number>;
        alert_threshold: number;
        volume_threshold: number;
      }>;
    };
    Views: Record<string, never>;
    Functions: {
      ii_is_owner: { Args: Record<string, never>; Returns: boolean };
      ii_claim_ingestion: { Args: { job_id: string }; Returns: boolean };
      ii_release_ingestion: { Args: { job_id: string }; Returns: undefined };
      ii_reserve_sec_request: { Args: Record<string, never>; Returns: number };
      ii_commit_filing: {
        Args: { filing: Json; positions: Json };
        Returns: undefined;
      };
    };
  };
};
export type ResearchClient = SupabaseClient<ResearchDatabase>;
