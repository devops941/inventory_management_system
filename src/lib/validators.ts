import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional().nullable(),
  roleId: z.string().optional().nullable(),
  status: z.enum(["active", "blocked"]).default("active"),
});

export const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  sku: z.string().min(1, "SKU is required"),
  barcode: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  unit: z.string().default("pcs"),
  costPrice: z.coerce.number().min(0).default(0),
  sellingPrice: z.coerce.number().min(0).default(0),
  reorderLevel: z.coerce.number().int().min(0).default(0),
  quantity: z.coerce.number().int().min(0).default(0),
  image: z.string().optional().nullable(),
  status: z.enum(["active", "inactive"]).default("active"),
  expiryDate: z.coerce.date().optional().nullable(),
  categoryId: z.string().min(1, "Category is required"),
  supplierId: z.string().optional().nullable(),
  warehouseId: z.string().optional().nullable(),
});

export const categorySchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  status: z.enum(["active", "inactive"]).default("active"),
});

export const warehouseSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  manager: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  status: z.enum(["active", "inactive"]).default("active"),
});

export const supplierSchema = z.object({
  name: z.string().min(1),
  code: z.string().optional().nullable(),
  contactPerson: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  status: z.enum(["active", "inactive"]).default("active"),
  notes: z.string().optional().nullable(),
});

export const customerSchema = supplierSchema.omit({ contactPerson: true });

export const stockAdjustSchema = z.object({
  productId: z.string().min(1),
  warehouseId: z.string().min(1),
  type: z.enum(["IN", "OUT", "ADJUSTMENT"]),
  quantity: z.coerce.number().int().positive("Quantity must be positive"),
  note: z.string().optional().nullable(),
});

export const transferSchema = z.object({
  productId: z.string().min(1),
  fromWarehouseId: z.string().min(1),
  toWarehouseId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  note: z.string().optional().nullable(),
});

export const orderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
  unitCost: z.coerce.number().min(0).optional(),
  unitPrice: z.coerce.number().min(0).optional(),
});

export const purchaseOrderSchema = z.object({
  supplierId: z.string().min(1),
  warehouseId: z.string().optional().nullable(),
  status: z
    .enum(["pending", "approved", "received", "returned", "cancelled"])
    .default("pending"),
  expectedDate: z.coerce.date().optional().nullable(),
  tax: z.coerce.number().min(0).default(0),
  discount: z.coerce.number().min(0).default(0),
  paidAmount: z.coerce.number().min(0).default(0),
  notes: z.string().optional().nullable(),
  items: z.array(orderItemSchema).min(1, "At least one item is required"),
});

export const salesOrderSchema = z.object({
  customerId: z.string().min(1),
  warehouseId: z.string().optional().nullable(),
  status: z
    .enum(["pending", "confirmed", "issued", "cancelled", "returned"])
    .default("pending"),
  paymentStatus: z.enum(["unpaid", "partial", "paid"]).default("unpaid"),
  dueDate: z.coerce.date().optional().nullable(),
  tax: z.coerce.number().min(0).default(0),
  discount: z.coerce.number().min(0).default(0),
  paidAmount: z.coerce.number().min(0).default(0),
  notes: z.string().optional().nullable(),
  items: z.array(orderItemSchema).min(1, "At least one item is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type PurchaseOrderInput = z.infer<typeof purchaseOrderSchema>;
export type SalesOrderInput = z.infer<typeof salesOrderSchema>;
