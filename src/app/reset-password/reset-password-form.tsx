"use client";

import { useActionState, useState } from "react";
import { resetPasswordAction, type FormState } from "@/app/login/actions";
import { Button, Notice } from "@/components/ui";
import { Lock, Eye, EyeOff, Check, X } from "lucide-react";

const init: FormState = {};

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPasswordAction, init);
  const [showNew, setShowNew] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  const hasLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNum = /[0-9]/.test(newPassword);

  if (!token) {
    return (
      <Notice tone="danger">
        Invalid or missing password reset token. Please request a new password reset link.
      </Notice>
    );
  }

  return (
    <form action={action} className="space-y-4" aria-label="Reset password form">
      {state.error && <Notice tone="danger">{state.error}</Notice>}

      <input type="hidden" name="token" value={token} />

      <div className="space-y-1.5 text-left">
        <label
          htmlFor="newPassword"
          className="block text-xs font-bold uppercase tracking-wider text-ink"
        >
          New Password
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-ink-muted">
            <Lock className="size-4" />
          </div>
          <input
            id="newPassword"
            name="newPassword"
            type={showNew ? "text" : "password"}
            required
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-12 text-sm text-ink transition-colors placeholder:text-ink-subtle focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
          <button
            type="button"
            onClick={() => setShowNew((v) => !v)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink focus:outline-none cursor-pointer"
            aria-label={showNew ? "Hide password" : "Show password"}
          >
            {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      <div className="rounded-xl bg-canvas-subtle p-3 border border-line/60 text-xs space-y-1.5">
        <p className="font-semibold text-ink-muted mb-1">Password must include:</p>
        <div className="grid grid-cols-2 gap-1.5">
          <span className={`flex items-center gap-1.5 ${hasLength ? "text-brand font-medium" : "text-ink-muted"}`}>
            {hasLength ? <Check className="size-3.5" /> : <X className="size-3.5 text-ink-subtle" />} At least 8 characters
          </span>
          <span className={`flex items-center gap-1.5 ${hasUpper ? "text-brand font-medium" : "text-ink-muted"}`}>
            {hasUpper ? <Check className="size-3.5" /> : <X className="size-3.5 text-ink-subtle" />} One uppercase letter
          </span>
          <span className={`flex items-center gap-1.5 ${hasLower ? "text-brand font-medium" : "text-ink-muted"}`}>
            {hasLower ? <Check className="size-3.5" /> : <X className="size-3.5 text-ink-subtle" />} One lowercase letter
          </span>
          <span className={`flex items-center gap-1.5 ${hasNum ? "text-brand font-medium" : "text-ink-muted"}`}>
            {hasNum ? <Check className="size-3.5" /> : <X className="size-3.5 text-ink-subtle" />} One number (0-9)
          </span>
        </div>
      </div>

      <div className="space-y-1.5 text-left">
        <label
          htmlFor="confirmPassword"
          className="block text-xs font-bold uppercase tracking-wider text-ink"
        >
          Confirm Password
        </label>
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-ink-muted">
            <Lock className="size-4" />
          </div>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            placeholder="••••••••••••"
            className="h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-4 text-sm text-ink transition-colors placeholder:text-ink-subtle focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>
      </div>

      <div className="pt-2">
        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={pending || !hasLength || !hasUpper || !hasLower || !hasNum}
        >
          {pending ? "Resetting password…" : "Set New Password & Sign In"}
        </Button>
      </div>
    </form>
  );
}

