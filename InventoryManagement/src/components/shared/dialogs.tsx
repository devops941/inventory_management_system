"use client";

import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  destructive = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => Promise<void> | void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            className={destructive ? "bg-destructive hover:bg-destructive/90" : ""}
            onClick={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                await onConfirm();
                onOpenChange(false);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Working..." : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function StatusBadge({
  value,
  map,
}: {
  value: string;
  map?: Record<string, { label: string; className: string }>;
}) {
  const defaults: Record<string, { label: string; className: string }> = {
    active: { label: "Active", className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" },
    inactive: { label: "Inactive", className: "bg-slate-100 text-slate-600 hover:bg-slate-100" },
    blocked: { label: "Blocked", className: "bg-red-100 text-red-700 hover:bg-red-100" },
    pending: { label: "Pending", className: "bg-amber-100 text-amber-700 hover:bg-amber-100" },
    approved: { label: "Approved", className: "bg-blue-100 text-blue-700 hover:bg-blue-100" },
    received: { label: "Received", className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" },
    confirmed: { label: "Confirmed", className: "bg-blue-100 text-blue-700 hover:bg-blue-100" },
    issued: { label: "Issued", className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" },
    returned: { label: "Returned", className: "bg-purple-100 text-purple-700 hover:bg-purple-100" },
    cancelled: { label: "Cancelled", className: "bg-red-100 text-red-700 hover:bg-red-100" },
    paid: { label: "Paid", className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" },
    partial: { label: "Partial", className: "bg-amber-100 text-amber-700 hover:bg-amber-100" },
    unpaid: { label: "Unpaid", className: "bg-red-100 text-red-700 hover:bg-red-100" },
    low: { label: "Low stock", className: "bg-red-100 text-red-700 hover:bg-red-100" },
    ok: { label: "OK", className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" },
  };
  const cfg = map?.[value] ?? defaults[value] ?? {
    label: value,
    className: "bg-slate-100 text-slate-600",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
}
