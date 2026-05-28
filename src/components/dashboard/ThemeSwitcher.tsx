const themes = [
  { label: "Light", value: "light" },
  { label: "Dark Blue", value: "dark-blue" },
] as const;

export function ThemeSwitcher() {
  return (
    <div className="flex items-center rounded-lg border app-surface p-1">
      {themes.map((item) => (
        <button
          key={item.value}
          type="button"
          className="theme-option h-8 rounded-md px-3 text-xs font-semibold"
          data-theme-option={item.value}
          data-active={item.value === "light" ? "true" : "false"}
          aria-pressed={item.value === "light"}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
