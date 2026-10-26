"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Menu, LogOut, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/client";

const TITLES: Record<string, string> = {
  dashboard: "Dashboard",
  products: "Product Management",
  categories: "Categories",
  warehouses: "Warehouses",
  suppliers: "Suppliers",
  customers: "Customers",
  purchases: "Purchase Management",
  sales: "Sales & Invoices",
  stock: "Stock Management",
  alerts: "Alerts & Notifications",
  reports: "Reports & Analytics",
  users: "Users & Roles",
  settings: "Settings",
};

export function AppHeader() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  const section = pathname.split("/")[1] || "dashboard";

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await api.get<{ unread: number }>("/api/notifications?unread=true");
        if (active) setUnread(res.unread);
      } catch {
        /* header badge is non-critical */
      }
    };
    if (user) load();
    const timer = setInterval(load, 60000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [user, pathname]);

  const initials = (user?.name ?? "U")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 lg:px-6">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation</span>
            </Button>
          }
        />
        <SheetContent side="left" className="w-64 bg-sidebar p-0">
          <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
              IM
            </div>
            <span className="font-semibold tracking-tight">Inventory MS</span>
          </div>
          <SidebarNav onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex-1">
        <h1 className="text-base font-semibold tracking-tight lg:text-lg">
          {TITLES[section] ?? "Inventory"}
        </h1>
        <p className="hidden text-xs text-muted-foreground sm:block">
          {user?.role ? `Signed in as ${user.role}` : "Inventory Management System"}
        </p>
      </div>

      <Button
        variant="ghost"
        size="icon"
        aria-label="Notifications"
        render={<Link href="/alerts" />}
      >
        <span className="relative">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-2 -top-2 h-5 min-w-5 justify-center rounded-full px-1 text-[10px]"
            >
              {unread > 99 ? "99+" : unread}
            </Badge>
          )}
        </span>
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" className="gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="hidden text-left sm:block">
                <p className="text-sm font-medium leading-none">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.role}</p>
              </div>
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs font-normal text-muted-foreground">
                {user?.email}
              </p>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link href="/settings" />}>
            <UserIcon className="mr-2 h-4 w-4" /> Profile & Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => logout()} className="text-destructive">
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
