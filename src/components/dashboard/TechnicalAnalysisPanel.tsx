"use client";

import { useState } from "react";
import type { OhlcDaily } from "@/lib/types";
import { buildTechnicalAnalysis, buildRangeLevels, buildRangeAdvice, getRangeRead, getRangeReadClass, getRangeBarClass, toCandles, getToneClass, formatSignedPercent } from "@/lib/technical/analysis";
import { DataFreshness, latestFreshness } from "./DataFreshness";
import { formatCurrency, formatNumber, formatPercent } from "./format";
import { SupportResistancePanel } from "./SupportResistancePanel";

type Props = {
  activeSubTab: TechnicalSubTab;
  ohlc: OhlcDaily[];
  showDataSource?: boolean;
};

type SignalTone = "bullish" | "bearish" | "neutral";

type SignalItem = {
  label: string;
  value: string;
  verdict: string;
  tone: SignalTone;
};

type Candle = {
  close: number;
  date: string;
  high: number;
  low: number;
  open: number;
  volume: number | null;
};

type StopLossRead = {
  balanced: StopLossMethod;
  confidence: "High" | "Medium" | "Low";
  methods: StopLossMethod[];
  position: StopLossMethod;
  shortTerm: StopLossMethod;
  summary: string;
  suggested: StopLossMethod;
};

type StopLossMethod = {
  label: string;
  price: number;
  riskPercent: number;
  detail: string;
  method: string;
  weight: number;
};

type LimitAnalysisRead = {
  balanced: LimitMethod;
  confidence: "High" | "Medium" | "Low";
  methods: LimitMethod[];
  position: LimitMethod;
  shortTerm: LimitMethod;
  summary: string;
  suggested: LimitMethod;
};

type LimitMethod = {
  detail: string;
  gainPercent: number;
  label: string;
  method: string;
  price: number;
  weight: number;
};

type RangeAdvice = {
  action: string;
  details: Array<{
    label: string;
    value: string;
    tone?: SignalTone;
  }>;
  summary: string;
  title: string;
  tone: SignalTone;
};

export type TechnicalSubTab =
  | "stop-limit"
  | "ranges"
  | "signals"
  | "moving-averages"
  | "momentum"
  | "support-resistance";

const technicalTabs: Array<{ id: TechnicalSubTab; label: string }> = [
  { id: "stop-limit", label: "Stop & Limit" },
  { id: "ranges", label: "Range Lows / Highs" },
  { id: "signals", label: "Signals" },
  { id: "moving-averages", label: "Moving Averages" },
  { id: "momentum", label: "Momentum" },
  { id: "support-resistance", label: "Support / Resistance" },
];

export function TechnicalAnalysisPanel({
  activeSubTab,
  ohlc,
  showDataSource = false,
}: Props) {
  const [activeSection, setActiveSection] = useState<TechnicalSubTab>(activeSubTab);
  const freshness = latestFreshness(ohlc);
  const candles = toCandles(ohlc);

  if (candles.length < 30) {
    return (
      <section className="rounded-lg border app-surface p-4 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-sm font-semibold app-heading">Technical Analysis</h2>
            <p className="mt-1 text-xs leading-5 app-muted">
              More daily OHLC history is needed to calculate moving averages, RSI, MACD, and trend signals.
            </p>
            <div className="mt-2">
              <DataFreshness
                fetchedAt={freshness?.fetchedAt}
                showSource={showDataSource}
                source={freshness?.source}
              />
            </div>
          </div>
        </div>
        <div className="mt-3 rounded-lg border app-subtle p-3 text-xs app-muted">
          Refresh market data or load a ticker with at least 30 cached trading days.
        </div>
      </section>
    );
  }

  const analysis = buildTechnicalAnalysis(candles);

  return (
    <section className="rounded-lg border app-surface p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-sm font-semibold app-heading">Technical Analysis</h2>
          <p className="mt-1 text-xs leading-5 app-muted">
            Trend, momentum, moving average, volatility, and volume read from cached daily candles.
          </p>
          <div className="mt-2">
            <DataFreshness
              fetchedAt={freshness?.fetchedAt}
              showSource={showDataSource}
              source={freshness?.source}
            />
          </div>
        </div>
        <div className="rounded-lg border app-subtle px-3 py-2.5 lg:min-w-[320px]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-medium uppercase tracking-normal app-muted">
                Summary
              </div>
              <div className={`mt-1 text-base font-semibold ${getToneClass(analysis.tone)}`}>
                {analysis.summary}
              </div>
              <div className="mt-1 text-xs app-muted">{analysis.verdict}</div>
            </div>
            <SignalMeter score={analysis.score} />
          </div>
        </div>
      </div>

      <div className="mt-3 overflow-x-auto rounded-lg border app-surface p-1">
        <div className="flex min-w-max gap-1">
          {technicalTabs.map((tab) => (
            <button
              key={tab.id}
              aria-current={activeSection === tab.id ? "page" : undefined}
              className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition ${
                activeSection === tab.id
                  ? "app-primary-button"
                  : "app-muted hover:bg-[color-mix(in_srgb,var(--app-accent)_8%,transparent)] hover:text-[var(--app-text)]"
              }`}
              onClick={() => setActiveSection(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeSection === "stop-limit" ? (
        <StopLimitPanel
          limitAnalysis={analysis.limitAnalysis}
          latestClose={analysis.latestClose}
          stopLoss={analysis.stopLoss}
        />
      ) : null}

      {activeSection === "ranges" ? (
        <RangeLevelsPanel candles={candles} latestClose={analysis.latestClose} />
      ) : null}

      {activeSection === "signals" ? (
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {analysis.signals.map((signal) => (
            <SignalCard key={signal.label} signal={signal} />
          ))}
        </div>
      ) : null}

      {activeSection === "moving-averages" ? (
        <MovingAveragesPanel
          latestClose={analysis.latestClose}
          movingAverages={analysis.movingAverages}
        />
      ) : null}

      {activeSection === "momentum" ? (
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <RsiGauge value={analysis.rsi} />
          <MacdBars values={analysis.macd.histogram.slice(-18)} tone={analysis.macdTone} />
        </div>
      ) : null}

      {activeSection === "support-resistance" ? (
        <div className="mt-3">
          <SupportResistancePanel ohlc={ohlc} showDataSource={showDataSource} />
        </div>
      ) : null}
    </section>
  );
}

function RangeLevelsPanel({
  candles,
  latestClose,
}: {
  candles: Candle[];
  latestClose: number;
}) {
  const ranges = buildRangeLevels(candles, latestClose);
  const advice = buildRangeAdvice(ranges, latestClose);

  return (
    <div className="mt-3 rounded-lg border app-subtle p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-normal app-muted">
            Interval lows / highs
          </div>
          <p className="mt-1 text-xs leading-5 app-muted">
            Shows the absolute low and high inside each cached trading interval. These are period
            boundaries, while support/resistance levels are nearest actionable price areas.
          </p>
        </div>
        <div className="rounded-lg border app-surface px-3 py-2 text-right">
          <div className="text-[11px] font-medium uppercase tracking-normal app-muted">
            Latest close
          </div>
          <div className="text-sm font-semibold app-heading">{formatCurrency(latestClose)}</div>
        </div>
      </div>

      <RangeAdvicePanel advice={advice} />

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[780px] border-separate border-spacing-0 text-left text-xs">
          <thead className="app-surface">
            <tr className="uppercase tracking-normal app-muted">
              <th className="border-b app-border-soft px-3 py-2 font-semibold">Interval</th>
              <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Interval low</th>
              <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">Interval high</th>
              <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">From low</th>
              <th className="border-b app-border-soft px-3 py-2 text-right font-semibold">From high</th>
              <th className="border-b app-border-soft px-3 py-2 font-semibold">Position</th>
              <th className="border-b app-border-soft px-3 py-2 font-semibold">Read</th>
            </tr>
          </thead>
          <tbody>
            {ranges.map((range) => (
              <tr
                key={range.label}
                className="app-muted transition hover:bg-[var(--app-surface-muted)]"
              >
                <td className="border-b app-border-soft px-3 py-2.5 font-semibold app-heading">
                  {range.label}
                </td>
                <td className="border-b app-border-soft px-3 py-2.5 text-right">
                  {formatCurrency(range.low)}
                </td>
                <td className="border-b app-border-soft px-3 py-2.5 text-right">
                  {formatCurrency(range.high)}
                </td>
                <td className="border-b app-border-soft px-3 py-2.5 text-right app-positive">
                  +{formatPercent(range.fromLowPercent, 1)}
                </td>
                <td className="border-b app-border-soft px-3 py-2.5 text-right app-negative">
                  {formatPercent(range.fromHighPercent, 1)}
                </td>
                <td className="border-b app-border-soft px-3 py-2.5">
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--app-border-soft)]">
                    <div
                      className={`h-full rounded-full ${getRangeBarClass(range.positionPercent)}`}
                      style={{ width: `${Math.max(4, Math.min(100, range.positionPercent))}%` }}
                    />
                  </div>
                  <div className="mt-1 text-[11px] app-muted">
                    {formatPercent(range.positionPercent, 0)} of range
                  </div>
                </td>
                <td className="border-b app-border-soft px-3 py-2.5">
                  <span className={getRangeReadClass(range.positionPercent)}>
                    {getRangeRead(range.positionPercent)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RangeAdvicePanel({ advice }: { advice: RangeAdvice }) {
  return (
    <div className="mt-3 rounded-lg border app-surface p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-normal app-muted">
            Range advice
          </div>
          <div className={`mt-1 text-sm font-semibold ${getToneClass(advice.tone)}`}>
            {advice.title}
          </div>
          <p className="mt-1 max-w-3xl text-xs leading-5 app-muted">{advice.summary}</p>
          <p className="mt-2 text-xs font-medium app-heading">{advice.action}</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[420px]">
          {advice.details.map((detail) => (
            <div key={detail.label} className="rounded-lg border app-subtle px-3 py-2">
              <div className="text-[11px] font-medium uppercase tracking-normal app-muted">
                {detail.label}
              </div>
              <div className={`mt-1 text-sm font-semibold ${detail.tone ? getToneClass(detail.tone) : "app-heading"}`}>
                {detail.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StopLimitPanel({
  latestClose,
  limitAnalysis,
  stopLoss,
}: {
  latestClose: number;
  limitAnalysis: LimitAnalysisRead;
  stopLoss: StopLossRead;
}) {
  const rewardPercent = limitAnalysis.balanced.gainPercent;
  const riskPercent = Math.abs(stopLoss.balanced.riskPercent);
  const riskReward = riskPercent === 0 ? null : rewardPercent / riskPercent;

  return (
    <div className="mt-3 space-y-3">
      <div className="grid gap-3 xl:grid-cols-2">
        <StopLossPanel stopLoss={stopLoss} />
        <LimitAnalysisPanel
          latestClose={latestClose}
          limitAnalysis={limitAnalysis}
          riskReward={riskReward}
        />
      </div>
    </div>
  );
}

function StopLossPanel({ stopLoss }: { stopLoss: StopLossRead }) {
  const prices = stopLoss.methods.map((method) => method.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const range = Math.max(max - min, 0.01);

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-[color-mix(in_srgb,var(--app-negative)_30%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-negative)_6%,var(--app-surface))] p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-normal app-muted">
              Which stop loss is good?
            </div>
            <div className="mt-1 text-sm font-semibold app-heading">
              Balanced choice: <span className="app-negative">{formatCurrency(stopLoss.balanced.price)}</span>
            </div>
            <p className="mt-1 max-w-3xl text-xs leading-5 app-muted">{stopLoss.summary}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:min-w-[280px]">
            <StopLossStat label="Balanced risk" value={formatSignedPercent(stopLoss.balanced.riskPercent)} />
            <StopLossStat label="Confidence" value={stopLoss.confidence} />
          </div>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <RecommendationCard
            label="Short-term trade"
            method={stopLoss.shortTerm}
            note="Tighter exit. Good if you want to protect capital quickly and can re-enter later."
          />
          <RecommendationCard
            label="Balanced swing"
            method={stopLoss.balanced}
            note="Best default choice. It gives the stock room to move without accepting the widest drawdown."
            recommended
          />
          <RecommendationCard
            label="Position trade"
            method={stopLoss.position}
            note="Wider exit. Better for longer holds, but risk is larger before the stop triggers."
          />
        </div>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {stopLoss.methods.map((method) => {
          const position = ((method.price - min) / range) * 100;

          return (
            <div
              key={method.method}
              className={`rounded-lg border px-3 py-2.5 ${
                method.method === stopLoss.balanced.method
                  ? "border-[color-mix(in_srgb,var(--app-negative)_45%,var(--app-border))] app-surface"
                  : "app-subtle"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-[11px] font-medium uppercase tracking-normal app-muted">
                  {method.label}
                </div>
                {method.method === stopLoss.balanced.method ? (
                  <span className="rounded-full bg-[color-mix(in_srgb,var(--app-negative)_12%,transparent)] px-2 py-0.5 text-[10px] font-semibold app-negative">
                    Balanced
                  </span>
                ) : null}
              </div>
              <div className="mt-1 flex items-baseline justify-between gap-2">
                <div className="text-sm font-semibold app-heading">{formatCurrency(method.price)}</div>
                <div className="text-xs font-semibold app-negative">
                  {formatSignedPercent(method.riskPercent)}
                </div>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--app-border-soft)]">
                <div
                  className="h-full rounded-full bg-[var(--app-negative)]"
                  style={{ width: `${Math.max(8, Math.min(100, position))}%` }}
                />
              </div>
              <p className="mt-2 text-xs leading-5 app-muted">{method.detail}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LimitAnalysisPanel({
  latestClose,
  limitAnalysis,
  riskReward,
}: {
  latestClose: number;
  limitAnalysis: LimitAnalysisRead;
  riskReward: number | null;
}) {
  const prices = limitAnalysis.methods.map((method) => method.price);
  const min = Math.min(...prices, latestClose);
  const max = Math.max(...prices, latestClose);
  const range = Math.max(max - min, 0.01);

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-[color-mix(in_srgb,var(--app-positive)_30%,var(--app-border))] bg-[color-mix(in_srgb,var(--app-positive)_6%,var(--app-surface))] p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-normal app-muted">
              Limit / target analysis
            </div>
            <div className="mt-1 text-sm font-semibold app-heading">
              Balanced limit: <span className="app-positive">{formatCurrency(limitAnalysis.balanced.price)}</span>
            </div>
            <p className="mt-1 max-w-3xl text-xs leading-5 app-muted">
              {limitAnalysis.summary}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:min-w-[280px]">
            <StopLossStat
              label="Balanced upside"
              value={`+${formatPercent(limitAnalysis.balanced.gainPercent, 1)}`}
            />
            <StopLossStat
              label="Reward / risk"
              value={riskReward === null ? "-" : `${formatNumber(riskReward, 2)}x`}
            />
          </div>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-3">
          <LimitRecommendationCard
            label="Quick limit"
            method={limitAnalysis.shortTerm}
            note="Closer target. Useful when momentum is uncertain or you want faster profit-taking."
          />
          <LimitRecommendationCard
            label="Balanced target"
            method={limitAnalysis.balanced}
            note="Best default choice. It blends resistance, volatility, moving averages, and fixed target methods."
            recommended
          />
          <LimitRecommendationCard
            label="Stretch target"
            method={limitAnalysis.position}
            note="Wider target. Better only when trend, volume, and market conditions keep improving."
          />
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {limitAnalysis.methods.map((method) => {
          const position = ((method.price - min) / range) * 100;

          return (
            <div
              key={method.method}
              className={`rounded-lg border px-3 py-2.5 ${
                method.method === limitAnalysis.balanced.method
                  ? "border-[color-mix(in_srgb,var(--app-positive)_45%,var(--app-border))] app-surface"
                  : "app-subtle"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-[11px] font-medium uppercase tracking-normal app-muted">
                  {method.label}
                </div>
                {method.method === limitAnalysis.balanced.method ? (
                  <span className="rounded-full bg-[color-mix(in_srgb,var(--app-positive)_12%,transparent)] px-2 py-0.5 text-[10px] font-semibold app-positive">
                    Balanced
                  </span>
                ) : null}
              </div>
              <div className="mt-1 flex items-baseline justify-between gap-2">
                <div className="text-sm font-semibold app-heading">{formatCurrency(method.price)}</div>
                <div className="text-xs font-semibold app-positive">
                  +{formatPercent(method.gainPercent, 1)}
                </div>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--app-border-soft)]">
                <div
                  className="h-full rounded-full bg-[var(--app-positive)]"
                  style={{ width: `${Math.max(8, Math.min(100, position))}%` }}
                />
              </div>
              <p className="mt-2 text-xs leading-5 app-muted">{method.detail}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LimitRecommendationCard({
  label,
  method,
  note,
  recommended = false,
}: {
  label: string;
  method: LimitMethod;
  note: string;
  recommended?: boolean;
}) {
  return (
    <div className={`rounded-lg border px-3 py-2.5 ${recommended ? "app-surface" : "app-subtle"}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-normal app-muted">
          {label}
        </div>
        {recommended ? (
          <span className="rounded-full bg-[color-mix(in_srgb,var(--app-positive)_12%,transparent)] px-2 py-0.5 text-[10px] font-semibold app-positive">
            Good default
          </span>
        ) : null}
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-2">
        <div className="text-sm font-semibold app-heading">{formatCurrency(method.price)}</div>
        <div className="text-xs font-semibold app-positive">
          +{formatPercent(method.gainPercent, 1)}
        </div>
      </div>
      <p className="mt-2 text-xs leading-5 app-muted">
        {method.label}. {note}
      </p>
    </div>
  );
}

function RecommendationCard({
  label,
  method,
  note,
  recommended = false,
}: {
  label: string;
  method: StopLossMethod;
  note: string;
  recommended?: boolean;
}) {
  return (
    <div className={`rounded-lg border px-3 py-2.5 ${recommended ? "app-surface" : "app-subtle"}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] font-semibold uppercase tracking-normal app-muted">
          {label}
        </div>
        {recommended ? (
          <span className="rounded-full bg-[color-mix(in_srgb,var(--app-positive)_12%,transparent)] px-2 py-0.5 text-[10px] font-semibold app-positive">
            Good default
          </span>
        ) : null}
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-2">
        <div className="text-sm font-semibold app-heading">{formatCurrency(method.price)}</div>
        <div className="text-xs font-semibold app-negative">
          {formatSignedPercent(method.riskPercent)}
        </div>
      </div>
      <p className="mt-2 text-xs leading-5 app-muted">
        {method.label}. {note}
      </p>
    </div>
  );
}

function StopLossStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border app-subtle px-3 py-2">
      <div className="text-[11px] font-medium app-muted">{label}</div>
      <div className="mt-1 text-sm font-semibold app-heading">{value}</div>
    </div>
  );
}

function MovingAveragesPanel({
  latestClose,
  movingAverages,
}: {
  latestClose: number;
  movingAverages: Array<{
    distance: number | null;
    label: string;
    tone: SignalTone;
    value: number | null;
  }>;
}) {
  return (
    <div className="mt-3 rounded-lg border app-subtle p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-normal app-muted">
            Moving averages
          </div>
          <div className="mt-1 text-xs app-muted">
            Price compared with common short, medium, and long trend averages.
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] font-medium uppercase tracking-normal app-muted">
            Last close
          </div>
          <div className="text-sm font-semibold app-heading">
            {formatCurrency(latestClose)}
          </div>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {movingAverages.map((ma) => (
          <MovingAverageRow key={ma.label} ma={ma} />
        ))}
      </div>
    </div>
  );
}

function SignalCard({ signal }: { signal: SignalItem }) {
  return (
    <div className="rounded-lg border app-subtle px-3 py-2.5">
      <div className="text-[11px] font-medium uppercase tracking-normal app-muted">
        {signal.label}
      </div>
      <div className={`mt-1 text-sm font-semibold ${getToneClass(signal.tone)}`}>
        {signal.value}
      </div>
      <div className="mt-1 text-xs leading-5 app-muted">{signal.verdict}</div>
    </div>
  );
}

function MovingAverageRow({
  ma,
}: {
  ma: { distance: number | null; label: string; tone: SignalTone; value: number | null };
}) {
  const width = ma.distance === null ? 0 : Math.min(Math.abs(ma.distance) * 5, 100);

  return (
    <div className="grid gap-2 sm:grid-cols-[90px_1fr_90px] sm:items-center">
      <div className="text-xs font-semibold app-heading">{ma.label}</div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--app-border-soft)]">
        <div
          className={`h-full rounded-full ${
            ma.tone === "bullish"
              ? "bg-[var(--app-positive)]"
              : ma.tone === "bearish"
                ? "bg-[var(--app-negative)]"
                : "bg-[var(--app-text-soft)]"
          }`}
          style={{ width: `${width}%` }}
        />
      </div>
      <div className="text-right text-xs app-muted">
        {formatCurrency(ma.value)}
        <span className={`ml-1 ${getToneClass(ma.tone)}`}>
          {ma.distance === null ? "" : formatSignedPercent(ma.distance)}
        </span>
      </div>
    </div>
  );
}

function SignalMeter({ score }: { score: number }) {
  const normalized = Math.max(0, Math.min(100, ((score + 6) / 12) * 100));

  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border app-surface">
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full text-xs font-semibold app-heading"
        style={{
          background: `conic-gradient(var(--app-accent) ${normalized}%, var(--app-border-soft) 0)`,
        }}
      >
        {Math.round(normalized)}
      </div>
    </div>
  );
}

function RsiGauge({ value }: { value: number | null }) {
  const left = value === null ? 50 : Math.max(0, Math.min(100, value));
  const tone = value === null ? "neutral" : value >= 70 ? "bearish" : value <= 30 ? "bullish" : "neutral";

  return (
    <div className="rounded-lg border app-subtle p-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-normal app-muted">RSI 14</div>
          <div className={`mt-1 text-sm font-semibold ${getToneClass(tone)}`}>
            {value === null ? "-" : formatNumber(value, 1)}
          </div>
        </div>
        <div className="text-right text-xs app-muted">
          {value === null
            ? "Need more data"
            : value >= 70
              ? "Overbought"
              : value <= 30
                ? "Oversold"
                : "Neutral range"}
        </div>
      </div>
      <div className="relative mt-3 h-2 rounded-full bg-[linear-gradient(90deg,var(--app-positive),var(--app-border),var(--app-negative))]">
        <div
          className="absolute top-1/2 h-4 w-1 -translate-y-1/2 rounded-full bg-[var(--app-text)]"
          style={{ left: `${left}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-[10px] app-muted">
        <span>30</span>
        <span>50</span>
        <span>70</span>
      </div>
    </div>
  );
}

function MacdBars({ values, tone }: { tone: SignalTone; values: number[] }) {
  const max = Math.max(...values.map((value) => Math.abs(value)), 1);

  return (
    <div className="rounded-lg border app-subtle p-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-normal app-muted">MACD</div>
          <div className={`mt-1 text-sm font-semibold ${getToneClass(tone)}`}>
            {tone === "bullish" ? "Positive momentum" : tone === "bearish" ? "Negative momentum" : "Flat"}
          </div>
        </div>
      </div>
      <div className="mt-3 flex h-16 items-center gap-1">
        {values.map((value, index) => (
          <div key={`${value}-${index}`} className="flex h-full flex-1 items-center">
            <div
              className={`w-full rounded-sm ${value >= 0 ? "bg-[var(--app-positive)]" : "bg-[var(--app-negative)]"}`}
              style={{
                height: `${Math.max(8, (Math.abs(value) / max) * 100)}%`,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
