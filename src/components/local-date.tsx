"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function LocalDateSync() {
  const router = useRouter();
  useEffect(() => {
    const now = new Date();
    const iso = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, "0"),
      String(now.getDate()).padStart(2, "0"),
    ].join("-");
    const current = document.cookie
      .split("; ")
      .find((entry) => entry.startsWith("local_date="))
      ?.split("=")[1];
    if (current === iso) return;
    document.cookie = `local_date=${iso}; Path=/; Max-Age=172800; SameSite=Lax`;
    router.refresh();
  }, [router]);
  return null;
}
