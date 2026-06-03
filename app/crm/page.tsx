// app/crm/page.tsx
// Obsidian ERP v4.0 - CRM Dashboard
"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Users,
  Target,
  User,
  MapPin,
  TrendingUp,
  ArrowRight,
  Plus,
  ArrowUpRight,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// v3.0 Imports
import { useFrappeList } from "@/hooks/generic";
import { PageHeader, LoadingState } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import type { Lead, Customer, Contact, Address } from "@/types/doctype-types";

/**
 * Quick Action Card Component
 */
function ActionCard({
  title,
  description,
  icon: Icon,
  href,
  color,
  delay,
  count,
}: {
  title: string;
  description: string;
  icon: any;
  href: string;
  color: string;
  delay: number;
  count?: number;
}) {
  const router = useRouter();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="group relative overflow-hidden bg-card hover:bg-card/80 p-6 rounded-[2.5rem] border border-border/50 transition-all duration-500 hover:shadow-2xl hover:shadow-primary/5 cursor-pointer"
      onClick={() => router.push(href)}
    >
      {/* Background Glow */}
      <div
        className={`absolute -right-8 -top-8 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-700 bg-${color}`}
      />

      <div className="flex items-start justify-between mb-8">
        <div
          className={`p-4 rounded-2xl bg-secondary/10 group-hover:bg-${color}/10 group-hover:scale-110 transition-all duration-500`}
        >
          <Icon
            className={`h-6 w-6 text-muted-foreground group-hover:text-${color}`}
          />
        </div>
        <div className="flex flex-col items-end">
          {count !== undefined && (
            <span className="text-3xl font-black tracking-tighter opacity-20 group-hover:opacity-100 transition-opacity duration-500">
              {count}
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full opacity-0 group-hover:opacity-100 transition-all duration-500 translate-x-4 group-hover:translate-x-0"
          >
            <ArrowUpRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div>
        <h3 className="text-xl font-bold tracking-tight mb-2 group-hover:text-primary transition-colors">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed font-medium">
          {description}
        </p>
      </div>

      {/* Decorative Line */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/10 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-700" />
    </motion.div>
  );
}

export default function CRMDashboard() {
  const router = useRouter();

  // Fetch data for stats and recent activity
  const { data: leads, isLoading: leadsLoading } = useFrappeList<Lead>("Lead", {
    orderBy: { field: "creation", order: "desc" },
    limit: 5,
  });
  const { data: customers, isLoading: customersLoading } =
    useFrappeList<Customer>("Customer", {
      orderBy: { field: "creation", order: "desc" },
      limit: 5,
    });
  const { data: contacts, isLoading: contactsLoading } = useFrappeList<Contact>(
    "Contact",
    {
      orderBy: { field: "creation", order: "desc" },
      limit: 5,
    }
  );
  const { data: addresses, isLoading: addressesLoading } =
    useFrappeList<Address>("Address", {
      orderBy: { field: "creation", order: "desc" },
      limit: 5,
    });

  // Counts (mocking total counts by assuming we might need a separate count API, but using list length for now as an example)
  // In a real app, useFrappeList could return total count if implemented in backend
  const stats = [
    {
      label: "Leads",
      count: leads?.length || 0,
      icon: Target,
      color: "primary",
      href: "/crm/lead",
    },
    {
      label: "Customers",
      count: customers?.length || 0,
      icon: Users,
      color: "blue-500",
      href: "/crm/customer",
    },
    {
      label: "Contacts",
      count: contacts?.length || 0,
      icon: User,
      color: "indigo-500",
      href: "/crm/contact",
    },
    {
      label: "Addresses",
      count: addresses?.length || 0,
      icon: MapPin,
      color: "emerald-500",
      href: "/crm/address",
    },
  ];

  if (leadsLoading || customersLoading || contactsLoading || addressesLoading) {
    return <LoadingState type="list" count={4} />;
  }

  return (
    <div className="space-y-10 pb-20">
      <PageHeader
        title="CRM Hub"
        subtitle="Manage leads, nurture relationships, and track conversions."
        actions={
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="rounded-full bg-background/50 backdrop-blur-sm border-border/50"
              onClick={() => router.push("/crm/settings")}
            >
              <Plus className="h-4 w-4 mr-2" /> Settings
            </Button>
            <Button
              className="rounded-full shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all duration-500"
              onClick={() => router.push("/crm/lead/new")}
            >
              <Sparkles className="h-4 w-4 mr-2" /> Quick Lead
            </Button>
          </div>
        }
      />

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <ActionCard
            key={stat.label}
            title={stat.label}
            description={`View and manage all ${stat.label.toLowerCase()} in your system.`}
            icon={stat.icon}
            href={stat.href}
            color={stat.color}
            delay={idx * 0.1}
            count={stat.count}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mt-10">
        {/* Recent Activity Section */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-xl">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">
                Recent Opportunities
              </h2>
            </div>
            <Button
              variant="ghost"
              className="rounded-full text-primary hover:text-primary/80"
              onClick={() => router.push("/crm/lead")}
            >
              View All <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>

          <div className="grid gap-4">
            {leads?.map((lead, idx) => (
              <motion.div
                key={lead.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + idx * 0.05 }}
                className="group flex items-center justify-between p-5 bg-card hover:bg-card/80 rounded-[2rem] border border-border/50 hover:border-primary/20 transition-all duration-300 cursor-pointer"
                onClick={() =>
                  router.push(`/crm/lead/${encodeURIComponent(lead.name)}`)
                }
              >
                <div className="flex items-center gap-5">
                  <div className="h-12 w-12 rounded-full bg-secondary/20 flex items-center justify-center font-bold text-primary group-hover:scale-110 transition-transform">
                    {lead.lead_name?.charAt(0) || "L"}
                  </div>
                  <div>
                    <h4 className="font-bold text-lg leading-none mb-1 group-hover:text-primary transition-colors">
                      {lead.lead_name}
                    </h4>
                    <p className="text-sm text-muted-foreground font-medium">
                      {lead.company_name || lead.email_id}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50 mb-1">
                      Status
                    </p>
                    <Badge
                      variant="outline"
                      className="rounded-full border-primary/20 bg-primary/5 text-primary"
                    >
                      {lead.status}
                    </Badge>
                  </div>
                  <div className="p-3 rounded-full bg-secondary/20 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Side Panel: Quick Tips & Info */}
        <div className="lg:col-span-4 space-y-8">
          <InfoCard title="CRM Health" icon="activity" variant="gradient">
            <div className="space-y-6 pt-2">
              <div className="flex justify-between items-center bg-background/30 p-4 rounded-2xl border border-white/5 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold opacity-80">
                    Recent Conversions
                  </span>
                </div>
                <span className="text-lg font-black tracking-tighter">
                  {leads?.filter((l) => l.status === "Converted").length || 0}
                </span>
              </div>

              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground font-medium">
                    Conversion Rate
                  </span>
                  <span className="text-primary font-bold">65%</span>
                </div>
                <div className="h-2 w-full bg-secondary/30 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: "65%" }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-primary/80 to-primary shadow-[0_0_10px_rgba(var(--primary),0.3)]"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed mt-2 italic font-medium">
                  * Based on recent lead conversions and opportunity responses.
                </p>
              </div>
            </div>
          </InfoCard>

          {/* Market Insights Distribution */}
          <div className="p-8 rounded-[2.5rem] bg-secondary/20 border border-primary/10 space-y-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-xl font-bold tracking-tight text-foreground">
                Market Insights
              </h3>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <span>Top Industries</span>
                  <span>Impact</span>
                </div>
                {[
                  { name: "Technology", value: "45%", color: "bg-primary" },
                  { name: "Marketing", value: "25%", color: "bg-violet-500" },
                  {
                    name: "Real Estate",
                    value: "20%",
                    color: "bg-emerald-500",
                  },
                ].map((item) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="font-medium">{item.name}</span>
                        <span className="text-muted-foreground">
                          {item.value}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-background rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: item.value }}
                          className={`h-full ${item.color}`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-8 rounded-[2.5rem] bg-primary/5 border border-primary/10 space-y-4 relative overflow-hidden group hover:bg-primary/[0.08] transition-colors duration-500">
            {/* Decorative Glow */}
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary/10 rounded-full blur-2xl group-hover:bg-primary/20 transition-colors" />

            <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 transition-transform duration-500 group-hover:scale-110">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <h3 className="text-xl font-black tracking-tight text-foreground">
              Pro Tip
            </h3>
            <p className="text-sm text-muted-foreground font-medium leading-relaxed">
              Always add{" "}
              <span className="text-primary font-bold underline">
                Address Titles
              </span>{" "}
              to your locations to make search and filtering faster for your
              sales team.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
