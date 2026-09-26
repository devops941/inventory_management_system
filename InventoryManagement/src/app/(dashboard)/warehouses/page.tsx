"use client";

import { CrudManager, type CrudConfig } from "@/components/shared/crud-manager";
import { StatusBadge } from "@/components/shared/dialogs";

interface Warehouse {
  id: string;
  name: string;
  code?: string | null;
  address?: string | null;
  city?: string | null;
  manager?: string | null;
  phone?: string | null;
  status: string;
  _count?: { stock: number; purchaseOrders: number; salesOrders: number };
}

const config: CrudConfig<Warehouse> = {
  module: "warehouses",
  title: "Warehouses",
  description: "Storage locations, racks and depots.",
  endpoint: "/api/warehouses",
  entityName: "Warehouse",
  searchPlaceholder: "Search warehouses...",
  emptyForm: {
    name: "",
    code: "",
    address: "",
    city: "",
    manager: "",
    phone: "",
    status: "active",
  },
  toForm: (w) => ({
    name: w.name,
    code: w.code ?? "",
    address: w.address ?? "",
    city: w.city ?? "",
    manager: w.manager ?? "",
    phone: w.phone ?? "",
    status: w.status,
  }),
  columns: [
    {
      key: "name",
      header: "Warehouse",
      searchValue: (r) => `${r.name} ${r.code ?? ""} ${r.city ?? ""}`,
      render: (r) => (
        <div>
          <p className="font-medium">{r.name}</p>
          <p className="text-xs text-muted-foreground">
            {r.code ?? "-"} &middot; {r.city ?? "-"}
          </p>
        </div>
      ),
    },
    {
      key: "manager",
      header: "Manager",
      searchValue: (r) => r.manager ?? "",
      render: (r) => <span className="text-sm">{r.manager ?? "-"}</span>,
    },
    {
      key: "phone",
      header: "Phone",
      render: (r) => (
        <span className="text-sm text-muted-foreground">{r.phone ?? "-"}</span>
      ),
    },
    {
      key: "stock",
      header: "Stock lines",
      render: (r) => <span className="text-sm">{r._count?.stock ?? 0}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusBadge value={r.status} />,
    },
  ],
  fields: [
    { name: "name", label: "Name", required: true },
    { name: "code", label: "Code", placeholder: "WH-MAIN" },
    { name: "manager", label: "Manager" },
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
  ],
};

export default function WarehousesPage() {
  return <CrudManager config={config} />;
}
