export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      analyst_price_targets_snapshot: {
        Row: {
          id: number;
          ticker_id: number;
          as_of_date: string;
          target_low: number | null;
          target_mean: number | null;
          target_high: number | null;
          target_median: number | null;
          analyst_count: number | null;
          source: string | null;
          source_updated_at: string | null;
          fetched_at: string;
        };
        Insert: {
          id?: number;
          ticker_id: number;
          as_of_date: string;
          target_low?: number | null;
          target_mean?: number | null;
          target_high?: number | null;
          target_median?: number | null;
          analyst_count?: number | null;
          source?: string | null;
          source_updated_at?: string | null;
          fetched_at?: string;
        };
        Update: {
          id?: number;
          ticker_id?: number;
          as_of_date?: string;
          target_low?: number | null;
          target_mean?: number | null;
          target_high?: number | null;
          target_median?: number | null;
          analyst_count?: number | null;
          source?: string | null;
          source_updated_at?: string | null;
          fetched_at?: string;
        };
        Relationships: [];
      };
      analyst_ratings_snapshot: {
        Row: {
          id: number;
          ticker_id: number;
          as_of_date: string;
          consensus: string | null;
          strong_buy: number;
          buy: number;
          hold: number;
          sell: number;
          strong_sell: number;
          analyst_count: number;
          source: string | null;
          source_updated_at: string | null;
          fetched_at: string;
        };
        Insert: {
          id?: number;
          ticker_id: number;
          as_of_date: string;
          consensus?: string | null;
          strong_buy?: number;
          buy?: number;
          hold?: number;
          sell?: number;
          strong_sell?: number;
          analyst_count?: number;
          source?: string | null;
          source_updated_at?: string | null;
          fetched_at?: string;
        };
        Update: {
          id?: number;
          ticker_id?: number;
          as_of_date?: string;
          consensus?: string | null;
          strong_buy?: number;
          buy?: number;
          hold?: number;
          sell?: number;
          strong_sell?: number;
          analyst_count?: number;
          source?: string | null;
          source_updated_at?: string | null;
          fetched_at?: string;
        };
        Relationships: [];
      };
      earnings_quarterly: {
        Row: {
          id: number;
          ticker_id: number;
          fiscal_year: number;
          fiscal_quarter: number;
          period: string | null;
          report_date: string | null;
          eps_actual: number | null;
          eps_estimate: number | null;
          eps_surprise: number | null;
          eps_surprise_percent: number | null;
          revenue_actual: number | null;
          revenue_estimate: number | null;
          source: string | null;
          source_updated_at: string | null;
          fetched_at: string;
        };
        Insert: {
          id?: number;
          ticker_id: number;
          fiscal_year: number;
          fiscal_quarter: number;
          period?: string | null;
          report_date?: string | null;
          eps_actual?: number | null;
          eps_estimate?: number | null;
          eps_surprise?: number | null;
          eps_surprise_percent?: number | null;
          revenue_actual?: number | null;
          revenue_estimate?: number | null;
          source?: string | null;
          source_updated_at?: string | null;
          fetched_at?: string;
        };
        Update: {
          id?: number;
          ticker_id?: number;
          fiscal_year?: number;
          fiscal_quarter?: number;
          period?: string | null;
          report_date?: string | null;
          eps_actual?: number | null;
          eps_estimate?: number | null;
          eps_surprise?: number | null;
          eps_surprise_percent?: number | null;
          revenue_actual?: number | null;
          revenue_estimate?: number | null;
          source?: string | null;
          source_updated_at?: string | null;
          fetched_at?: string;
        };
        Relationships: [];
      };
      fundamentals_snapshot: {
        Row: {
          id: number;
          ticker_id: number;
          as_of_date: string;
          market_cap: number | null;
          pe: number | null;
          forward_pe: number | null;
          peg: number | null;
          pb: number | null;
          ps: number | null;
          roe: number | null;
          roa: number | null;
          gross_margin: number | null;
          operating_margin: number | null;
          net_margin: number | null;
          debt_to_equity: number | null;
          dividend_yield: number | null;
          beta: number | null;
          source: string | null;
          source_updated_at: string | null;
          fetched_at: string;
        };
        Insert: {
          id?: number;
          ticker_id: number;
          as_of_date: string;
          market_cap?: number | null;
          pe?: number | null;
          forward_pe?: number | null;
          peg?: number | null;
          pb?: number | null;
          ps?: number | null;
          roe?: number | null;
          roa?: number | null;
          gross_margin?: number | null;
          operating_margin?: number | null;
          net_margin?: number | null;
          debt_to_equity?: number | null;
          dividend_yield?: number | null;
          beta?: number | null;
          source?: string | null;
          source_updated_at?: string | null;
          fetched_at?: string;
        };
        Update: {
          id?: number;
          ticker_id?: number;
          as_of_date?: string;
          market_cap?: number | null;
          pe?: number | null;
          forward_pe?: number | null;
          peg?: number | null;
          pb?: number | null;
          ps?: number | null;
          roe?: number | null;
          roa?: number | null;
          gross_margin?: number | null;
          operating_margin?: number | null;
          net_margin?: number | null;
          debt_to_equity?: number | null;
          dividend_yield?: number | null;
          beta?: number | null;
          source?: string | null;
          source_updated_at?: string | null;
          fetched_at?: string;
        };
        Relationships: [];
      };
      ohlc_daily: {
        Row: {
          id: number;
          ticker_id: number;
          date: string;
          open: number | null;
          high: number | null;
          low: number | null;
          close: number | null;
          adjusted_close: number | null;
          volume: number | null;
          source: string | null;
          source_updated_at: string | null;
          fetched_at: string;
        };
        Insert: {
          id?: number;
          ticker_id: number;
          date: string;
          open?: number | null;
          high?: number | null;
          low?: number | null;
          close?: number | null;
          adjusted_close?: number | null;
          volume?: number | null;
          source?: string | null;
          source_updated_at?: string | null;
          fetched_at?: string;
        };
        Update: {
          id?: number;
          ticker_id?: number;
          date?: string;
          open?: number | null;
          high?: number | null;
          low?: number | null;
          close?: number | null;
          adjusted_close?: number | null;
          volume?: number | null;
          source?: string | null;
          source_updated_at?: string | null;
          fetched_at?: string;
        };
        Relationships: [];
      };
      portfolio_transactions: {
        Row: {
          id: number;
          portfolio_id: number;
          user_id: string;
          ticker_id: number;
          transaction_type: string;
          trade_date: string;
          quantity: number;
          price: number;
          fees: number;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          portfolio_id: number;
          user_id: string;
          ticker_id: number;
          transaction_type: string;
          trade_date: string;
          quantity: number;
          price: number;
          fees?: number;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          portfolio_id?: number;
          user_id?: string;
          ticker_id?: number;
          transaction_type?: string;
          trade_date?: string;
          quantity?: number;
          price?: number;
          fees?: number;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      portfolios: {
        Row: {
          id: number;
          user_id: string;
          name: string;
          base_currency: string;
          description: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          name: string;
          base_currency?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          name?: string;
          base_currency?: string;
          description?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      provider_fetch_log: {
        Row: {
          id: number;
          provider: string;
          endpoint: string;
          symbol: string | null;
          status: string;
          status_code: number | null;
          error_message: string | null;
          fetched_at: string;
        };
        Insert: {
          id?: number;
          provider: string;
          endpoint: string;
          symbol?: string | null;
          status: string;
          status_code?: number | null;
          error_message?: string | null;
          fetched_at?: string;
        };
        Update: {
          id?: number;
          provider?: string;
          endpoint?: string;
          symbol?: string | null;
          status?: string;
          status_code?: number | null;
          error_message?: string | null;
          fetched_at?: string;
        };
        Relationships: [];
      };
      quotes_latest: {
        Row: {
          ticker_id: number;
          price: number | null;
          change: number | null;
          change_percent: number | null;
          previous_close: number | null;
          open: number | null;
          day_high: number | null;
          day_low: number | null;
          volume: number | null;
          source: string | null;
          source_updated_at: string | null;
          fetched_at: string;
        };
        Insert: {
          ticker_id: number;
          price?: number | null;
          change?: number | null;
          change_percent?: number | null;
          previous_close?: number | null;
          open?: number | null;
          day_high?: number | null;
          day_low?: number | null;
          volume?: number | null;
          source?: string | null;
          source_updated_at?: string | null;
          fetched_at?: string;
        };
        Update: {
          ticker_id?: number;
          price?: number | null;
          change?: number | null;
          change_percent?: number | null;
          previous_close?: number | null;
          open?: number | null;
          day_high?: number | null;
          day_low?: number | null;
          volume?: number | null;
          source?: string | null;
          source_updated_at?: string | null;
          fetched_at?: string;
        };
        Relationships: [];
      };
      tickers: {
        Row: {
          id: number;
          symbol: string;
          exchange: string | null;
          name: string | null;
          sector: string | null;
          industry: string | null;
          currency: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          symbol: string;
          exchange?: string | null;
          name?: string | null;
          sector?: string | null;
          industry?: string | null;
          currency?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          symbol?: string;
          exchange?: string | null;
          name?: string | null;
          sector?: string | null;
          industry?: string | null;
          currency?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_watchlist: {
        Row: {
          id: number;
          user_id: string;
          ticker_id: number;
          created_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          ticker_id: number;
          created_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          ticker_id?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      users_profile: {
        Row: {
          id: string;
          display_name: string | null;
          role: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string | null;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
