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
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNotifications } from "@/lib/stores/use-notifications";
import { NotificationsPanel } from "@/components/notifications/notifications-panel";
import { usePathname } from "next/navigation";
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
      { title: "Dashboard", href: "/crm", icon: LayoutDashboard },
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
      { title: "Settings", href: "/stock/settings", icon: Settings },
    ],
  },
  {
    title: "Buying",
    icon: ShoppingCart,
    items: [
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
      { title: "Settings", href: "/buying/settings", icon: Settings },
    ],
  },
  {
    title: "Manufacturing",
    icon: Factory,
    items: [
      {
        title: "Work Orders",
        href: "/manufacturing/work-order",
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
      { title: "Employees", href: "/hr/employee", icon: Users },
      { title: "Settings", href: "/hr/settings", icon: Settings },
    ],
  },
  {
    title: "Accounting",
    icon: Calculator,
    items: [
      { title: "Dashboard", href: "/accounting", icon: LayoutDashboard },
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
    href: "/reports",
    items: [],
  },
];

// Collapsible Nav Section Component
function NavSection({
  section,
  isOpen,
  onToggle,
  pathname,
  isSidebarCollapsed,
}: {
  section: (typeof navigation)[0];
  isOpen: boolean;
  onToggle: () => void;
  pathname: string;
  isSidebarCollapsed: boolean;
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
                      <span>{item.title}</span>
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
  const [openSections, setOpenSections] = useState<string[]>(["Inventory"]); // Default open
  const [notifOpen, setNotifOpen] = useState(false);
  const { unreadCount } = useNotifications();
  const pathname = usePathname();

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Auto-expand section based on current path
  useEffect(() => {
    const activeSection = navigation.find((section) =>
      section.items?.some((item) => pathname.startsWith(item.href)),
    );
    if (activeSection && !openSections.includes(activeSection.title)) {
      setOpenSections((prev) => [...prev, activeSection.title]);
    }
  }, [pathname]);

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
              src="/logo.png" 
              alt="Obsidian Logo" 
              className="h-full w-full object-contain bg-white p-1"
            />
          </div>
          {(!isSidebarCollapsed || isMobile) && (
            <div className="flex flex-col animate-in fade-in slide-in-from-left-2 duration-300">
              <span className="font-bold text-lg tracking-tight">Obsidian ERP</span>
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

      {/* Search */}
      {(!isSidebarCollapsed || isMobile) && (
        <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-300 delay-100">
          <div className="flex items-center bg-secondary/50 hover:bg-secondary rounded-xl px-3 py-2.5 transition-all duration-300 cursor-pointer group border border-transparent hover:border-border/50">
            <Search className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            <input
              type="text"
              placeholder="Search or ask AI..."
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
        {navigation.map((section, idx) => (
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
            />
          </div>
        ))}
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
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-xs font-bold">
                  KA
                </AvatarFallback>
              </Avatar>
              {(!isSidebarCollapsed || isMobile) && (
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-sm font-semibold truncate">
                    Kidus Abdula
                  </span>
                  <span className="text-[10px] text-muted-foreground truncate">
                    Administrator
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
            <DropdownMenuItem className="rounded-xl py-2.5 focus:bg-secondary cursor-pointer transition-colors">
              <Settings className="mr-3 h-4 w-4" /> Preferences
            </DropdownMenuItem>
            <DropdownMenuItem className="rounded-xl py-2.5 focus:bg-secondary cursor-pointer transition-colors">
              <HelpCircle className="mr-3 h-4 w-4" /> Help & Support
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border/50" />
            <DropdownMenuItem className="rounded-xl py-2.5 text-destructive focus:bg-destructive/10 cursor-pointer transition-colors">
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
