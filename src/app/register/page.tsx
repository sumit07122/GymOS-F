import Link from "next/link";
import {
  Logo,
  Button,
  Field,
  Notice,
  Card,
  Badge,
} from "@/components/ui";
import { submitRegistrationAction } from "./actions";
import {
  Building2,
  MapPin,
  User,
  Phone,
  Mail,
  FileText,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export const metadata = { title: "Request a GymOS workspace" };

export default async function RegistrationPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; submitted?: string }>;
}) {
  const { error, submitted } = await searchParams;

  return (
    <main className="min-h-dvh bg-canvas flex flex-col">
      {/* Top Header */}
      <header className="border-b border-line/80 bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="FIXIA GymOS home">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs text-ink-muted">
              Already have a gym workspace?
            </span>
            <Link href="/login">
              <Button variant="secondary" size="sm">
                Sign in
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Registration Content */}
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-12 items-start">
          {/* Left Hero Column */}
          <div className="lg:col-span-5 space-y-6">
            <Badge tone="brand" size="md">
              Gym Onboarding
            </Badge>

            <h1 className="font-display text-3xl font-black tracking-tight text-ink sm:text-4xl lg:text-5xl leading-[1.1]">
              Bring your gym onto <span className="text-brand">one unified</span> register.
            </h1>

            <p className="text-sm text-ink-muted leading-relaxed">
              Submit your gym details to FIXIA. Our platform onboarding team verifies your gym, provisions your isolated Neon PostgreSQL tenant, and connects your owner credentials before operations commence.
            </p>

            <div className="space-y-4 pt-4 border-t border-line/60">
              <div className="flex items-start gap-3">
                <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-brand-light text-brand">
                  <ShieldCheck className="size-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ink">
                    Tenant-Level Data Isolation
                  </h4>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Your members, payments, and logs are segregated with PostgreSQL Row Level Security.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="grid size-8 shrink-0 place-items-center rounded-xl bg-brand-light text-brand">
                  <Sparkles className="size-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-ink">
                    Instant Member OTP Sign-in
                  </h4>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Members authenticate password-free using SMS OTP directly on mobile devices.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Form Column */}
          <div className="lg:col-span-7">
            {submitted ? (
              <Card className="p-8 sm:p-10 text-center space-y-4">
                <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-success-soft text-success">
                  <CheckCircle2 className="size-8" />
                </div>
                <h2 className="font-display text-2xl font-black text-ink">
                  Workspace Request Received!
                </h2>
                <p className="max-w-md mx-auto text-sm text-ink-muted leading-relaxed">
                  Thank you for submitting your gym details. FIXIA Platform Administration will review your request, configure your dedicated workspace, and reach out via your provided phone and email.
                </p>
                <div className="pt-4">
                  <Link href="/">
                    <Button variant="secondary" size="md">
                      Return to Homepage
                    </Button>
                  </Link>
                </div>
              </Card>
            ) : (
              <Card className="p-6 sm:p-8">
                <div className="border-b border-line pb-4 mb-6">
                  <h2 className="font-display text-xl font-bold text-ink">
                    Request Gym Workspace
                  </h2>
                  <p className="text-xs text-ink-muted mt-0.5">
                    Fill in your fitness center details and owner contact
                  </p>
                </div>

                {error && (
                  <div className="mb-6">
                    <Notice tone="danger">
                      {error === "limited"
                        ? "Too many submission requests. Please wait a moment and try again."
                        : error === "phone"
                        ? "Please enter a valid 10-digit Indian mobile number."
                        : "Please check your entries and ensure all required fields are complete."}
                    </Notice>
                  </div>
                )}

                <form action={submitRegistrationAction} className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Gym business name"
                      name="gymName"
                      required
                      maxLength={100}
                      placeholder="e.g. Iron Forge Fitness"
                      icon={Building2}
                    />
                    <Field
                      label="City"
                      name="city"
                      maxLength={80}
                      placeholder="e.g. Bangalore, Mumbai"
                      icon={MapPin}
                    />

                    <Field
                      label="Owner full name"
                      name="ownerName"
                      required
                      maxLength={80}
                      placeholder="e.g. Rahul Sharma"
                      icon={User}
                    />
                    <Field
                      label="Owner mobile number"
                      name="ownerPhone"
                      type="tel"
                      required
                      placeholder="98765 43210"
                      icon={Phone}
                    />

                    <div className="sm:col-span-2">
                      <Field
                        label="Owner email address"
                        name="ownerEmail"
                        type="email"
                        required
                        placeholder="owner@yourgym.in"
                        icon={Mail}
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <Field
                        label="Gym physical address"
                        name="address"
                        maxLength={200}
                        placeholder="Premises, street, locality, pincode"
                        icon={MapPin}
                      />
                    </div>

                    <div className="sm:col-span-2 space-y-1.5 text-left">
                      <label
                        htmlFor="notes"
                        className="block text-xs font-bold uppercase tracking-wider text-ink"
                      >
                        Additional notes / Expected member count
                      </label>
                      <textarea
                        id="notes"
                        name="notes"
                        maxLength={500}
                        rows={3}
                        placeholder="e.g. Currently managing ~250 active members with 2 branch locations..."
                        className="w-full rounded-xl border border-line bg-surface p-3.5 text-sm text-ink transition-colors placeholder:text-ink-subtle focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-line/60">
                    <Button type="submit" size="lg" iconRight={ArrowRight} className="w-full">
                      Submit Workspace Request
                    </Button>
                    <p className="mt-2 text-center text-[11px] text-ink-muted">
                      No upfront credit card required. Submitting initiates platform review.
                    </p>
                  </div>
                </form>
              </Card>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
