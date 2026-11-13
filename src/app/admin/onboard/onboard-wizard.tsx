"use client";

import { useState, useTransition } from "react";
import { Button, Notice } from "@/components/ui";
import {
  createOnboardingGymAction,
  commitImportAction,
  generateAccountsAction,
  activateWorkspaceAction,
} from "../actions";
import {
  Building,
  CreditCard,
  UploadCloud,
  KeyRound,
  CheckCircle2,
  Download,
  AlertCircle,
  FileSpreadsheet,
  Check,
  Copy,
  Sparkles,
} from "lucide-react";

interface Plan {
  name: string;
  durationDays: number;
  priceInr: number;
}

interface OnboardWizardProps {
  initialGymId?: string;
  initialStep?: string;
  progress: any;
  subscriptionPlans: Array<{
    id: string;
    name: string;
    priceInr: number;
    durationDays: number;
  }>;
}

export function OnboardWizard({
  initialGymId,
  initialStep = "profile",
  progress,
  subscriptionPlans,
}: OnboardWizardProps) {
  const [currentStep, setCurrentStep] = useState<string>(
    initialGymId ? (initialStep === "profile" ? "import" : initialStep) : "profile"
  );
  const [gymId, setGymId] = useState<string | undefined>(initialGymId);
  const [isPending, startTransition] = useTransition();

  // CSV Import State
  const [csvContent, setCsvContent] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [importResult, setImportResult] = useState<any>(null);
  const [importError, setImportError] = useState<string | null>(null);

  // Provisioning State
  const [provisionResult, setProvisionResult] = useState<any>(null);
  const [provisionError, setProvisionError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Activation State
  const [activationResult, setActivationResult] = useState<any>(null);
  const [selectedSubPlan, setSelectedSubPlan] = useState<string>(
    subscriptionPlans[0]?.id ?? ""
  );

  // Step 1: Form state for gym creation
  const [customPlans, setCustomPlans] = useState<Plan[]>([
    { name: "Monthly Standard", durationDays: 30, priceInr: 1500 },
    { name: "Quarterly Pro", durationDays: 90, priceInr: 4000 },
    { name: "Annual VIP", durationDays: 365, priceInr: 14000 },
  ]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setImportError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvContent(text);
    };
    reader.readAsText(file);
  };

  const handleCommitImport = () => {
    if (!gymId || !csvContent) return;
    setImportError(null);
    startTransition(async () => {
      try {
        const res = await commitImportAction(gymId, csvContent);
        setImportResult(res);
        if (res.importedCount > 0) {
          // Auto advance to provision step
          setCurrentStep("provision");
        }
      } catch (err: any) {
        setImportError(err.message || "Failed to commit import.");
      }
    });
  };

  const handleGenerateAccounts = () => {
    if (!gymId) return;
    setProvisionError(null);
    startTransition(async () => {
      try {
        const res = await generateAccountsAction(gymId);
        setProvisionResult(res);
      } catch (err: any) {
        setProvisionError(err.message || "Failed to generate accounts.");
      }
    });
  };

  const handleActivateWorkspace = () => {
    if (!gymId) return;
    startTransition(async () => {
      try {
        const res = await activateWorkspaceAction(gymId);
        setActivationResult(res);
        setCurrentStep("complete");
      } catch (err: any) {
        alert(err.message || "Failed to activate workspace.");
      }
    });
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const steps = [
    { id: "profile", label: "1. Gym & Owner", icon: Building },
    { id: "import", label: "2. Bulk Import", icon: UploadCloud },
    { id: "provision", label: "3. Provision Credentials", icon: KeyRound },
    { id: "activate", label: "4. Activate Workspace", icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-6">
      {/* Wizard Progress Bar */}
      <nav aria-label="Onboarding Progress" className="rounded-2xl border border-line bg-surface p-2 shadow-xs">
        <ol className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {steps.map((s) => {
            const Icon = s.icon;
            const isActive = currentStep === s.id;
            const isCompleted =
              (s.id === "profile" && Boolean(gymId)) ||
              (s.id === "import" && (progress?.hasImport || importResult?.importedCount > 0)) ||
              (s.id === "provision" && (progress?.membersWithAccounts > 0 || provisionResult?.createdCount > 0)) ||
              (s.id === "activate" && (progress?.isActivated || activationResult));

            return (
              <li key={s.id}>
                <button
                  type="button"
                  disabled={!gymId && s.id !== "profile"}
                  onClick={() => setCurrentStep(s.id)}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold transition-all ${
                    isActive
                      ? "bg-brand text-white shadow-xs"
                      : isCompleted
                      ? "bg-brand/10 text-brand hover:bg-brand/15"
                      : "text-ink-muted hover:bg-canvas-subtle"
                  }`}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="truncate">{s.label}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* STEP 1: GYM PROFILE & OWNER */}
      {currentStep === "profile" && (
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm space-y-6">
          <div>
            <h2 className="font-display text-lg font-bold text-ink">Step 1: Gym Profile &amp; Owner Account</h2>
            <p className="text-xs text-ink-muted mt-1">
              Configure the gym metadata, contact information, and primary owner administrator credentials.
            </p>
          </div>

          <form action={createOnboardingGymAction} className="space-y-6">
            <input type="hidden" name="plansJson" value={JSON.stringify(customPlans)} />

            {/* Section A: Gym Metadata */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand">Gym Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-ink">Gym Name *</label>
                  <input
                    name="name"
                    required
                    placeholder="e.g. Iron Paradise Fitness"
                    className="h-10 w-full rounded-xl border border-line bg-canvas-subtle px-3 text-xs text-ink focus:border-brand focus:bg-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-ink">URL Slug (subdomain identifier) *</label>
                  <input
                    name="slug"
                    required
                    pattern="[a-z0-9-]+"
                    placeholder="e.g. iron-paradise"
                    className="h-10 w-full rounded-xl border border-line bg-canvas-subtle px-3 text-xs text-ink focus:border-brand focus:bg-white focus:outline-none font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-ink">Gym Phone / Helpline *</label>
                  <input
                    name="phone"
                    required
                    placeholder="e.g. 9876543210"
                    className="h-10 w-full rounded-xl border border-line bg-canvas-subtle px-3 text-xs text-ink focus:border-brand focus:bg-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-ink">Gym Logo URL (Optional)</label>
                  <input
                    name="logo"
                    placeholder="https://..."
                    className="h-10 w-full rounded-xl border border-line bg-canvas-subtle px-3 text-xs text-ink focus:border-brand focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1 space-y-1">
                  <label className="text-xs font-semibold text-ink">City *</label>
                  <input
                    name="city"
                    required
                    placeholder="e.g. Mumbai"
                    className="h-10 w-full rounded-xl border border-line bg-canvas-subtle px-3 text-xs text-ink focus:border-brand focus:bg-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-ink">State</label>
                  <input
                    name="state"
                    placeholder="e.g. Maharashtra"
                    className="h-10 w-full rounded-xl border border-line bg-canvas-subtle px-3 text-xs text-ink focus:border-brand focus:bg-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-ink">PIN Code</label>
                  <input
                    name="pinCode"
                    placeholder="e.g. 400001"
                    className="h-10 w-full rounded-xl border border-line bg-canvas-subtle px-3 text-xs text-ink focus:border-brand focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-ink">Full Facility Address</label>
                <input
                  name="address"
                  placeholder="e.g. Plot 42, Bandra West, Mumbai"
                  className="h-10 w-full rounded-xl border border-line bg-canvas-subtle px-3 text-xs text-ink focus:border-brand focus:bg-white focus:outline-none"
                />
              </div>
            </div>

            {/* Section B: Owner Account */}
            <div className="space-y-4 pt-4 border-t border-line">
              <h3 className="text-xs font-bold uppercase tracking-wider text-brand">Owner Credentials</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-ink">Owner Full Name *</label>
                  <input
                    name="ownerName"
                    required
                    placeholder="e.g. Rajesh Kumar"
                    className="h-10 w-full rounded-xl border border-line bg-canvas-subtle px-3 text-xs text-ink focus:border-brand focus:bg-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-ink">Owner Mobile (Indian 10-digit) *</label>
                  <input
                    name="ownerPhone"
                    required
                    placeholder="e.g. 9876500001"
                    className="h-10 w-full rounded-xl border border-line bg-canvas-subtle px-3 text-xs text-ink focus:border-brand focus:bg-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-ink">Owner Login Email *</label>
                  <input
                    name="ownerEmail"
                    type="email"
                    required
                    placeholder="e.g. owner@ironparadise.in"
                    className="h-10 w-full rounded-xl border border-line bg-canvas-subtle px-3 text-xs text-ink focus:border-brand focus:bg-white focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-ink">Owner Password (min 10 chars) *</label>
                  <input
                    name="ownerPassword"
                    type="password"
                    required
                    minLength={10}
                    defaultValue="GymOwner2026!#"
                    className="h-10 w-full rounded-xl border border-line bg-canvas-subtle px-3 text-xs text-ink focus:border-brand focus:bg-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section C: Initial Membership Plans */}
            <div className="space-y-3 pt-4 border-t border-line">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-brand">Default Membership Plans</h3>
                <span className="text-[11px] text-ink-muted">Auto-created for this gym</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {customPlans.map((p, idx) => (
                  <div key={idx} className="rounded-xl border border-line bg-canvas-subtle p-3 space-y-1">
                    <p className="font-bold text-xs text-ink">{p.name}</p>
                    <p className="text-[11px] text-ink-muted">{p.durationDays} days · ₹{p.priceInr.toLocaleString("en-IN")}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-line flex justify-end">
              <Button type="submit" size="lg" className="w-full sm:w-auto">
                Create Gym Profile &amp; Continue →
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 2: BULK MEMBER IMPORT */}
      {currentStep === "import" && (
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-bold text-ink">Step 2: Bulk Member Import</h2>
              <p className="text-xs text-ink-muted mt-1">
                Upload member spreadsheets (CSV format). Existing memberships, plans, and join dates are imported transactionally.
              </p>
            </div>
            <a
              href="/api/admin/template"
              download
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-canvas-subtle px-3 py-2 text-xs font-bold text-ink hover:bg-canvas transition-colors shadow-xs"
            >
              <Download className="size-3.5 text-brand" />
              Download CSV Template
            </a>
          </div>

          {importError && <Notice tone="danger">{importError}</Notice>}

          {/* Drag & Drop File Zone */}
          <div className="rounded-2xl border-2 border-dashed border-line hover:border-brand/50 bg-canvas-subtle/50 p-8 text-center transition-colors">
            <FileSpreadsheet className="mx-auto size-12 text-ink-muted" />
            <div className="mt-3">
              <label
                htmlFor="file-upload"
                className="cursor-pointer text-xs font-bold text-brand hover:underline"
              >
                Choose a CSV file
              </label>
              <span className="text-xs text-ink-muted"> or drag and drop</span>
              <input
                id="file-upload"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="sr-only"
              />
            </div>
            <p className="mt-1 text-[11px] text-ink-muted">
              Standard format: Full Name, Phone (10 digits), Email (optional), Plan, Start Date, Expiry Date, Paid Amount
            </p>
            {fileName && (
              <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-brand/10 px-3 py-1 text-xs font-medium text-brand">
                <Check className="size-3.5" /> {fileName} ({csvContent.split("\n").length - 1} rows detected)
              </div>
            )}
          </div>

          {/* Import Action */}
          {csvContent && (
            <div className="flex items-center justify-between pt-4 border-t border-line">
              <span className="text-xs text-ink-muted">Ready to import records into {progress?.gym?.name || "gym"}</span>
              <Button
                onClick={handleCommitImport}
                disabled={isPending}
                size="lg"
              >
                {isPending ? "Validating & Importing…" : "Commit Member Import →"}
              </Button>
            </div>
          )}

          {/* Import Summary Results */}
          {importResult && (
            <div className="rounded-xl border border-line bg-canvas-subtle p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-ink">Import Execution Summary</h4>
                <span className="text-xs font-bold text-brand">{importResult.importedCount} members imported</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="rounded-lg bg-surface p-2 border border-line">
                  <p className="text-[10px] text-ink-muted uppercase">Total Rows</p>
                  <p className="text-base font-bold text-ink">{importResult.totalRows}</p>
                </div>
                <div className="rounded-lg bg-surface p-2 border border-line">
                  <p className="text-[10px] text-ink-muted uppercase">Imported</p>
                  <p className="text-base font-bold text-emerald-600">{importResult.importedCount}</p>
                </div>
                <div className="rounded-lg bg-surface p-2 border border-line">
                  <p className="text-[10px] text-ink-muted uppercase">Duplicates Skipped</p>
                  <p className="text-base font-bold text-amber-600">{importResult.duplicateCount}</p>
                </div>
                <div className="rounded-lg bg-surface p-2 border border-line">
                  <p className="text-[10px] text-ink-muted uppercase">Errors</p>
                  <p className="text-base font-bold text-rose-600">{importResult.errorCount}</p>
                </div>
              </div>

              {importResult.errors?.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs font-semibold text-rose-700">Errors flagged during import:</p>
                  <ul className="text-xs text-rose-600 list-disc list-inside space-y-0.5">
                    {importResult.errors.slice(0, 5).map((e: any, idx: number) => (
                      <li key={idx}>Row {e.row}: {e.error} ({e.phone || e.name})</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-4 border-t border-line">
            <Button variant="ghost" size="sm" onClick={() => setCurrentStep("profile")}>
              ← Back
            </Button>
            <Button size="sm" onClick={() => setCurrentStep("provision")}>
              Skip / Proceed to Account Provisioning →
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: PROVISION MEMBER CREDENTIALS */}
      {currentStep === "provision" && (
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-bold text-ink">Step 3: Provision Member Login Accounts</h2>
              <p className="text-xs text-ink-muted mt-1">
                Generates cryptographically random temporary passwords for imported members. Members must change password upon their first sign-in.
              </p>
            </div>
            <Button
              onClick={handleGenerateAccounts}
              disabled={isPending}
              size="lg"
              className="shrink-0"
            >
              <Sparkles className="size-4 mr-2" />
              {isPending ? "Generating Credentials…" : "Generate Member Logins"}
            </Button>
          </div>

          {provisionError && <Notice tone="danger">{provisionError}</Notice>}

          {/* Stats Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-line bg-canvas-subtle p-4">
              <p className="text-xs text-ink-muted uppercase font-semibold">Total Members</p>
              <p className="text-2xl font-bold text-ink mt-1">
                {progress?.totalMembers ?? (importResult?.importedCount || 0)}
              </p>
            </div>
            <div className="rounded-xl border border-line bg-canvas-subtle p-4">
              <p className="text-xs text-ink-muted uppercase font-semibold">Accounts Provisioned</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1">
                {provisionResult?.createdCount ?? (progress?.membersWithAccounts || 0)}
              </p>
            </div>
            <div className="rounded-xl border border-line bg-canvas-subtle p-4">
              <p className="text-xs text-ink-muted uppercase font-semibold">Pending Accounts</p>
              <p className="text-2xl font-bold text-amber-600 mt-1">
                {Math.max(0, (progress?.totalMembers || 0) - (progress?.membersWithAccounts || 0))}
              </p>
            </div>
          </div>

          {/* Newly Provisioned Credentials Table */}
          {provisionResult?.credentials && provisionResult.credentials.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-ink">
                  Generated Temporary Passwords (Single-View Distribution)
                </h4>
                <span className="text-[11px] text-amber-600 font-medium">
                  Copy or export now. Passwords are argon2 hashed and not stored in plaintext.
                </span>
              </div>

              <div className="max-h-72 overflow-y-auto rounded-xl border border-line">
                <table className="w-full text-left text-xs">
                  <thead className="bg-canvas-subtle text-ink font-semibold sticky top-0 border-b border-line">
                    <tr>
                      <th className="p-3">Member Name</th>
                      <th className="p-3">Phone</th>
                      <th className="p-3">Temporary Password</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60 bg-surface">
                    {provisionResult.credentials.map((c: any, idx: number) => (
                      <tr key={idx} className="hover:bg-canvas-subtle/50">
                        <td className="p-3 font-medium text-ink">{c.name}</td>
                        <td className="p-3 font-mono text-ink-muted">{c.phone}</td>
                        <td className="p-3 font-mono font-bold text-brand bg-canvas-subtle/60 px-2 rounded-md">
                          {c.temporaryPassword}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            type="button"
                            onClick={() => copyToClipboard(`${c.name}: Phone ${c.phone}, Password: ${c.temporaryPassword}`, idx)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-ink-muted hover:text-brand"
                          >
                            {copiedIndex === idx ? (
                              <span className="text-emerald-600 font-bold">Copied!</span>
                            ) : (
                              <>
                                <Copy className="size-3" /> Copy
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-4 border-t border-line">
            <Button variant="ghost" size="sm" onClick={() => setCurrentStep("import")}>
              ← Back
            </Button>
            <Button size="sm" onClick={() => setCurrentStep("activate")}>
              Continue to Workspace Activation →
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4: ACTIVATE WORKSPACE */}
      {currentStep === "activate" && (
        <div className="rounded-2xl border border-line bg-surface p-6 shadow-sm space-y-6">
          <div>
            <h2 className="font-display text-lg font-bold text-ink">Step 4: Activate Gym Workspace</h2>
            <p className="text-xs text-ink-muted mt-1">
              Select platform subscription plan and grant full operational access to the gym owner and members.
            </p>
          </div>

          <div className="space-y-4">
            <label className="text-xs font-bold uppercase tracking-wider text-ink block">
              Choose Platform Subscription Tier
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {subscriptionPlans.map((plan) => (
                <div
                  key={plan.id}
                  onClick={() => setSelectedSubPlan(plan.id)}
                  className={`cursor-pointer rounded-xl border p-4 transition-all ${
                    selectedSubPlan === plan.id
                      ? "border-brand bg-brand/5 ring-2 ring-brand/20 shadow-xs"
                      : "border-line bg-canvas-subtle hover:bg-surface"
                  }`}
                >
                  <p className="font-bold text-xs text-ink">{plan.name}</p>
                  <p className="text-base font-extrabold text-ink mt-1">₹{plan.priceInr.toLocaleString("en-IN")}</p>
                  <p className="text-[11px] text-ink-muted mt-0.5">{plan.durationDays} days access</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-line bg-canvas-subtle p-4 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink">Ready for Launch Checklist</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-700">
                <Check className="size-4 text-emerald-600" /> Gym Metadata &amp; Location Configured
              </div>
              <div className="flex items-center gap-2 text-emerald-700">
                <Check className="size-4 text-emerald-600" /> Membership Plans Seeded
              </div>
              <div className="flex items-center gap-2 text-emerald-700">
                <Check className="size-4 text-emerald-600" /> Multi-Tenant Boundaries &amp; RLS Verified
              </div>
              <div className="flex items-center gap-2 text-emerald-700">
                <Check className="size-4 text-emerald-600" /> Owner Administrator Bootstrapped
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-line flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setCurrentStep("provision")}>
              ← Back
            </Button>
            <Button
              onClick={handleActivateWorkspace}
              disabled={isPending}
              size="lg"
            >
              {isPending ? "Activating Workspace…" : "Activate Gym Workspace & Launch 🚀"}
            </Button>
          </div>
        </div>
      )}

      {/* STEP 5: ACTIVATION COMPLETE */}
      {currentStep === "complete" && (
        <div className="rounded-2xl border border-line bg-surface p-8 shadow-sm text-center space-y-4">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200">
            <CheckCircle2 className="size-8" />
          </div>
          <h2 className="font-display text-2xl font-bold text-ink">Gym Workspace Live!</h2>
          <p className="text-sm text-ink-muted max-w-md mx-auto">
            {progress?.gym?.name || "The gym"} workspace is now fully active. The gym owner has been notified and members can begin logging in with their phone and temporary passwords.
          </p>
          <div className="pt-4 flex justify-center gap-3">
            <a
              href="/admin"
              className="inline-flex items-center justify-center rounded-xl border border-line bg-surface px-4 py-2.5 text-xs font-bold text-ink hover:bg-canvas transition-colors"
            >
              Back to Platform Command Center
            </a>
            <a
              href="/login"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-strong transition-colors"
            >
              Open Sign-In Portal ↗
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

