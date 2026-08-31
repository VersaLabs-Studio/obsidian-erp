"use client";

// app/reports/page.tsx
// Obsidian ERP v4.0 — Phase 2Y-R2 P7: Reports Hub.
// Central landing page surfacing all flagship reports.

import Link from "next/link";
import { motion } from "framer-motion";
import {
  BarChart3,
  Scale,
  TrendingUp,
  ShoppingCart,
  Factory,
} from "lucide-react";
import { PageHeader } from "@/components/smart";

const REPORTS = [
  {
    title: "Stock Balance & Valuation",
    description: "Current stock levels, valuation rates, and reorder status across all warehouses",
    href: "/reports/stock-balance",
    icon: Scale,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  {
    title: "Sales Performance",
    description: "Top customers, revenue trends, and order status breakdown",
    href: "/reports/sales-performance",
    icon: TrendingUp,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  {
    title: "Procurement Spend",
    description: "Supplier spend analysis, purchase order trends, and cost breakdown",
    href: "/reports/procurement-spend",
    icon: ShoppingCart,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
  {
    title: "Manufacturing Production",
    description: "Work order status, job card progress, and production output",
    href: "/reports/manufacturing-production",
    icon: Factory,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const },
  },
};

export default function ReportsHubPage() {
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 p-6"
    >
      <motion.div variants={cardVariants}>
        <PageHeader
          title="Reports"
          label="Operational and financial reports across all modules"
        />
      </motion.div>

      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
      >
        {REPORTS.map((report) => {
          const Icon = report.icon;
          return (
            <motion.div key={report.href} variants={cardVariants}>
              <Link
                href={report.href}
                className="group block rounded-2xl border border-border/60 bg-card/40 p-6 backdrop-blur-sm transition-all duration-200 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
              >
                <div className="flex items-start gap-4">
                  <div className={`rounded-xl p-3 ${report.bgColor}`}>
                    <Icon className={`h-5 w-5 ${report.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {report.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                      {report.description}
                    </p>
                  </div>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}
