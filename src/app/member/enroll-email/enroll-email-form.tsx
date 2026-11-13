"use client";

import { useActionState, useState } from "react";
import { requestEmailOtpAction, verifyEmailOtpAction, type FormState } from "@/app/login/actions";
import { Button, Field, Notice } from "@/components/ui";
import { Mail, KeyRound, ArrowRight } from "lucide-react";

const init: FormState = {};

export function EnrollEmailForm() {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [reqState, reqAction, reqPending] = useActionState(async (prev: FormState, fd: FormData) => {
    const res = await requestEmailOtpAction(prev, fd);
    if (res.success) {
      setStep("code");
    }
    return res;
  }, init);

  const [verState, verAction, verPending] = useActionState(verifyEmailOtpAction, init);

  if (step === "code") {
    return (
      <form action={verAction} className="space-y-4" aria-label="Verify email with code">
        <Notice tone="ok">
          Verification code dispatched to <strong>{email}</strong>. Enter the 6-digit code below.
        </Notice>
        {verState.error && <Notice tone="danger">{verState.error}</Notice>}

        <input type="hidden" name="email" value={email} />

        <Field
          label="6-digit verification code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="\d{6}"
          maxLength={6}
          required
          icon={KeyRound}
          placeholder="123456"
          className="tracking-[0.4em] font-mono text-center font-bold text-lg"
        />

        <Button type="submit" className="w-full" size="lg" disabled={verPending}>
          {verPending ? "Verifying code…" : "Verify & Link Email"}
        </Button>

        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={() => setStep("email")}
            className="text-xs text-brand hover:underline font-medium"
          >
            ← Change email address
          </button>
        </div>
      </form>
    );
  }

  return (
    <form action={reqAction} className="space-y-4" aria-label="Enter email address">
      {reqState.error && <Notice tone="danger">{reqState.error}</Notice>}

      <div className="space-y-1.5 text-left">
        <label
          htmlFor="email"
          className="block text-xs font-bold uppercase tracking-wider text-ink"
        >
          Email address
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-ink-muted">
            <Mail className="size-4" />
          </div>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-4 text-sm text-ink transition-colors placeholder:text-ink-subtle focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>
        <p className="text-xs text-ink-muted">We will send a 6-digit code to confirm ownership.</p>
      </div>

      <div className="pt-2">
        <Button
          type="submit"
          className="w-full"
          size="lg"
          iconRight={ArrowRight}
          disabled={reqPending || !email}
        >
          {reqPending ? "Sending code…" : "Send Verification Code"}
        </Button>
      </div>
    </form>
  );
}

