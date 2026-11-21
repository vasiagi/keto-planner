import Link from "next/link";
import { AuthFrame } from "@/app/login/page";
import { SignupForm } from "@/app/signup/signup-form";

export const metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <AuthFrame title="Create your account" subtitle="Email and password. If confirmation is on, check your inbox next.">
      <SignupForm />
      <p className="mt-4 text-sm text-muted">
        Already eating with Cedar?{" "}
        <Link href="/login" className="font-semibold text-moss">
          Sign in
        </Link>
      </p>
    </AuthFrame>
  );
}
