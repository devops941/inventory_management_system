"use client";

import { CrudManager, type CrudConfig } from "@/components/shared/crud-manager";
import { StatusBadge } from "@/components/shared/dialogs";

interface Customer {
  id: string;
  name: string;
  code?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  status: string;
  _count?: { salesOrders: number };
}

const config: CrudConfig<Customer> = {
  module: "customers",
  title: "Customers",
  description: "Buyers, contacts and sales history.",
  endpoint: "/api/customers",
  entityName: "Customer",
  searchPlaceholder: "Search customers...",
  emptyForm: {
    name: "",
    code: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    status: "active",
    notes: "",
  },
  toForm: (c) => ({
    name: c.name,
    code: c.code ?? "",
    email: c.email ?? "",
    phone: c.phone ?? "",
    address: "",
    city: c.city ?? "",
    status: c.status,
    notes: "",
  }),
  columns: [
    {
      key: "name",
      header: "Customer",
      searchValue: (r) => `${r.name} ${r.code ?? ""} ${r.email ?? ""} ${r.phone ?? ""}`,
      render: (r) => (
        <div>
          <p className="font-medium">{r.name}</p>
          <p className="text-xs text-muted-foreground">{r.code ?? "-"}</p>
        </div>
      ),
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
      key: "city",
      header: "City",
      searchValue: (r) => r.city ?? "",
      render: (r) => <span className="text-sm">{r.city ?? "-"}</span>,
    },
    {
      key: "orders",
      header: "Sales orders",
      render: (r) => <span className="text-sm">{r._count?.salesOrders ?? 0}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusBadge value={r.status} />,
    },
  ],
  fields: [
    { name: "name", label: "Customer name", required: true },
    { name: "code", label: "Code", placeholder: "CUS-001" },
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

export default function CustomersPage() {
  return <CrudManager config={config} />;
}
