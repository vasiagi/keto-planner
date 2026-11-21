import { cookies } from "next/headers";
import { isIsoDate } from "@/lib/dates";

export async function getToday() {
  const jar = await cookies();
  const value = jar.get("local_date")?.value;
  if (value && isIsoDate(value)) return value;
  return new Date().toISOString().slice(0, 10);
}
