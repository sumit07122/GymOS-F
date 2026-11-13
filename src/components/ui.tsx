import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

export function Button({ variant = "primary", className = "", ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" }) {
  const base = "inline-flex h-11 items-center justify-center rounded-xl px-5 text-[15px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";
  const v = variant === "primary" ? "bg-deep text-white hover:bg-deeper" : "border border-line bg-surface text-ink hover:bg-soft";
  return <button className={`${base} ${v} ${className}`} {...p} />;
}

export function Field({ label, hint, ...p }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  const id = p.id ?? p.name;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink">{label}</label>
      <input
        id={id}
        className="h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-[15px] text-ink placeholder:text-muted/70 focus:border-deep focus:outline-none focus:ring-2 focus:ring-deep/20"
        {...p}
      />
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Notice({ tone = "danger", children }: { tone?: "danger" | "warn" | "ok"; children: ReactNode }) {
  const t = { danger: "bg-danger-soft text-danger", warn: "bg-warn-soft text-warn", ok: "bg-soft text-deeper" }[tone];
  return <div role={tone === "danger" ? "alert" : "status"} className={`rounded-xl px-4 py-3 text-sm ${t}`}>{children}</div>;
}

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-9 place-items-center rounded-xl bg-brand font-display text-lg font-extrabold text-forest" aria-hidden>F</span>
      <span className={`whitespace-nowrap font-display text-base font-extrabold tracking-tight sm:text-lg ${light ? "text-white" : "text-ink"}`}>
        FIXIA <span className={light ? "text-brand" : "text-deep"}>GymOS</span>
      </span>
    </div>
  );
}
