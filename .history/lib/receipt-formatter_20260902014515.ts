import { Printer } from "expo-bluetooth-thermal-printer";
import { getStore, type StoreInfo, type TransactionDetail } from "@/lib/database";

function formatRp(value: number): string {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

function paymentLabel(method: string): string {
  switch (method) {
    case "tunai":
      return "Tunai";
    case "transfer":
      return "Transfer";
    case "qris":
      return "QRIS";
    case "hutang":
      return "Hutang";
    default:
      return method;
  }
}

export async function printReceipt(
  printer: Printer,
  detail: TransactionDetail,
): Promise<void> {
  const store: StoreInfo = await getStore();

  await printer.initialize();
  await printer.alignCenter();

  // Store name
  await printer.bold(true);
  await printer.setSize("doubleHeight");
  await printer.println(store.name || "UMKM POS");
  await printer.setSize("normal");
  await printer.bold(false);

  // Store address & phone
  if (store.address) {
    await printer.println(store.address);
  }
  if (store.phone) {
    await printer.println(`Telp: ${store.phone}`);
  }

  await printer.separator();

  // Invoice & date
  await printer.alignLeft();
  await printer.println(`No: ${detail.invoice_number}`);

  const d = new Date(detail.created_at);
  const dateStr = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  await printer.println(`Tgl: ${dateStr}`);

  if (detail.cashier_name) {
    await printer.println(`Kasir: ${detail.cashier_name}`);
  }
  if (detail.customer_name) {
    await printer.println(`Pelanggan: ${detail.customer_name}`);
  }

  await printer.separator();

  // Items
  for (const item of detail.items) {
    const line = `${item.product_name} (${item.quantity}x)`;
    await printer.println(line);
    const unitDisplay = `@ ${formatRp(item.unit_price)}`;
    await printer.row("  ", `${unitDisplay}`);
    if (item.discount_amount > 0 && item.discount_name) {
      await printer.row("  Diskon", `-${formatRp(item.discount_amount)}`);
    }
    await printer.row("  Subtotal", formatRp(item.total));
  }

  await printer.separator();

  // Payment summary
  await printer.row("Subtotal", formatRp(detail.subtotal));
  if (detail.discount_amount > 0) {
    await printer.row("Diskon", `-${formatRp(detail.discount_amount)}`);
  }
  await printer.row("Dibayar", formatRp(detail.paid_amount));

  if (detail.change_amount > 0) {
    await printer.row("Kembalian", formatRp(detail.change_amount));
  }

  await printer.bold(true);
  await printer.separator();
  await printer.row("TOTAL", formatRp(detail.total_amount));
  await printer.bold(false);

  // Payment method
  await printer.println(`Bayar: ${paymentLabel(detail.payment_method)}`);

  // Status
  const statusText =
    detail.status === "PAID"
      ? "LUNAS"
      : detail.status === "PARTIAL"
        ? "BAYAR SEBAGIAN"
        : "BELUM DIBAYAR";
  await printer.println(`Status: ${statusText}`);

  await printer.separator();

  // Footer
  await printer.alignCenter();
  if (store.receipt_footer) {
    await printer.println(store.receipt_footer);
  }
  await printer.println("Terima kasih!");

  await printer.feed(4);
}
