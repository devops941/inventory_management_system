"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Tags,
  Warehouse,
  Truck,
  Users,
  ShoppingCart,
  Receipt,
  Boxes,
  Bell,
  BarChart3,
  Settings,
  UserCog,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth-provider";
import type { ModuleKey } from "@/lib/rbac";

type NavItem = {
  href: string;
  label: string;
  icon: React.ElementType;
  mod: ModuleKey;
};

// Grouped purely for visual clarity — the items, routes and RBAC module keys
// are unchanged from the original flat list.
const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, mod: "dashboard" },
    ],
  },
  {
    title: "Catalogue",
    items: [
      { href: "/products", label: "Products", icon: Package, mod: "products" },
      { href: "/categories", label: "Categories", icon: Tags, mod: "categories" },
      { href: "/warehouses", label: "Warehouses", icon: Warehouse, mod: "warehouses" },
      { href: "/suppliers", label: "Suppliers", icon: Truck, mod: "suppliers" },
      { href: "/customers", label: "Customers", icon: Users, mod: "customers" },
    ],
  },
  {
    title: "Operations",
    items: [
      { href: "/purchases", label: "Purchases", icon: ShoppingCart, mod: "purchases" },
      { href: "/sales", label: "Sales & Invoices", icon: Receipt, mod: "sales" },
      { href: "/stock", label: "Stock", icon: Boxes, mod: "stock" },
      { href: "/alerts", label: "Alerts", icon: Bell, mod: "alerts" },
      { href: "/reports", label: "Reports", icon: BarChart3, mod: "reports" },
    ],
  },
  {
    title: "Administration",
    items: [
      { href: "/users", label: "Users & Roles", icon: UserCog, mod: "users" },
      { href: "/settings", label: "Settings", icon: Settings, mod: "settings" },
    ],
  },
];

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { can } = useAuth();

  return (
    <nav className="flex flex-col gap-5 p-3">
      {NAV_GROUPS.map((group) => {
        const items = group.items.filter((item) => can(item.mod));
        if (items.length === 0) return null;
        return (
          <div key={group.title} className="flex flex-col gap-1">
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {group.title}
            </p>
            {items.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary-foreground/80" />
                  )}
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition-transform group-hover:scale-110",
                      active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-sidebar-accent-foreground"
                    )}
                  />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
