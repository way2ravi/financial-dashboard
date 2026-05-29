import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Financial Dashboard",
  description: "Multi-user stock research dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var theme = localStorage.getItem("financial-dashboard-theme") || "black";
                document.documentElement.dataset.theme = theme;
                function syncThemeButtons() {
                  document.querySelectorAll("[data-theme-option]").forEach(function (button) {
                    var active = button.getAttribute("data-theme-option") === theme;
                    button.setAttribute("data-active", active ? "true" : "false");
                    button.setAttribute("aria-pressed", active ? "true" : "false");
                  });
                }
                document.addEventListener("DOMContentLoaded", syncThemeButtons);
                document.addEventListener("click", function (event) {
                  var target = event.target && event.target.closest
                    ? event.target.closest("[data-theme-option]")
                    : null;
                  if (!target) return;
                  theme = target.getAttribute("data-theme-option") || "black";
                  document.documentElement.dataset.theme = theme;
                  localStorage.setItem("financial-dashboard-theme", theme);
                  syncThemeButtons();
                });
              } catch (_) {
                document.documentElement.dataset.theme = "black";
              }
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
