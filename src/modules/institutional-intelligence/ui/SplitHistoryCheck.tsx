"use client";
import { useState } from "react";
import { Search } from "lucide-react";
import type { SplitCheck } from "../types";
import styles from "./terminal.module.css";

export function SplitHistoryCheck() {
  const [result, setResult] = useState<SplitCheck | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      className={styles.form}
      onChange={() => {
        setResult(null);
        setError("");
      }}
      onSubmit={async (event) => {
        event.preventDefault();
        const body = Object.fromEntries(new FormData(event.currentTarget));
        setBusy(true);
        setError("");
        setResult(null);
        try {
          const response = await fetch(
            "/api/institutional-intelligence/splits",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            },
          );
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Split check failed");
          setResult(data);
        } catch (cause) {
          setError(
            cause instanceof Error ? cause.message : "Split check failed",
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>Massive split-history check</h2>
      <label>
        Ticker
        <input name="ticker" required maxLength={15} disabled={busy} />
      </label>
      <label>
        After date
        <input name="from" type="date" required disabled={busy} />
      </label>
      <label>
        Through date
        <input name="to" type="date" required disabled={busy} />
      </label>
      <button className={styles.button} disabled={busy}>
        <Search size={16} />
        {busy ? "Checking..." : "Check split history"}
      </button>
      {error ? (
        <p role="alert" className={styles.negative}>
          {error}
        </p>
      ) : null}
      {result ? (
        <section aria-label="Split check result">
          <p role="status">
            {result.paginationPending
              ? "Partial results: additional provider pages remain."
              : result.events.length
                ? `${result.events.length} split events returned.`
                : "No split events returned."}
          </p>
          <p>
            {result.ticker} · After {result.from} through {result.to}
          </p>
          <p className={styles.muted}>
            Checked: {result.checkedAt} · Corporate-action coverage: not
            verified
          </p>
          {result.events.length ? (
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th>Effective date</th>
                    <th>Event</th>
                    <th>Old shares</th>
                    <th>New shares</th>
                    <th>Share multiplier</th>
                  </tr>
                </thead>
                <tbody>
                  {result.events.map((entry, index) => (
                    <tr key={`${entry.date}:${index}`}>
                      <td>{entry.date}</td>
                      <td>{entry.kind.replaceAll("_", " ")}</td>
                      <td>{entry.oldShares}</td>
                      <td>{entry.newShares}</td>
                      <td>{entry.ratio}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          <a href={result.sourceUrl} target="_blank" rel="noreferrer">
            Massive query reference
          </a>
        </section>
      ) : null}
    </form>
  );
}
