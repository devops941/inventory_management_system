"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { canAccess, type ModuleKey } from "@/lib/rbac";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { AppHeader } from "@/components/layout/app-header";

const SECTION_MODULE: Record<string, ModuleKey> = {
  dashboard: "dashboard",
  products: "products",
  categories: "categories",
  warehouses: "warehouses",
  suppliers: "suppliers",
  customers: "customers",
  purchases: "purchases",
  sales: "sales",
  stock: "stock",
  alerts: "alerts",
  reports: "reports",
  users: "users",
  settings: "settings",
};

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (!loading && user) {
      const section = pathname.split("/")[1];
      const mod = SECTION_MODULE[section];
      if (mod && !canAccess(user.role, mod)) router.replace("/dashboard");
    }
  }, [loading, user, pathname, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden w-64 shrink-0 border-r bg-background lg:block">
        <div className="flex h-16 items-center gap-2 border-b px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            IM
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">Inventory MS</p>
            <p className="text-[11px] text-muted-foreground">Full-stack Next.js</p>
          </div>
        </div>
        <div className="sticky top-16 max-h-[calc(100vh-4rem)] overflow-y-auto">
          <SidebarNav />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <AppHeader />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
