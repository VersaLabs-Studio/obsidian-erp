// components/command/CommandPalette.tsx
// Obsidian ERP v4.0 — Command Palette (Cmd/Ctrl+K)
// Built on cmdk, OKLCH semantic tokens, Framer Motion, dual theme

"use client";

import { useEffect, useCallback } from "react";
import { Command } from "cmdk";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import {
  Search,
  FileText,
  ShoppingCart,
  Users,
  Package,
  DollarSign,
  Factory,
  BarChart3,
  Settings,
  Plus,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { useCommandPalette } from "@/hooks/useCommandPalette";

/**
 * Navigation commands
 */
const NAV_COMMANDS = [
  { id: "nav-dashboard", label: "Go to Dashboard", path: "/", icon: BarChart3, group: "Navigation" },
  { id: "nav-crm", label: "Go to CRM", path: "/crm", icon: Users, group: "Navigation" },
  { id: "nav-leads", label: "Go to Leads", path: "/crm/lead", icon: Users, group: "Navigation" },
  { id: "nav-customers", label: "Go to Customers", path: "/crm/customer", icon: Users, group: "Navigation" },
  { id: "nav-quotations", label: "Go to Quotations", path: "/sales/quotation", icon: FileText, group: "Navigation" },
  { id: "nav-sales-orders", label: "Go to Sales Orders", path: "/sales/sales-order", icon: ShoppingCart, group: "Navigation" },
  { id: "nav-delivery-notes", label: "Go to Delivery Notes", path: "/stock/delivery-note", icon: Package, group: "Navigation" },
  { id: "nav-sales-invoices", label: "Go to Sales Invoices", path: "/accounting/sales-invoice", icon: DollarSign, group: "Navigation" },
  { id: "nav-purchase-orders", label: "Go to Purchase Orders", path: "/buying/purchase-order", icon: ShoppingCart, group: "Navigation" },
  { id: "nav-work-orders", label: "Go to Work Orders", path: "/manufacturing/work-order", icon: Factory, group: "Navigation" },
  { id: "nav-items", label: "Go to Items", path: "/stock/item", icon: Package, group: "Navigation" },
  { id: "nav-settings", label: "Go to Settings", path: "/settings", icon: Settings, group: "Navigation" },
];

/**
 * Create commands
 */
const CREATE_COMMANDS = [
  { id: "create-lead", label: "Create Lead", path: "/crm/lead/new", icon: Plus, group: "Create" },
  { id: "create-customer", label: "Create Customer", path: "/crm/customer/new", icon: Plus, group: "Create" },
  { id: "create-quotation", label: "Create Quotation", path: "/sales/quotation/new", icon: Plus, group: "Create" },
  { id: "create-sales-order", label: "Create Sales Order", path: "/sales/sales-order/new", icon: Plus, group: "Create" },
  { id: "create-purchase-order", label: "Create Purchase Order", path: "/buying/purchase-order/new", icon: Plus, group: "Create" },
  { id: "create-item", label: "Create Item", path: "/stock/item/new", icon: Plus, group: "Create" },
];

interface CommandPaletteProps {
  /** Additional CSS classes */
  className?: string;
}

/**
 * CommandPalette — Global command palette (Cmd/Ctrl+K)
 *
 * Provides quick navigation, document creation, and search
 * across the entire application.
 *
 * @example
 * ```tsx
 * // Automatically mounted in layout
 * <CommandPalette />
 * ```
 */
export function CommandPalette({ className }: CommandPaletteProps) {
  const router = useRouter();
  const { isOpen, close, toggle } = useCommandPalette();
  const prefersReducedMotion = useReducedMotion();

  // Keyboard shortcut: Cmd/Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggle();
      }
      if (e.key === "Escape" && isOpen) {
        close();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, close, toggle]);

  const handleSelect = useCallback(
    (path: string) => {
      router.push(path);
      close();
    },
    [router, close]
  );

  const allCommands = [...NAV_COMMANDS, ...CREATE_COMMANDS];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0 }}
            animate={prefersReducedMotion ? {} : { opacity: 1 }}
            exit={prefersReducedMotion ? {} : { opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
            onClick={close}
          />

          {/* Command palette */}
          <motion.div
            initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.96, y: -8 }}
            animate={prefersReducedMotion ? {} : { opacity: 1, scale: 1, y: 0 }}
            exit={prefersReducedMotion ? {} : { opacity: 0, scale: 0.96, y: -8 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "fixed left-1/2 top-[20%] z-50 w-full max-w-lg -translate-x-1/2",
              className
            )}
          >
            <Command
              className="rounded-xl border bg-card shadow-2xl"
              onKeyDown={(e: React.KeyboardEvent) => {
                if (e.key === "Escape") {
                  close();
                }
              }}
            >
              <div className="flex items-center border-b px-3">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Command.Input
                  placeholder="Search commands, pages, or actions..."
                  className="flex h-11 w-full rounded-md bg-transparent py-3 px-2 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  autoFocus
                />
                <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground sm:flex">
                  ESC
                </kbd>
              </div>

              <Command.List className="max-h-[300px] overflow-y-auto p-2">
                <Command.Empty className="flex items-center justify-center py-6 text-sm text-muted-foreground">
                  No results found.
                </Command.Empty>

                {/* Navigation group */}
                <Command.Group heading="Navigation" className="mb-2">
                  {NAV_COMMANDS.map((cmd) => (
                    <Command.Item
                      key={cmd.id}
                      value={cmd.label}
                      onSelect={() => handleSelect(cmd.path)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors hover:bg-accent aria-selected:bg-accent"
                    >
                      <cmd.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1">{cmd.label}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    </Command.Item>
                  ))}
                </Command.Group>

                {/* Create group */}
                <Command.Group heading="Create" className="mb-2">
                  {CREATE_COMMANDS.map((cmd) => (
                    <Command.Item
                      key={cmd.id}
                      value={cmd.label}
                      onSelect={() => handleSelect(cmd.path)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm cursor-pointer transition-colors hover:bg-accent aria-selected:bg-accent"
                    >
                      <cmd.icon className="h-4 w-4 text-primary" />
                      <span className="flex-1">{cmd.label}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    </Command.Item>
                  ))}
                </Command.Group>
              </Command.List>

              <div className="border-t px-3 py-2 flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">
                  Navigate with ↑↓ · Select with Enter · Close with Esc
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Obsidian ERP v4.0
                </span>
              </div>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
