import prisma from "./prisma";
import { hashPassword } from "./auth";
import { ALL_ROLES, ROLES } from "./rbac";

const CATEGORIES = [
  "Electronics",
  "Stationery",
  "Furniture",
  "Groceries",
  "Hardware",
  "Apparel",
  "Cleaning Supplies",
  "Networking",
];

const WAREHOUSES = [
  { name: "Main Warehouse", code: "WH-MAIN", city: "Mumbai", manager: "Ravi Kumar" },
  { name: "North Depot", code: "WH-NORTH", city: "Delhi", manager: "Anita Sharma" },
  { name: "South Hub", code: "WH-SOUTH", city: "Bengaluru", manager: "Suresh Rao" },
];

const SUPPLIERS = [
  { name: "TechnoWorld Distributors", contactPerson: "Arjun Mehta", city: "Mumbai" },
  { name: "OfficeLine Supplies", contactPerson: "Priya Nair", city: "Pune" },
  { name: "Global Traders", contactPerson: "Imran Khan", city: "Delhi" },
  { name: "FreshMart Wholesale", contactPerson: "Neha Gupta", city: "Bengaluru" },
  { name: "BuildRight Hardware", contactPerson: "Vikram Singh", city: "Chennai" },
];

const CUSTOMERS = [
  { name: "Acme Retail", city: "Mumbai" },
  { name: "Bright Stores", city: "Delhi" },
  { name: "Corner Shop", city: "Pune" },
  { name: "Metro Mart", city: "Bengaluru" },
  { name: "Sunrise Traders", city: "Hyderabad" },
];

const PRODUCT_SEED = [
  { name: "Wireless Mouse", category: "Electronics", cost: 350, sell: 599, unit: "pcs" },
  { name: "Mechanical Keyboard", category: "Electronics", cost: 1800, sell: 2799, unit: "pcs" },
  { name: "27-inch Monitor", category: "Electronics", cost: 12500, sell: 16999, unit: "pcs" },
  { name: "USB-C Hub", category: "Electronics", cost: 900, sell: 1499, unit: "pcs" },
  { name: "A4 Notebook", category: "Stationery", cost: 45, sell: 89, unit: "pcs" },
  { name: "Gel Pen (Box)", category: "Stationery", cost: 120, sell: 199, unit: "box" },
  { name: "Stapler", category: "Stationery", cost: 85, sell: 149, unit: "pcs" },
  { name: "Office Chair", category: "Furniture", cost: 4200, sell: 6499, unit: "pcs" },
  { name: "Study Table", category: "Furniture", cost: 5600, sell: 8499, unit: "pcs" },
  { name: "Basmati Rice 5kg", category: "Groceries", cost: 480, sell: 650, unit: "bag" },
  { name: "Sunflower Oil 1L", category: "Groceries", cost: 130, sell: 175, unit: "bottle" },
  { name: "Wheat Flour 10kg", category: "Groceries", cost: 380, sell: 499, unit: "bag" },
  { name: "Cordless Drill", category: "Hardware", cost: 3200, sell: 4599, unit: "pcs" },
  { name: "Screwdriver Set", category: "Hardware", cost: 260, sell: 449, unit: "set" },
  { name: "Cotton T-Shirt", category: "Apparel", cost: 220, sell: 499, unit: "pcs" },
  { name: "Denim Jeans", category: "Apparel", cost: 850, sell: 1599, unit: "pcs" },
  { name: "Floor Cleaner 2L", category: "Cleaning Supplies", cost: 180, sell: 279, unit: "bottle" },
  { name: "Detergent Powder 3kg", category: "Cleaning Supplies", cost: 340, sell: 499, unit: "pack" },
  { name: "Wi-Fi Router", category: "Networking", cost: 1600, sell: 2499, unit: "pcs" },
  { name: "LAN Cable 20m", category: "Networking", cost: 350, sell: 599, unit: "roll" },
];

const rand = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(arr: T[]): T => arr[rand(0, arr.length - 1)];

export async function runSeed() {
  // Wipe in dependency order so re-seeding is idempotent.
  await prisma.stockMovement.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.purchaseItem.deleteMany({});
  await prisma.salesItem.deleteMany({});
  await prisma.purchaseOrder.deleteMany({});
  await prisma.salesOrder.deleteMany({});
  await prisma.stock.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.category.deleteMany({});
  await prisma.warehouse.deleteMany({});
  await prisma.supplier.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.role.deleteMany({});

  const roleMap: Record<string, string> = {};
  const roleDescriptions: Record<string, string> = {
    [ROLES.ADMIN]: "Manages users, roles, settings, warehouses and views all reports.",
    [ROLES.INVENTORY_MANAGER]:
      "Manages products, stock, transfers, adjustments and alerts.",
    [ROLES.PURCHASE_STAFF]: "Manages suppliers, creates purchase orders and receives goods.",
    [ROLES.SALES_STAFF]: "Manages customers, creates sales orders and issues stock and invoices.",
  };
  for (const name of ALL_ROLES) {
    const role = await prisma.role.create({
      data: { name, description: roleDescriptions[name] },
    });
    roleMap[name] = role.id;
  }

  const demoUsers = [
    { name: "System Admin", email: "admin@ims.com", role: ROLES.ADMIN },
    { name: "Maya Manager", email: "manager@ims.com", role: ROLES.INVENTORY_MANAGER },
    { name: "Paul Purchase", email: "purchase@ims.com", role: ROLES.PURCHASE_STAFF },
    { name: "Sara Sales", email: "sales@ims.com", role: ROLES.SALES_STAFF },
  ];
  const password = await hashPassword("password123");
  for (const u of demoUsers) {
    await prisma.user.create({
      data: {
        name: u.name,
        email: u.email,
        password,
        phone: `+91 90000 000${demoUsers.indexOf(u) + 1}`,
        roleId: roleMap[u.role],
        status: "active",
      },
    });
  }

  const categories = [];
  for (const name of CATEGORIES) {
    categories.push(
      await prisma.category.create({
        data: { name, description: `${name} products` },
      })
    );
  }
  const categoryByName = Object.fromEntries(categories.map((c) => [c.name, c]));

  const warehouses = [];
  for (const w of WAREHOUSES) {
    warehouses.push(
      await prisma.warehouse.create({
        data: { ...w, address: `${w.city} Industrial Area`, phone: "+91 98765 43210" },
      })
    );
  }

  const suppliers = [];
  for (let i = 0; i < SUPPLIERS.length; i++) {
    const s = SUPPLIERS[i];
    suppliers.push(
      await prisma.supplier.create({
        data: {
          ...s,
          code: `SUP-${String(i + 1).padStart(3, "0")}`,
          email: `contact${i + 1}@supplier.com`,
          phone: "+91 91234 5678" + i,
          address: `${s.city} Market Road`,
          status: "active",
        },
      })
    );
  }

  const customers = [];
  for (let i = 0; i < CUSTOMERS.length; i++) {
    const c = CUSTOMERS[i];
    customers.push(
      await prisma.customer.create({
        data: {
          ...c,
          code: `CUS-${String(i + 1).padStart(3, "0")}`,
          email: `buyer${i + 1}@customer.com`,
          phone: "+91 99887 7665" + i,
          address: `${c.city} High Street`,
          status: "active",
        },
      })
    );
  }

  // Products
  const products = [];
  for (let i = 0; i < PRODUCT_SEED.length; i++) {
    const p = PRODUCT_SEED[i];
    const category = categoryByName[p.category];
    products.push(
      await prisma.product.create({
        data: {
          name: p.name,
          sku: `SKU-${String(i + 1).padStart(4, "0")}`,
          barcode: `89012345${String(i + 1).padStart(4, "0")}`,
          description: `${p.name} - ${p.category}`,
          unit: p.unit,
          costPrice: p.cost,
          sellingPrice: p.sell,
          reorderLevel: rand(5, 20),
          quantity: 0,
          status: "active",
          // Perishable lines get an expiry so expiry alerts are demonstrable.
          expiryDate:
            p.category === "Groceries"
              ? new Date(Date.now() + (i % 3 === 0 ? -5 : 20) * 86400000)
              : null,
          categoryId: category.id,
          supplierId: pick(suppliers).id,
          warehouseId: warehouses[0].id,
        },
      })
    );
  }

  // Opening stock spread across warehouses (some deliberately low).
  const { applyStock } = await import("./stock");
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const isLow = i % 7 === 0;
    const qty = isLow ? rand(0, 3) : rand(25, 180);
    await applyStock({
      productId: p.id,
      warehouseId: warehouses[0].id,
      quantity: qty,
      type: "IN",
      referenceType: "opening",
      note: "Opening stock",
    });
    if (i % 3 === 0) {
      await applyStock({
        productId: p.id,
        warehouseId: warehouses[1].id,
        quantity: rand(10, 60),
        type: "IN",
        referenceType: "opening",
        note: "Opening stock",
      });
    }
  }

  // Purchase orders across statuses
  const admin = await prisma.user.findFirst({ where: { email: "admin@ims.com" } });
  const purchaseStatuses = ["pending", "approved", "received", "received", "cancelled"];
  for (let i = 0; i < 8; i++) {
    const supplier = pick(suppliers);
    const warehouse = warehouses[i % warehouses.length];
    const itemCount = rand(1, 3);
    const items = [];
    for (let j = 0; j < itemCount; j++) {
      const product = pick(products);
      const quantity = rand(5, 40);
      items.push({
        productId: product.id,
        quantity,
        unitCost: product.costPrice,
        total: quantity * product.costPrice,
      });
    }
    const subtotal = items.reduce((s, it) => s + it.total, 0);
    const tax = Math.round(subtotal * 0.18);
    const total = subtotal + tax;
    const status = purchaseStatuses[i % purchaseStatuses.length];
    const orderDate = new Date(Date.now() - rand(1, 150) * 86400000);

    const order = await prisma.purchaseOrder.create({
      data: {
        orderNumber: `PO-${orderDate.getFullYear()}-${String(i + 1).padStart(4, "0")}`,
        supplierId: supplier.id,
        warehouseId: warehouse.id,
        status: status === "received" ? "approved" : status,
        orderDate,
        expectedDate: new Date(orderDate.getTime() + 7 * 86400000),
        subtotal,
        tax,
        discount: 0,
        total,
        paidAmount: status === "received" ? total : 0,
        createdById: admin?.id,
        items: { create: items },
      },
    });

    if (status === "received") {
      const { receiveOrder } = await import("./purchase");
      await receiveOrder(order.id, admin!.id);
    }
  }

  // Sales orders across statuses
  const salesStatuses = ["pending", "confirmed", "issued", "issued", "cancelled"];
  for (let i = 0; i < 10; i++) {
    const customer = pick(customers);
    const warehouse = warehouses[0];
    const itemCount = rand(1, 3);
    const items = [];
    for (let j = 0; j < itemCount; j++) {
      const product = pick(products);
      const quantity = rand(1, 8);
      items.push({
        productId: product.id,
        quantity,
        unitPrice: product.sellingPrice,
        total: quantity * product.sellingPrice,
      });
    }
    const subtotal = items.reduce((s, it) => s + it.total, 0);
    const tax = Math.round(subtotal * 0.18);
    const discount = i % 3 === 0 ? Math.round(subtotal * 0.05) : 0;
    const total = subtotal + tax - discount;
    const status = salesStatuses[i % salesStatuses.length];
    const paymentStatus =
      status === "issued" ? (i % 2 === 0 ? "paid" : "partial") : "unpaid";
    const orderDate = new Date(Date.now() - rand(1, 120) * 86400000);

    const order = await prisma.salesOrder.create({
      data: {
        orderNumber: `SO-${orderDate.getFullYear()}-${String(i + 1).padStart(4, "0")}`,
        customerId: customer.id,
        warehouseId: warehouse.id,
        status: status === "issued" ? "confirmed" : status,
        paymentStatus,
        orderDate,
        dueDate: new Date(orderDate.getTime() + 15 * 86400000),
        subtotal,
        tax,
        discount,
        total,
        paidAmount: paymentStatus === "paid" ? total : paymentStatus === "partial" ? total / 2 : 0,
        createdById: admin?.id,
        items: { create: items },
      },
    });

    if (status === "issued") {
      try {
        const { issueSalesOrder } = await import("./sales");
        await issueSalesOrder(order.id, admin!.id);
      } catch {
        // Skip if the random quantity exceeds available stock.
        await prisma.salesOrder.update({
          where: { id: order.id },
          data: { status: "confirmed" },
        });
      }
    }
  }

  const counts = {
    roles: await prisma.role.count(),
    users: await prisma.user.count(),
    categories: await prisma.category.count(),
    warehouses: await prisma.warehouse.count(),
    suppliers: await prisma.supplier.count(),
    customers: await prisma.customer.count(),
    products: await prisma.product.count(),
    purchaseOrders: await prisma.purchaseOrder.count(),
    salesOrders: await prisma.salesOrder.count(),
    stockRows: await prisma.stock.count(),
    movements: await prisma.stockMovement.count(),
    notifications: await prisma.notification.count(),
  };
  return counts;
}
