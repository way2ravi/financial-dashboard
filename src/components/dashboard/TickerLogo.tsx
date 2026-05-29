import Image from "next/image";
import type { Ticker } from "@/lib/types";

type Props = {
  ticker: Pick<Ticker, "logoUrl" | "name" | "symbol">;
  size?: "sm" | "md" | "lg";
};

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-14 w-14 text-base",
};

export function TickerLogo({ ticker, size = "md" }: Props) {
  const className = `${sizeClasses[size]} flex shrink-0 items-center justify-center overflow-hidden rounded-lg border app-subtle font-semibold app-heading`;

  if (!ticker.logoUrl) {
    return <div className={className}>{getInitials(ticker)}</div>;
  }

  return (
    <div className={className}>
      <Image
        src={ticker.logoUrl}
        alt={`${ticker.name ?? ticker.symbol} logo`}
        width={56}
        height={56}
        className="h-full w-full object-contain p-1"
      />
    </div>
  );
}

function getInitials(ticker: Pick<Ticker, "name" | "symbol">) {
  const source = ticker.name || ticker.symbol;
  const words = source.split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }

  return ticker.symbol.slice(0, 2).toUpperCase();
}
