// app/sales/dashboard/page.tsx
// Obsidian ERP v4.0 - Sales Dashboard
"use client";

import { motion } from "framer-motion";
import {
  FileText,
  ClipboardList,
  Users,
  TrendingUp,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  LayoutDashboard,
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
import { Quotation, SalesOrder } from "@/types/doctype-types";
import { LoadingState, StatusBadge } from "@/components/smart";

// ============================================================================
// Stat Card Component
// ============================================================================

interface StatCardProps {
  title: string;
  value: string | number;
  icon: any;
  description: string;
  trend?: {
    value: string;
    positive: boolean;
  };
  color: string;
  index: number;
}

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  color,
  index,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className="group relative overflow-hidden border-none shadow-lg shadow-black/5 bg-card/60 backdrop-blur-md hover:bg-card hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 rounded-[2rem]">
        {/* Background Glow */}
        <div
          className={`absolute -right-8 -top-8 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-700 bg-${color.replace("bg-", "")}`}
        />

        <CardContent className="p-6 relative">
          <div className="flex justify-between items-start">
            <div className="space-y-4">
              <div
                className={cn(
                  "p-4 rounded-2xl transition-all duration-500 group-hover:scale-110 shadow-lg shadow-black/5",
                  color.includes("primary")
                    ? "bg-primary/10"
                    : `${color.replace("bg-", "bg-")}/10`,
                )}
              >
                <Icon
                  className={cn(
                    "w-6 h-6",
                    color.includes("primary")
                      ? "text-primary"
                      : `text-${color.replace("bg-", "")}`,
                  )}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {title}
                </p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-3xl font-bold tracking-tight">{value}</h3>
                  {trend && (
                    <span
                      className={`text-xs font-semibold ${trend.positive ? "text-emerald-500" : "text-rose-500"}`}
                    >
                      {trend.value}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
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
// Dashboard Page
// ============================================================================

export default function SalesDashboard() {
  const router = useRouter();

  // Fetch Quotations
  const { data: quotations = [], isLoading: isLoadingQuotations } =
    useFrappeList<Quotation>("Quotation", {
      fields: ["name", "customer_name", "grand_total", "status", "creation"],
      orderBy: { field: "creation", order: "desc" },
      limit: 5,
    });

  // Fetch Sales Orders
  const { data: salesOrders = [], isLoading: isLoadingOrders } =
    useFrappeList<SalesOrder>("Sales Order", {
      fields: ["name", "customer_name", "grand_total", "status", "creation"],
      orderBy: { field: "creation", order: "desc" },
      limit: 5,
    });

  // Simple metric calculations (real apps would use specialized endpoints)
  const openQuotations = quotations.filter(
    (q) => q.status === "Open" || q.status === "Draft",
  ).length;
  const pendingOrders = salesOrders.filter(
    (so) => so.status === "Draft" || so.status === "To Deliver",
  ).length;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-ET", {
      style: "currency",
      currency: "ETB",
    }).format(amount);
  };

  const isLoading = isLoadingQuotations || isLoadingOrders;

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight flex items-center gap-3">
            <LayoutDashboard className="w-10 h-10 text-primary" />
            Sales Overview
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Monitor your sales performance and streamline your workflow.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="rounded-full px-6"
            onClick={() => router.push("/sales/quotation/new")}
          >
            <Plus className="w-4 h-4 mr-2" /> New Quotation
          </Button>
          <Button
            className="rounded-full px-6 shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all"
            onClick={() => router.push("/sales/sales-order/new")}
          >
            <Plus className="w-4 h-4 mr-2" /> New Order
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Sales"
          value={formatCurrency(453200)} // Mocked for demo
          icon={TrendingUp}
          description="Total revenue this month"
          trend={{ value: "+12.5%", positive: true }}
          color="primary"
          index={0}
        />
        <StatCard
          title="Open Quotations"
          value={openQuotations}
          icon={FileText}
          description="Quotations awaiting approval"
          color="amber-500"
          index={1}
        />
        <StatCard
          title="Pending Orders"
          value={pendingOrders}
          icon={Clock}
          description="Orders to be fulfilled"
          color="sky-500"
          index={2}
        />
        <StatCard
          title="New Customers"
          value="24"
          icon={Users}
          description="Acquired in last 30 days"
          trend={{ value: "+4", positive: true }}
          color="emerald-500"
          index={3}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Quotations */}
        <Card className="border-none shadow-xl shadow-black/5 bg-card/40 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-xl">Recent Quotations</CardTitle>
              <CardDescription>
                Latest proposals sent to customers
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/sales/quotation")}
            >
              View All <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingState rows={3} variant="list" />
            ) : quotations.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground italic">
                No recent quotations
              </div>
            ) : (
              <div className="space-y-4">
                {quotations.map((q, i) => (
                  <div
                    key={q.name}
                    className="flex items-center justify-between p-4 rounded-2xl bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer group"
                    onClick={() => router.push(`/sales/quotation/${q.name}`)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold group-hover:scale-110 transition-transform">
                        {q.customer_name?.charAt(0) || "Q"}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">
                          {q.customer_name || "Unknown Customer"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {q.name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <p className="text-sm font-bold">
                        {formatCurrency(q.grand_total || 0)}
                      </p>
                      <StatusBadge status={q.status.toLowerCase()} size="sm" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Sales Orders */}
        <Card className="border-none shadow-xl shadow-black/5 bg-card/40 backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-xl">Recent Sales Orders</CardTitle>
              <CardDescription>Latest confirmed orders</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/sales/sales-order")}
            >
              View All <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <LoadingState rows={3} variant="list" />
            ) : salesOrders.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground italic">
                No recent sales orders
              </div>
            ) : (
              <div className="space-y-4">
                {salesOrders.map((so, i) => (
                  <div
                    key={so.name}
                    className="flex items-center justify-between p-4 rounded-2xl bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer group"
                    onClick={() => router.push(`/sales/sales-order/${so.name}`)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-500 font-bold group-hover:scale-110 transition-transform">
                        {so.customer_name?.charAt(0) || "S"}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">
                          {so.customer_name || "Unknown Customer"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {so.name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <p className="text-sm font-bold">
                        {formatCurrency(so.grand_total || 0)}
                      </p>
                      <StatusBadge status={so.status.toLowerCase()} size="sm" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* CTA Section - Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card
          className="group relative overflow-hidden border-none shadow-lg shadow-black/5 bg-card/60 backdrop-blur-md hover:bg-card hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 rounded-[2rem] cursor-pointer"
          onClick={() => router.push("/crm/customer/new")}
        >
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-700 bg-primary" />
          <CardContent className="p-6 flex items-center gap-5 relative">
            <div className="p-4 rounded-2xl bg-primary/10 group-hover:scale-110 transition-all duration-500">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h4 className="font-bold text-lg group-hover:text-primary transition-colors">
                Register Customer
              </h4>
              <p className="text-sm text-muted-foreground font-medium">
                Add a new customer to CRM
              </p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="group relative overflow-hidden border-none shadow-lg shadow-black/5 bg-card/60 backdrop-blur-md hover:bg-card hover:shadow-2xl hover:shadow-indigo-500/5 transition-all duration-500 rounded-[2rem] cursor-pointer"
          onClick={() => router.push("/sales/quotation/new")}
        >
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-700 bg-indigo-500" />
          <CardContent className="p-6 flex items-center gap-5 relative">
            <div className="p-4 rounded-2xl bg-indigo-500/10 group-hover:scale-110 transition-all duration-500">
              <FileText className="w-6 h-6 text-indigo-500" />
            </div>
            <div>
              <h4 className="font-bold text-lg group-hover:text-indigo-500 transition-colors">
                Create Quotation
              </h4>
              <p className="text-sm text-muted-foreground font-medium">
                Send a new proposal
              </p>
            </div>
          </CardContent>
        </Card>

        <Card
          className="group relative overflow-hidden border-none shadow-lg shadow-black/5 bg-card/60 backdrop-blur-md hover:bg-card hover:shadow-2xl hover:shadow-emerald-500/5 transition-all duration-500 rounded-[2rem] cursor-pointer"
          onClick={() => router.push("/sales/sales-order/new")}
        >
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-20 transition-opacity duration-700 bg-emerald-500" />
          <CardContent className="p-6 flex items-center gap-5 relative">
            <div className="p-4 rounded-2xl bg-emerald-500/10 group-hover:scale-110 transition-all duration-500">
              <ClipboardList className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h4 className="font-bold text-lg group-hover:text-emerald-500 transition-colors">
                New Sales Order
              </h4>
              <p className="text-sm text-muted-foreground font-medium">
                Convert a won deal
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
