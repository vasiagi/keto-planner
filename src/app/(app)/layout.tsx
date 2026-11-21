import { Suspense } from "react";
import { headers } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { AppNav } from "@/components/nav-links";
import { requireUser } from "@/lib/auth";
import { getProfile } from "@/lib/queries";

export const instant = false;

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full">
      <div className="mx-auto flex min-h-full w-full max-w-6xl">
        <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-line bg-paper px-4 py-6 md:flex">
          <p className="font-display text-2xl text-moss-deep">Cedar</p>
          <AppNav className="mt-8 flex flex-1 flex-col gap-1" />
          <form action={signOut}>
            <button type="submit" className="min-h-11 rounded-full px-3 text-sm font-semibold text-moss">
              Sign out
            </button>
          </form>
        </aside>
        <div className="min-w-0 flex-1">
          <Suspense fallback={<main className="px-4 py-6 pb-28 md:px-8">Loading your kitchen…</main>}>
            <Guarded>{children}</Guarded>
          </Suspense>
        </div>
      </div>
      <AppNav className="fixed inset-x-0 bottom-0 z-20 flex gap-1 border-t border-line bg-paper px-2 py-2 md:hidden" mobile />
    </div>
  );
}

async function Guarded({ children }: { children: React.ReactNode }) {
  await connection();
  const pathname = (await headers()).get("x-pathname") ?? "";
  const { supabase, userId } = await requireUser();
  const profile = await getProfile(supabase, userId);
  if (!profile?.onboardedAt && pathname !== "/onboarding") redirect("/onboarding");
  return <main className="px-4 py-6 pb-28 md:px-8 md:pb-10">{children}</main>;
}
