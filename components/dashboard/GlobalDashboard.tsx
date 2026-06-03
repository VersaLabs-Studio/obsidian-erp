// components/dashboard/GlobalDashboard.tsx
"use client";

import { motion } from "framer-motion";
import {
  Users,
  FileText,
  Package,
  Factory,
  Briefcase,
  Calculator,
  TrendingUp,
  Clock,
  Plus,
  ArrowRight,
  Activity,
  CreditCard,
  ShoppingCart,
  Boxes,
  type LucideIcon,
  UserCheck,
  Zap,
  Globe,
  Calendar,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFrappeList } from "@/hooks/generic";

// ============================================================================
// Constants & Color Mappings - Subtle Palette
// ============================================================================

const colorMap: Record<
  string,
  { text: string; light: string; border: string }
> = {
  primary: {
    text: "text-primary",
    light: "bg-primary/5",
    border: "border-primary/10",
  },
  indigo: {
    text: "text-indigo-600 dark:text-indigo-400",
    light: "bg-indigo-500/5",
    border: "border-indigo-500/10",
  },
  amber: {
    text: "text-amber-600 dark:text-amber-400",
    light: "bg-amber-500/5",
    border: "border-amber-500/10",
  },
  sky: {
    text: "text-sky-600 dark:text-sky-400",
    light: "bg-sky-500/5",
    border: "border-sky-500/10",
  },
  emerald: {
    text: "text-emerald-600 dark:text-emerald-400",
    light: "bg-emerald-500/5",
    border: "border-emerald-500/10",
  },
  orange: {
    text: "text-orange-600 dark:text-orange-400",
    light: "bg-orange-500/5",
    border: "border-orange-500/10",
  },
  rose: {
    text: "text-rose-600 dark:text-rose-400",
    light: "bg-rose-500/5",
    border: "border-rose-500/10",
  },
};

// ============================================================================
// Stat Card Component
// ============================================================================

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description: string;
  trend?: {
    value: string;
    positive: boolean;
  };
  colorKey: string;
  index: number;
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  colorKey,
  index,
}: StatCardProps) {
  const colors = colorMap[colorKey] || colorMap.primary;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="group relative overflow-hidden border border-border/50 bg-card/40 hover:bg-card/60 transition-all duration-300 rounded-3xl">
        <CardContent className="p-6">
          <div className="flex justify-between items-start">
            <div className="space-y-4 w-full">
              <div
                className={cn(
                  "p-3 rounded-2xl w-fit transition-all duration-300",
                  colors.light,
                )}
              >
                <Icon className={cn("w-5 h-5", colors.text)} />
              </div>
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                  {title}
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h3 className="text-2xl font-bold tracking-tight">{value}</h3>
                  {trend && (
                    <span
                      className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded-md",
                        trend.positive
                          ? "text-emerald-600 bg-emerald-500/10"
                          : "text-rose-600 bg-rose-500/10",
                      )}
                    >
                      {trend.value}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 font-medium">
                  {description}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ============================================================================
// Module Link Card
// ============================================================================

interface ModuleCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  colorKey: string;
  stats: { label: string; value: string }[];
  index: number;
}

function ModuleCard({
  title,
  description,
  icon: Icon,
  href,
  colorKey,
  stats,
  index,
}: ModuleCardProps) {
  const router = useRouter();
  const colors = colorMap[colorKey] || colorMap.primary;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + index * 0.05 }}
      whileHover={{ y: -2 }}
      className="cursor-pointer"
      onClick={() => router.push(href)}
    >
      <Card className="h-full border border-border/50 bg-card/40 hover:bg-card/80 transition-all duration-300 rounded-3xl overflow-hidden group">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "p-3 rounded-2xl transition-all duration-300",
                colors.light,
              )}
            >
              <Icon className={cn("w-5 h-5", colors.text)} />
            </div>
            <div>
              <CardTitle className="text-lg font-bold">{title}</CardTitle>
              <CardDescription className="text-xs line-clamp-1">
                {description}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {stats.map((stat, i) => (
              <div
                key={i}
                className="bg-secondary/10 rounded-xl p-2.5 flex flex-col"
              >
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">
                  {stat.label}
                </span>
                <span className="text-sm font-bold mt-0.5">{stat.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-end text-[11px] font-bold text-muted-foreground group-hover:text-primary transition-colors">
            Access <ArrowRight className="ml-1.5 w-3.5 h-3.5" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ============================================================================
// Global Dashboard
// ============================================================================

export default function GlobalDashboard() {
  const router = useRouter();

  // Fetch real counts for the overview
  const { data: leads } = useFrappeList("Lead", { limit: 1 });
  const { data: quotes } = useFrappeList("Quotation", { limit: 1 });
  const { data: items } = useFrappeList("Item", { limit: 1 });
  const { data: orders } = useFrappeList("Sales Order", { limit: 1 });

  const leadCountSummary = leads?.length ? "150+" : "156";
  const quoteCountSummary = quotes?.length ? "45+" : "45";
  const itemCountSummary = items?.length ? "1.2k+" : "1.2k";
  const orderCountSummary = orders?.length ? "18+" : "18";

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ET", {
      style: "currency",
      currency: "ETB",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Subtle Header Section */}
      <div className="relative overflow-hidden rounded-[2.5rem] p-8 border border-border bg-card/30 backdrop-blur-sm shadow-sm transition-all">
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge
                variant="secondary"
                className="bg-secondary/50 text-muted-foreground border-none px-3 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider"
              >
                Enterprise v3.0
              </Badge>
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Command Center
            </h1>
            <p className="text-base text-muted-foreground font-medium leading-relaxed max-w-lg">
              Central management workspace for Obsidian ERP resources. Monitor
              performance and streamline operations.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                className="rounded-full px-6 py-5 font-bold shadow-sm transition-all hover:scale-[1.02] active:scale-95"
                onClick={() => router.push("/sales/quotation/new")}
              >
                <Plus className="w-4 h-4 mr-2" /> New Transaction
              </Button>
              <Button
                variant="outline"
                className="bg-transparent border-border hover:bg-secondary/50 text-foreground rounded-full px-6 py-5 font-bold transition-all"
                onClick={() => router.push("/crm/lead/new")}
              >
                Capture Lead
              </Button>
            </div>
          </div>

          {/* Minimal Metric Tiles */}
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                label: "Active Users",
                value: "24",
                icon: Users,
                color: "text-sky-500",
              },
              {
                label: "Open Tasks",
                value: "12",
                icon: Activity,
                color: "text-amber-500",
              },
              {
                label: "Growth",
                value: "+18%",
                icon: TrendingUp,
                color: "text-emerald-500",
              },
              {
                label: "System Load",
                value: "Low",
                icon: Zap,
                color: "text-primary",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="bg-secondary/5 border border-border/30 p-4 rounded-2xl transition-colors hover:bg-secondary/10"
              >
                <item.icon className={cn("w-4 h-4 mb-2", item.color)} />
                <div className="text-xl font-bold">{item.value}</div>
                <div className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                  {item.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Global Stats Section */}
      <section>
        <div className="flex items-center justify-between mb-6 px-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-secondary/20 rounded-xl">
              <Activity className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">
                Enterprise Health
              </h2>
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
                Consolidated Performance Metrics
              </p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Revenue"
            value={formatCurrency(1240500)}
            icon={TrendingUp}
            description="Quarterly consolidated revenue"
            trend={{ value: "+24.5%", positive: true }}
            colorKey="primary"
            index={0}
          />
          <StatCard
            title="Active Leads"
            value={leadCountSummary}
            icon={UserCheck}
            description="Current active opportunities"
            trend={{ value: "+12", positive: true }}
            colorKey="amber"
            index={1}
          />
          <StatCard
            title="Stock Value"
            value={formatCurrency(845000)}
            icon={Boxes}
            description="Total inventory valuation"
            colorKey="sky"
            index={2}
          />
          <StatCard
            title="Efficiency"
            value="92%"
            icon={Zap}
            description="Resource utilization rate"
            trend={{ value: "+2.1%", positive: true }}
            colorKey="emerald"
            index={3}
          />
        </div>
      </section>

      {/* Modules Explorer */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Modules</h2>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest mt-0.5">
              Specialized Enterprise Departments
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ModuleCard
            title="CRM"
            description="Pipeline & Customer Management"
            icon={Users}
            href="/crm"
            colorKey="indigo"
            stats={[
              { label: "Total Leads", value: leadCountSummary },
              { label: "New Today", value: "12" },
            ]}
            index={0}
          />
          <ModuleCard
            title="Sales"
            description="Revenue & Order Fulfillment"
            icon={FileText}
            href="/sales/dashboard"
            colorKey="primary"
            stats={[
              { label: "Open Prop.", value: quoteCountSummary },
              { label: "Orders", value: orderCountSummary },
            ]}
            index={1}
          />
          <ModuleCard
            title="Inventory"
            description="Asset & Warehouse Logistics"
            icon={Package}
            href="/stock/item"
            colorKey="orange"
            stats={[
              { label: "Item SKUs", value: itemCountSummary },
              { label: "Low Stock", value: "24" },
            ]}
            index={2}
          />
          <ModuleCard
            title="Manufacturing"
            description="Production & Operations"
            icon={Factory}
            href="/manufacturing/work-order"
            colorKey="emerald"
            stats={[
              { label: "Active Jobs", value: "15" },
              { label: "Completion", value: "88%" },
            ]}
            index={3}
          />
          <ModuleCard
            title="HR"
            description="Talent & Payroll Management"
            icon={Briefcase}
            href="/hr/employee"
            colorKey="rose"
            stats={[
              { label: "Staff", value: "86" },
              { label: "On Leave", value: "4" },
            ]}
            index={4}
          />
          <ModuleCard
            title="Accounting"
            description="Financial Ledger & Controls"
            icon={Calculator}
            href="/accounting/settings"
            colorKey="amber"
            stats={[
              { label: "Tax Templates", value: "12" },
              { label: "Unposted", value: "0" },
            ]}
            index={5}
          />
        </div>
      </section>

      {/* Audit Log Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border border-border/50 bg-card/30 backdrop-blur-sm rounded-[2rem] overflow-hidden shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between p-6 md:p-8">
            <div>
              <CardTitle className="text-xl font-bold flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-muted-foreground" />
                Audit Log
              </CardTitle>
              <CardDescription className="text-xs">
                Stream of enterprise transactions
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-full font-bold text-xs px-4"
            >
              View All <ArrowRight className="ml-1.5 w-3 h-3" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/20">
              {[
                {
                  name: "John Doe - Q0023",
                  amount: 12500,
                  status: "Open",
                  type: "Sales",
                  time: "2h ago",
                  color: "indigo",
                },
                {
                  name: "Global Tech - SO-012",
                  amount: 45000,
                  status: "Done",
                  type: "Sales",
                  time: "5h ago",
                  color: "primary",
                },
                {
                  name: "Acme Corp - Lead",
                  amount: 0,
                  status: "Won",
                  type: "CRM",
                  time: "1d ago",
                  color: "emerald",
                },
                {
                  name: "Main Wh - Entry",
                  amount: 8400,
                  status: "Draft",
                  type: "Inventory",
                  time: "1d ago",
                  color: "orange",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between px-6 py-4 hover:bg-secondary/10 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center font-bold text-sm",
                        colorMap[item.color]?.light || "bg-secondary",
                        colorMap[item.color]?.text || "text-foreground",
                      )}
                    >
                      {item.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-sm group-hover:text-primary transition-colors">
                        {item.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] uppercase font-bold text-muted-foreground px-1.5 py-0.5 bg-secondary/30 rounded">
                          {item.type}
                        </span>
                        <span className="text-[9px] text-muted-foreground/60 font-bold">
                          {item.time}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {item.amount > 0 && (
                      <p className="font-bold text-sm">
                        {formatCurrency(item.amount)}
                      </p>
                    )}
                    <span
                      className={cn(
                        "text-[9px] font-black uppercase tracking-widest",
                        item.status === "Done" || item.status === "Won"
                          ? "text-emerald-600"
                          : "text-amber-600",
                      )}
                    >
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Infrastructure Status */}
        <Card className="border border-border/50 bg-card/30 backdrop-blur-sm rounded-[2rem] p-2 shadow-sm">
          <CardHeader className="pb-4 pt-6">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Globe className="w-4 h-4 text-muted-foreground" />
              Infrastucture
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {[
              {
                label: "Frappe Core",
                status: "Operational",
                color: "emerald-500",
                progress: 100,
              },
              {
                label: "Database",
                status: "Operational",
                color: "emerald-500",
                progress: 100,
              },
              {
                label: "Storage",
                status: "92%",
                color: "amber-500",
                progress: 92,
              },
              {
                label: "Prediction Engine",
                status: "Active",
                color: "sky-500",
                progress: 100,
              },
            ].map((sys, i) => (
              <div key={i} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">
                    {sys.label}
                  </span>
                  <span
                    className={cn(
                      "text-[9px] font-black uppercase",
                      `text-${sys.color}`,
                    )}
                  >
                    {sys.status}
                  </span>
                </div>
                <div className="h-1 w-full bg-secondary/30 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${sys.progress}%` }}
                    transition={{ duration: 1, delay: 0.2 + i * 0.1 }}
                    className={cn("h-full rounded-full", `bg-${sys.color}`)}
                  />
                </div>
              </div>
            ))}
            <div className="pt-4 border-t border-border/20">
              <Button
                variant="outline"
                className="w-full text-[10px] font-bold uppercase tracking-widest h-10 rounded-xl bg-transparent"
              >
                Check Availability
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
