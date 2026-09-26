"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, RefreshCw, UserCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/shared/states";
import { ConfirmDialog } from "@/components/shared/dialogs";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/client";
import { PERMISSIONS, type RoleName } from "@/lib/rbac";

export default function SettingsPage() {
  const { user, refresh, logout } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [confirmSeed, setConfirmSeed] = useState(false);
  const [password, setPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone ?? "");
    }
  }, [user]);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await api.put(`/api/users/${user.id}`, { name, phone });
      await refresh();
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setChangingPassword(true);
    try {
      await api.put(`/api/users/${user.id}`, { password });
      setPassword("");
      toast.success("Password changed");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Change failed");
    } finally {
      setChangingPassword(false);
    }
  };

  const reseed = async () => {
    setSeeding(true);
    try {
      await api.post("/api/seed?force=true");
      toast.success("Demo data reloaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Seeding failed");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div>
      <PageHeader title="Settings" description="Your profile, access and system data" />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Update your name and contact number</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Email</Label>
                <Input value={user?.email ?? ""} disabled />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save profile
                </Button>
              </div>
            </form>

            <Separator className="my-6" />

            <form onSubmit={changePassword} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>New password</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>
              <div className="flex items-end">
                <Button type="submit" variant="outline" disabled={changingPassword}>
                  Change password
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCircle className="h-4 w-4" /> Access
              </CardTitle>
              <CardDescription>Role and module permissions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs uppercase text-muted-foreground">Role</p>
                <Badge variant="secondary">{user?.role ?? "No role"}</Badge>
              </div>
              <div>
                <p className="mb-1 text-xs uppercase text-muted-foreground">
                  Modules
                </p>
                <div className="flex flex-wrap gap-1">
                  {(PERMISSIONS[(user?.role ?? "") as RoleName] ?? []).map((m) => (
                    <Badge key={m} variant="outline" className="text-[10px] capitalize">
                      {m}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System data</CardTitle>
              <CardDescription>Demo dataset utilities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Reload the demo dataset (roles, users, products, orders). This
                replaces all existing data and is admin-only.
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setConfirmSeed(true)}
                disabled={seeding}
              >
                {seeding ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Reload demo data
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Session</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full" onClick={() => logout()}>
                Sign out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmSeed}
        onOpenChange={setConfirmSeed}
        title="Reload demo data"
        description="This replaces all existing data with the demo dataset. Only works on an empty database."
        confirmLabel="Reload"
        destructive
        onConfirm={reseed}
      />
    </div>
  );
}
