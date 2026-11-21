"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/dashboard", label: "Today" },
  { href: "/plan", label: "Plan" },
  { href: "/groceries", label: "Shop" },
  { href: "/log", label: "Log" },
  { href: "/weight", label: "Weight" },
];

export function AppNav({ className, mobile = false }: { className?: string; mobile?: boolean }) {
  const pathname = usePathname();
  return (
    <nav aria-label={mobile ? "Mobile" : "Primary"} className={className}>
      {ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={
              mobile
                ? `flex min-h-11 flex-1 items-center justify-center rounded-xl text-xs font-semibold ${active ? "bg-moss text-white" : "text-muted"}`
                : `rounded-xl px-3 py-2 text-sm font-semibold ${active ? "bg-moss text-white" : "text-foreground hover:bg-background"}`
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
