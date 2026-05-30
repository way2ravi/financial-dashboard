"use client";

import { useState } from "react";
import type { OhlcDaily } from "@/lib/types";
import { wilderRsi } from "@/lib/technical/indicators";
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

export type TechnicalSubTab =
  | "stop-limit"
  | "signals"
  | "moving-averages"
  | "momentum"
  | "support-resistance";

const technicalTabs: Array<{ id: TechnicalSubTab; label: string }> = [
  { id: "stop-limit", label: "Stop & Limit" },
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

function buildTechnicalAnalysis(candles: Candle[]) {
  const closes = candles.map((candle) => candle.close);
  const latest = candles.at(-1)!;
  const latestClose = latest.close;
  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const sma200 = sma(closes, 200);
  const ema20 = latestEma(closes, 20);
  const rsi = wilderRsi(closes, 14);
  const macd = calculateMacd(closes);
  const bollinger = calculateBollinger(closes, 20);
  const volumeSignal = calculateVolumeSignal(candles);
  const stopLoss = calculateStopLoss(candles, latestClose, sma20);
  const limitAnalysis = calculateLimitAnalysis(candles, latestClose, sma20, bollinger.upper);
  const movingAverages = [
    toMovingAverage("SMA 20", sma20, latestClose),
    toMovingAverage("EMA 20", ema20, latestClose),
    toMovingAverage("SMA 50", sma50, latestClose),
    toMovingAverage("SMA 200", sma200, latestClose),
  ];
  const macdLast = macd.histogram.at(-1) ?? null;
  const macdPrev = macd.histogram.at(-2) ?? null;
  const macdTone: SignalTone =
    macdLast === null ? "neutral" : macdLast > 0 ? "bullish" : macdLast < 0 ? "bearish" : "neutral";
  let score = 0;

  movingAverages.forEach((ma) => {
    if (ma.tone === "bullish") score += ma.label === "SMA 200" ? 2 : 1;
    if (ma.tone === "bearish") score -= ma.label === "SMA 200" ? 2 : 1;
  });
  if (rsi !== null && rsi > 70) score -= 1;
  if (rsi !== null && rsi < 30) score += 1;
  if (macdTone === "bullish") score += 1;
  if (macdTone === "bearish") score -= 1;
  if (volumeSignal.tone === "bullish") score += 1;
  if (volumeSignal.tone === "bearish") score -= 1;

  const tone: SignalTone = score >= 3 ? "bullish" : score <= -3 ? "bearish" : "neutral";
  const summary =
    tone === "bullish" ? "Bullish bias" : tone === "bearish" ? "Bearish bias" : "Mixed / neutral";
  const verdict =
    tone === "bullish"
      ? "Trend and momentum lean positive, but confirm with volume and support levels."
      : tone === "bearish"
        ? "Trend or momentum is weak; wait for a reclaim of key averages or stronger volume."
        : "Signals are mixed. This is better treated as a watchlist setup than a clear entry.";
  const rsiTone: SignalTone =
    rsi === null ? "neutral" : rsi >= 70 ? "bearish" : rsi <= 30 ? "bullish" : "neutral";
  const bollingerTone = getBollingerTone(latestClose, bollinger.lower, bollinger.upper);
  const signals: SignalItem[] = [
    {
      label: "Trend",
      value: getTrendValue(movingAverages),
      verdict: getTrendVerdict(movingAverages),
      tone: getTrendTone(movingAverages),
    },
    {
      label: "Momentum",
      value: rsi === null ? "RSI unavailable" : `RSI ${formatNumber(rsi, 1)}`,
      verdict:
        rsi === null
          ? "Need more closing prices."
          : rsi >= 70
            ? "Potentially overbought; pullback risk is higher."
            : rsi <= 30
              ? "Potentially oversold; bounce risk is higher."
              : "Momentum is in a normal range.",
      tone: rsiTone,
    },
    {
      label: "MACD",
      value: macdLast === null ? "Unavailable" : formatNumber(macdLast, 3),
      verdict:
        macdLast !== null && macdPrev !== null && macdLast > macdPrev
          ? "Momentum is improving."
          : macdLast !== null && macdPrev !== null && macdLast < macdPrev
            ? "Momentum is fading."
            : "Momentum is flat or unavailable.",
      tone: macdTone,
    },
    {
      label: "Volatility / volume",
      value: bollinger.label,
      verdict: `${bollinger.verdict} ${volumeSignal.verdict}`,
      tone: bollingerTone === "neutral" ? volumeSignal.tone : bollingerTone,
    },
  ];

  return {
    latestClose,
    macd,
    macdTone,
    movingAverages,
    rsi,
    score,
    signals,
    summary,
    limitAnalysis,
    stopLoss,
    tone,
    verdict,
  };
}

function calculateLimitAnalysis(
  candles: Candle[],
  latestClose: number,
  sma20: number | null,
  upperBand: number | null
): LimitAnalysisRead {
  const atr = calculateAtr(candles, 14);
  const sma50 = sma(candles.map((candle) => candle.close), 50);
  const recentHighs = candles
    .slice(-90)
    .map((candle) => candle.high)
    .filter((high) => high > latestClose)
    .sort((a, b) => a - b);
  const nearestResistance = recentHighs[0] ?? null;
  const swingHigh = Math.max(...candles.slice(-20).map((candle) => candle.high));
  const wideSwingHigh = Math.max(...candles.slice(-60).map((candle) => candle.high));
  const rawMethods = [
    {
      detail: "Uses the nearest recent resistance area with a small buffer below it.",
      label: "Resistance-based",
      method: "resistance",
      price: nearestResistance === null ? null : nearestResistance * 0.99,
      weight: 3,
    },
    {
      detail: "Uses one average true range above the latest close for a near-term target.",
      label: "ATR near target",
      method: "atr-1",
      price: atr === null ? null : latestClose + atr,
      weight: 2,
    },
    {
      detail: "Uses two average true ranges above the latest close for a wider target.",
      label: "ATR stretch",
      method: "atr-2",
      price: atr === null ? null : latestClose + atr * 2,
      weight: 2,
    },
    {
      detail: "Uses the upper Bollinger Band as a volatility-aware upside zone.",
      label: "Bollinger upper",
      method: "bollinger-upper",
      price: upperBand,
      weight: 2,
    },
    {
      detail: "Uses the latest 20-day high as a practical first profit-taking area.",
      label: "20-day high",
      method: "swing-high",
      price: Number.isFinite(swingHigh) ? swingHigh * 0.99 : null,
      weight: 2,
    },
    {
      detail: "Uses the latest 60-day high for a longer position target.",
      label: "60-day high",
      method: "wide-swing-high",
      price: Number.isFinite(wideSwingHigh) ? wideSwingHigh * 0.985 : null,
      weight: 1,
    },
    {
      detail: "Uses the 20-day average as a mean-reversion target when price is below it.",
      label: "SMA 20 reclaim",
      method: "sma20",
      price: sma20 === null ? null : sma20 * 1.02,
      weight: 1,
    },
    {
      detail: "Uses the 50-day average as a wider trend-reclaim target.",
      label: "SMA 50 reclaim",
      method: "sma50",
      price: sma50 === null ? null : sma50 * 1.02,
      weight: 1,
    },
    {
      detail: "Uses a simple 10% upside target when chart levels are limited.",
      label: "Fixed 10%",
      method: "fixed-10",
      price: latestClose * 1.1,
      weight: 1,
    },
  ];
  const methods = rawMethods
    .filter((candidate): candidate is Omit<LimitMethod, "gainPercent"> =>
      candidate.price !== null && candidate.price > latestClose
    )
    .map((method) => ({
      ...method,
      gainPercent: ((method.price - latestClose) / latestClose) * 100,
    }))
    .sort((a, b) => a.price - b.price);
  const fallback: LimitMethod = {
    detail: "Uses a 10% fallback because overhead resistance data is limited.",
    gainPercent: 10,
    label: "Fixed 10%",
    method: "fixed-10",
    price: latestClose * 1.1,
    weight: 1,
  };
  const availableMethods = methods.length > 0 ? methods : [fallback];
  const weightedPrice =
    availableMethods.reduce((sum, method) => sum + method.price * method.weight, 0) /
    availableMethods.reduce((sum, method) => sum + method.weight, 0);
  const suggested =
    availableMethods
      .map((method) => ({
        ...method,
        distanceFromWeighted: Math.abs(method.price - weightedPrice),
      }))
      .sort((a, b) => a.distanceFromWeighted - b.distanceFromWeighted)[0] ?? fallback;
  const cleanSuggested: LimitMethod = {
    detail: suggested.detail,
    gainPercent: suggested.gainPercent,
    label: suggested.label,
    method: suggested.method,
    price: suggested.price,
    weight: suggested.weight,
  };
  const confidence = methods.length >= 5 ? "High" : methods.length >= 3 ? "Medium" : "Low";
  const shortTerm =
    availableMethods.find((method) => method.method === "resistance") ??
    availableMethods.find((method) => method.method === "atr-1") ??
    availableMethods[0] ??
    cleanSuggested;
  const position =
    [...availableMethods]
      .filter((method) => method.gainPercent <= Math.max(cleanSuggested.gainPercent * 2.5, 15))
      .at(-1) ??
    availableMethods.at(-1) ??
    cleanSuggested;

  return {
    balanced: cleanSuggested,
    confidence,
    methods: availableMethods,
    position,
    shortTerm,
    suggested: cleanSuggested,
    summary: `For most swing trades, the balanced limit is the best default because it combines ${methods.length} available upside methods and stays closest to the weighted average of resistance, volatility, trend-reclaim, recent-high, and fixed-target levels. Use the quick limit when you want faster profit-taking.`,
  };
}

function calculateStopLoss(
  candles: Candle[],
  latestClose: number,
  sma20: number | null
): StopLossRead {
  const atr = calculateAtr(candles, 14);
  const sma50 = sma(candles.map((candle) => candle.close), 50);
  const recentLows = candles
    .slice(-60)
    .map((candle) => candle.low)
    .filter((low) => low > 0 && low < latestClose)
    .sort((a, b) => b - a);
  const nearestSupport = recentLows[0] ?? null;
  const swingLow = Math.min(...candles.slice(-20).map((candle) => candle.low));
  const recentHigh = Math.max(...candles.slice(-20).map((candle) => candle.high));
  const rawMethods = [
    {
      label: "Support-based",
      price: nearestSupport === null ? null : nearestSupport * 0.98,
      detail: "Uses the nearest recent support area with a small buffer.",
      method: "support",
      weight: 3,
    },
    {
      label: "ATR conservative",
      price: atr === null ? null : latestClose - atr * 2,
      detail: "Uses two average true ranges below the latest close.",
      method: "atr-2",
      weight: 3,
    },
    {
      label: "ATR tight",
      price: atr === null ? null : latestClose - atr * 1.25,
      detail: "Uses a tighter 1.25 ATR buffer for shorter-term trades.",
      method: "atr-1.25",
      weight: 2,
    },
    {
      label: "SMA 20 trend",
      price: sma20 === null ? null : sma20 * 0.97,
      detail: "Uses the 20-day average with a small buffer.",
      method: "sma20",
      weight: 2,
    },
    {
      label: "SMA 50 trend",
      price: sma50 === null ? null : sma50 * 0.97,
      detail: "Uses the 50-day average for a wider trend stop.",
      method: "sma50",
      weight: 1,
    },
    {
      label: "Swing low",
      price: Number.isFinite(swingLow) ? swingLow * 0.985 : null,
      detail: "Uses the lowest low from the last 20 daily candles.",
      method: "swing-low",
      weight: 2,
    },
    {
      label: "Trailing high",
      price: Number.isFinite(recentHigh) ? recentHigh * 0.9 : null,
      detail: "Uses a 10% trailing stop from the recent 20-day high.",
      method: "trailing-high",
      weight: 1,
    },
    {
      label: "Fixed 8%",
      price: latestClose * 0.92,
      detail: "Uses a simple fixed-risk fallback when chart levels are noisy.",
      method: "fixed-8",
      weight: 1,
    },
  ];
  const methods = rawMethods
    .filter((candidate): candidate is StopLossMethod =>
      candidate.price !== null && candidate.price > 0 && candidate.price < latestClose
    )
    .map((method) => ({
      ...method,
      riskPercent: ((method.price - latestClose) / latestClose) * 100,
    }))
    .sort((a, b) => b.price - a.price);
  const weightedPrice =
    methods.reduce((sum, method) => sum + method.price * method.weight, 0) /
    methods.reduce((sum, method) => sum + method.weight, 0);
  const suggested =
    methods
      .map((method) => ({
        ...method,
        distanceFromWeighted: Math.abs(method.price - weightedPrice),
      }))
      .sort((a, b) => a.distanceFromWeighted - b.distanceFromWeighted)[0] ?? {
      detail: "Uses an 8% fallback because technical support data is limited.",
      label: "Fixed 8%",
      method: "fixed-8",
      price: latestClose * 0.92,
      riskPercent: -8,
      weight: 1,
    };
  const cleanSuggested: StopLossMethod = {
    detail: suggested.detail,
    label: suggested.label,
    method: suggested.method,
    price: suggested.price,
    riskPercent: suggested.riskPercent,
    weight: suggested.weight,
  };
  const confidence = methods.length >= 5 ? "High" : methods.length >= 3 ? "Medium" : "Low";
  const shortTerm =
    methods.find((method) => method.method === "support") ??
    methods.find((method) => method.method === "fixed-8") ??
    methods[0] ??
    cleanSuggested;
  const position =
    methods.find((method) => method.method === "sma50") ??
    methods.find((method) => method.method === "atr-2") ??
    methods.at(-1) ??
    cleanSuggested;

  return {
    balanced: cleanSuggested,
    confidence,
    methods,
    position,
    shortTerm,
    suggested: cleanSuggested,
    summary: `For most swing trades, the balanced stop is the best default because it combines ${methods.length} available methods and stays closest to the weighted average of support, volatility, trend, swing, trailing, and fixed-risk stops. Use the short-term stop only if you want a tight exit.`,
  };
}

function calculateAtr(candles: Candle[], period: number) {
  if (candles.length <= period) return null;

  const trueRanges = candles.slice(-period).map((candle, index, slice) => {
    const previousClose =
      index === 0
        ? candles[candles.length - period - 1]?.close ?? candle.close
        : slice[index - 1].close;

    return Math.max(
      candle.high - candle.low,
      Math.abs(candle.high - previousClose),
      Math.abs(candle.low - previousClose)
    );
  });

  return trueRanges.reduce((sum, value) => sum + value, 0) / trueRanges.length;
}

function toCandles(ohlc: OhlcDaily[]): Candle[] {
  return ohlc
    .filter(
      (point) =>
        point.close !== null &&
        point.high !== null &&
        point.low !== null &&
        point.open !== null &&
        Number.isFinite(point.close) &&
        Number.isFinite(point.high) &&
        Number.isFinite(point.low) &&
        Number.isFinite(point.open)
    )
    .map((point) => ({
      close: point.close!,
      date: point.date,
      high: point.high!,
      low: point.low!,
      open: point.open!,
      volume: point.volume,
    }));
}

function toMovingAverage(label: string, value: number | null, close: number) {
  const distance = value === null || value === 0 ? null : ((close - value) / value) * 100;
  const tone: SignalTone =
    distance === null ? "neutral" : distance > 0 ? "bullish" : distance < 0 ? "bearish" : "neutral";

  return { distance, label, tone, value };
}

function sma(values: number[], period: number) {
  if (values.length < period) return null;

  const slice = values.slice(-period);
  return slice.reduce((sum, value) => sum + value, 0) / period;
}

function latestEma(values: number[], period: number) {
  const series = emaSeries(values, period);
  return series.at(-1) ?? null;
}

function emaSeries(values: number[], period: number) {
  if (values.length < period) return [];

  const multiplier = 2 / (period + 1);
  const series: number[] = [];
  let previous = values.slice(0, period).reduce((sum, value) => sum + value, 0) / period;
  series.push(previous);

  values.slice(period).forEach((value) => {
    previous = (value - previous) * multiplier + previous;
    series.push(previous);
  });

  return series;
}

function calculateMacd(values: number[]) {
  const ema12 = emaSeries(values, 12);
  const ema26 = emaSeries(values, 26);
  const offset = ema12.length - ema26.length;
  const macdLine = ema26.map((value, index) => ema12[index + offset] - value);
  const signalLine = emaSeries(macdLine, 9);
  const histogramOffset = macdLine.length - signalLine.length;
  const histogram = signalLine.map((value, index) => macdLine[index + histogramOffset] - value);

  return { histogram, line: macdLine, signal: signalLine };
}

function calculateBollinger(values: number[], period: number) {
  if (values.length < period) {
    return {
      label: "Bollinger unavailable",
      lower: null,
      upper: null,
      verdict: "Need more history for volatility bands.",
    };
  }

  const slice = values.slice(-period);
  const average = slice.reduce((sum, value) => sum + value, 0) / period;
  const variance =
    slice.reduce((sum, value) => sum + (value - average) ** 2, 0) / period;
  const deviation = Math.sqrt(variance);
  const lower = average - deviation * 2;
  const upper = average + deviation * 2;
  const close = values.at(-1)!;

  if (close > upper) {
    return {
      label: "Above upper band",
      lower,
      upper,
      verdict: "Price is stretched above its volatility band.",
    };
  }

  if (close < lower) {
    return {
      label: "Below lower band",
      lower,
      upper,
      verdict: "Price is stretched below its volatility band.",
    };
  }

  return {
    label: "Inside bands",
    lower,
    upper,
    verdict: "Price is trading inside normal volatility bands.",
  };
}

function calculateVolumeSignal(candles: Candle[]) {
  const recent = candles.slice(-20).map((candle) => candle.volume).filter(isNumber);
  const latestVolume = candles.at(-1)?.volume;

  if (recent.length < 10 || latestVolume === null || latestVolume === undefined) {
    return { tone: "neutral" as SignalTone, verdict: "Volume confirmation is unavailable." };
  }

  const average = recent.reduce((sum, value) => sum + value, 0) / recent.length;
  const latestClose = candles.at(-1)!.close;
  const previousClose = candles.at(-2)?.close ?? latestClose;
  const rising = latestClose >= previousClose;

  if (latestVolume > average * 1.5 && rising) {
    return { tone: "bullish" as SignalTone, verdict: "Volume is above average on an up move." };
  }

  if (latestVolume > average * 1.5 && !rising) {
    return { tone: "bearish" as SignalTone, verdict: "Volume is above average on a down move." };
  }

  return { tone: "neutral" as SignalTone, verdict: "Volume is near normal." };
}

function getTrendTone(movingAverages: Array<{ tone: SignalTone }>): SignalTone {
  const bullish = movingAverages.filter((ma) => ma.tone === "bullish").length;
  const bearish = movingAverages.filter((ma) => ma.tone === "bearish").length;

  if (bullish > bearish) return "bullish";
  if (bearish > bullish) return "bearish";
  return "neutral";
}

function getTrendValue(movingAverages: Array<{ tone: SignalTone }>) {
  const bullish = movingAverages.filter((ma) => ma.tone === "bullish").length;
  const bearish = movingAverages.filter((ma) => ma.tone === "bearish").length;

  return `${bullish} bullish / ${bearish} bearish`;
}

function getTrendVerdict(movingAverages: Array<{ label: string; tone: SignalTone }>) {
  const aboveLongTerm = movingAverages.find((ma) => ma.label === "SMA 200")?.tone;

  if (aboveLongTerm === "bullish") {
    return "Price is above the long-term average.";
  }

  if (aboveLongTerm === "bearish") {
    return "Price is below the long-term average.";
  }

  return "Long-term trend needs more data.";
}

function getBollingerTone(
  close: number,
  lower: number | null,
  upper: number | null
): SignalTone {
  if (upper !== null && close > upper) return "bearish";
  if (lower !== null && close < lower) return "bullish";

  return "neutral";
}

function getToneClass(tone: SignalTone) {
  if (tone === "bullish") return "app-positive";
  if (tone === "bearish") return "app-negative";

  return "app-heading";
}

function formatSignedPercent(value: number) {
  const formatted = formatPercent(value, 1);

  return value > 0 ? `+${formatted}` : formatted;
}

function isNumber(value: number | null): value is number {
  return value !== null && value !== undefined && Number.isFinite(value);
}
