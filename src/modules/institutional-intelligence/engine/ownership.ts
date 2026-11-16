import type { ResearchData, PositionChange, Snapshot } from "../types";
import { effectiveHoldings } from "./filings";

export function buildSnapshots(data: ResearchData, ticker: string): Snapshot[] {
  const security = data.securities.find((s) => s.ticker === ticker);
  const effective = effectiveHoldings(data.filings, data.holdings);
  const periods = [
    ...new Set(
      effective
        .map((row) => row.filing.report_date)
        .filter((date): date is string => Boolean(date)),
    ),
  ].sort();
  const identifiers = data.identifiers.filter((i) => i.ticker === ticker);
  const mappingVerified = (period: string) => {
    const valid = identifiers.filter(
      (i) => i.valid_from <= period && (!i.valid_to || i.valid_to >= period),
    );
    return (
      valid.length > 0 &&
      valid.every(
        (i) =>
          !data.identifiers.some(
            (other) =>
              other.cusip === i.cusip &&
              other.ticker !== ticker &&
              other.valid_from <= period &&
              (!other.valid_to || other.valid_to >= period),
          ),
      )
    );
  };
  const sharesFor = (row: (typeof effective)[number], period: string) =>
    row.holdings
      .filter(
        (h) =>
          h.share_type === "SH" &&
          !h.put_call &&
          identifiers.some(
            (i) =>
              i.cusip === h.cusip &&
              i.valid_from <= period &&
              (!i.valid_to || i.valid_to >= period),
          ),
      )
      .reduce((sum, h) => sum + h.shares, 0);
  return periods.map((period, index) => {
    const previous = periods[index - 1] ?? null;
    const adjacent =
      previous !== null &&
      Math.round((Date.parse(period) - Date.parse(previous)) / 86400000) >=
        80 &&
      Math.round((Date.parse(period) - Date.parse(previous)) / 86400000) <= 100;
    const currentRows = effective.filter(
      (row) => row.filing.report_date === period,
    );
    const priorRows = effective.filter(
      (row) => row.filing.report_date === previous,
    );
    const actionsVerified = Boolean(
      security?.actions_verified_through &&
      security.actions_verified_through >= period,
    );
    const splitRatio = data.actions
      .filter(
        (a) =>
          a.ticker === ticker &&
          previous &&
          a.effective_date > previous &&
          a.effective_date <= period,
      )
      .reduce((ratio, a) => ratio * a.split_ratio, 1);
    const changes: PositionChange[] = [];
    for (const current of currentRows) {
      const prior = priorRows.find((p) => p.filing.cik === current.filing.cik);
      const shares = sharesFor(current, period);
      const previousShares =
        prior && previous ? sharesFor(prior, previous) * splitRatio : null;
      const comparable = Boolean(
        adjacent &&
        prior?.complete &&
        current.complete &&
        actionsVerified &&
        mappingVerified(period) &&
        previous &&
        mappingVerified(previous),
      );
      if (shares === 0 && (previousShares === null || previousShares === 0))
        continue;
      const delta =
        comparable && previousShares !== null ? shares - previousShares : null;
      changes.push({
        cik: current.filing.cik,
        institution:
          data.institutions.find((i) => i.cik === current.filing.cik)?.name ??
          current.filing.cik,
        ticker,
        shares,
        previous: previousShares,
        delta,
        changePercent:
          delta !== null && previousShares
            ? (delta / previousShares) * 100
            : null,
        status:
          delta === null
            ? "Unverified"
            : previousShares === 0 && shares > 0
              ? "New"
              : shares === 0 && (previousShares ?? 0) > 0
                ? "Closed"
                : delta > 0
                  ? "Increased"
                  : delta < 0
                    ? "Reduced"
                    : "Unchanged",
        reportDate: period,
        previousReportDate: previous,
        filedDate: current.filing.filed_date,
        sourceUrl: current.filing.source_url,
        independentGroup:
          data.institutions.find((i) => i.cik === current.filing.cik)
            ?.independence_group ?? null,
      });
    }
    // A manager absent from the latest filing set is missing, NOT an inferred exit.
    const allComparable =
      changes.length > 0 &&
      changes.every((c) => c.delta !== null) &&
      priorRows.every((p) =>
        currentRows.some((c) => c.filing.cik === p.filing.cik),
      );
    const shares = changes.reduce((sum, c) => sum + c.shares, 0);
    const holders = changes.filter((c) => c.shares > 0).length;
    return {
      ticker,
      reportDate: period,
      shares,
      holders,
      added: allComparable
        ? changes.reduce((sum, c) => sum + Math.max(0, c.delta ?? 0), 0)
        : null,
      reduced: allComparable
        ? changes.reduce(
            (sum, c) => sum + Math.abs(Math.min(0, c.delta ?? 0)),
            0,
          )
        : null,
      newPositions: changes.filter((c) => c.status === "New").length,
      closedPositions: changes.filter((c) => c.status === "Closed").length,
      concentration:
        shares > 0
          ? (changes
              .map((c) => c.shares)
              .sort((a, b) => b - a)
              .slice(0, 5)
              .reduce((s, v) => s + v, 0) /
              shares) *
            100
          : null,
      // Tracked-manager samples are not a verified complete ownership universe.
      ownershipPercent: null,
      changes,
      comparable: allComparable,
    };
  });
}
