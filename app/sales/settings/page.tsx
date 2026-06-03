// app/sales/settings/page.tsx
// Obsidian ERP v4.0 - Sales Settings Landing Page
"use client";

import { useRouter } from "next/navigation";
import { Calculator, FileText, Handshake, User, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/smart";

const settingsItems = [
  {
    title: "Projects",
    description:
      "Manage production projects and track progress for sales orders.",
    icon: Briefcase,
    href: "/sales/settings/project",
  },
  {
    title: "Tax Templates",
    description:
      "Manage sales tax templates like VAT 15%, Withholding Tax, etc.",
    icon: Calculator,
    href: "/sales/settings/taxes",
  },
  {
    title: "Terms and Conditions",
    description:
      "Standard legal terms like '50% Advance Required', 'No Refunds on Custom Print'.",
    icon: FileText,
    href: "/sales/settings/terms",
  },
  {
    title: "Partner Types",
    description:
      "Manage categories for sales partners (e.g. Agency, Reseller).",
    icon: FileText,
    href: "/sales/settings/sales-partner-type",
  },
  {
    title: "Sales Partners",
    description:
      "Manage external entities that help you sell products/services.",
    icon: Handshake,
    href: "/sales/settings/sales-partner",
  },
  {
    title: "Sales Persons",
    description:
      "Manage internal staff members responsible for sales operations.",
    icon: User,
    href: "/sales/settings/sales-person",
  },
];

export default function SalesSettingsPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales Settings"
        subtitle="Configure taxes, terms, and pricing"
        backHref="/sales"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {settingsItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.href}
              onClick={() => router.push(item.href)}
              className="cursor-pointer rounded-[2rem] p-8 bg-card shadow-sm hover:shadow-xl hover:shadow-primary/5 hover:bg-card/80 transition-all duration-500 group"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-foreground">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {item.description}
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
