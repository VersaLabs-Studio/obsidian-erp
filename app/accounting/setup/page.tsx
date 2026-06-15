"use client";

import { useRouter } from "next/navigation";
import {
  Wallet,
  Building2,
  CreditCard,
  Calendar,
  Settings2,
  ArrowRight,
  ChevronRight,
  Landmark,
  Calculator,
  PieChart,
  Network,
  Tag,
} from "lucide-react";
import { PageHeader } from "@/components/smart";
import { cn } from "@/lib/utils";

const SETUP_MODULES = [
  {
    title: "Chart of Accounts",
    description:
      "Manage your account hierarchy (Assets, Liabilities, Income, Expenses)",
    href: "/accounting/setup/account",
    icon: Network,
    color: "text-blue-600",
    bg: "bg-blue-100 dark:bg-blue-900/40",
    borderColor: "border-blue-200 dark:border-blue-800",
  },
  {
    title: "Cost Centers",
    description:
      "Structure your business into profitable departments or divisions",
    href: "/accounting/setup/cost-center",
    icon: Building2,
    color: "text-rose-600",
    bg: "bg-rose-100 dark:bg-rose-900/40",
    borderColor: "border-rose-200 dark:border-rose-800",
  },
  {
    title: "Modes of Payment",
    description: "Configure Bank, Cash, and Mobile Money payment methods",
    href: "/accounting/setup/mode-of-payment",
    icon: CreditCard,
    color: "text-emerald-600",
    bg: "bg-emerald-100 dark:bg-emerald-900/40",
    borderColor: "border-emerald-200 dark:border-emerald-800",
  },
  {
    title: "Fiscal Years",
    description: "Set up accounting periods and financial year boundaries",
    href: "/accounting/setup/fiscal-year",
    icon: Calendar,
    color: "text-amber-600",
    bg: "bg-amber-100 dark:bg-amber-900/40",
    borderColor: "border-amber-200 dark:border-amber-800",
  },
  {
    title: "Payment Terms",
    description:
      "Define standard payment templates (e.g., Net 30, 50% Advance)",
    href: "/accounting/setup/payment-terms",
    icon: Calendar,
    color: "text-indigo-600",
    bg: "bg-indigo-100 dark:bg-indigo-900/40",
    borderColor: "border-indigo-200 dark:border-indigo-800",
  },
  {
    title: "Tax Categories",
    description: "Manage tax classes and regional tax rules",
    href: "/accounting/setup/tax-category",
    icon: Calculator,
    color: "text-violet-600",
    bg: "bg-violet-100 dark:bg-violet-900/40",
    borderColor: "border-violet-200 dark:border-violet-800",
  },
  {
    title: "Price Lists",
    description: "Manage selling/buying price lists and currency rules",
    href: "/accounting/settings/price-list",
    icon: Tag,
    color: "text-cyan-600",
    bg: "bg-cyan-100 dark:bg-cyan-900/40",
    borderColor: "border-cyan-200 dark:border-cyan-800",
  },
];

export default function AccountingSetupPage() {
  const router = useRouter();

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      <PageHeader
        title="Accounting Configuration"
        subtitle="Foundational settings for your financial infrastructure"
        backUrl="/accounting"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {SETUP_MODULES.map((module, idx) => {
          const Icon = module.icon;
          return (
            <div
              key={module.href}
              onClick={() => router.push(module.href)}
              className={cn(
                "group relative bg-card rounded-2xl border p-8 cursor-pointer overflow-hidden",
                "hover:shadow-xl hover:border-primary/20 transition-all duration-500",
                "animate-in fade-in slide-in-from-bottom-4 shadow-sm",
                module.borderColor,
              )}
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br from-primary/5 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="flex flex-col gap-6">
                <div
                  className={cn(
                    "h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 shadow-lg",
                    module.bg,
                  )}
                >
                  <Icon className={cn("h-7 w-7", module.color)} />
                </div>
                <div className="space-y-2">
                  <h3 className="font-black text-lg group-hover:text-primary transition-colors flex items-center justify-between">
                    {module.title}
                    <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
                  </h3>
                  <p className="text-xs text-muted-foreground font-medium leading-relaxed uppercase tracking-widest">
                    {module.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
