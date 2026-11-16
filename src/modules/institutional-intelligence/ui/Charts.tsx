"use client";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import styles from "./terminal.module.css";
export function EvidenceChart({
  data,
  series,
  empty = "No verified observations available.",
  quarterly = false,
}: {
  data: Array<Record<string, string | number | null>>;
  series: Array<{
    key: string;
    name: string;
    color: string;
    bar?: boolean;
    secondary?: boolean;
  }>;
  empty?: string;
  quarterly?: boolean;
}) {
  if (
    !data.length ||
    !data.some((row) => series.some((s) => typeof row[s.key] === "number"))
  )
    return <div className={styles.emptyChart}>{empty}</div>;
  return (
    <div
      className={styles.chart}
      aria-label={quarterly ? "Quarter-end observations" : "Daily observations"}
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <ComposedChart
          data={data}
          margin={{ top: 12, right: 12, bottom: 4, left: 4 }}
        >
          <CartesianGrid stroke="#303638" vertical={false} />
          <XAxis
            dataKey="date"
            stroke="#969fa3"
            tick={{ fontSize: 11 }}
            minTickGap={30}
          />
          <YAxis
            stroke="#969fa3"
            tick={{ fontSize: 11 }}
            width={48}
            tickFormatter={(n) =>
              Intl.NumberFormat("en", { notation: "compact" }).format(n)
            }
          />
          {series.some((s) => s.secondary) ? (
            <YAxis
              yAxisId="secondary"
              orientation="right"
              stroke="#969fa3"
              tick={{ fontSize: 11 }}
              width={45}
              tickFormatter={(n) =>
                Intl.NumberFormat("en", { notation: "compact" }).format(n)
              }
            />
          ) : null}
          <Tooltip
            contentStyle={{
              background: "#1c2224",
              border: "1px solid #414b4f",
              color: "#f1f5f4",
              fontSize: 12,
            }}
            labelFormatter={(label) =>
              `${quarterly ? "Reporting period" : "Date"}: ${label}`
            }
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          {series.map((s) =>
            s.bar ? (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.name}
                fill={s.color}
                yAxisId={s.secondary ? "secondary" : 0}
                opacity={0.7}
              />
            ) : (
              <Line
                key={s.key}
                dataKey={s.key}
                name={s.name}
                stroke={s.color}
                yAxisId={s.secondary ? "secondary" : 0}
                dot={data.length < 10}
                strokeWidth={2}
                connectNulls={false}
                isAnimationActive={false}
              />
            ),
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
