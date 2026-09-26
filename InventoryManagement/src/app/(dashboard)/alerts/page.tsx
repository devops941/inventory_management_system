"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Bell,
  BellOff,
  CalendarClock,
  CheckCheck,
  Info,
  PackageCheck,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, LoadingState, ErrorState, EmptyState, StatCard } from "@/components/shared/states";
import { api, formatDateTime } from "@/lib/client";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  severity: string;
  link?: string | null;
  isRead: boolean;
  createdAt: string;
  product?: { name: string; sku: string } | null;
}

const SEVERITY: Record<string, { className: string; icon: React.ElementType }> = {
  critical: { className: "bg-red-100 text-red-700", icon: AlertTriangle },
  warning: { className: "bg-amber-100 text-amber-700", icon: AlertTriangle },
  success: { className: "bg-emerald-100 text-emerald-700", icon: PackageCheck },
  info: { className: "bg-blue-100 text-blue-700", icon: Info },
};

export default function AlertsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [scanning, setScanning] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ notifications: Notification[] }>(
        "/api/notifications"
      );
      setItems(res.notifications);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load alerts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markAll = async () => {
    try {
      await api.patch("/api/notifications/all");
      toast.success("All alerts marked as read");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  const scanExpiry = async () => {
    setScanning(true);
    try {
      const res = await api.post<{ created: number }>("/api/alerts/scan");
      toast.success(
        res.created > 0
          ? `${res.created} expiry alert(s) created`
          : "No new expiry alerts"
      );
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setScanning(false);
    }
  };

  const markOne = async (id: string) => {
    try {
      await api.patch(`/api/notifications/${id}`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  };

  const remove = async (id: string) => {
    try {
      await api.delete(`/api/notifications/${id}`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const filtered =
    filter === "all"
      ? items
      : filter === "unread"
        ? items.filter((i) => !i.isRead)
        : items.filter((i) => i.type === filter);

  const unread = items.filter((i) => !i.isRead).length;
  const lowStock = items.filter((i) => i.type === "low_stock").length;
  const expiry = items.filter((i) => i.type === "expiry").length;

  if (loading) return <LoadingState label="Loading alerts..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader
        title="Alerts & Notifications"
        description="Low-stock warnings, order events and system notices"
      >
        <Button variant="outline" size="sm" onClick={scanExpiry} disabled={scanning}>
          <CalendarClock className="mr-2 h-4 w-4" />
          {scanning ? "Scanning..." : "Scan expiry"}
        </Button>
        <Button variant="outline" size="sm" onClick={markAll} disabled={unread === 0}>
          <CheckCheck className="mr-2 h-4 w-4" /> Mark all read
        </Button>
      </PageHeader>

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Unread"
          value={unread}
          icon={Bell}
          tone={unread > 0 ? "warning" : "success"}
        />
        <StatCard label="Low stock alerts" value={lowStock} icon={AlertTriangle} tone={lowStock > 0 ? "danger" : "success"} />
        <StatCard label="Expiry alerts" value={expiry} icon={CalendarClock} />
      </div>

      <Tabs value={filter} onValueChange={setFilter} className="mb-4">
        <TabsList>
          <TabsTrigger value="all">All ({items.length})</TabsTrigger>
          <TabsTrigger value="unread">Unread ({unread})</TabsTrigger>
          <TabsTrigger value="low_stock">Low stock</TabsTrigger>
          <TabsTrigger value="order">Orders</TabsTrigger>
          <TabsTrigger value="expiry">Expiry</TabsTrigger>
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              title="No alerts"
              description="You are all caught up."
              icon={BellOff}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => {
            const sev = SEVERITY[n.severity] ?? SEVERITY.info;
            const Icon = sev.icon;
            return (
              <Card
                key={n.id}
                className={n.isRead ? "opacity-70" : "border-l-4 border-l-primary"}
              >
                <CardContent className="flex items-start gap-3 p-4">
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${sev.className}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{n.title}</p>
                      {!n.isRead && (
                        <Badge variant="secondary" className="text-[10px]">
                          New
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-muted-foreground">{n.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDateTime(n.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {!n.isRead && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markOne(n.id)}
                      >
                        Mark read
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive"
                      onClick={() => remove(n.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
