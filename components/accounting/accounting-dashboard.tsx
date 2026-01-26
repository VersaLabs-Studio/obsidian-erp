"use client";

import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  CreditCard,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  BarChart3,
  Calendar,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface MetricCardProps {
  title: string;
  value: string;
  trend: string;
  trendType: "up" | "down" | "neutral";
  icon: any;
  color: string;
  index: number;
}

function MetricCard({
  title,
  value,
  trend,
  trendType,
  icon: Icon,
  color,
  index,
}: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className="rounded-[2.5rem] border-border/50 bg-card/40 backdrop-blur-sm shadow-xl hover:bg-card/60 transition-all duration-300">
        <CardContent className="p-8">
          <div className="flex justify-between items-start mb-6">
            <div className={cn("p-4 rounded-[1.5rem] shadow-lg", color)}>
              <Icon className="w-6 h-6 text-white" />
            </div>
            <Badge
              variant="outline"
              className={cn(
                "font-black text-[10px] uppercase tracking-widest px-2 py-0.5 border",
                trendType === "up"
                  ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/5"
                  : trendType === "down"
                    ? "text-rose-500 border-rose-500/20 bg-rose-500/5"
                    : "text-sky-500 border-sky-500/20 bg-sky-500/5",
              )}
            >
              {trendType === "up" ? (
                <ArrowUpRight className="w-3 h-3 mr-1 inline" />
              ) : trendType === "down" ? (
                <ArrowDownRight className="w-3 h-3 mr-1 inline" />
              ) : null}
              {trend}
            </Badge>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">
            {title}
          </p>
          <h3 className="text-3xl font-black tracking-tight">{value}</h3>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function AccountingDashboard() {
  return (
    <div className="space-y-8">
      {/* Primary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Receivables"
          value="ETB 14,250.00"
          trend="+12.5%"
          trendType="up"
          icon={TrendingUp}
          color="bg-primary/90"
          index={0}
        />
        <MetricCard
          title="Total Payables"
          value="ETB 8,420.00"
          trend="-2.4%"
          trendType="down"
          icon={TrendingDown}
          color="bg-rose-500/90"
          index={1}
        />
        <MetricCard
          title="Cash Balance"
          value="ETB 452,100.00"
          trend="+5.1%"
          trendType="up"
          icon={Wallet}
          color="bg-emerald-500/90"
          index={2}
        />
        <MetricCard
          title="Pending Approvals"
          value="12"
          trend="Action Required"
          trendType="neutral"
          icon={Activity}
          color="bg-amber-500/90"
          index={3}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cash Flow Preview */}
        <Card className="lg:col-span-2 rounded-[2.5rem] border-border/50 bg-card/40 backdrop-blur-sm overflow-hidden min-h-[400px]">
          <CardHeader className="p-8 pb-0">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold">
                  Cash Flow Overview
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1 font-medium">
                  Monthly revenue vs expenses
                </p>
              </div>
              <div className="p-3 bg-secondary/30 rounded-2xl">
                <BarChart3 className="w-5 h-5 text-muted-foreground" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 flex items-center justify-center min-h-[300px]">
            <div className="flex flex-col items-center text-center opacity-40">
              <PieChart className="w-20 h-20 mb-4 text-muted-foreground" />
              <p className="text-sm font-bold uppercase tracking-widest">
                Financial Charts Loading...
              </p>
              <p className="text-xs font-medium">
                Waiting for transaction data
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Quick Links / Recent Activity */}
        <Card className="rounded-[2.5rem] border-border/50 bg-card/40 backdrop-blur-sm overflow-hidden">
          <CardHeader className="p-8 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-sky-500/10 rounded-2xl">
                <Calendar className="w-5 h-5 text-sky-600" />
              </div>
              <CardTitle className="text-lg font-bold">
                Up-coming Due Dates
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-0 space-y-4">
            {[
              {
                name: "Acme Corp Payment",
                date: "Jan 28",
                amount: "ETB 2,500",
                type: "Income",
              },
              {
                name: "Rent - Main Office",
                date: "Feb 01",
                amount: "ETB 15,000",
                type: "Expense",
              },
              {
                name: "Global Tech Services",
                date: "Feb 03",
                amount: "ETB 4,200",
                type: "Expense",
              },
              {
                name: "Star Logistics",
                date: "Feb 05",
                amount: "ETB 1,800",
                type: "Income",
              },
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 bg-secondary/10 rounded-2xl hover:bg-secondary/20 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full",
                      item.type === "Income" ? "bg-emerald-500" : "bg-rose-500",
                    )}
                  />
                  <div>
                    <p className="text-sm font-bold group-hover:text-primary transition-colors">
                      {item.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
                      {item.date}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-black">{item.amount}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
