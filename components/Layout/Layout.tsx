// components/Layout/Layout.tsx
// Obsidian ERP v4.0 - Premium Floating Layout with Dark Mode Support
"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  LayoutDashboard,
  Users,
  User,
  Box,
  Truck,
  Settings,
  Search,
  Bell,
  Menu,
  ChevronRight,
  ChevronDown,
  Factory,
  Calculator,
  LogOut,
  HelpCircle,
  FileText,
  Sparkles,
  Package,
  BarChart3,
  Wallet,
  ShoppingCart,
  Receipt,
  CreditCard,
  Building2,
  Wrench,
  MoveRight,
  MapPin,
  TrendingUp,
  Target,
  MessageSquare,
  Phone,
  ClipboardList,
  X,
  Layers,
  Briefcase,
  Warehouse,
  ArrowRightLeft,
  Scale,
  Cpu,
  Cog,
  BookOpen,
  Tag,
  FolderTree,
  Ruler,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useNotifications } from "@/lib/stores/use-notifications";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { NotificationsPanel } from "@/components/notifications/notifications-panel";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/smart/theme-toggle";

// NEW v3.0 Navigation Structure
const navigation = [
  {
    title: "Overview",
    icon: LayoutDashboard,
    href: "/dashboard",
    items: [],
  },
  {
    title: "CRM",
    icon: Users,
    items: [
      { title: "Dashboard", href: "/crm/dashboard", icon: LayoutDashboard },
      { title: "Leads", href: "/crm/lead", icon: Target },
      { title: "Customers", href: "/crm/customer", icon: Users },
      { title: "Contacts", href: "/crm/contact", icon: User },
      { title: "Addresses", href: "/crm/address", icon: MapPin },
      { title: "Settings", href: "/crm/settings", icon: Settings },
    ],
  },
  {
    title: "Sales",
    icon: FileText,
    items: [
      { title: "Dashboard", href: "/sales/dashboard", icon: LayoutDashboard },
      { title: "Quotations", href: "/sales/quotation", icon: FileText },
      {
        title: "Sales Orders",
        href: "/sales/sales-order",
        icon: ClipboardList,
      },
      { title: "Settings", href: "/sales/settings", icon: Settings },
    ],
  },
  {
    title: "Inventory",
    icon: Package,
    items: [
      { title: "Dashboard", href: "/stock/dashboard", icon: LayoutDashboard },
      { title: "Items", href: "/stock/item", icon: Box },
      { title: "Warehouses", href: "/stock/warehouse", icon: Warehouse },
      { title: "Delivery Notes", href: "/stock/delivery-note", icon: Truck },
      {
        title: "Material Requests",
        href: "/stock/material-request",
        icon: ShoppingCart,
      },
      {
        title: "Stock Entries",
        href: "/stock/stock-entry",
        icon: ArrowRightLeft,
      },
      { title: "Stock Balance", href: "/stock/stock-balance", icon: Scale },
      {
        title: "Stock Ledger",
        href: "/stock/stock-ledger",
        icon: ClipboardList,
      },
      {
        title: "Stock Reconciliation",
        href: "/stock/stock-reconciliation",
        icon: ClipboardList,
      },
      { title: "Item Price", href: "/stock/settings/item-price", icon: Tag },
      // 2R Part 7 — Item Group + UOM settings pages (their API routes
      // already existed; the UI is now built).
      { title: "Item Groups", href: "/stock/settings/item-group", icon: FolderTree },
      { title: "Units of Measure", href: "/stock/settings/uom", icon: Ruler },
      { title: "Settings", href: "/stock/settings", icon: Settings },
    ],
  },
  {
    title: "Buying",
    icon: ShoppingCart,
    items: [
      { title: "Dashboard", href: "/buying/dashboard", icon: LayoutDashboard },
      {
        title: "Suppliers",
        href: "/buying/supplier",
        icon: Building2,
      },
      {
        title: "Purchase Orders",
        href: "/buying/purchase-order",
        icon: ClipboardList,
      },
      // 2R Part 8 — RFQ: the module is implemented (list/new/detail pages
      // exist) but absent from the sidebar. Wire it in between PO and PR
      // (the natural procure-to-pay order: request quotations → order →
      // receive → invoice).
      {
        title: "Requests for Quotation",
        href: "/buying/request-for-quotation",
        icon: FileText,
      },
      // Procure-to-pay continues: receive goods, then bill them. Both
      // pages live in their owning modules (stock / accounting) but the
      // buyer's workflow runs through here, so we surface them in Buying.
      {
        title: "Purchase Receipts",
        href: "/stock/purchase-receipt",
        icon: Package,
      },
      {
        title: "Purchase Invoices",
        href: "/accounting/purchase-invoice",
        icon: Receipt,
      },
      { title: "Settings", href: "/buying/settings", icon: Settings },
    ],
  },
  {
    title: "Manufacturing",
    icon: Factory,
    items: [
      {
        title: "Dashboard",
        href: "/manufacturing/dashboard",
        icon: LayoutDashboard,
      },
      {
        title: "Work Orders",
        href: "/manufacturing/work-order",
        icon: ClipboardList,
      },
      {
        title: "Job Cards",
        href: "/manufacturing/job-card",
        icon: ClipboardList,
      },
      { title: "Bill of Materials", href: "/manufacturing/bom", icon: Layers },
      { title: "Workstations", href: "/manufacturing/workstation", icon: Cpu },
      { title: "Operations", href: "/manufacturing/operation", icon: Cog },
      { title: "Settings", href: "/manufacturing/settings", icon: Settings },
    ],
  },
  {
    title: "HR",
    icon: Briefcase,
    items: [
      { title: "Dashboard", href: "/hr/dashboard", icon: LayoutDashboard },
      { title: "Employees", href: "/hr/employee", icon: Users },
      { title: "Settings", href: "/hr/settings", icon: Settings },
    ],
  },
  {
    title: "Accounting",
    icon: Calculator,
    items: [
      { title: "Dashboard", href: "/accounting/dashboard", icon: LayoutDashboard },
      {
        title: "Sales Invoices",
        href: "/accounting/sales-invoice",
        icon: Receipt,
      },
      {
        title: "Purchase Invoices",
        href: "/accounting/purchase-invoice",
        icon: Receipt,
      },
      {
        title: "Payment Entries",
        href: "/accounting/payment-entry",
        icon: CreditCard,
      },
      {
        title: "Journal Entries",
        href: "/accounting/journal-entry",
        icon: BookOpen,
      },
      { title: "Price Lists", href: "/accounting/settings/price-list", icon: Tag },
      { title: "Setup", href: "/accounting/setup", icon: Settings },
    ],
  },
  {
    title: "Reports",
    icon: BarChart3,
    // 2N Part 3.2: Reports group is a sub-section of Accounting. We link
    // each financial report directly rather than nesting a parent route.
    items: [
      { title: "Dashboard", href: "/accounting/reports", icon: BarChart3 },
      { title: "Sales", href: "/accounting/reports/sales", icon: TrendingUp },
      { title: "Receivables", href: "/accounting/reports/receivables", icon: Wallet },
      { title: "Payables", href: "/accounting/reports/payables", icon: Wallet },
      { title: "Profit & Loss", href: "/accounting/reports/profit-and-loss", icon: TrendingUp },
      { title: "Balance Sheet", href: "/accounting/reports/balance-sheet", icon: BarChart3 },
      { title: "Accounts Receivable", href: "/accounting/reports/accounts-receivable", icon: Wallet },
      { title: "Accounts Payable", href: "/accounting/reports/accounts-payable", icon: Wallet },
    ],
  },
];

// ---------------------------------------------------------------------------
// Role-based menu visibility.
//
// The server already ENFORCES permissions (per-user sid forwarding →
// ERPNext DocPerm). This is the UI half: don't surface a module a user
// can't use. Mapped by ERPNext's standard module→role conventions; a
// System Manager / Administrator sees everything. Empty list = public
// (Overview). Fail closed while the user is still resolving (roles = [])
// so we never flash modules the user lacks.
// ---------------------------------------------------------------------------
const SECTION_ROLES: Record<string, string[]> = {
  Overview: [], // everyone
  CRM: ["Sales User", "Sales Manager"],
  Sales: ["Sales User", "Sales Manager"],
  Inventory: ["Stock User", "Stock Manager"],
  // Receiving against a PO is a stock activity, so stock roles see Buying too.
  Buying: ["Purchase User", "Purchase Manager", "Stock User", "Stock Manager"],
  Manufacturing: ["Manufacturing User", "Manufacturing Manager"],
  HR: ["HR User", "HR Manager"],
  Accounting: ["Accounts User", "Accounts Manager"],
  Reports: ["Accounts User", "Accounts Manager"],
};

const ALL_ACCESS_ROLES = ["System Manager", "Administrator"];

function canSeeSection(title: string, roles: string[]): boolean {
  const required = SECTION_ROLES[title];
  if (!required || required.length === 0) return true; // public / unmapped
  if (roles.some((r) => ALL_ACCESS_ROLES.includes(r))) return true; // admin
  return required.some((r) => roles.includes(r));
}

// Collapsible Nav Section Component
function NavSection({
  section,
  isOpen,
  onToggle,
  pathname,
  isSidebarCollapsed,
  pinnedHrefs,
  onTogglePin,
}: {
  section: (typeof navigation)[0];
  isOpen: boolean;
  onToggle: () => void;
  pathname: string;
  isSidebarCollapsed: boolean;
  pinnedHrefs: string[];
  onTogglePin: (href: string) => void;
}) {
  const hasSubItems = section.items && section.items.length > 0;
  const isActive = section.href
    ? pathname === section.href
    : section.items?.some((item) => pathname.startsWith(item.href));
  const Icon = section.icon;

  // Single item (no dropdown)
  if (!hasSubItems && section.href) {
    return (
      <Link href={section.href} className="block">
        <div
          className={cn(
            "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300",
            isActive
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
              : "text-muted-foreground hover:bg-secondary/80 hover:text-foreground",
            isSidebarCollapsed && "justify-center px-2",
          )}
        >
          <Icon
            className={cn(
              "h-[18px] w-[18px] transition-transform duration-300",
              isActive && "scale-110",
            )}
          />
          {!isSidebarCollapsed && <span>{section.title}</span>}
        </div>
      </Link>
    );
  }

  // Collapsible section
  return (
    <div className="space-y-1">
      <button
        onClick={onToggle}
        className={cn(
          "w-full group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-300",
          isActive
            ? "bg-secondary text-foreground"
            : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground",
          isSidebarCollapsed && "justify-center px-2",
        )}
      >
        <Icon
          className={cn(
            "h-[18px] w-[18px] transition-transform duration-300 group-hover:scale-110",
            isActive && "text-primary",
          )}
        />
        {!isSidebarCollapsed && (
          <>
            <span className="flex-1 text-left">{section.title}</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform duration-300",
                isOpen && "rotate-180",
              )}
            />
          </>
        )}
      </button>

      {/* Sub-items with smooth collapse animation */}
      {!isSidebarCollapsed && (
        <div
          className={cn(
            "grid transition-all duration-300 ease-out",
            isOpen
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0",
          )}
        >
          <div className="overflow-hidden">
            <div className="pl-4 space-y-0.5 pt-1">
              {section.items?.map((item, idx) => {
                const ItemIcon = item.icon;
                const isItemActive =
                  pathname === item.href ||
                  (pathname.startsWith(item.href + "/") &&
                    !section.items?.some(
                      (sibling) =>
                        sibling !== item &&
                        pathname.startsWith(sibling.href) &&
                        sibling.href.length > item.href.length,
                    ));
                const isPinned = pinnedHrefs.includes(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block"
                    style={{ animationDelay: `${idx * 30}ms` }}
                  >
                    <div
                      className={cn(
                        "group flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all duration-200",
                        isItemActive
                          ? "bg-primary text-primary-foreground font-medium shadow-md shadow-primary/10"
                          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground hover:translate-x-1",
                      )}
                    >
                      <ItemIcon
                        className={cn(
                          "h-4 w-4 transition-all duration-200",
                          isItemActive ? "scale-110" : "group-hover:scale-110",
                        )}
                      />
                      <span className="flex-1 truncate">{item.title}</span>
                      {/* Pin / unpin star (2Q Part 5 Section 3) — purely
                          cosmetic, persisted per user. */}
                      <button
                        type="button"
                        aria-label={
                          isPinned
                            ? `Unpin ${item.title}`
                            : `Pin ${item.title}`
                        }
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onTogglePin(item.href);
                        }}
                        className={cn(
                          "shrink-0 text-base leading-none transition-opacity",
                          isPinned
                            ? "text-amber-500 opacity-100"
                            : "text-muted-foreground/40 opacity-0 group-hover:opacity-100",
                        )}
                        title={isPinned ? "Unpin" : "Pin to sidebar"}
                      >
                        {isPinned ? "★" : "☆"}
                      </button>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // 2Q Part 5 (F-B4) — persist expanded/collapsed sections per user.
  // We key the localStorage entry by userId so two users on the same
  // machine don't trample each other. The `auto-expand the current
  // route` behavior is preserved (and now also persists across reloads).
  const { user, isLoading: userLoading } = useCurrentUser();
  const storageKey = user?.userId
    ? `obsidian-erp-sidebar-sections:${user.userId}`
    : "obsidian-erp-sidebar-sections:anon";
  const pinnedKey = user?.userId
    ? `obsidian-erp-sidebar-pinned:${user.userId}`
    : "obsidian-erp-sidebar-pinned:anon";
  const [openSections, setOpenSections] = useState<string[]>(["Inventory"]); // Default open
  const [pinned, setPinned] = useState<string[]>([]);
  // 2Q Part 5 — type-to-filter (Section 1: filter input). Pure local
  // state; no command-palette or fuzzy-search library — just substring
  // match on title. The handoff said "reuse useCommandPalette" but the
  // existing one is a modal launcher, not a per-section filter; for the
  // sidebar a 1-line input is the right ergonomics.
  const [filter, setFilter] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const { unreadCount } = useNotifications();
  const pathname = usePathname();
  const router = useRouter();

  // Rehydrate persisted sections + pins on mount / user change.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (
          Array.isArray(parsed) &&
          parsed.every((s) => typeof s === "string")
        ) {
          setOpenSections(parsed);
        }
      }
      const rawPinned = window.localStorage.getItem(pinnedKey);
      if (rawPinned) {
        const parsedPinned = JSON.parse(rawPinned) as unknown;
        if (
          Array.isArray(parsedPinned) &&
          parsedPinned.every((s) => typeof s === "string")
        ) {
          setPinned(parsedPinned);
        }
      }
    } catch {
      // ignore corrupt localStorage
    }
  }, [storageKey, pinnedKey]);

  // Persist sections on change.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(openSections));
    } catch {
      // quota / disabled — best effort
    }
  }, [openSections, storageKey]);

  // Persist pins on change.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(pinnedKey, JSON.stringify(pinned));
    } catch {
      // best effort
    }
  }, [pinned, pinnedKey]);

  const togglePin = (href: string) => {
    setPinned((prev) =>
      prev.includes(href) ? prev.filter((h) => h !== href) : [...prev, href],
    );
  };

  // Real signed-in identity (replaces the old hardcoded profile). Also
  // makes the §A RBAC test legible — you can see which user you are.
  const displayName = user?.fullName || user?.userId || "Account";
  const displayRole = user?.userRole || "—";
  const initials =
    displayName
      .split(/\s+/)
      .map((p) => p[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "U";

  async function handleSignOut() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore — navigate to /login regardless of the network result
    }
    router.push("/login");
  }

  // Only the modules this user's roles grant. This is a COSMETIC gate —
  // the server enforces RBAC on every request regardless. We fail OPEN
  // only while we don't yet have a resolved user (still loading, or no
  // session — though middleware would have redirected): show the full
  // menu rather than flash an empty sidebar. Once the user IS resolved we
  // filter by their actual roles. Empty roles now legitimately means "no
  // module access" (role discovery is reliable post-2P-FINAL), so a
  // role-less user correctly sees only the public Overview. A System
  // Manager / Administrator matches every section via canSeeSection.
  const visibleNavigation = useMemo(() => {
    if (userLoading || !user) return navigation;
    return navigation.filter((s) => canSeeSection(s.title, user.roles ?? []));
  }, [user, userLoading]);

  // 2Q Part 5 — apply the type-to-filter. Sections with no sub-items
  // (Overview) are always shown. For sections with sub-items, we filter
  // items by the query (case-insensitive substring). If the query is
  // empty, everything is shown.
  const query = filter.trim().toLowerCase();
  const filteredNavigation = useMemo(() => {
    if (!query) return visibleNavigation;
    return visibleNavigation
      .map((s) => {
        if (!s.items?.length) return s;
        const matches = s.items.filter(
          (it) =>
            it.title.toLowerCase().includes(query) ||
            it.href.toLowerCase().includes(query),
        );
        if (matches.length === 0) return null;
        return { ...s, items: matches };
      })
      .filter((s): s is (typeof visibleNavigation)[number] => s !== null);
  }, [visibleNavigation, query]);

  // Pinned items surface as a "Pinned" group at the top. Only items
  // that exist in the visible navigation are kept.
  const pinnedItems = useMemo(() => {
    const all = visibleNavigation.flatMap((s) => s.items ?? []);
    return pinned
      .map((href) => all.find((it) => it.href === href))
      .filter((it): it is NonNullable<typeof it> => Boolean(it));
  }, [pinned, visibleNavigation]);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Auto-expand section based on current path. Also auto-expands the
  // section that matches the current route even if it's filtered out
  // (so a user can navigate to a section via deep link and have it
  // expanded).
  useEffect(() => {
    const activeSection = visibleNavigation.find((section) =>
      section.items?.some((item) => pathname.startsWith(item.href)),
    );
    if (activeSection && !openSections.includes(activeSection.title)) {
      setOpenSections((prev) => [...prev, activeSection.title]);
    }
  }, [pathname, visibleNavigation, openSections]);

  const toggleSection = (title: string) => {
    setOpenSections((prev) =>
      prev.includes(title) ? prev.filter((t) => t !== title) : [...prev, title],
    );
  };

  // Sidebar Content (shared between desktop and mobile)
  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <>
      {/* Brand Area */}
      <div
        className={cn(
          "flex items-center justify-between mb-6",
          isMobile ? "px-2" : "px-1",
        )}
      >
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="h-10 w-10 relative overflow-hidden rounded-xl shadow-lg shadow-primary/20 transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
            <img
              src="/pana-logo.png"
              alt="Pana Logo"
              className="h-full w-full object-contain bg-white p-1"
            />
          </div>
          {(!isSidebarCollapsed || isMobile) && (
            <div className="flex flex-col animate-in fade-in slide-in-from-left-2 duration-300">
              <span className="font-bold text-lg tracking-tight">Pana Promotion</span>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                Enterprise
              </span>
            </div>
          )}
        </div>
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(false)}
            className="rounded-full"
          >
            <X className="h-5 w-5" />
          </Button>
        )}
      </div>

      {/* Search / type-to-filter (2Q Part 5) */}
      {(!isSidebarCollapsed || isMobile) && (
        <div className="mb-3 animate-in fade-in slide-in-from-top-2 duration-300 delay-100">
          <div className="flex items-center bg-secondary/50 hover:bg-secondary rounded-xl px-3 py-2.5 transition-all duration-300 border border-transparent hover:border-border/50 focus-within:border-primary/40 focus-within:bg-secondary">
            <Search className="h-4 w-4 text-muted-foreground transition-colors" />
            <input
              type="text"
              placeholder="Search or ask AI..."
              aria-label="Filter navigation"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-transparent border-none outline-none text-sm ml-2.5 w-full placeholder:text-muted-foreground/60"
            />
            <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-border/50 bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              ⌘K
            </kbd>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto space-y-1.5 scrollbar-hide">
        {/* Pinned group (2Q Part 5 Section 3) — only when there are pins
            and no active filter (filter owns the viewport when typing). */}
        {!query && pinnedItems.length > 0 && (!isSidebarCollapsed || isMobile) && (
          <div className="mb-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <p className="px-3 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Pinned
            </p>
            <div className="space-y-0.5">
              {pinnedItems.map((it) => {
                const ItemIcon = it.icon;
                const isItemActive = pathname === it.href;
                return (
                  <Link key={it.href} href={it.href} className="block">
                    <div
                      className={cn(
                        "group flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all duration-200",
                        isItemActive
                          ? "bg-primary text-primary-foreground font-medium shadow-md shadow-primary/10"
                          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground hover:translate-x-1",
                      )}
                    >
                      <ItemIcon
                        className={cn(
                          "h-4 w-4",
                          isItemActive ? "scale-110" : "group-hover:scale-110",
                        )}
                      />
                      <span className="flex-1 truncate">{it.title}</span>
                      <button
                        type="button"
                        aria-label={`Unpin ${it.title}`}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          togglePin(it.href);
                        }}
                        className="text-amber-500/80 hover:text-amber-500"
                        title="Unpin"
                      >
                        ★
                      </button>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {filteredNavigation.map((section, idx) => (
          <div
            key={section.title}
            className="animate-in fade-in slide-in-from-left-3"
            style={{ animationDelay: `${(idx + 1) * 50}ms` }}
          >
            <NavSection
              section={section}
              isOpen={openSections.includes(section.title)}
              onToggle={() => toggleSection(section.title)}
              pathname={pathname}
              isSidebarCollapsed={isSidebarCollapsed && !isMobile}
              pinnedHrefs={pinned}
              onTogglePin={togglePin}
            />
          </div>
        ))}

        {/* Empty filter state */}
        {query && filteredNavigation.length === 0 && (!isSidebarCollapsed || isMobile) && (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground/80">
            No navigation matches &ldquo;{filter}&rdquo;.
          </div>
        )}
      </div>

      {/* User Profile */}
      <div className="pt-4 mt-4 border-t border-border/30">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div
              className={cn(
                "flex items-center gap-3 p-2 rounded-xl cursor-pointer hover:bg-secondary/50 transition-all duration-300 group",
                isSidebarCollapsed && !isMobile && "justify-center",
              )}
            >
              <Avatar className="h-9 w-9 ring-2 ring-background shadow-md transition-transform duration-300 group-hover:scale-105">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {(!isSidebarCollapsed || isMobile) && (
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm font-semibold truncate">
                    {displayName}
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate">
                    {displayRole}
                  </span>
                </div>
              )}
              {(!isSidebarCollapsed || isMobile) && (
                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              )}
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="top"
            className="w-56 rounded-2xl border-none shadow-2xl bg-popover/95 backdrop-blur-xl p-2"
          >
            <DropdownMenuLabel className="text-xs text-muted-foreground uppercase tracking-wider px-2 py-1.5">
              My Account
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border/50" />
            {/* Preferences — routes to /settings (single page, 4 sections). */}
            <DropdownMenuItem
              className="rounded-xl py-2.5 focus:bg-secondary cursor-pointer transition-colors"
              onSelect={() => router.push("/settings")}
            >
              <Settings className="mr-3 h-4 w-4" /> Preferences
            </DropdownMenuItem>
            {/* Help & Support is still a follow-up (no-op for now). */}
            <DropdownMenuItem className="rounded-xl py-2.5 focus:bg-secondary cursor-pointer transition-colors">
              <HelpCircle className="mr-3 h-4 w-4" /> Help & Support
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border/50" />
            <DropdownMenuItem
              className="rounded-xl py-2.5 text-destructive focus:bg-destructive/10 cursor-pointer transition-colors"
              onSelect={handleSignOut}
            >
              <LogOut className="mr-3 h-4 w-4" /> Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-secondary/30 text-foreground overflow-hidden">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden lg:flex flex-col m-3 rounded-2xl bg-card p-4 shadow-xl shadow-black/5 transition-all duration-500 ease-out",
          isSidebarCollapsed ? "w-[72px]" : "w-[280px]",
        )}
      >
        <SidebarContent />
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header */}
        <header className="h-16 flex items-center justify-between px-4 lg:px-6 mt-2 lg:mt-3 animate-in fade-in slide-in-from-top-2 duration-500">
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(true)}
            className="lg:hidden rounded-xl hover:bg-card shadow-sm"
          >
            <Menu className="h-5 w-5" />
          </Button>

          {/* Breadcrumbs - Functional Navigation */}
          <div className="hidden lg:flex">
            <div className="flex items-center gap-2 px-4 py-2 bg-card/80 backdrop-blur-sm rounded-full shadow-sm border border-white/30">
              <Link
                href="/dashboard"
                className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer font-medium"
              >
                Home
              </Link>
              {pathname
                .split("/")
                .filter(Boolean)
                .map((segment, index, array) => {
                  const href = "/" + array.slice(0, index + 1).join("/");
                  const isLast = index === array.length - 1;
                  const label = segment.replace(/-/g, " ");

                  return (
                    <div key={segment} className="flex items-center gap-2">
                      <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
                      {isLast ? (
                        <span className="text-sm font-bold text-foreground capitalize">
                          {decodeURIComponent(label)}
                        </span>
                      ) : (
                        <Link
                          href={href}
                          className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer capitalize font-medium"
                        >
                          {decodeURIComponent(label)}
                        </Link>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle */}
            <ThemeToggle />
            <div className="relative">
              <Button
                size="icon"
                variant="ghost"
                className="relative rounded-full hover:bg-card shadow-sm transition-all duration-300 hover:scale-105"
                onClick={() => setNotifOpen(!notifOpen)}
                aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
              >
                <Bell className="h-5 w-5 text-muted-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-background animate-pulse" />
                )}
              </Button>
              <NotificationsPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
            </div>
            <div className="hidden sm:block h-6 w-[1px] bg-border/50 mx-1" />
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:flex rounded-full border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all duration-300"
            >
              <HelpCircle className="h-4 w-4 mr-2" /> Help
            </Button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-4 lg:p-6 lg:pt-2">
          <div className="h-full w-full max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-50 lg:hidden transition-all duration-300",
          isMobileMenuOpen ? "visible" : "invisible",
        )}
      >
        {/* Backdrop */}
        <div
          className={cn(
            "absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300",
            isMobileMenuOpen ? "opacity-100" : "opacity-0",
          )}
          onClick={() => setIsMobileMenuOpen(false)}
        />

        {/* Sidebar Panel */}
        <div
          className={cn(
            "absolute inset-y-0 left-0 w-80 max-w-[85vw] bg-card p-5 shadow-2xl flex flex-col transition-transform duration-300 ease-out",
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <SidebarContent isMobile />
        </div>
      </div>
    </div>
  );
}
