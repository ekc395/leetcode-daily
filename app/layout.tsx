import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "leetcode-daily",
  description: "Spaced repetition for LeetCode",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={jetbrainsMono.variable}>
      <body>
        <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
          <Sidebar />
          <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
