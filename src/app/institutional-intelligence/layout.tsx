import type { Metadata } from "next";
import styles from "@/modules/institutional-intelligence/ui/terminal.module.css";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Institutional Intelligence | Private Research",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};
export default function ResearchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className={styles.terminal}>{children}</div>;
}
