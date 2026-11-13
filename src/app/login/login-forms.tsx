"use client";

import { useActionState, useState } from "react";
import { Button, Field, Notice } from "@/components/ui";
import {
  passwordLoginAction,
  requestOtpAction,
  verifyOtpAction,
  type FormState,
} from "./actions";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  Phone,
  KeyRound,
  ArrowRight,
  User,
  Shield,
} from "lucide-react";

const init: FormState = {};

export function LoginForms({
  initialTab = "member",
}: {
  initialTab?: "staff" | "member";
}) {
  const [tab, setTab] = useState<"staff" | "member">(initialTab);

  return (
    <div>
      {/* Neumorphic Segmented Tab Switcher */}
      <div
        role="tablist"
        aria-label="Sign in role"
        className="mb-6 grid grid-cols-2 rounded-2xl bg-canvas-subtle p-1 border border-line shadow-inner"
      >
        <button
          role="tab"
          type="button"
          aria-selected={tab === "member"}
          onClick={() => setTab("member")}
          className={`flex items-center justify-center gap-2 h-11 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-150 ${
            tab === "member"
              ? "bg-white text-ink shadow-[0_2px_8px_rgba(23,37,29,0.06)] border border-line/60"
              : "text-ink-muted hover:text-ink"
          }`}
        >
          <User className="size-3.5" />
          Member
        </button>

        <button
          role="tab"
          type="button"
          aria-selected={tab === "staff"}
          onClick={() => setTab("staff")}
          className={`flex items-center justify-center gap-2 h-11 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-150 ${
            tab === "staff"
              ? "bg-white text-ink shadow-[0_2px_8px_rgba(23,37,29,0.06)] border border-line/60"
              : "text-ink-muted hover:text-ink"
          }`}
        >
          <Shield className="size-3.5" />
          Gym Owner / Admin
        </button>
      </div>

      {tab === "member" ? <MemberForm /> : <StaffForm />}
    </div>
  );
}

function StaffForm() {
  const [state, action, pending] = useActionState(passwordLoginAction, init);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} className="space-y-4" aria-label="Owner and admin sign in">
      {state.error && <Notice tone="danger">{state.error}</Notice>}

      <Field
        label="Email address"
        name="email"
        type="email"
        autoComplete="username"
        required
        icon={Mail}
        placeholder="name@matrixgym.in"
      />

      <div className="space-y-1.5 text-left">
        <label
          htmlFor="password"
          className="block text-xs font-bold uppercase tracking-wider text-ink"
        >
          Password
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-ink-muted">
            <Lock className="size-4" />
          </div>
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="••••••••••••"
            className="h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-12 text-sm text-ink transition-colors placeholder:text-ink-subtle focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink focus:outline-none cursor-pointer"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      <div className="pt-2">
        <Button type="submit" className="w-full" size="lg" disabled={pending}>
          {pending ? "Authenticating…" : "Sign in to Workspace"}
        </Button>
      </div>
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
          <Notice tone="ok">
            Verification code dispatched to {phone}. Enter the 6-digit OTP below.
          </Notice>
          {error && <Notice tone="danger">{error}</Notice>}

          <input type="hidden" name="phone" value={phone} />
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
            {verPending ? "Verifying…" : "Confirm Code & Enter"}
          </Button>
        </form>

        <form action={reqAction} aria-label="Send a new code">
          <input type="hidden" name="phone" value={phone} />
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            disabled={reqPending}
          >
            Did not receive code? Send a new code
          </Button>
        </form>
      </div>
    );
  }

  return (
    <form action={reqAction} className="space-y-4" aria-label="Member sign in">
      {error && <Notice tone="danger">{error}</Notice>}

      <Field
        label="Mobile number"
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="98765 43210"
        defaultValue={phone}
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
          disabled={reqPending}
        >
          {reqPending ? "Sending code…" : "Continue with OTP"}
        </Button>
      </div>
    </form>
  );
}
