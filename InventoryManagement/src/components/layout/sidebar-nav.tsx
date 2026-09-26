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

const NAV: {
  href: string;
  label: string;
  icon: React.ElementType;
  mod: ModuleKey;
}[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, mod: "dashboard" },
  { href: "/products", label: "Products", icon: Package, mod: "products" },
  { href: "/categories", label: "Categories", icon: Tags, mod: "categories" },
  { href: "/warehouses", label: "Warehouses", icon: Warehouse, mod: "warehouses" },
  { href: "/suppliers", label: "Suppliers", icon: Truck, mod: "suppliers" },
  { href: "/customers", label: "Customers", icon: Users, mod: "customers" },
  { href: "/purchases", label: "Purchases", icon: ShoppingCart, mod: "purchases" },
  { href: "/sales", label: "Sales & Invoices", icon: Receipt, mod: "sales" },
  { href: "/stock", label: "Stock", icon: Boxes, mod: "stock" },
  { href: "/alerts", label: "Alerts", icon: Bell, mod: "alerts" },
  { href: "/reports", label: "Reports", icon: BarChart3, mod: "reports" },
  { href: "/users", label: "Users & Roles", icon: UserCog, mod: "users" },
  { href: "/settings", label: "Settings", icon: Settings, mod: "settings" },
];

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { can } = useAuth();

  return (
    <nav className="flex flex-col gap-1 p-3">
      {NAV.filter((item) => can(item.mod)).map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
