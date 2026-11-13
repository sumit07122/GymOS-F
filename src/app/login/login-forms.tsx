"use client";

import { useActionState, useState } from "react";
import { Button, Field, Notice } from "@/components/ui";
import { passwordLoginAction, requestOtpAction, verifyOtpAction, type FormState } from "./actions";

const init: FormState = {};

export function LoginForms({ initialTab = "member" }: { initialTab?: "staff" | "member" }) {
  const [tab, setTab] = useState<"staff" | "member">(initialTab);
  return (
    <div>
      <div role="tablist" aria-label="Sign in as" className="mb-6 grid grid-cols-2 rounded-xl bg-soft p-1">
        {([["member", "Member"], ["staff", "Gym owner / FIXIA"]] as const).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            type="button"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`h-10 rounded-lg text-sm font-semibold transition-colors ${tab === id ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "member" ? <MemberForm /> : <StaffForm />}
    </div>
  );
}

function StaffForm() {
  const [state, action, pending] = useActionState(passwordLoginAction, init);
  return (
    <form action={action} className="space-y-4" aria-label="Owner and admin sign in">
      {state.error && <Notice>{state.error}</Notice>}
      <Field label="Email" name="email" type="email" autoComplete="username" required />
      <Field label="Password" name="password" type="password" autoComplete="current-password" required />
      <Button type="submit" className="w-full" disabled={pending}>{pending ? "Signing in…" : "Sign in"}</Button>
    </form>
  );
}

function MemberForm() {
  const [reqState, reqAction, reqPending] = useActionState(requestOtpAction, init);
  const [verState, verAction, verPending] = useActionState(verifyOtpAction, init);
  const step = verState.step ?? reqState.step ?? "phone";
  const phone = verState.phone ?? reqState.phone ?? "";
  const error = verState.error ?? reqState.error;

  if (step === "code") {
    return (
      <div className="space-y-4">
        <form action={verAction} className="space-y-4" aria-label="Enter your login code">
          <Notice tone="ok">If {phone} is registered with an active gym, we have sent a 6-digit code to it.</Notice>
          {error && <Notice>{error}</Notice>}
          <input type="hidden" name="phone" value={phone} />
          <Field label="6-digit code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={6} required className="tracking-[0.4em]" />
          <Button type="submit" className="w-full" disabled={verPending}>{verPending ? "Checking…" : "Sign in"}</Button>
        </form>
        {/* A sibling form: forms must never be nested. */}
        <form action={reqAction} aria-label="Send a new code">
          <input type="hidden" name="phone" value={phone} />
          <Button type="submit" variant="ghost" className="w-full" disabled={reqPending}>Send a new code</Button>
        </form>
      </div>
    );
  }
  return (
    <form action={reqAction} className="space-y-4" aria-label="Member sign in">
      {error && <Notice>{error}</Notice>}
      <Field label="Mobile number" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="98765 43210" defaultValue={phone} required hint="We will text you a one-time code." />
      <Button type="submit" className="w-full" disabled={reqPending}>{reqPending ? "Sending…" : "Send code"}</Button>
    </form>
  );
}
