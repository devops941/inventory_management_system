"use client";

import { CrudManager, type CrudConfig } from "@/components/shared/crud-manager";
import { StatusBadge } from "@/components/shared/dialogs";

interface Category {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  _count?: { products: number };
}

const config: CrudConfig<Category> = {
  module: "categories",
  title: "Categories",
  description: "Organise products into groups.",
  endpoint: "/api/categories",
  entityName: "Category",
  searchPlaceholder: "Search categories...",
  emptyForm: { name: "", description: "", status: "active" },
  toForm: (c) => ({
    name: c.name,
    description: c.description ?? "",
    status: c.status,
  }),
  columns: [
    {
      key: "name",
      header: "Category",
      searchValue: (r) => r.name,
      render: (r) => (
        <div>
          <p className="font-medium">{r.name}</p>
          <p className="text-xs text-muted-foreground">{r.description ?? "-"}</p>
        </div>
      ),
    },
    {
      key: "products",
      header: "Products",
      render: (r) => (
        <span className="text-sm">{r._count?.products ?? 0}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusBadge value={r.status} />,
    },
  ],
  fields: [
    { name: "name", label: "Name", required: true },
    { name: "description", label: "Description", type: "textarea", colSpan: 2 },
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

export default function CategoriesPage() {
  return <CrudManager config={config} />;
}
