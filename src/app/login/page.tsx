import Link from "next/link";
import { Suspense } from "react";
import { LoginForm } from "@/app/login/login-form";
import { readParam } from "@/lib/format";

export const metadata = { title: "Sign in" };

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  return (
    <AuthFrame title="Welcome back" subtitle="Sign in to your meal plan.">
      <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>
        <LoginGate searchParams={searchParams} />
      </Suspense>
      <p className="mt-4 text-sm text-muted">
        New here?{" "}
        <Link href="/signup" className="font-semibold text-moss">
          Create an account
        </Link>
      </p>
    </AuthFrame>
  );
}

async function LoginGate({ searchParams }: { searchParams: Promise<{ error?: string | string[] }> }) {
  const params = await searchParams;
  return <LoginForm confirmationFailed={readParam(params.error) === "confirmation"} />;
}

export function AuthFrame({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-5 py-10">
      <Link href="/" className="font-display text-2xl text-moss-deep">
        Cedar
      </Link>
      <h1 className="mt-8 font-display text-4xl">{title}</h1>
      <p className="mt-2 text-muted">{subtitle}</p>
      <div className="mt-6">{children}</div>
    </main>
  );
}
