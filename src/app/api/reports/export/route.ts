import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { fail, getSession, handleError } from "@/lib/api";
import { canAccess } from "@/lib/rbac";

/**
 * GET /api/reports/export?type=stock|purchases|sales&format=xlsx|pdf
 * Streams a generated Excel or PDF report. Admin/manager roles only.
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return fail("Unauthorized", 401);
    if (!canAccess(session.role, "reports"))
      return fail("Forbidden: reports access required", 403);

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") ?? "stock";
    const format = searchParams.get("format") ?? "xlsx";

    const { title, headers, rows } = await buildReport(type);

    if (format === "pdf") {
      const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
      const doc = await PDFDocument.create();
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const bold = await doc.embedFont(StandardFonts.HelveticaBold);

      let page = doc.addPage([842, 595]);
      let y = 555;
      page.drawText(title, { x: 40, y, size: 18, font: bold, color: rgb(0.1, 0.1, 0.1) });
      y -= 26;
      page.drawText(`Generated ${new Date().toLocaleString()}`, {
        x: 40,
        y,
        size: 9,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });
      y -= 24;

      const colWidth = (842 - 80) / headers.length;
      const drawRow = (values: (string | number)[], isHeader = false) => {
        values.forEach((v, i) => {
          page.drawText(String(v).slice(0, 26), {
            x: 40 + i * colWidth,
            y,
            size: 9,
            font: isHeader ? bold : font,
            color: isHeader ? rgb(0.1, 0.1, 0.1) : rgb(0.25, 0.25, 0.25),
          });
        });
        y -= 16;
      };

      drawRow(headers, true);
      page.drawLine({
        start: { x: 40, y: y + 10 },
        end: { x: 802, y: y + 10 },
        thickness: 0.5,
        color: rgb(0.8, 0.8, 0.8),
      });
      for (const row of rows) {
        if (y < 50) {
          page = doc.addPage([842, 595]);
          y = 555;
        }
        drawRow(row);
      }

      const bytes = await doc.save();
      return new NextResponse(Buffer.from(bytes), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${type}-report.pdf"`,
        },
      });
    }

    const ExcelJS = (await import("exceljs")).default;
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Inventory Management System";
    const sheet = workbook.addWorksheet(title.slice(0, 30));
    sheet.columns = headers.map((h) => ({
      header: h,
      key: h,
      width: Math.max(14, h.length + 4),
    }));
    sheet.getRow(1).font = { bold: true };
    rows.forEach((r) => sheet.addRow(r));

    const buffer = await workbook.xlsx.writeBuffer();
    return new NextResponse(Buffer.from(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${type}-report.xlsx"`,
      },
    });
  } catch (e) {
    return handleError(e);
  }
}

async function buildReport(type: string) {
  if (type === "purchases") {
    const orders = await prisma.purchaseOrder.findMany({
      include: { supplier: true },
      orderBy: { orderDate: "desc" },
    });
    return {
      title: "Purchase Report",
      headers: ["Order No", "Supplier", "Status", "Date", "Total", "Paid"],
      rows: orders.map((o) => [
        o.orderNumber,
        o.supplier?.name ?? "-",
        o.status,
        new Date(o.orderDate).toLocaleDateString(),
        o.total.toFixed(2),
        o.paidAmount.toFixed(2),
      ]),
    };
  }

  if (type === "sales") {
    const orders = await prisma.salesOrder.findMany({
      include: { customer: true },
      orderBy: { orderDate: "desc" },
    });
    return {
      title: "Sales Report",
      headers: ["Order No", "Customer", "Status", "Payment", "Date", "Total", "Paid"],
      rows: orders.map((o) => [
        o.orderNumber,
        o.customer?.name ?? "-",
        o.status,
        o.paymentStatus,
        new Date(o.orderDate).toLocaleDateString(),
        o.total.toFixed(2),
        o.paidAmount.toFixed(2),
      ]),
    };
  }

  const products = await prisma.product.findMany({
    include: { category: true, supplier: true },
    orderBy: { name: "asc" },
  });
  return {
    title: "Stock Report",
    headers: ["SKU", "Product", "Category", "Qty", "Unit", "Cost", "Sell", "Cost Value"],
    rows: products.map((p) => [
      p.sku,
      p.name,
      p.category?.name ?? "-",
      p.quantity,
      p.unit,
      p.costPrice.toFixed(2),
      p.sellingPrice.toFixed(2),
      (p.quantity * p.costPrice).toFixed(2),
    ]),
  };
}
