// app/accounting/settings/page.tsx
// Obsidian ERP v4.0 - Accounting Settings Landing Page
"use client";

import { useRouter } from "next/navigation";
import {
  Building2,
  Settings,
  ArrowUpRight,
  Coins,
  ListOrdered,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/smart";
import { motion } from "framer-motion";

const settingsItems = [
  {
    title: "Companies",
    description:
      "Manage multiple company profiles, abbreviations, and default currencies.",
    icon: Building2,
    href: "/accounting/settings/company",
  },
  {
    title: "Currencies",
    description: "Define and manage exchange rates and currency settings.",
    icon: Coins,
    href: "/accounting/settings/currency",
  },
  {
    title: "Price Lists",
    description: "Manage multiple price lists for buying and selling.",
    icon: ListOrdered,
    href: "/accounting/settings/price-list",
  },
];

export default function AccountingSettingsPage() {
  const router = useRouter();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Accounting Settings"
        subtitle="Global configuration for your financial operations."
        backHref="/accounting/dashboard"
        actions={
          <div className="flex items-center gap-2 px-4 py-2 bg-secondary/30 rounded-full">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Finance Hub</span>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {settingsItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => router.push(item.href)}
              className="group relative overflow-hidden rounded-2xl bg-card p-8 hover:bg-card/80 shadow-sm hover:shadow-xl transition-all duration-500 cursor-pointer border border-transparent hover:border-primary/10"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-6">
                  <div className="p-4 bg-primary/10 rounded-2xl group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                    <Icon className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold tracking-tight mb-1 group-hover:text-primary transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
                      {item.description}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1"
                >
                  <ArrowUpRight className="h-5 w-5 font-bold" />
                </Button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
