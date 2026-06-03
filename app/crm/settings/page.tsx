// app/crm/settings/page.tsx
// Obsidian ERP v4.0 - CRM Settings Landing Page
// @ts-nocheck

"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Users,
  MapPin,
  ArrowUpRight,
  Settings,
  FolderTree,
  Globe,
  Tag,
  Briefcase,
} from "lucide-react";

// v3.0 Imports
import { PageHeader } from "@/components/smart";

// Setting Card Component following v3.0 design pattern
function SettingCard({
  title,
  description,
  icon: Icon,
  href,
  count,
  index,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  count?: number;
  index: number;
}) {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="group relative overflow-hidden rounded-2xl bg-card hover:bg-card/80 shadow-lg hover:shadow-xl transition-all duration-500 cursor-pointer border border-transparent hover:border-primary/10"
      onClick={() => router.push(href)}
    >
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <div className="relative p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {/* Icon Container */}
            <div className="p-3.5 bg-primary/10 rounded-2xl group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300 shadow-sm">
              <Icon className="h-6 w-6 text-primary" />
            </div>

            {/* Title & Description */}
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-foreground mb-1 group-hover:text-primary transition-colors">
                {title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {description}
              </p>
            </div>
          </div>

          {/* Arrow */}
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1 group-hover:bg-primary group-hover:text-primary-foreground"
          >
            <ArrowUpRight className="h-5 w-5" />
          </Button>
        </div>

        {/* Count Badge */}
        {count !== undefined && (
          <div className="mt-4 pt-4 border-t border-border/30">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-widest text-muted-foreground/60 font-semibold">
                Total Records
              </span>
              <span className="text-2xl font-bold text-primary">{count}</span>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Settings configuration
const settingsItems = [
  {
    title: "Customer Groups",
    description:
      "Manage customer classification groups like Retail, Enterprise, and Individual customers.",
    icon: Users,
    href: "/crm/settings/customer-group",
  },
  {
    title: "Territories",
    description:
      "Configure geographical territories for sales and distribution such as regions and cities.",
    icon: MapPin,
    href: "/crm/settings/territory",
  },
  {
    title: "Lead Sources",
    description:
      "Track where your leads come from - Website, Referral, Advertisement, etc.",
    icon: Tag,
    href: "/crm/settings/lead-source",
  },
  {
    title: "Industry Types",
    description:
      "Define industry classifications for customers and leads to better segment your market.",
    icon: Briefcase,
    href: "/crm/settings/industry-type",
  },
];

export default function CRMSettingsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="CRM Settings"
        subtitle="Configure your Customer Relationship Management module"
        backHref="/crm/customer"
        actions={
          <div className="flex items-center gap-2 px-4 py-2 bg-secondary/30 rounded-full">
            <Settings className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Configuration Hub
            </span>
          </div>
        }
      />

      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-8 border border-primary/10"
      >
        <div className="relative z-10 max-w-2xl">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-primary/20 rounded-xl">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            <span className="text-xs uppercase tracking-widest text-primary font-bold">
              System Configuration
            </span>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">
            Customize Your CRM Experience
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Configure customer groups, territories, lead sources, and industry
            types to match your business workflow. These settings help you
            organize and segment your customer data effectively.
          </p>
        </div>

        {/* Decorative elements */}
        <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute right-20 top-10 w-32 h-32 bg-primary/5 rounded-full blur-2xl" />
      </motion.div>

      {/* Settings Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {settingsItems.map((item, index) => (
          <SettingCard
            key={item.href}
            title={item.title}
            description={item.description}
            icon={item.icon}
            href={item.href}
            index={index}
          />
        ))}
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-card rounded-2xl p-6 shadow-lg"
      >
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          Quick Links
        </h3>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => (window.location.href = "/crm/customer")}
          >
            <Users className="h-4 w-4 mr-2" />
            All Customers
          </Button>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => (window.location.href = "/crm/lead")}
          >
            <FolderTree className="h-4 w-4 mr-2" />
            All Leads
          </Button>
          <Button
            variant="outline"
            className="rounded-full"
            onClick={() => (window.location.href = "/crm/contact")}
          >
            <MapPin className="h-4 w-4 mr-2" />
            All Contacts
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
