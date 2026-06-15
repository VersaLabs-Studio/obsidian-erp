// @ts-nocheck
"use client";

import { useRouter } from "next/navigation";
import {
  Truck,
  User,
  Settings,
  ChevronRight,
  Package,
  Warehouse,
  ShieldCheck,
  MapPin,
  Tag,
} from "lucide-react";
import { PageHeader } from "@/components/smart";
import { InfoCard } from "@/components/ui/info-card";
import { cn } from "@/lib/utils";

interface SetupLinkProps {
  title: string;
  description: string;
  href: string;
  icon: any;
  color: string;
}

function SetupLink({
  title,
  description,
  href,
  icon: Icon,
  color,
}: SetupLinkProps) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(href)}
      className="group relative bg-card rounded-[2rem] border border-border/50 p-6 hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 transition-all duration-300 cursor-pointer"
    >
      <div className="flex items-start justify-between">
        <div className="flex gap-4">
          <div
            className={cn(
              "h-14 w-14 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-lg",
              color,
            )}
          >
            <Icon className="h-7 w-7 text-white" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-lg group-hover:text-primary transition-colors">
              {title}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-[200px]">
              {description}
            </p>
          </div>
        </div>
        <div className="h-10 w-10 rounded-full bg-secondary/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-4 group-hover:translate-x-0">
          <ChevronRight className="h-5 w-5 text-primary" />
        </div>
      </div>
    </div>
  );
}

export default function StockSettingsPage() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader
        title="Inventory Setup"
        subtitle="Manage stock configurations and logistics logistics utilities"
        icon={<Settings className="h-6 w-6 text-primary" />}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Logistics Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Truck className="h-4 w-4 text-amber-500" />
            </div>
            <h2 className="font-bold text-xl tracking-tight">
              Logistics Utilities
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SetupLink
              title="Drivers"
              description="Manage delivery staff and license details"
              href="/stock/setup/driver"
              icon={User}
              color="bg-indigo-500 shadow-indigo-500/20"
            />
            <SetupLink
              title="Vehicles"
              description="Manage delivery fleet and fuel tracking"
              href="/stock/setup/vehicle"
              icon={Truck}
              color="bg-amber-500 shadow-amber-500/20"
            />
          </div>
        </div>

        {/* Master Data Section */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 px-2">
            <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Package className="h-4 w-4 text-blue-500" />
            </div>
            <h2 className="font-bold text-xl tracking-tight">Master Data</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SetupLink
              title="Items"
              description="Manage products, SKUs, and categories"
              href="/stock/item"
              icon={Package}
              color="bg-blue-500 shadow-blue-500/20"
            />
            <SetupLink
              title="Warehouses"
              description="Setup storage locations and groups"
              href="/stock/warehouse"
              icon={Warehouse}
              color="bg-emerald-500 shadow-emerald-500/20"
            />
            <SetupLink
              title="Item Price"
              description="Manage standard selling and buying rates"
              href="/stock/settings/item-price"
              icon={Tag}
              color="bg-violet-500 shadow-violet-500/20"
            />
          </div>
        </div>
      </div>

      <InfoCard
        title="Operational Settings"
        icon={<ShieldCheck className="h-5 w-5 text-primary" />}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-2">
          <div className="p-4 rounded-3xl bg-secondary/20 border border-border/50 group cursor-pointer hover:bg-secondary/30 transition-all">
            <p className="font-bold mb-1 group-hover:text-primary">
              Stock Method
            </p>
            <p className="text-xs text-muted-foreground italic">
              FIFO (Standard)
            </p>
          </div>
          <div className="p-4 rounded-3xl bg-secondary/20 border border-border/50 group cursor-pointer hover:bg-secondary/30 transition-all">
            <p className="font-bold mb-1 group-hover:text-primary">
              Auto Material Request
            </p>
            <p className="text-xs text-muted-foreground italic">
              Enabled for finish goods
            </p>
          </div>
          <div className="p-4 rounded-3xl bg-secondary/20 border border-border/50 group cursor-pointer hover:bg-secondary/30 transition-all">
            <p className="font-bold mb-1 group-hover:text-primary">
              Negative Stock
            </p>
            <p className="text-xs text-muted-foreground italic text-destructive/80 font-bold">
              Strictly Prohibited
            </p>
          </div>
        </div>
      </InfoCard>
    </div>
  );
}
