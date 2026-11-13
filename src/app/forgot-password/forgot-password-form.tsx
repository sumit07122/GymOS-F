"use client";

import { useActionState } from "react";
import { forgotPasswordAction, type FormState } from "@/app/login/actions";
import { Button, Field, Notice } from "@/components/ui";
import { Phone, ArrowRight, ShieldAlert } from "lucide-react";

const init: FormState = {};

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, init);

  if (state.success && state.message) {
    return (
      <div className="space-y-4">
        <Notice tone="ok">{state.message}</Notice>
        <p className="text-xs text-ink-muted">
          Please check your email inbox and spam folder. The password reset link will expire in 30 minutes.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4" aria-label="Request password reset">
      {state.error && <Notice tone="danger">{state.error}</Notice>}
      {state.message && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 flex items-start gap-3">
          <ShieldAlert className="size-5 shrink-0 text-amber-600 mt-0.5" />
          <p>{state.message}</p>
        </div>
      )}

      <Field
        label="Mobile number"
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="98765 43210"
        required
        icon={Phone}
        hint="Registered 10-digit Indian mobile number"
      />

      <div className="pt-2">
        <Button
          type="submit"
          className="w-full"
          size="lg"
          iconRight={ArrowRight}
          disabled={pending}
        >
          {pending ? "Checking account…" : "Send Reset Link"}
        </Button>
      </div>
    </form>
  );
}

