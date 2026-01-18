"use client";

import { useRouter } from "next/navigation";
import { Layers, Briefcase, Settings } from "lucide-react";
import { PageHeader } from "@/components/smart";

const settingsItems = [
  {
    title: "Departments",
    description: "Manage organizational structure and functional groups.",
    icon: Layers,
    href: "/hr/settings/department",
  },
  {
    title: "Designations",
    description: "Define job roles and professional titles within the company.",
    icon: Briefcase,
    href: "/hr/settings/designation",
  },
];

export default function HRSettingsPage() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <PageHeader
        title="HR Settings"
        subtitle="Configure organizational structure and roles"
        backHref="/hr"
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
