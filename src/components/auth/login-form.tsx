"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Boxes, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/components/auth-provider";
import { api } from "@/lib/client";

const DEMO = [
  { role: "Admin", email: "admin@ims.com" },
  { role: "Inventory Manager", email: "manager@ims.com" },
  { role: "Purchase Staff", email: "purchase@ims.com" },
  { role: "Sales Staff", email: "sales@ims.com" },
];

export function LoginForm() {
  const { login, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("admin@ims.com");
  const [password, setPassword] = useState("password123");
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [needsSeed, setNeedsSeed] = useState(false);

  useEffect(() => {
    if (!authLoading && user) router.replace("/dashboard");
  }, [authLoading, user, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success("Welcome back");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      if (message.toLowerCase().includes("invalid")) setNeedsSeed(true);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const onSeed = async () => {
    setSeeding(true);
    try {
      await api.post("/api/seed");
      toast.success("Demo data loaded. You can sign in now.");
      setNeedsSeed(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Seeding failed");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-foreground/15">
            <Boxes className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold">Inventory Management System</p>
            <p className="text-xs text-primary-foreground/70">
              Next.js full-stack &middot; Prisma &middot; MongoDB
            </p>
          </div>
        </div>
        <div className="space-y-4">
          <h2 className="text-3xl font-semibold leading-tight">
            Real-time stock, purchases and sales in one place.
          </h2>
          <ul className="space-y-2 text-sm text-primary-foreground/80">
            <li>&bull; Live stock levels across every warehouse</li>
            <li>&bull; Purchase orders and goods received notes</li>
            <li>&bull; Sales orders, invoices and stock issue</li>
            <li>&bull; Low-stock and expiry alerts</li>
            <li>&bull; Reports with Excel and PDF export</li>
          </ul>
        </div>
        <p className="text-xs text-primary-foreground/60">
          Role-based access for Admin, Inventory Manager, Purchase Staff and Sales Staff.
        </p>
      </div>

      <div className="flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl">Sign in</CardTitle>
            <CardDescription>
              Use your IMS account to access the dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/forgot-password"
                    className="text-xs text-muted-foreground hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign in
              </Button>
            </form>

            <div className="rounded-lg border bg-muted/40 p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Demo accounts (password: password123)
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {DEMO.map((d) => (
                  <button
                    key={d.email}
                    type="button"
                    onClick={() => {
                      setEmail(d.email);
                      setPassword("password123");
                    }}
                    className="rounded-md border bg-background px-2 py-1.5 text-left text-xs hover:bg-accent"
                  >
                    <span className="block font-medium">{d.role}</span>
                    <span className="block truncate text-muted-foreground">
                      {d.email}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {needsSeed && (
              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
                <p className="mb-2">
                  No accounts found. Load the demo dataset to get started.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onSeed}
                  disabled={seeding}
                >
                  {seeding && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                  Load demo data
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
