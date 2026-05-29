const themes = [
  { label: "Light", value: "light" },
  { label: "Dark Blue", value: "dark-blue" },
  { label: "Black", value: "black" },
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
          data-active={item.value === "black" ? "true" : "false"}
          aria-pressed={item.value === "black"}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
