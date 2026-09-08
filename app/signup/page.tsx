import { Suspense } from "react";
import { SignupForm } from "@/components/auth-forms";

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-canvas">
          <p className="text-sm text-muted">Loading…</p>
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
