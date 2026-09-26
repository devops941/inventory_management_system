"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, type Column } from "@/components/shared/data-table";
import { PageHeader, LoadingState, ErrorState } from "@/components/shared/states";
import { ConfirmDialog } from "@/components/shared/dialogs";
import { api } from "@/lib/client";
import { useAuth } from "@/components/auth-provider";
import { canManage, type ModuleKey } from "@/lib/rbac";

export interface FieldDef {
  name: string;
  label: string;
  type?: "text" | "email" | "textarea" | "select";
  required?: boolean;
  options?: { value: string; label: string }[];
  colSpan?: 1 | 2;
  placeholder?: string;
}

export interface CrudConfig<T> {
  module: ModuleKey;
  title: string;
  description: string;
  endpoint: string;
  entityName: string;
  columns: Column<T>[];
  fields: FieldDef[];
  emptyForm: Record<string, string>;
  toForm?: (row: T) => Record<string, string>;
  searchPlaceholder?: string;
}

export function CrudManager<T extends { id: string }>({
  config,
}: {
  config: CrudConfig<T>;
}) {
  const { user } = useAuth();
  const editable = canManage(user?.role, config.module);

  const [rows, setRows] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<T | null>(null);
  const [form, setForm] = useState<Record<string, string>>(config.emptyForm);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<T | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await api.get<T[]>(config.endpoint));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, [config.endpoint]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(config.emptyForm);
    setOpen(true);
  };

  const openEdit = (row: T) => {
    setEditing(row);
    setForm(config.toForm ? config.toForm(row) : (row as unknown as Record<string, string>));
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.put(`${config.endpoint}/${editing.id}`, form);
        toast.success(`${config.entityName} updated`);
      } else {
        await api.post(config.endpoint, form);
        toast.success(`${config.entityName} created`);
      }
      setOpen(false);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      await api.delete(`${config.endpoint}/${toDelete.id}`);
      toast.success(`${config.entityName} deleted`);
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const columns: Column<T>[] = editable
    ? [
        ...config.columns,
        {
          key: "actions",
          header: "",
          className: "text-right",
          render: (row: T) => (
            <div className="flex justify-end gap-1">
              <Button variant="ghost" size="icon" onClick={() => openEdit(row)}>
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive"
                onClick={() => setToDelete(row)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ),
        },
      ]
    : config.columns;

  if (loading) return <LoadingState label={`Loading ${config.title.toLowerCase()}...`} />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader title={config.title} description={config.description}>
        {editable && (
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" /> Add {config.entityName.toLowerCase()}
          </Button>
        )}
      </PageHeader>

      <DataTable
        columns={columns}
        rows={rows}
        searchPlaceholder={config.searchPlaceholder ?? "Search..."}
        emptyTitle={`No ${config.title.toLowerCase()} yet`}
        emptyDescription={
          editable
            ? `Use the "Add ${config.entityName.toLowerCase()}" button to create one.`
            : undefined
        }
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? `Edit ${config.entityName.toLowerCase()}` : `Add ${config.entityName.toLowerCase()}`}
            </DialogTitle>
            <DialogDescription>
              Fill in the details below and save.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            {config.fields.map((f) => (
              <div
                key={f.name}
                className={`space-y-2 ${f.colSpan === 2 ? "sm:col-span-2" : ""}`}
              >
                <Label>{f.label}</Label>
                {f.type === "textarea" ? (
                  <Textarea
                    value={form[f.name] ?? ""}
                    onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                    rows={2}
                  />
                ) : f.type === "select" ? (
                  <Select
                    value={form[f.name] ?? ""}
                    onValueChange={(v) => setForm({ ...form, [f.name]: v ?? "" })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`Select ${f.label.toLowerCase()}`}>
                        {(f.options ?? []).find((o) => o.value === form[f.name])?.label}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {(f.options ?? []).map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type={f.type ?? "text"}
                    value={form[f.name] ?? ""}
                    placeholder={f.placeholder}
                    required={f.required}
                    onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                  />
                )}
              </div>
            ))}
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
        title={`Delete ${config.entityName.toLowerCase()}`}
        description="This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={remove}
      />
    </div>
  );
}
