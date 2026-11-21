import type { Metadata } from "next";
import { Fraunces, Figtree } from "next/font/google";
import { LocalDateSync } from "@/components/local-date";
import { StaleActionReset } from "@/lib/stale-action";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

const body = Figtree({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Cedar", template: "%s · Cedar" },
  description: "Weekly keto and low-carb meal planning, a grocery list, and a simple weight log.",
  robots: { index: false, follow: false },
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} h-full antialiased`}>
      <body className="min-h-full">
        <LocalDateSync />
        <StaleActionReset />
        {children}
      </body>
    </html>
  );
}
