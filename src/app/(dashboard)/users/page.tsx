"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { ConfirmDialog, StatusBadge } from "@/components/shared/dialogs";
import { api, formatDate } from "@/lib/client";
import { PERMISSIONS, type RoleName } from "@/lib/rbac";

interface UserRow {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  status: string;
  role: string | null;
  roleId: string | null;
  lastLogin?: string | null;
  createdAt: string;
}

interface Role {
  id: string;
  name: string;
  description?: string | null;
  _count?: { users: number };
}

const EMPTY = {
  name: "",
  email: "",
  password: "",
  phone: "",
  roleId: "",
  status: "active",
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<UserRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [u, r] = await Promise.all([
        api.get<UserRow[]>("/api/users"),
        api.get<Role[]>("/api/roles"),
      ]);
      setUsers(u);
      setRoles(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY, roleId: roles[0]?.id ?? "" });
    setOpen(true);
  };

  const openEdit = (u: UserRow) => {
    setEditing(u);
    setForm({
      name: u.name,
      email: u.email,
      password: "",
      phone: u.phone ?? "",
      roleId: u.roleId ?? "",
      status: u.status,
    });
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/api/users/${editing.id}`, form);
        toast.success("User updated");
      } else {
        await api.post("/api/users", form);
        toast.success("User created");
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
      await api.delete(`/api/users/${toDelete.id}`);
      toast.success("User deleted");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  };

  const columns: Column<UserRow>[] = [
    {
      key: "name",
      header: "User",
      searchValue: (r) => `${r.name} ${r.email}`,
      render: (r) => (
        <div>
          <p className="font-medium">{r.name}</p>
          <p className="text-xs text-muted-foreground">{r.email}</p>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      render: (r) => <span className="text-sm">{r.phone ?? "-"}</span>,
    },
    {
      key: "role",
      header: "Role",
      searchValue: (r) => r.role ?? "",
      render: (r) => (
        <Badge variant="secondary" className="gap-1">
          <ShieldCheck className="h-3 w-3" /> {r.role ?? "No role"}
        </Badge>
      ),
    },
    {
      key: "lastLogin",
      header: "Last login",
      render: (r) => (
        <span className="text-xs text-muted-foreground">
          {r.lastLogin ? formatDate(r.lastLogin) : "Never"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusBadge value={r.status} />,
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (r) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" onClick={() => openEdit(r)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive"
            onClick={() => setToDelete(r)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (loading) return <LoadingState label="Loading users..." />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  return (
    <div>
      <PageHeader title="Users & Roles" description="Accounts and role permissions">
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add user
        </Button>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="lg:col-span-3">
          <DataTable
            columns={columns}
            rows={users}
            searchPlaceholder="Search users..."
            emptyTitle="No users found"
          />
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Roles</CardTitle>
            <CardDescription>Access per role</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {roles.map((r) => (
              <div key={r.id} className="space-y-1.5 border-b pb-3 last:border-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{r.name}</p>
                  <span className="text-xs text-muted-foreground">
                    {r._count?.users ?? 0} users
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{r.description}</p>
                <div className="flex flex-wrap gap-1">
                  {(PERMISSIONS[r.name as RoleName] ?? []).map((m) => (
                    <Badge key={m} variant="outline" className="text-[10px] capitalize">
                      {m}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit user" : "Add user"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Leave the password blank to keep the current one."
                : "Create an account and assign a role."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>{editing ? "New password" : "Password *"}</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required={!editing}
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={form.roleId}
                onValueChange={(v) => setForm({ ...form, roleId: v ?? "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select role">
                    {roles.find((r) => r.id === form.roleId)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm({ ...form, status: v ?? "active" })}
              >
                <SelectTrigger>
                  <SelectValue>
                    {form.status === "active" ? "Active" : form.status === "blocked" ? "Blocked" : form.status}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
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
        title="Delete user"
        description={`Delete ${toDelete?.name}? They will lose access immediately.`}
        confirmLabel="Delete"
        destructive
        onConfirm={remove}
      />
    </div>
  );
}
