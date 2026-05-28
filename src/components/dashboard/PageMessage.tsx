export type PageMessageValue = { tone: "error" | "notice"; text: string } | null;

type Props = {
  message: PageMessageValue;
};

export function PageMessage({ message }: Props) {
  if (!message) {
    return null;
  }

  const toneClass =
    message.tone === "error"
      ? "text-[var(--app-negative)]"
      : "text-[var(--app-positive)]";

  return (
    <div className={`rounded-lg border app-surface px-4 py-3 text-sm font-medium ${toneClass}`}>
      {message.text}
    </div>
  );
}
