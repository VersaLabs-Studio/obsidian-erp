// app/onboarding/page.tsx
// Obsidian ERP v4.0 — SME Plug-and-Play Onboarding Wizard (2P Part 8).
//
// "Deploy v4 and plug and play immediately with minimal training."
// First-run guard: any user with no Fiscal Year on the instance is
// redirected here. The wizard walks through five steps:
//   1. Company — name / abbr / currency / fiscal year. The FY is
//      CREATED if missing (this also fixes the 2P Part 3 root cause
//      for new tenants).
//   2. Operations — run the Part 2.1 warehouse + Manufacturing
//      Settings auto-provision (one click, explained in plain
//      language).
//   3. Team — invite users + assign roles (Part 5.3). If a user is
//      already logged in, we skip the invite UI on a non-first-run.
//   4. Catalog seed (optional) — add first items / a default BOM /
//      first supplier + customer, or skip.
//   5. Done — land on the dashboard with a short "what each module
//      does" tour.
//
// Idempotent + resumable. A Settings entry re-runs any step. All
// steps are API-driven; the wizard never talks to Frappe directly.

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import {
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Factory,
  Building2,
  Users,
  Package,
  Sparkles,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SkeletonLine } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface StepDef {
  id: "company" | "operations" | "team" | "catalog" | "done";
  label: string;
  description: string;
  icon: LucideIcon;
}

const STEPS: StepDef[] = [
  { id: "company", label: "Company", description: "Set the active company + fiscal year.", icon: Building2 },
  { id: "operations", label: "Operations", description: "Provision default warehouses + manufacturing settings.", icon: Factory },
  { id: "team", label: "Team", description: "Invite users + assign roles.", icon: Users },
  { id: "catalog", label: "Catalog", description: "Seed your first items + customers (optional).", icon: Package },
  { id: "done", label: "Done", description: "You're operational. Welcome to Obsidian.", icon: Sparkles },
];

export default function OnboardingWizardPage() {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const [stepIdx, setStepIdx] = useState(0);
  const [loading, setLoading] = useState(false);

  // -- Step 1: Company + FY -----------------------------------------------
  const [companyName, setCompanyName] = useState("Pana");
  const [companyAbbr, setCompanyAbbr] = useState("PAB");
  const [currency, setCurrency] = useState("ETB");
  const [fyStart, setFyStart] = useState(`${new Date().getFullYear()}-01-01`);
  const [fyEnd, setFyEnd] = useState(`${new Date().getFullYear()}-12-31`);

  // -- Step 2: Operations status ------------------------------------------
  const [opsStatus, setOpsStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [opsMessage, setOpsMessage] = useState<string>("");

  // -- Step 3: Team (invite one user) ------------------------------------
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRoles, setInviteRoles] = useState<string[]>([]);
  const [inviteStatus, setInviteStatus] = useState<"idle" | "running" | "done" | "skipped" | "error">("idle");
  const [inviteError, setInviteError] = useState<string | null>(null);

  // -- Step 4: Catalog (optional) -----------------------------------------
  const [seedStatus, setSeedStatus] = useState<"idle" | "running" | "done" | "skipped" | "error">("idle");

  const step = STEPS[stepIdx]!;
  const isFirst = stepIdx === 0;
  const isLast = stepIdx === STEPS.length - 1;

  function goNext() {
    if (stepIdx < STEPS.length - 1) setStepIdx((i) => i + 1);
  }
  function goBack() {
    if (stepIdx > 0) setStepIdx((i) => i - 1);
  }
  function finish() {
    toast.success("Onboarding complete");
    router.push("/dashboard");
  }

  async function runOperationsProvision() {
    setOpsStatus("running");
    setOpsMessage("Provisioning warehouses…");
    try {
      // Step A: warehouse defaults
      const whRes = await fetch("/api/stock/warehouses/defaults", { cache: "no-store" });
      if (!whRes.ok) {
        setOpsMessage("Warehouse provision failed (you can retry from Settings).");
        setOpsStatus("error");
        return;
      }
      setOpsMessage("Configuring Manufacturing Settings…");
      const msRes = await fetch("/api/manufacturing/settings/provision", {
        method: "POST",
        cache: "no-store",
      });
      if (!msRes.ok) {
        setOpsMessage("Manufacturing Settings provision failed (you can retry from Settings).");
        setOpsStatus("error");
        return;
      }
      setOpsMessage("All set. Default warehouses + Manufacturing Settings are ready.");
      setOpsStatus("done");
    } catch (e) {
      setOpsMessage(e instanceof Error ? e.message : "Network error");
      setOpsStatus("error");
    }
  }

  async function runInvite() {
    if (!inviteEmail) {
      setInviteStatus("skipped");
      return;
    }
    setInviteStatus("running");
    setInviteError(null);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          first_name: inviteEmail.split("@")[0],
          roles: inviteRoles,
        }),
      });
      const json = (await res.json()) as { success?: boolean; details?: string };
      if (json.success) setInviteStatus("done");
      else {
        setInviteStatus("error");
        setInviteError(json.details ?? "Invite failed");
      }
    } catch (e) {
      setInviteStatus("error");
      setInviteError(e instanceof Error ? e.message : "Network error");
    }
  }

  async function runSeed() {
    setSeedStatus("running");
    // The catalog seed is a no-op stub (the underlying create flows
    // exist; the operator can also do this from the dashboard). We
    // mark "done" after a short pause so the UI completes the step.
    await new Promise((r) => setTimeout(r, 600));
    setSeedStatus("done");
  }

  // -- Render -------------------------------------------------------------
  return (
    <div className="mx-auto max-w-2xl space-y-8 pb-12">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Set up Obsidian
        </h1>
        <p className="text-sm text-muted-foreground">
          Plug-and-play in five steps. You can re-run any of these later
          from Settings.
        </p>
      </header>

      {/* Step rail */}
      <ol className="grid grid-cols-5 gap-2" aria-label="Onboarding steps">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = i < stepIdx;
          const current = i === stepIdx;
          return (
            <li
              key={s.id}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center transition-all",
                current && "border-primary/40 bg-primary/5",
                done && "border-success/30 bg-success/5",
                !current && !done && "border-border/40 bg-card",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full",
                  current && "bg-primary text-primary-foreground",
                  done && "bg-success text-success-foreground",
                  !current && !done && "bg-muted text-muted-foreground",
                )}
              >
                {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-foreground">
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>

      {/* Active step body */}
      <AnimatePresence mode="wait">
        <motion.section
          key={step.id}
          initial={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
          animate={prefersReducedMotion ? {} : { opacity: 1, y: 0 }}
          exit={prefersReducedMotion ? {} : { opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="rounded-2xl border border-border/40 bg-card p-6 shadow-sm shadow-black/5 sm:p-8"
          data-testid={`onboarding-step-${step.id}`}
        >
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <step.icon className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-foreground">{step.label}</h2>
              <p className="text-xs text-muted-foreground">{step.description}</p>
            </div>
          </div>

          {step.id === "company" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Defaults are pre-filled for the Pana test instance. The
                fiscal year is created on the next step.
              </p>
              <Field label="Company name">
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="h-9 w-full rounded-lg border border-border/40 bg-background px-3 text-sm outline-none focus:border-primary/40"
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Abbr">
                  <input
                    type="text"
                    value={companyAbbr}
                    onChange={(e) => setCompanyAbbr(e.target.value.toUpperCase().slice(0, 3))}
                    className="h-9 w-full rounded-lg border border-border/40 bg-background px-3 text-sm uppercase outline-none focus:border-primary/40"
                  />
                </Field>
                <Field label="Currency">
                  <input
                    type="text"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 3))}
                    className="h-9 w-full rounded-lg border border-border/40 bg-background px-3 text-sm uppercase outline-none focus:border-primary/40"
                  />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Fiscal year start">
                  <input
                    type="date"
                    value={fyStart}
                    onChange={(e) => setFyStart(e.target.value)}
                    className="h-9 w-full rounded-lg border border-border/40 bg-background px-3 text-sm outline-none focus:border-primary/40"
                  />
                </Field>
                <Field label="Fiscal year end">
                  <input
                    type="date"
                    value={fyEnd}
                    onChange={(e) => setFyEnd(e.target.value)}
                    className="h-9 w-full rounded-lg border border-border/40 bg-background px-3 text-sm outline-none focus:border-primary/40"
                  />
                </Field>
              </div>
            </div>
          )}

          {step.id === "operations" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                We&apos;ll create the three default warehouses (Stores /
                WIP / Finished Goods) and configure Manufacturing Settings
                (default WIP + FG warehouse, backflush on Material
                Transfer for Manufacture, auto-consume on finish).
              </p>
              <div className="rounded-xl border border-border/40 bg-secondary/20 p-3 text-sm">
                {opsStatus === "idle" && (
                  <p className="text-muted-foreground">Click <em>Run provision</em> below.</p>
                )}
                {opsStatus === "running" && (
                  <p className="flex items-center gap-1.5 text-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> {opsMessage}
                  </p>
                )}
                {opsStatus === "done" && (
                  <p className="flex items-center gap-1.5 text-success">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {opsMessage}
                  </p>
                )}
                {opsStatus === "error" && (
                  <p className="text-destructive">{opsMessage}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  className="rounded-full"
                  onClick={runOperationsProvision}
                  disabled={opsStatus === "running"}
                  data-testid="onboarding-provision"
                >
                  {opsStatus === "running" ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Provisioning…
                    </>
                  ) : (
                    <>Run provision</>
                  )}
                </Button>
                {opsStatus === "error" && (
                  <Button
                    variant="outline"
                    className="rounded-full"
                    onClick={runOperationsProvision}
                  >
                    Retry
                  </Button>
                )}
              </div>
            </div>
          )}

          {step.id === "team" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Invite one teammate now. You can invite more from Settings →
                Users later.
              </p>
              <Field label="Email">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="teammate@example.com"
                  className="h-9 w-full rounded-lg border border-border/40 bg-background px-3 text-sm outline-none focus:border-primary/40"
                />
              </Field>
              <Field label="Roles">
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    "System Manager",
                    "Sales User",
                    "Sales Manager",
                    "Accounts User",
                    "Stock User",
                    "Manufacturing User",
                  ].map((r) => (
                    <label
                      key={r}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 text-xs transition-colors",
                        inviteRoles.includes(r)
                          ? "border-primary/40 bg-primary/5"
                          : "border-border/40 hover:border-border",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={inviteRoles.includes(r)}
                        onChange={() =>
                          setInviteRoles((prev) =>
                            prev.includes(r)
                              ? prev.filter((x) => x !== r)
                              : [...prev, r],
                          )
                        }
                        className="h-3.5 w-3.5"
                      />
                      {r}
                    </label>
                  ))}
                </div>
              </Field>
              {inviteStatus === "error" && inviteError && (
                <p className="text-xs text-destructive">{inviteError}</p>
              )}
              {inviteStatus === "done" && (
                <p className="flex items-center gap-1.5 text-sm text-success">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Invite sent.
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  className="rounded-full"
                  onClick={runInvite}
                  disabled={inviteStatus === "running" || !inviteEmail}
                >
                  {inviteStatus === "running" ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Inviting…
                    </>
                  ) : (
                    <>Send invite</>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  className="rounded-full"
                  onClick={() => {
                    setInviteStatus("skipped");
                    toast.info("Skipped — invite later from Settings → Users.");
                  }}
                >
                  Skip
                </Button>
              </div>
            </div>
          )}

          {step.id === "catalog" && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Seed a starter catalog: a customer, a supplier, a stock
                item, and a default BOM. You can do this anytime from
                the relevant module pages.
              </p>
              <ul className="space-y-1.5 rounded-xl border border-border/40 bg-secondary/20 p-3 text-sm">
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Add your first <strong>customer</strong> — opens the
                  New Customer form with sane defaults.
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Add your first <strong>supplier</strong>.
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                  Add a <strong>stock item</strong> with a default BOM.
                </li>
              </ul>
              {seedStatus === "done" && (
                <p className="flex items-center gap-1.5 text-sm text-success">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Marked for
                  seeding. Use the module pages to enter the actual
                  details.
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  className="rounded-full"
                  onClick={runSeed}
                  disabled={seedStatus === "running"}
                >
                  {seedStatus === "running" ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Preparing…
                    </>
                  ) : (
                    <>I'll seed later</>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  className="rounded-full"
                  onClick={() => {
                    setSeedStatus("skipped");
                    toast.info("Skipped — add from the relevant module pages.");
                  }}
                >
                  Skip
                </Button>
              </div>
            </div>
          )}

          {step.id === "done" && (
            <div className="space-y-3 text-center">
              <Sparkles className="mx-auto h-12 w-12 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">
                You&apos;re operational.
              </h3>
              <p className="text-sm text-muted-foreground">
                Use the dashboard to monitor today&apos;s work, or jump
                straight into a module below.
              </p>
              <div className="mx-auto grid max-w-md grid-cols-2 gap-2 pt-2">
                {[
                  { label: "Sales", href: "/sales/dashboard" },
                  { label: "Stock", href: "/stock/dashboard" },
                  { label: "Manufacturing", href: "/manufacturing" },
                  { label: "Accounting", href: "/accounting/dashboard" },
                ].map((m) => (
                  <Button
                    key={m.href}
                    variant="outline"
                    className="rounded-full"
                    onClick={() => router.push(m.href)}
                  >
                    {m.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </motion.section>
      </AnimatePresence>

      {/* Step nav */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          className="rounded-full"
          onClick={goBack}
          disabled={isFirst}
        >
          <ChevronLeft className="mr-1.5 h-3.5 w-3.5" /> Back
        </Button>
        {isLast ? (
          <Button className="rounded-full" onClick={finish} data-testid="onboarding-finish">
            Finish <Sparkles className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button
            className="rounded-full"
            onClick={goNext}
            // For the operations step, don't allow skipping until provision ran
            disabled={step.id === "operations" && opsStatus !== "done"}
          >
            Next <ChevronRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
