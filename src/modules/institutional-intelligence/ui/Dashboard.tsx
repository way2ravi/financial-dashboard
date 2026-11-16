"use client";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import {
  Activity,
  ArrowDownUp,
  ArrowUpRight,
  Bell,
  Building2,
  ChartNoAxesCombined,
  Check,
  ChevronRight,
  Download,
  FileText,
  LayoutDashboard,
  LockKeyhole,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Star,
  Workflow,
} from "lucide-react";
import type { ResearchView } from "../server/view";
import { EvidenceChart } from "./Charts";
import { SplitHistoryCheck } from "./SplitHistoryCheck";
import { researchSignOut } from "@/app/institutional-intelligence/login/actions";
import styles from "./terminal.module.css";
export type Tab =
  | "Overview"
  | "Watchlist"
  | "Filings"
  | "Alerts"
  | "Compare"
  | "Methodology"
  | "Configuration";
const tabs: Array<{ name: Tab; icon: typeof Activity }> = [
  { name: "Overview", icon: LayoutDashboard },
  { name: "Watchlist", icon: Star },
  { name: "Filings", icon: FileText },
  { name: "Alerts", icon: Bell },
  { name: "Compare", icon: ArrowDownUp },
  { name: "Methodology", icon: Workflow },
  { name: "Configuration", icon: Settings2 },
];
const count = (n: number | null | undefined, digits = 0) =>
  n == null
    ? "—"
    : Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(n);
const percent = (n: number | null | undefined) =>
  n == null ? "—" : `${n > 0 ? "+" : ""}${count(n, 1)}%`;
const short = (n: number | null | undefined) =>
  n == null
    ? "—"
    : Intl.NumberFormat("en-US", {
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(n);
const root = "/institutional-intelligence";
export function IntelligenceDashboard({
  initial,
  focusTicker,
  focusInstitution,
  initialTab = "Overview",
}: {
  initial: ResearchView;
  focusTicker?: string;
  focusInstitution?: string;
  initialTab?: Tab;
}) {
  const [data, setData] = useState(initial),
    [tab, setTab] = useState<Tab>(initialTab),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const [ticker, setTicker] = useState(""),
    [institution, setInstitution] = useState(focusInstitution ?? ""),
    [sector, setSector] = useState(""),
    [period, setPeriod] = useState(""),
    [filedAfter, setFiledAfter] = useState(""),
    [change, setChange] = useState("all"),
    [marketCap, setMarketCap] = useState("all"),
    [signal, setSignal] = useState("all");
  const [sort, setSort] = useState<{
      key: "ticker" | "holders" | "shares" | "change";
      desc: boolean;
    }>({ key: "ticker", desc: false }),
    [compare, setCompare] = useState<string[]>([]),
    [quarters, setQuarters] = useState(8);
  const selected = data.rows.find((row) => row.security.ticker === focusTicker);
  const manager = data.institutions.find((i) => i.cik === focusInstitution);
  async function refresh() {
    const response = await fetch("/api/institutional-intelligence", {
      cache: "no-store",
    });
    if (!response.ok)
      throw new Error(
        "Unable to refresh private research. Check owner access and database setup.",
      );
    setData(await response.json());
  }
  async function act(body: Record<string, unknown>) {
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/institutional-intelligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Action failed");
      await refresh();
      setNotice(
        body.action === "ingest" || body.action === "backfill13F"
          ? `Ingestion ${result.status}; ${result.processed ?? 0} filings processed.${result.note ? ` ${result.note}` : ""}`
          : "Saved.",
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }
  const filtered = data.rows
    .filter((row) => {
      const snapshot = period
        ? row.history.find((h) => h.reportDate === period)
        : row.snapshot;
      if (tab === "Watchlist" && !row.watched) return false;
      if (
        ticker &&
        !`${row.security.ticker} ${row.security.name ?? ""}`
          .toLowerCase()
          .includes(ticker.toLowerCase())
      )
        return false;
      if (sector && row.security.sector !== sector) return false;
      if (institution && !snapshot?.changes.some((c) => c.cik === institution))
        return false;
      if (period && !snapshot) return false;
      if (
        filedAfter &&
        !snapshot?.changes.some((c) => c.filedDate >= filedAfter)
      )
        return false;
      if (
        marketCap === "large" &&
        !(row.security.market_cap && row.security.market_cap >= 10e9)
      )
        return false;
      if (
        marketCap === "small" &&
        !(row.security.market_cap && row.security.market_cap < 2e9)
      )
        return false;
      const net = snapshot?.comparable
        ? (snapshot.added ?? 0) - (snapshot.reduced ?? 0)
        : null;
      if (change === "increase" && !(net !== null && net > 0)) return false;
      if (change === "decrease" && !(net !== null && net < 0)) return false;
      if (signal !== "all" && row.score.confidence !== signal) return false;
      return true;
    })
    .sort((a, b) => {
      const value = (row: typeof a) =>
        sort.key === "ticker"
          ? row.security.ticker
          : sort.key === "holders"
            ? (row.snapshot?.holders ?? -1)
            : sort.key === "shares"
              ? (row.snapshot?.shares ?? -1)
              : row.snapshot?.comparable
                ? (row.snapshot.added ?? 0) - (row.snapshot.reduced ?? 0)
                : -Infinity;
      const av = value(a),
        bv = value(b),
        result =
          typeof av === "string" && typeof bv === "string"
            ? av.localeCompare(bv)
            : Number(av) - Number(bv);
      return sort.desc ? -result : result;
    });
  const snapshots = data.rows
    .map((r) => r.snapshot)
    .filter((s): s is NonNullable<typeof s> => Boolean(s));
  const comparable = snapshots.filter((s) => s.comparable);
  const metrics = [
    {
      label: "Stocks monitored",
      value: count(data.rows.filter((r) => r.watched).length),
      icon: Star,
    },
    {
      label: "Reported share increases",
      value: comparable.length
        ? count(
            comparable.filter((s) => (s.added ?? 0) > (s.reduced ?? 0)).length,
          )
        : "—",
      icon: ChartNoAxesCombined,
    },
    {
      label: "Reported share reductions",
      value: comparable.length
        ? count(
            comparable.filter((s) => (s.added ?? 0) < (s.reduced ?? 0)).length,
          )
        : "—",
      icon: Activity,
    },
    {
      label: "New reported positions",
      value: comparable.length
        ? count(comparable.reduce((n, s) => n + s.newPositions, 0))
        : "—",
      icon: Building2,
    },
    {
      label: "Significant disclosed reductions",
      value: comparable.length
        ? count(
            comparable
              .flatMap((s) => s.changes)
              .filter(
                (c) =>
                  c.changePercent !== null &&
                  c.changePercent <= -data.configuration.alertThreshold,
              ).length,
          )
        : "—",
      icon: ArrowDownUp,
    },
    {
      label: "Unusual volume observations",
      value: data.configuration.marketBars
        ? count(
            data.alerts.filter((a) => a.kind.startsWith("Unusual volume"))
              .length,
          )
        : "—",
      icon: Activity,
    },
    {
      label: "Regulatory filings indexed",
      value: count(data.filings.length),
      icon: FileText,
    },
    {
      label: "Strong evidence observations",
      value: data.canShowSignals
        ? count(
            data.rows.filter(
              (r) =>
                r.score.confidence === "High" && (r.score.total ?? 0) >= 80,
            ).length,
          )
        : "Disabled",
      icon: ShieldCheck,
    },
  ];
  function sortable(key: typeof sort.key, label: string) {
    return (
      <button
        onClick={() =>
          setSort({ key, desc: sort.key === key ? !sort.desc : false })
        }
      >
        {label}
        <ArrowDownUp size={11} />
      </button>
    );
  }
  const rowsTable = (rows: ResearchView["rows"], comparison = false) => (
    <div className={styles.tableWrap}>
      <table>
        <thead>
          <tr>
            {comparison ? <th>Compare</th> : null}
            <th>{sortable("ticker", "STOCK")}</th>
            <th>{sortable("holders", "REPORTING HOLDERS")}</th>
            <th>{sortable("shares", "REPORTED SHARES")}</th>
            <th>{sortable("change", "NET SHARE CHANGE")}</th>
            <th>REPORT PERIOD</th>
            <th>OBSERVATIONAL SCORE</th>
            <th>CONFIDENCE</th>
            <th>WATCH</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const s = period
              ? row.history.find((h) => h.reportDate === period)
              : row.snapshot;
            const currentScore = !period || period === row.snapshot?.reportDate;
            return (
              <tr key={row.security.ticker}>
                {comparison ? (
                  <td>
                    <input
                      aria-label={`Compare ${row.security.ticker}`}
                      type="checkbox"
                      checked={compare.includes(row.security.ticker)}
                      onChange={(e) => {
                        if (e.target.checked && compare.length === 5) {
                          setNotice("Compare up to five stocks.");
                          return;
                        }
                        setCompare(
                          e.target.checked
                            ? [...compare, row.security.ticker]
                            : compare.filter((t) => t !== row.security.ticker),
                        );
                      }}
                    />
                  </td>
                ) : null}
                <td>
                  <Link
                    className={styles.ticker}
                    href={`${root}/stocks/${row.security.ticker}`}
                  >
                    {row.security.ticker}
                  </Link>
                  <div className={styles.sub}>
                    {row.security.name ?? "Company metadata not connected"}
                  </div>
                </td>
                <td>{s ? count(s.holders) : "—"}</td>
                <td>{s ? short(s.shares) : "—"}</td>
                <td
                  className={
                    s?.comparable
                      ? (s.added ?? 0) >= (s.reduced ?? 0)
                        ? styles.positive
                        : styles.negative
                      : styles.muted
                  }
                >
                  {s?.comparable
                    ? short((s.added ?? 0) - (s.reduced ?? 0))
                    : "Not comparable"}
                </td>
                <td>{s?.reportDate ?? "No filings mapped"}</td>
                <td>
                  {!currentScore || row.score.total === null ? (
                    <span className={styles.muted}>
                      {data.canShowSignals
                        ? currentScore ? "Insufficient data" : "No point-in-time score"
                        : "Information only"}
                    </span>
                  ) : (
                    `${row.score.total}/100`
                  )}
                </td>
                <td>
                  <span className={styles.badge}>{currentScore ? row.score.confidence : "Unavailable"}</span>
                </td>
                <td>
                  <button
                    className={styles.iconButton}
                    title={
                      row.watched ? "Remove from watchlist" : "Add to watchlist"
                    }
                    aria-label={`Watch ${row.security.ticker}`}
                    disabled={busy}
                    onClick={() =>
                      act({
                        action: row.watched ? "unwatch" : "watch",
                        ticker: row.security.ticker,
                      })
                    }
                  >
                    <Star size={14} fill={row.watched ? "#7bdab5" : "none"} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {!rows.length ? <Empty title="No matching stocks" /> : null}
    </div>
  );
  return (
    <>
      <header className={styles.header}>
        <Link href={root} className={styles.brand}>
          <Image src="/icon.png" width={28} height={28} alt="Way2Investing" />
          WAY2INVESTING <span className={styles.muted}>/ PRIVATE RESEARCH</span>
        </Link>
        <div className={styles.actions}>
          <span className={styles.privateLabel}>
            <LockKeyhole size={12} />
            Owner workspace
          </span>
          <form action={researchSignOut}>
            <button className={styles.button}>Sign out</button>
          </form>
        </div>
      </header>
      <div className={styles.shell}>
        <nav className={styles.sidebar} aria-label="Private research">
          {tabs.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={styles.navButton}
              aria-current={
                !focusTicker && !focusInstitution && tab === name
                  ? "page"
                  : undefined
              }
              onClick={() => {
                if (focusTicker || focusInstitution) {
                  window.location.href =
                    name === "Compare" ? `${root}/compare` : `${root}?tab=${encodeURIComponent(name)}`;
                  return;
                }
                if(name === "Compare") setPeriod("");
                setTab(name);
              }}
            >
              <Icon size={16} />
              {name}
            </button>
          ))}
          <div className={styles.sidebarFoot}>
            <ShieldCheck size={19} />
            <p>Evidence before interpretation.</p>
            <p>{data.mode}</p>
          </div>
        </nav>
        <main className={styles.main}>
          <div className={styles.heading}>
            <div>
              <div className={styles.status}>
                <span className={styles.dot} />
                {data.filings.length
                  ? "Tracked-manager coverage"
                  : "Awaiting verified data"}
                <ChevronRight size={12} />
                {data.mode}
              </div>
              <h1 style={{ marginTop: 12 }}>
                {focusTicker
                  ? `${focusTicker} / Stock Intelligence`
                  : focusInstitution
                    ? (manager?.name ?? `Institution ${focusInstitution}`)
                    : "Institutional Intelligence"}
              </h1>
              <p>
                Track institutional ownership, disclosed transactions and market
                accumulation signals.
              </p>
            </div>
            <div className={styles.actions}>
              <a
                className={styles.iconButton}
                title="Export private research JSON"
                aria-label="Export research"
                href="/api/institutional-intelligence?export=json"
              >
                <Download size={16} />
              </a>
              <button
                disabled={busy}
                className={styles.button}
                onClick={() => {
                  setBusy(true);
                  refresh()
                    .catch((error) => setNotice(error.message))
                    .finally(() => setBusy(false));
                }}
              >
                <RefreshCw size={14} />
                Refresh
              </button>
              <button
                className={styles.primary}
                disabled={busy || !data.configuration.secConfigured}
                onClick={() => act({ action: "ingest" })}
              >
                <Workflow size={14} />
                {busy ? "Working…" : "Run ingestion"}
              </button>
            </div>
          </div>
          {notice ? (
            <p role="status" className={styles.notice}>
              {notice}
            </p>
          ) : null}
          {data.setupError ? (
            <p role="alert" className={styles.notice}>
              {data.setupError}
            </p>
          ) : null}
          {!data.institutions.length || !data.configuration.mappings ? (
            <p className={styles.notice}>
              Data setup incomplete:{" "}
              {data.institutions.length
                ? ""
                : "add reporting managers by SEC CIK; "}
              {data.configuration.mappings
                ? ""
                : "record verified, date-effective CUSIP mappings. "}
              No illustrative holdings or financial signals are displayed.
            </p>
          ) : null}
          {focusTicker ? (
            selected ? (
              <StockDetail
                row={selected}
                quarters={quarters}
                setQuarters={setQuarters}
                canShowSignals={data.canShowSignals}
              />
            ) : (
              <Empty
                title="This ticker is not monitored"
                detail="Add the ticker under Configuration, then record its verified security identifiers."
              />
            )
          ) : focusInstitution ? (
            <section className={styles.section}>
              <h2>Reported holdings history</h2>
              <p className={styles.muted}>
                CIK {focusInstitution}. Holdings observations are quarter-end
                snapshots.
              </p>
              <HoldingsTable
                changes={data.rows
                  .flatMap((r) => r.history.flatMap((h) => h.changes))
                  .filter((c) => c.cik === focusInstitution)}
              />
              <Filings data={data} institution={focusInstitution} />
            </section>
          ) : (
            <>
              {tab === "Overview" || tab === "Watchlist" ? (
                <>
                  <div className={styles.metrics}>
                    {metrics.map(({ label, value, icon: Icon }) => (
                      <div key={label} className={styles.metric}>
                        <div className={styles.metricLabel}>
                          {label}
                          <Icon size={13} />
                        </div>
                        <div className={styles.metricValue}>{value}</div>
                      </div>
                    ))}
                  </div>
                  <section className={styles.section}>
                    <div className={styles.sectionHead}>
                      <div>
                        <h2>Watchlist evidence map</h2>
                        <p>
                          Reported quarter-end share changes / tracked sample
                          only
                        </p>
                      </div>
                    </div>
                    <div className={styles.heatmap}>
                      {data.rows
                        .filter((r) => r.watched)
                        .map((row) => (
                          <Link
                            href={`${root}/stocks/${row.security.ticker}`}
                            className={styles.heatCell}
                            key={row.security.ticker}
                          >
                            <strong>{row.security.ticker}</strong>
                            <span
                              className={
                                row.snapshot?.comparable
                                  ? (row.snapshot.added ?? 0) >=
                                    (row.snapshot.reduced ?? 0)
                                    ? styles.positive
                                    : styles.negative
                                  : styles.muted
                              }
                            >
                              {row.snapshot?.comparable
                                ? short(
                                    (row.snapshot.added ?? 0) -
                                      (row.snapshot.reduced ?? 0),
                                  )
                                : "No verified comparison"}
                            </span>
                          </Link>
                        ))}
                    </div>
                  </section>
                  <section className={styles.section}>
                    <div className={styles.sectionHead}>
                      <h2>Stock research universe</h2>
                      <span className={styles.muted}>
                        {filtered.length} stocks
                      </span>
                    </div>
                    <div className={styles.filters}>
                      <label>
                        <span>
                          <Search
                            size={12}
                            style={{ display: "inline", marginRight: 5 }}
                          />
                          Stock
                        </span>
                        <input
                          value={ticker}
                          onChange={(e) => setTicker(e.target.value)}
                          placeholder="Ticker or company"
                        />
                      </label>
                      <label>
                        Institution
                        <select
                          value={institution}
                          onChange={(e) => setInstitution(e.target.value)}
                        >
                          <option value="">All reporting managers</option>
                          {data.institutions.map((i) => (
                            <option key={i.cik} value={i.cik}>
                              {i.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Sector
                        <select
                          value={sector}
                          onChange={(e) => setSector(e.target.value)}
                        >
                          <option value="">All sectors / unavailable</option>
                          {[
                            ...new Set(
                              data.rows
                                .map((r) => r.security.sector)
                                .filter(Boolean),
                            ),
                          ].map((s) => (
                            <option key={s!}>{s}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Market capitalisation
                        <select
                          value={marketCap}
                          onChange={(e) => setMarketCap(e.target.value)}
                        >
                          <option value="all">All sizes</option>
                          <option value="large">$10bn and above</option>
                          <option value="small">Below $2bn</option>
                        </select>
                      </label>
                      <label>
                        Reporting quarter
                        <select
                          value={period}
                          onChange={(e) => setPeriod(e.target.value)}
                        >
                          <option value="">Latest per stock</option>
                          {[
                            ...new Set(
                              data.rows.flatMap((r) =>
                                r.history.map((h) => h.reportDate),
                              ),
                            ),
                          ]
                            .sort()
                            .reverse()
                            .map((d) => (
                              <option key={d}>{d}</option>
                            ))}
                        </select>
                      </label>
                      <label>
                        Filed on / after
                        <input
                          type="date"
                          value={filedAfter}
                          onChange={(e) => setFiledAfter(e.target.value)}
                        />
                      </label>
                      <label>
                        Reported share change
                        <select
                          value={change}
                          onChange={(e) => setChange(e.target.value)}
                        >
                          <option value="all">All observations</option>
                          <option value="increase">Net increase</option>
                          <option value="decrease">Net reduction</option>
                        </select>
                      </label>
                      <label>
                        Evidence confidence
                        <select
                          value={signal}
                          onChange={(e) => setSignal(e.target.value)}
                        >
                          <option value="all">All confidence levels</option>
                          {["High", "Medium", "Low", "Unavailable"].map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    {rowsTable(filtered)}
                  </section>
                  <section className={styles.section}>
                    <div className={styles.sectionHead}>
                      <h2>Disclosure activity</h2>
                      <button
                        className={styles.button}
                        onClick={() => setTab("Filings")}
                      >
                        All filings
                        <ArrowUpRight size={13} />
                      </button>
                    </div>
                    <Feed data={data} act={act} />
                  </section>
                </>
              ) : null}
              {tab === "Filings" ? <Filings data={data} /> : null}
              {tab === "Alerts" ? (
                <section className={styles.section}>
                  <div className={styles.sectionHead}>
                    <h2>Notification centre</h2>
                    <span className={styles.muted}>
                      In-app evidence alerts only
                    </span>
                  </div>
                  <Feed data={data} act={act} all />
                </section>
              ) : null}
              {tab === "Compare" ? (
                <section className={styles.section}>
                  <div className={styles.sectionHead}>
                    <h2>Compare up to five stocks</h2>
                    <span className={styles.muted}>
                      {compare.length}/5 selected · not ranked
                    </span>
                  </div>
                  {rowsTable(data.rows, true)}
                  {compare.length ? (
                    <div className={styles.tableWrap} style={{ marginTop: 25 }}>
                      <table>
                        <thead>
                          <tr>
                            <th>METRIC</th>
                            {compare.map((t) => (
                              <th key={t}>{t}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            "Reported shares",
                            "Reporting holders",
                            "Net share change",
                            "20D relative strength",
                            "Score",
                            "Confidence",
                          ].map((label, index) => (
                            <tr key={label}>
                              <td>{label}</td>
                              {compare.map((t) => {
                                const r = data.rows.find(
                                  (row) => row.security.ticker === t,
                                )!;
                                return (
                                  <td key={t}>
                                    {
                                      [
                                        short(r.snapshot?.shares),
                                        count(r.snapshot?.holders),
                                        r.snapshot?.comparable
                                          ? short(
                                              (r.snapshot.added ?? 0) -
                                                (r.snapshot.reduced ?? 0),
                                            )
                                          : "Unavailable",
                                        percent(r.technical?.relativeStrength),
                                        count(r.score.total),
                                        r.score.confidence,
                                      ][index]
                                    }
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </section>
              ) : null}
              {tab === "Methodology" ? (
                <Methodology weights={data.configuration.weights} />
              ) : null}
              {tab === "Configuration" ? (
                <Configuration data={data} act={act} busy={busy} />
              ) : null}
            </>
          )}
          <footer className={styles.disclosure}>
            Institutional signals describe observed and inferred activity. They
            are not guarantees of future stock performance or personalised
            investment recommendations.
            <br />
            13F comparisons describe reported quarter-end positions. Exact
            transaction dates are not disclosed. The tracked-manager sample is
            not a complete institutional ownership universe. Price/volume
            inference cannot identify an institutional buyer.
          </footer>
        </main>
      </div>
    </>
  );
}
function Empty({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className={styles.empty}>
      <FileText size={27} />
      <h3>{title}</h3>
      <p>
        {detail ??
          "Verified records will appear after data sources and ingestion are configured."}
      </p>
    </div>
  );
}
function HoldingsTable({
  changes,
}: {
  changes: NonNullable<ResearchView["rows"][number]["snapshot"]>["changes"];
}) {
  const [descending, setDescending] = useState(true);
  return (
    <div className={styles.tableWrap}>
      <table>
        <thead>
          <tr>
            <th>INSTITUTION / STOCK</th>
            <th>
              <button onClick={() => setDescending(!descending)}>
                SHARES HELD
                <ArrowDownUp size={11} />
              </button>
            </th>
            <th>PREVIOUS SHARES*</th>
            <th>CHANGE</th>
            <th>STATUS</th>
            <th>REPORT DATE</th>
            <th>FILED DATE</th>
            <th>SOURCE</th>
          </tr>
        </thead>
        <tbody>
          {[...changes]
            .sort((a, b) => (descending ? -1 : 1) * (a.shares - b.shares))
            .map((c, i) => (
              <tr key={`${c.cik}:${c.ticker}:${c.reportDate}:${i}`}>
                <td>
                  <Link href={`${root}/institutions/${c.cik}`}>
                    {c.institution}
                  </Link>
                  <div className={styles.sub}>
                    <Link href={`${root}/stocks/${c.ticker}`}>{c.ticker}</Link>
                  </div>
                </td>
                <td>{count(c.shares)}</td>
                <td>{count(c.previous)}</td>
                <td
                  className={
                    (c.delta ?? 0) > 0
                      ? styles.positive
                      : (c.delta ?? 0) < 0
                        ? styles.negative
                        : styles.muted
                  }
                >
                  {percent(c.changePercent)}
                </td>
                <td>{c.status}</td>
                <td>{c.reportDate}</td>
                <td>{c.filedDate}</td>
                <td>
                  <a href={c.sourceUrl} target="_blank" rel="noreferrer">
                    SEC
                    <ArrowUpRight size={12} style={{ display: "inline" }} />
                  </a>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
      {!changes.length ? <Empty title="No mapped holdings" /> : null}
      <p className={styles.sub}>
        * Previous shares are adjusted only for recorded corporate actions.
        Changes remain unverified until action coverage and comparable filings
        are confirmed.
      </p>
    </div>
  );
}
function StockDetail({
  row,
  quarters,
  setQuarters,
  canShowSignals,
}: {
  row: ResearchView["rows"][number];
  quarters: number;
  setQuarters: (n: number) => void;
  canShowSignals: boolean;
}) {
  const history = row.history.slice(-quarters),
    s = row.snapshot;
  const facts = [
    {
      label: "Latest share price",
      value: row.latestPrice === null ? "—" : `$${count(row.latestPrice, 2)}`,
    },
    { label: "Market capitalisation", value: short(row.security.market_cap) },
    {
      label: "Daily / five sessions",
      value: `${percent(row.daily)} / ${percent(row.weekly)}`,
    },
    { label: "Latest trading volume", value: short(row.volume) },
    {
      label: "Average daily volume (20D)",
      value: short(row.technical?.averageVolume),
    },
    { label: "Reported shares / sample", value: short(s?.shares) },
    { label: "Reporting holders / sample", value: count(s?.holders) },
    { label: "Institutional ownership %", value: "Unavailable" },
  ];
  return (
    <>
      <p className={styles.muted}>
        {row.security.name ?? "Company metadata unavailable"} · Last refreshed:{" "}
        {row.refreshedAt ?? "No market data"}
      </p>
      {row.marketSource ? (
        <p className={styles.sub}>
          Market observations:{" "}
          <a href={row.marketSource} target="_blank" rel="noreferrer">
            Licensed source
          </a>
        </p>
      ) : null}
      <div className={styles.metrics}>
        {facts.map((f) => (
          <div className={styles.metric} key={f.label}>
            <div className={styles.metricLabel}>{f.label}</div>
            <div className={styles.metricValue}>{f.value}</div>
          </div>
        ))}
      </div>
      <div className={styles.sectionHead}>
        <h2>Quarterly disclosure evidence</h2>
        <select
          aria-label="Reporting periods"
          value={quarters}
          onChange={(e) => setQuarters(Number(e.target.value))}
        >
          <option value={4}>4 quarters</option>
          <option value={8}>8 quarters</option>
          <option value={100}>All available</option>
        </select>
      </div>
      <div className={styles.grid}>
        <section className={styles.section}>
          <h2>Reported institutional shares / tracked sample</h2>
          <EvidenceChart
            quarterly
            data={history.map((h) => ({
              date: h.reportDate,
              shares: h.shares,
            }))}
            series={[
              { key: "shares", name: "Quarter-end shares", color: "#6adbb1" },
            ]}
          />
        </section>
        <section className={styles.section}>
          <h2>Reporting holders and breadth</h2>
          <EvidenceChart
            quarterly
            data={history.map((h) => ({
              date: h.reportDate,
              holders: h.holders,
              newPositions: h.comparable ? h.newPositions : null,
              closedPositions: h.comparable ? h.closedPositions : null,
            }))}
            series={[
              { key: "holders", name: "Reporting holders", color: "#c7dbec" },
              {
                key: "newPositions",
                name: "New positions",
                color: "#6adbb1",
                bar: true,
              },
              {
                key: "closedPositions",
                name: "Closed positions",
                color: "#f28a91",
                bar: true,
              },
            ]}
          />
        </section>
        <section className={styles.section}>
          <h2>Reported shares added / reduced</h2>
          <EvidenceChart
            quarterly
            data={history.map((h) => ({
              date: h.reportDate,
              added: h.added,
              reduced: h.reduced === null ? null : -h.reduced,
            }))}
            series={[
              { key: "added", name: "Added", color: "#6adbb1", bar: true },
              { key: "reduced", name: "Reduced", color: "#f28a91", bar: true },
            ]}
          />
        </section>
        <section className={styles.section}>
          <h2>Ownership concentration / sample</h2>
          <EvidenceChart
            quarterly
            data={history.map((h) => ({
              date: h.reportDate,
              concentration: h.concentration,
            }))}
            series={[
              {
                key: "concentration",
                name: "Top five holders (% of tracked shares)",
                color: "#edc575",
              },
            ]}
          />
        </section>
        <section className={styles.section}>
          <h2>Price and volume / daily</h2>
          <EvidenceChart
            data={row.prices.map((b) => ({
              date: b.date,
              price: b.close,
              volume: b.volume,
            }))}
            series={[
              { key: "price", name: "Price", color: "#6adbb1" },
              {
                key: "volume",
                name: "Volume",
                color: "#64757e",
                bar: true,
                secondary: true,
              },
            ]}
          />
        </section>
        <section className={styles.section}>
          <h2>Evidence score history</h2>
          <EvidenceChart
            data={row.scoreHistory.map((h) => ({
              date: h.score.observedAt.slice(0,10),
              score: h.score.total,
            }))}
            series={[
              {
                key: "score",
                name: "Unvalidated observational score",
                color: "#c7dbec",
              },
            ]}
            empty={
              canShowSignals
                ? "No complete historical score observations."
                : "Directional score display is disabled by the global content policy."
            }
          />
        </section>
      </div>
      <section className={styles.section}>
        <h2>Reported positions</h2>
        <div className={styles.status} style={{ margin: "12px 0" }}>
          {[
            "New",
            "Increased",
            "Reduced",
            "Closed",
            "Unchanged",
            "Unverified",
          ].map((status) => (
            <span className={styles.badge} key={status}>
              {status}:{" "}
              {s
                ? count(s.changes.filter((c) => c.status === status).length)
                : "—"}
            </span>
          ))}
        </div>
        <HoldingsTable changes={s?.changes ?? []} />
      </section>
      <section className={styles.section}>
        <h2>Quantitative technical inference</h2>
        <p className={styles.muted} style={{ margin: "10px 0" }}>
          No indicator identifies a specific institutional transaction. Aligned,
          adjusted data is required.
        </p>
        <div className={styles.metrics}>
          {[
            "sma20",
            "sma50",
            "sma200",
            "rsi",
            "macd",
            "relativeVolume",
            "obv",
            "adl",
            "cmf",
            "relativeStrength",
          ].map((key) => (
            <div key={key} className={styles.metric}>
              <div className={styles.metricLabel}>{key.toUpperCase()}</div>
              <div className={styles.metricValue}>
                {count(
                  row.technical?.[
                    key as keyof NonNullable<typeof row.technical>
                  ] as number | undefined,
                  2,
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className={styles.section}>
        <h2>Explainable evidence components / {row.score.version}</h2>
        <p className={styles.muted} style={{ margin: "10px 0" }}>
          {row.score.label} · Confidence: {row.score.confidence}. Missing:{" "}
          {row.score.missing.join(", ") || "None"}. Initial weights are not
          predictively validated.
        </p>
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>COMPONENT</th>
                <th>WEIGHT</th>
                <th>COMPONENT SCORE</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(row.score.weights).map(([key, weight]) => (
                <tr key={key}>
                  <td>{key}</td>
                  <td>{weight}%</td>
                  <td>{count(row.score.components[key])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
function Filings({
  data,
  institution,
}: {
  data: ResearchView;
  institution?: string;
}) {
  return (
    <section className={styles.section}>
      <div className={styles.sectionHead}>
        <h2>Regulatory filing register</h2>
        <span className={styles.muted}>Filing date ≠ trade date</span>
      </div>
      <div className={styles.tableWrap}>
        <table>
          <thead>
            <tr>
              <th>FORM</th>
              <th>MANAGER</th>
              <th>REPORTING PERIOD</th>
              <th>FILED</th>
              <th>AMENDMENT</th>
              <th>INGESTION</th>
              <th>EVIDENCE</th>
            </tr>
          </thead>
          <tbody>
            {data.filings
              .filter((f) => !institution || f.cik === institution)
              .map((f) => (
                <tr key={f.accession}>
                  <td>
                    {f.form}
                    <div className={styles.sub}>
                      {/^4/.test(f.form)
                        ? "Insider activity, separate dataset"
                        : /^13F/.test(f.form)
                          ? "Quarter-end holdings"
                          : "Beneficial ownership disclosure"}
                    </div>
                  </td>
                  <td>
                    <Link href={`${root}/institutions/${f.cik}`}>
                      {data.institutions.find((i) => i.cik === f.cik)?.name ??
                        f.cik}
                    </Link>
                  </td>
                  <td>{f.report_date ?? "Not specified"}</td>
                  <td>{f.filed_date}</td>
                  <td>{f.amendment}</td>
                  <td>
                    <span className={styles.badge}>{f.status}</span>
                  </td>
                  <td>
                    <a href={f.source_url} target="_blank" rel="noreferrer">
                      Original SEC filing
                      <ArrowUpRight size={12} style={{ display: "inline" }} />
                    </a>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
        {!data.filings.length ? (
          <Empty
            title="No SEC filings ingested"
            detail="Add an institutional manager CIK, then run ingestion."
          />
        ) : null}
      </div>
    </section>
  );
}
function Feed({
  data,
  act,
  all = false,
}: {
  data: ResearchView;
  act: (body: Record<string, unknown>) => Promise<void>;
  all?: boolean;
}) {
  return (
    <>
      {data.alerts.slice(0, all ? 200 : 6).map((a) => (
        <article key={a.dedup_key} className={styles.feedItem}>
          <FileText size={17} className={styles.muted} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3>
              {a.ticker ? `${a.ticker} / ` : ""}
              {a.kind}
            </h3>
            <p>
              {data.institutions.find((i) => i.cik === a.cik)?.name ??
                "Reporting entity not mapped"}
              <br />
              Report period: {a.report_date ?? "Not specified"} · Filed:{" "}
              {a.filed_date ?? "Not applicable"}
              <br />
              Detected: {a.detected_at}
              <br />
              {String(
                a.evidence.note ??
                  "Review original evidence before interpretation.",
              )}
            </p>
            {typeof a.evidence.sourceUrl === "string" &&
            a.evidence.sourceUrl.startsWith("https://www.sec.gov/") ? (
              <a href={a.evidence.sourceUrl} target="_blank" rel="noreferrer">
                Original evidence
                <ArrowUpRight size={12} />
              </a>
            ) : null}
          </div>
          {!a.read_at ? (
            <button
              className={styles.iconButton}
              title="Mark notification read"
              aria-label="Mark notification read"
              onClick={() => act({ action: "readAlert", key: a.dedup_key })}
            >
              <Check size={14} />
            </button>
          ) : null}
        </article>
      ))}
      {!data.alerts.length ? (
        <Empty
          title="No new disclosures detected"
          detail="Alerts appear after verified filings or licensed market observations are processed."
        />
      ) : null}
    </>
  );
}
function Methodology({ weights }: { weights: Record<string, number> }) {
  return (
    <section className={`${styles.section} ${styles.method}`}>
      <h2>Evidence methodology / ii-evidence-1.0.0</h2>
      <p>
        13F positions are grouped by manager and reporting period. Restatements
        replace earlier snapshots; additive amendments add only distinct
        holdings. Overlapping additions, unresolved amendments, confidential
        omissions, missing prior quarters and unverified corporate-action
        coverage block comparisons. Options and principal-amount positions are
        excluded from ordinary share totals. Affiliated managers can still
        overlap; the sample is never presented as total institutional ownership.
      </p>
      <p>
        Ownership trend = 50 + 100 × net share change / prior shares. Breadth =
        50 + 50 × (increasing managers − reducing managers) / comparable
        managers. Significant holders are those representing at least 5% of the
        prior tracked share total. Their component uses the same change formula.
        Components are bounded to 0–100.
      </p>
      <p>
        Technical confirmation uses 50 + 30 × CMF(20) + 20 × sign(MACD
        histogram). Relative strength uses 50 + 2 × the 20-session performance
        difference against date-aligned SPY, compounded as a ratio. Quality
        falls with reporting-period age and incomplete comparisons. Indicators
        use adjusted bars only; relative volume compares the latest volume with
        the preceding 20 sessions, excluding the latest session.
      </p>
      <p>
        Weights:{" "}
        {Object.entries(weights)
          .map(([k, v]) => `${k} ${v}%`)
          .join(" · ")}
        . No overall score is calculated when a required component is absent.
        Strong classifications require at least three explicitly verified
        independent manager groups, comparable recent filings and supporting
        technical data. These initial weights and thresholds have not been
        historically validated. Scores are observations, not predictions.
      </p>
      <p>
        13D/13G beneficial ownership and Form 4 insider activity are kept
        separate from 13F share comparisons. Form 4 trade dates, where parsed,
        are not replaced with filing dates. Structured 13D/13G details require
        original-document review; the module does not infer undisclosed
        transaction flows.
      </p>
      <p>
        Public provider documents:{" "}
        <a
          href="https://www.sec.gov/about/developer-resources"
          target="_blank"
          rel="noreferrer"
        >
          SEC developer resources
        </a>{" "}
        ·{" "}
        <a
          href="https://www.sec.gov/rules-regulations/staff-guidance/frequently-asked-questions-about-form-13f"
          target="_blank"
          rel="noreferrer"
        >
          Form 13F FAQ
        </a>
      </p>
    </section>
  );
}
function Configuration({
  data,
  act,
  busy,
}: {
  data: ResearchView;
  act: (body: Record<string, unknown>) => Promise<void>;
  busy: boolean;
}) {
  function values(form: HTMLFormElement) {
    return Object.fromEntries(new FormData(form));
  }
  return (
    <>
      <section className={styles.section}>
        <h2>Provider status</h2>
        <p className={styles.muted} style={{ marginTop: 12 }}>
          SEC contact configured:{" "}
          {data.configuration.secConfigured ? "Yes" : "No"} · Managers:{" "}
          {data.institutions.length} · Identifier mappings:{" "}
          {data.configuration.mappings} · Licensed price bars:{" "}
          {data.configuration.marketBars}
        </p>
      </section>
      <div className={styles.formGrid}>
        <SplitHistoryCheck />
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            act({ action: "backfill13F", ...values(e.currentTarget) });
          }}
        >
          <h2>Historical 13F backfill</h2>
          <label>
            Reporting manager
            <select name="cik" required defaultValue="">
              <option value="" disabled>Select manager</option>
              {data.institutions.filter(manager => manager.enabled).map(manager => (
                <option key={manager.cik} value={manager.cik}>{manager.name}</option>
              ))}
            </select>
          </label>
          <label>
            Quarter-end date
            <input type="date" name="reportDate" required />
          </label>
          <label>
            SEC archive filename (optional)
            <input name="archive" maxLength={80} />
          </label>
          <button className={styles.button} disabled={busy || !data.institutions.length}>
            <Download size={16} /> Backfill quarter
          </button>
        </form>
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            act({ action: "securityMetadata", ...values(e.currentTarget) });
          }}
        >
          <h2>Verified company metadata</h2>
          <label>
            Ticker
            <input name="ticker" required />
          </label>
          <label>
            Company name
            <input name="name" maxLength={200} />
          </label>
          <label>
            Sector
            <input name="sector" maxLength={100} />
          </label>
          <label>
            Market capitalisation (USD)
            <input type="number" min={0} step="any" name="marketCap" />
          </label>
          <label>
            Verified source URL
            <input type="url" name="sourceUrl" required />
          </label>
          <button className={styles.button} disabled={busy}>
            Save sourced company facts
          </button>
        </form>
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            const v = values(e.currentTarget);
            act({ action: "watch", ...v });
          }}
        >
          <h2>Monitor a US-listed stock</h2>
          <label>
            Ticker
            <input name="ticker" required maxLength={15} />
          </label>
          <button className={styles.button} disabled={busy}>
            Add to watchlist
          </button>
        </form>
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            act({ action: "institution", ...values(e.currentTarget) });
          }}
        >
          <h2>Track an institutional manager</h2>
          <label>
            SEC CIK
            <input name="cik" required pattern="[0-9]{1,10}" maxLength={10} />
          </label>
          <button className={styles.button} disabled={busy}>
            Verify with SEC and add
          </button>
        </form>
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            act({ action: "identifier", ...values(e.currentTarget) });
          }}
        >
          <h2>Verified security identifier</h2>
          <label>
            Ticker
            <input name="ticker" required />
          </label>
          <label>
            CUSIP
            <input name="cusip" required minLength={9} maxLength={9} />
          </label>
          <label>
            Valid from
            <input type="date" name="validFrom" required />
          </label>
          <label>
            Valid to (optional)
            <input type="date" name="validTo" />
          </label>
          <label>
            Verified source URL
            <input type="url" name="sourceUrl" required />
          </label>
          <button className={styles.button} disabled={busy}>
            Save date-effective mapping
          </button>
        </form>
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            act({ action: "corporateAction", ...values(e.currentTarget) });
          }}
        >
          <h2>Record a verified stock split</h2>
          <label>
            Ticker
            <input name="ticker" required />
          </label>
          <label>
            Effective date
            <input type="date" name="date" required />
          </label>
          <label>
            New shares per old share
            <input
              type="number"
              min="0.000001"
              step="any"
              name="ratio"
              required
            />
          </label>
          <label>
            Corporate-action source URL
            <input type="url" name="sourceUrl" required />
          </label>
          <button className={styles.button} disabled={busy}>
            Save split evidence
          </button>
        </form>
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            act({
              action: "verifyActions",
              ...values(e.currentTarget),
              confirmed: true,
            });
          }}
        >
          <h2>Confirm corporate-action coverage</h2>
          <p>
            Only after reviewing complete action history through the selected
            date. An unrecorded split can produce a false ownership change.
          </p>
          <label>
            Ticker
            <input name="ticker" required />
          </label>
          <label>
            Verified through
            <input type="date" name="date" required />
          </label>
          <label>
            Review source URL
            <input type="url" name="sourceUrl" required />
          </label>
          <label className={styles.check}>
            <input type="checkbox" required />I reviewed split and identifier
            continuity.
          </label>
          <button className={styles.button} disabled={busy}>
            Record review attestation
          </button>
        </form>
        <form
          className={styles.form}
          onSubmit={async (e) => {
            e.preventDefault();
            const v = values(e.currentTarget);
            const file = v.file as File;
            try {
              await act({
                action: "prices",
                ticker: v.ticker,
                sourceUrl: v.sourceUrl,
                adjusted: v.adjusted === "on",
                licensed: v.licensed === "on",
                bars: JSON.parse(await file.text()),
              });
            } catch {
              window.alert("Select a valid JSON array of OHLCV bars.");
            }
          }}
        >
          <h2>Licensed historical market data</h2>
          <label>
            Ticker (include SPY benchmark)
            <input name="ticker" required />
          </label>
          <label>
            OHLCV JSON file
            <input
              type="file"
              name="file"
              accept="application/json,.json"
              required
            />
          </label>
          <label>
            Licensed provider source URL
            <input type="url" name="sourceUrl" required />
          </label>
          <label className={styles.check}>
            <input type="checkbox" name="adjusted" />
            All OHLCV fields are consistently split-adjusted
          </label>
          <label className={styles.check}>
            <input type="checkbox" name="licensed" required />I have the
            necessary data usage rights
          </label>
          <button className={styles.button} disabled={busy}>
            Import price history
          </button>
        </form>
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            const v = values(e.currentTarget);
            act({
              action: "settings",
              weights: Object.fromEntries(
                Object.keys(data.configuration.weights).map((k) => [
                  k,
                  Number(v[k]),
                ]),
              ),
              alertThreshold: Number(v.alertThreshold),
              volumeThreshold: Number(v.volumeThreshold),
            });
          }}
        >
          <h2>Versioned evidence weights</h2>
          {Object.entries(data.configuration.weights).map(([key, value]) => (
            <label key={key}>
              {key} %
              <input
                type="number"
                name={key}
                min={0}
                max={100}
                step="any"
                defaultValue={value}
                required
              />
            </label>
          ))}
          <label>
            Significant holding-change alert %
            <input
              name="alertThreshold"
              type="number"
              min={1}
              defaultValue={data.configuration.alertThreshold}
              required
            />
          </label>
          <label>
            Unusual relative-volume multiple
            <input
              name="volumeThreshold"
              type="number"
              min={1}
              step="0.1"
              defaultValue={data.configuration.volumeThreshold}
              required
            />
          </label>
          <button className={styles.button} disabled={busy}>
            Save research configuration
          </button>
        </form>
      </div>
      <section className={styles.section}>
        <h2>Ingestion history</h2>
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>STARTED</th>
                <th>STATUS</th>
                <th>FILINGS</th>
                <th>DETAIL</th>
              </tr>
            </thead>
            <tbody>
              {data.jobs.map((j) => (
                <tr key={j.id}>
                  <td>{j.started_at}</td>
                  <td>{j.status}</td>
                  <td>{j.processed}</td>
                  <td style={{ whiteSpace: "normal", maxWidth: 480 }}>
                    {j.error ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data.jobs.length ? (
            <Empty title="No ingestion runs recorded" />
          ) : null}
        </div>
      </section>
    </>
  );
}
