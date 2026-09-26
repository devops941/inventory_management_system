export const ROLES = {
  ADMIN: "Admin",
  INVENTORY_MANAGER: "Inventory Manager",
  PURCHASE_STAFF: "Purchase Staff",
  SALES_STAFF: "Sales Staff",
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

export const ALL_ROLES: RoleName[] = [
  ROLES.ADMIN,
  ROLES.INVENTORY_MANAGER,
  ROLES.PURCHASE_STAFF,
  ROLES.SALES_STAFF,
];

// Module keys used across API route guards and navigation.
export const MODULES = [
  "dashboard",
  "users",
  "products",
  "categories",
  "warehouses",
  "suppliers",
  "customers",
  "purchases",
  "sales",
  "stock",
  "alerts",
  "reports",
  "settings",
] as const;

export type ModuleKey = (typeof MODULES)[number];

// Permission matrix derived from section 3 (User Roles) of the overview PDF.
export const PERMISSIONS: Record<RoleName, ModuleKey[]> = {
  [ROLES.ADMIN]: [...MODULES],
  [ROLES.INVENTORY_MANAGER]: [
    "dashboard",
    "products",
    "categories",
    "warehouses",
    "suppliers",
    "stock",
    "alerts",
    "reports",
  ],
  [ROLES.PURCHASE_STAFF]: [
    "dashboard",
    "suppliers",
    "purchases",
    "products",
    "stock",
    "alerts",
    "reports",
  ],
  [ROLES.SALES_STAFF]: [
    "dashboard",
    "customers",
    "sales",
    "products",
    "stock",
    "alerts",
    "reports",
  ],
};

export function canAccess(role: string | null | undefined, mod: ModuleKey): boolean {
  if (!role) return false;
  const perms = PERMISSIONS[role as RoleName];
  if (!perms) return false;
  return perms.includes(mod);
}

// Modules each role may change. Mirrors section 3 (User Roles) of the overview:
// Admin does everything; the Inventory Manager owns products, categories,
// warehouses and manual stock operations; Purchase Staff own suppliers and
// purchasing (stock moves through goods-received); Sales Staff own customers
// and selling (stock moves through order issue). Every other module a role can
// merely view stays read-only.
export const WRITE_PERMISSIONS: Record<RoleName, ModuleKey[]> = {
  [ROLES.ADMIN]: [...MODULES],
  [ROLES.INVENTORY_MANAGER]: [
    "products",
    "categories",
    "warehouses",
    "stock",
    "alerts",
  ],
  [ROLES.PURCHASE_STAFF]: ["suppliers", "purchases"],
  [ROLES.SALES_STAFF]: ["customers", "sales"],
};

export function canManage(role: string | null | undefined, mod: ModuleKey): boolean {
  if (!role) return false;
  if (mod === "users" || mod === "settings") return role === ROLES.ADMIN;
  const perms = WRITE_PERMISSIONS[role as RoleName];
  if (!perms) return false;
  return perms.includes(mod);
}
