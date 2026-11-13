import React, {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type ReactNode,
} from "react";
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  ChevronDown,
  Loader2,
  type LucideIcon,
} from "lucide-react";

/* -------------------------------------------------------------------------- */
/* BUTTON                                                                     */
/* -------------------------------------------------------------------------- */

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon: Icon,
  iconRight: IconRight,
  className = "",
  children,
  disabled,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center font-semibold transition-all duration-150 select-none disabled:cursor-not-allowed disabled:opacity-55 active:scale-[0.98]";

  const sizes = {
    sm: "h-9 px-3.5 text-xs rounded-xl gap-1.5",
    md: "h-11 px-5 text-sm rounded-xl gap-2",
    lg: "h-12 px-6 text-[15px] rounded-2xl gap-2.5",
  }[size];

  const variants = {
    primary: "neu-button-primary",
    secondary: "neu-button-secondary",
    outline:
      "border border-line bg-surface text-ink hover:bg-surface-elevated hover:border-brand/40",
    ghost:
      "bg-transparent text-ink hover:bg-surface-elevated hover:text-brand",
    danger:
      "bg-danger text-white hover:bg-[#b83e3e] shadow-[0_2px_8px_rgba(220,85,85,0.3)]",
  }[variant];

  return (
    <button
      className={`${base} ${sizes} ${variants} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <Loader2 className="size-4 animate-spin shrink-0" />
      ) : Icon ? (
        <Icon className="size-4 shrink-0" />
      ) : null}
      {children}
      {!loading && IconRight ? (
        <IconRight className="size-4 shrink-0" />
      ) : null}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* INPUT / FIELD                                                              */
/* -------------------------------------------------------------------------- */

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
  icon?: LucideIcon;
}

export function Field({
  label,
  hint,
  error,
  icon: Icon,
  className = "",
  id: explicitId,
  name,
  ...props
}: FieldProps) {
  const id = explicitId ?? name;

  return (
    <div className="space-y-1.5 text-left">
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="block text-xs font-bold uppercase tracking-wider text-ink"
        >
          {label}
        </label>
        {hint && <span className="text-xs text-ink-muted">{hint}</span>}
      </div>
      <div className="relative">
        {Icon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-ink-muted">
            <Icon className="size-4" />
          </div>
        )}
        <input
          id={id}
          name={name}
          className={`h-11 w-full rounded-xl border bg-surface text-sm text-ink transition-colors placeholder:text-ink-subtle focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 ${
            Icon ? "pl-10 pr-3.5" : "px-3.5"
          } ${
            error
              ? "border-danger bg-danger-soft/30 focus:border-danger focus:ring-danger/20"
              : "border-line"
          } ${className}`}
          {...props}
        />
      </div>
      {error && (
        <p className="flex items-center gap-1 text-xs font-medium text-danger">
          <AlertCircle className="size-3.5 shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* SELECT FIELD                                                               */
/* -------------------------------------------------------------------------- */

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  hint?: string;
  error?: string;
}

export function SelectField({
  label,
  hint,
  error,
  children,
  className = "",
  id: explicitId,
  name,
  ...props
}: SelectFieldProps) {
  const id = explicitId ?? name;

  return (
    <div className="space-y-1.5 text-left">
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="block text-xs font-bold uppercase tracking-wider text-ink"
        >
          {label}
        </label>
        {hint && <span className="text-xs text-ink-muted">{hint}</span>}
      </div>
      <div className="relative">
        <select
          id={id}
          name={name}
          className={`h-11 w-full appearance-none rounded-xl border bg-surface pl-3.5 pr-10 text-sm text-ink transition-colors focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 ${
            error ? "border-danger focus:border-danger" : "border-line"
          } ${className}`}
          {...props}
        >
          {children}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-ink-muted">
          <ChevronDown className="size-4" />
        </div>
      </div>
      {error && (
        <p className="text-xs font-medium text-danger">{error}</p>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* CARD                                                                       */
/* -------------------------------------------------------------------------- */

export function Card({
  variant = "default",
  interactive = false,
  className = "",
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  variant?: "default" | "flat" | "elevated" | "inset";
  interactive?: boolean;
}) {
  const vClass = {
    default: "neu-card",
    flat: "neu-card-flat",
    elevated: "neu-card shadow-lg",
    inset: "neu-inset",
  }[variant];

  const iClass = interactive ? "neu-card-interactive cursor-pointer" : "";

  return (
    <div className={`${vClass} ${iClass} ${className}`} {...props}>
      {children}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* BADGE                                                                      */
/* -------------------------------------------------------------------------- */

export type BadgeTone = "success" | "warning" | "danger" | "neutral" | "brand";

export function Badge({
  tone = "neutral",
  size = "md",
  dot = false,
  children,
  className = "",
}: {
  tone?: BadgeTone;
  size?: "sm" | "md";
  dot?: boolean;
  children: ReactNode;
  className?: string;
}) {
  const tones = {
    success: "bg-success-soft text-[#0f6b43] border border-success/30",
    warning: "bg-warning-soft text-[#9c6114] border border-warning/30",
    danger: "bg-danger-soft text-[#b83e3e] border border-danger/30",
    neutral: "bg-surface-elevated text-ink-muted border border-line",
    brand: "bg-brand-light text-brand-dark border border-brand/30",
  }[tone];

  const dots = {
    success: "bg-success",
    warning: "bg-warning",
    danger: "bg-danger",
    neutral: "bg-ink-muted",
    brand: "bg-brand",
  }[tone];

  const sizes = size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold tracking-wide uppercase ${sizes} ${tones} ${className}`}
    >
      {dot && <span className={`size-1.5 rounded-full ${dots}`} aria-hidden />}
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* STAT / KPI CARD                                                            */
/* -------------------------------------------------------------------------- */

export function StatCard({
  label,
  value,
  subtext,
  icon: Icon,
  tone = "brand",
  className = "",
}: {
  label: string;
  value: ReactNode;
  subtext?: string;
  icon?: LucideIcon;
  tone?: "brand" | "success" | "warning" | "danger" | "neutral";
  className?: string;
}) {
  const iconBg = {
    brand: "bg-brand-light text-brand",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
    neutral: "bg-surface-elevated text-ink-muted",
  }[tone];

  return (
    <Card className={`p-5 text-left transition-all duration-200 hover:shadow-md ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wider text-ink-muted">
          {label}
        </p>
        {Icon && (
          <div className={`grid size-9 shrink-0 place-items-center rounded-xl ${iconBg}`}>
            <Icon className="size-5" />
          </div>
        )}
      </div>
      <p className="mt-2.5 font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
        {value}
      </p>
      {subtext && (
        <p className="mt-1.5 text-xs font-medium text-ink-muted">
          {subtext}
        </p>
      )}
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* NOTICE / ALERT                                                             */
/* -------------------------------------------------------------------------- */

export function Notice({
  tone = "danger",
  children,
  className = "",
}: {
  tone?: "danger" | "warn" | "ok" | "info";
  children: ReactNode;
  className?: string;
}) {
  const config = {
    danger: {
      bg: "bg-danger-soft/70 border-danger/30 text-[#9b2a2a]",
      icon: AlertCircle,
    },
    warn: {
      bg: "bg-warning-soft border-warning/30 text-[#9c6114]",
      icon: AlertTriangle,
    },
    ok: {
      bg: "bg-success-soft border-success/30 text-[#0f6b43]",
      icon: CheckCircle2,
    },
    info: {
      bg: "bg-brand-light border-brand/30 text-brand-dark",
      icon: Info,
    },
  }[tone];

  const IconComponent = config.icon;

  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 text-sm font-medium shadow-sm ${config.bg} ${className}`}
    >
      <IconComponent className="mt-0.5 size-4 shrink-0" />
      <div className="flex-1 leading-relaxed">{children}</div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* LOGO                                                                       */
/* -------------------------------------------------------------------------- */

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="relative grid size-9 place-items-center rounded-xl bg-gradient-to-br from-brand-secondary to-brand font-display text-lg font-black text-white shadow-[0_2px_8px_rgba(22,131,74,0.35)]">
        F
        <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full border border-white bg-white" />
      </div>
      <div className="flex flex-col">
        <span
          className={`whitespace-nowrap font-display text-base font-extrabold tracking-tight sm:text-lg ${
            light ? "text-white" : "text-ink"
          }`}
        >
          FIXIA{" "}
          <span className={light ? "text-brand-secondary" : "text-brand"}>
            GymOS
          </span>
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-ink-muted">
          Enterprise
        </span>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* AVATAR                                                                     */
/* -------------------------------------------------------------------------- */

export function Avatar({
  name,
  size = "md",
  className = "",
}: {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const sizes = {
    sm: "size-8 text-xs",
    md: "size-10 text-sm",
    lg: "size-12 text-base",
  }[size];

  return (
    <div
      className={`grid ${sizes} place-items-center rounded-full bg-gradient-to-br from-brand-light to-surface-elevated font-display font-bold text-brand shadow-inner border border-brand/20 ${className}`}
      aria-hidden
    >
      {initials || "U"}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* EMPTY STATE                                                                */
/* -------------------------------------------------------------------------- */

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}: {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={`flex flex-col items-center justify-center p-8 text-center sm:p-12 ${className}`}>
      {Icon && (
        <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-surface-elevated text-ink-muted border border-line shadow-sm">
          <Icon className="size-6" />
        </div>
      )}
      <h3 className="font-display text-base font-bold text-ink sm:text-lg">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-ink-muted">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </Card>
  );
}
