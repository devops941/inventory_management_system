"use client";

import { CrudManager, type CrudConfig } from "@/components/shared/crud-manager";
import { StatusBadge } from "@/components/shared/dialogs";

interface Supplier {
  id: string;
  name: string;
  code?: string | null;
  contactPerson?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  status: string;
  _count?: { products: number; purchaseOrders: number };
}

const config: CrudConfig<Supplier> = {
  module: "suppliers",
  title: "Suppliers",
  description: "Vendors, contacts and purchase history.",
  endpoint: "/api/suppliers",
  entityName: "Supplier",
  searchPlaceholder: "Search suppliers...",
  emptyForm: {
    name: "",
    code: "",
    contactPerson: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    status: "active",
    notes: "",
  },
  toForm: (s) => ({
    name: s.name,
    code: s.code ?? "",
    contactPerson: s.contactPerson ?? "",
    email: s.email ?? "",
    phone: s.phone ?? "",
    address: "",
    city: s.city ?? "",
    status: s.status,
    notes: "",
  }),
  columns: [
    {
      key: "name",
      header: "Supplier",
      searchValue: (r) => `${r.name} ${r.code ?? ""} ${r.email ?? ""} ${r.phone ?? ""}`,
      render: (r) => (
        <div>
          <p className="font-medium">{r.name}</p>
          <p className="text-xs text-muted-foreground">{r.code ?? "-"}</p>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contact person",
      searchValue: (r) => r.contactPerson ?? "",
      render: (r) => <span className="text-sm">{r.contactPerson ?? "-"}</span>,
    },
    {
      key: "email",
      header: "Email",
      searchValue: (r) => r.email ?? "",
      render: (r) => (
        <span className="text-sm text-muted-foreground">{r.email ?? "-"}</span>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      render: (r) => <span className="text-sm">{r.phone ?? "-"}</span>,
    },
    {
      key: "orders",
      header: "Products / POs",
      render: (r) => (
        <span className="text-sm">
          {r._count?.products ?? 0} / {r._count?.purchaseOrders ?? 0}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusBadge value={r.status} />,
    },
  ],
  fields: [
    { name: "name", label: "Supplier name", required: true },
    { name: "code", label: "Code", placeholder: "SUP-001" },
    { name: "contactPerson", label: "Contact person" },
    { name: "email", label: "Email", type: "email" },
    { name: "phone", label: "Phone" },
    { name: "city", label: "City" },
    { name: "address", label: "Address", colSpan: 2 },
    {
      name: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
      ],
    },
    { name: "notes", label: "Notes", type: "textarea", colSpan: 2 },
  ],
};

export default function SuppliersPage() {
  return <CrudManager config={config} />;
}
