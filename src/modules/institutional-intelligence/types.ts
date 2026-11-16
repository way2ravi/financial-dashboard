export const defaultWatchlist = [
  "NVDA",
  "PLTR",
  "ORCL",
  "TSLA",
  "MSFT",
  "GOOGL",
  "SOFI",
  "IOT",
  "BBAI",
  "QUBT",
  "DVLT",
  "HIMS",
  "CMG",
  "OPEN",
];
export type Filing = {
  accession: string;
  cik: string;
  form: string;
  report_date: string | null;
  filed_date: string;
  source_url: string;
  amendment: "original" | "restatement" | "additive" | "unresolved";
  amendment_number: number;
  status: "discovered" | "parsed" | "failed";
  detected_at: string;
  content_hash: string | null;
  metadata: Record<string, unknown>;
};
export type Holding = {
  accession: string;
  cusip: string;
  issuer: string;
  share_class: string;
  shares: number;
  share_type: string;
  put_call: string;
  value: number | null;
};
export type Institution = {
  cik: string;
  name: string;
  enabled: boolean;
  independence_group: string | null;
};
export type Security = {
  ticker: string;
  name: string | null;
  sector: string | null;
  market_cap: number | null;
  shares_outstanding: number | null;
  denominator_date: string | null;
  actions_verified_through: string | null;
  metadata_source_url?: string | null;
  actions_review_source?: string | null;
};
export type Identifier = {
  ticker: string;
  cusip: string;
  valid_from: string;
  valid_to: string | null;
  source_url: string;
};
export type CorporateAction = {
  ticker: string;
  effective_date: string;
  split_ratio: number;
  source_url: string;
};
export type SplitCheck = {
  ticker: string;
  from: string;
  to: string;
  checkedAt: string;
  sourceUrl: string;
  paginationPending: boolean;
  events: Array<{ date: string; kind: string; oldShares: number; newShares: number; ratio: number }>;
};
export type PriceBar = {
  ticker: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjusted: boolean;
  source_url: string;
  fetched_at: string;
};
export type PositionChange = {
  cik: string;
  institution: string;
  ticker: string;
  shares: number;
  previous: number | null;
  delta: number | null;
  changePercent: number | null;
  status:
    "New" | "Increased" | "Reduced" | "Closed" | "Unchanged" | "Unverified";
  reportDate: string;
  previousReportDate: string | null;
  filedDate: string;
  sourceUrl: string;
  independentGroup: string | null;
};
export type Alert = {
  dedup_key: string;
  ticker: string | null;
  cik: string | null;
  accession: string | null;
  kind: string;
  report_date: string | null;
  filed_date: string | null;
  detected_at: string;
  evidence: Record<string, unknown>;
  read_at: string | null;
};
export type JobLog = {
  id: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  processed: number;
  error: string | null;
};
export type Score = {
  total: number | null;
  label: string;
  confidence: "Unavailable" | "Low" | "Medium" | "High";
  components: Record<string, number | null>;
  missing: string[];
  version: string;
  weights: Record<string, number>;
  observedAt: string;
};
export type Snapshot = {
  ticker: string;
  reportDate: string;
  shares: number;
  holders: number;
  added: number | null;
  reduced: number | null;
  newPositions: number;
  closedPositions: number;
  concentration: number | null;
  ownershipPercent: number | null;
  changes: PositionChange[];
  comparable: boolean;
};
export type ResearchData = {
  securities: Security[];
  institutions: Institution[];
  filings: Filing[];
  holdings: Holding[];
  identifiers: Identifier[];
  actions: CorporateAction[];
  prices: PriceBar[];
  watchlist: string[];
  alerts: Alert[];
  jobs: JobLog[];
  scoreHistory: Array<{ ticker: string; report_date: string; score: Score }>;
  setupError: string | null;
};
