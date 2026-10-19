import { File, Paths } from "expo-file-system";
import * as XLSX from "xlsx";

import type {
    ExportExpenseRow,
    ExportProductRow,
    ExportTransactionItemRow,
    ExportTransactionRow,
} from "@/lib/database";

const MONEY_FORMAT = "Rp #,##0";

export type ExportPayload = {
  startDate: string; // ISO yyyy-mm-dd
  endDate: string; // ISO yyyy-mm-dd
  isSingleDay: boolean;
  summary: {
    omset: number;
    pengeluaran: number;
    labaKotor: number;
    labaBersih: number;
    jumlahTransaksi: number;
    itemTerjual: number;
    totalDiskon: number;
  };
  transactions: ExportTransactionRow[];
  items: ExportTransactionItemRow[];
  expenses: ExportExpenseRow[];
  products: ExportProductRow[];
};

export type ExportResult = {
  uri: string;
  name: string;
};

const MONTHS_ID = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const EXPENSE_CATEGORY_LABEL: Record<string, string> = {
  RENT: "Sewa",
  ELECTRICITY: "Listrik",
  TRANSPORT: "Transport",
  OTHER: "Lainnya",
};

function fmtDateId(iso: string): string {
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  const d = parseInt(parts[2], 10);
  const m = parseInt(parts[1], 10) - 1;
  return `${d} ${MONTHS_ID[m] ?? parts[1]} ${parts[0]}`;
}

function toDdMmYyyy(iso: string): string {
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function money(value: number): number {
  return value;
}

/** Ubah kolom tertentu pada sheet menjadi nilai numeric dengan format Rupiah. */
function applyMoneyFormat(
  ws: XLSX.WorkSheet,
  colIndex: number,
  startRow: number,
  endRow: number,
): void {
  for (let r = startRow; r <= endRow; r++) {
    const addr = XLSX.utils.encode_cell({ r, c: colIndex });
    const cell = ws[addr];
    if (cell && typeof cell.v === "number") {
      ws[addr] = { t: "n", v: cell.v, z: MONEY_FORMAT };
    }
  }
}

function setWidths(ws: XLSX.WorkSheet, widths: number[]): void {
  ws["!cols"] = widths.map((wch) => ({ wch }));
}

function buildRingkasanSheet(payload: ExportPayload): XLSX.WorkSheet {
  const periodText =
    payload.startDate === payload.endDate
      ? fmtDateId(payload.startDate)
      : `${fmtDateId(payload.startDate)} - ${fmtDateId(payload.endDate)}`;

  const rows: (string | number)[][] = [
    ["LAPORAN KASIR KITA"],
    ["Periode", periodText],
    [],
    ["Omzet", payload.summary.omset],
    ["Pengeluaran", payload.summary.pengeluaran],
    ["Laba Kotor", payload.summary.labaKotor],
    ["Laba Bersih", payload.summary.labaBersih],
    ["Jumlah Transaksi", payload.summary.jumlahTransaksi],
    ["Total Item Terjual", payload.summary.itemTerjual],
    ["Total Diskon", payload.summary.totalDiskon],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  // Baris data ringkasan: index 3..9 (0-based), nilai di kolom 1 merupakan nominal.
  for (const rowIndex of [3, 4, 5, 6, 9]) {
    applyMoneyFormat(ws, 1, rowIndex, rowIndex);
  }
  setWidths(ws, [22, 24]);
  return ws;
}

function buildTransaksiSheet(payload: ExportPayload): XLSX.WorkSheet {
  const header = [
    "No",
    "Invoice",
    "Tanggal",
    "Kasir",
    "Customer",
    "Subtotal",
    "Diskon",
    "Total",
    "Metode Pembayaran",
    "Dibayar",
    "Kembalian",
    "Status",
  ];
  const rows: (string | number)[][] = [header];
  payload.transactions.forEach((t, i) => {
    rows.push([
      i + 1,
      t.invoice_number,
      toDdMmYyyy(t.created_at.slice(0, 10)),
      t.cashier_name ?? "-",
      t.customer_name ?? "-",
      money(t.subtotal),
      money(t.discount_amount),
      money(t.total_amount),
      t.payment_method,
      money(t.paid_amount),
      money(t.change_amount),
      t.status,
    ]);
  });
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const last = rows.length - 1;
  for (const col of [5, 6, 7, 9, 10]) {
    applyMoneyFormat(ws, col, 1, last);
  }
  setWidths(ws, [6, 16, 12, 14, 18, 12, 12, 12, 14, 12, 12, 10]);
  return ws;
}

function buildDetailSheet(payload: ExportPayload): XLSX.WorkSheet {
  const header = [
    "Invoice",
    "Tanggal",
    "Produk",
    "Qty",
    "Unit",
    "Harga Jual",
    "Harga Modal",
    "Diskon",
    "Subtotal",
    "Laba",
  ];
  const rows: (string | number)[][] = [header];
  payload.items.forEach((it) => {
    rows.push([
      it.invoice_number,
      toDdMmYyyy(it.created_at.slice(0, 10)),
      it.product_name,
      it.quantity,
      it.product_unit,
      money(it.unit_price),
      money(it.buy_price),
      money(it.discount_amount),
      money(it.subtotal),
      money(it.laba),
    ]);
  });
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const last = rows.length - 1;
  for (const col of [5, 6, 7, 8, 9]) {
    applyMoneyFormat(ws, col, 1, last);
  }
  setWidths(ws, [16, 12, 26, 8, 8, 12, 12, 12, 13, 12]);
  return ws;
}

function buildPengeluaranSheet(payload: ExportPayload): XLSX.WorkSheet {
  const header = ["No", "Tanggal", "Kategori", "Deskripsi", "Jumlah"];
  const rows: (string | number)[][] = [header];
  payload.expenses.forEach((e, i) => {
    rows.push([
      i + 1,
      toDdMmYyyy(e.expense_date),
      EXPENSE_CATEGORY_LABEL[e.category] ?? e.category,
      e.description,
      money(e.amount),
    ]);
  });
  const total = payload.expenses.reduce((sum, e) => sum + e.amount, 0);
  rows.push(["TOTAL PENGELUARAN", "", "", "", money(total)]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  const last = rows.length - 1;
  applyMoneyFormat(ws, 4, 1, last);
  setWidths(ws, [6, 12, 14, 30, 14]);
  return ws;
}

function buildProdukSheet(payload: ExportPayload): XLSX.WorkSheet {
  const header = ["No", "Produk", "Unit", "Qty Terjual", "Omzet", "Laba Kotor"];
  const rows: (string | number)[][] = [header];
  payload.products.forEach((p, i) => {
    rows.push([
      i + 1,
      p.product_name,
      p.product_unit ?? "",
      p.quantity,
      money(p.omzet),
      money(p.labaKotor),
    ]);
  });
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const last = rows.length - 1;
  for (const col of [4, 5]) {
    applyMoneyFormat(ws, col, 1, last);
  }
  setWidths(ws, [6, 28, 8, 12, 14, 14]);
  return ws;
}

// ---------------------------------------------------------------------------
// Struktur modular: tambahkan sheet konsinyasi di sini nanti tanpa mengubah
// fungsi-fungsi sheet di atas.
// ---------------------------------------------------------------------------

function buildWorkbook(payload: ExportPayload): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, buildRingkasanSheet(payload), "Ringkasan");
  XLSX.utils.book_append_sheet(wb, buildTransaksiSheet(payload), "Transaksi");
  XLSX.utils.book_append_sheet(
    wb,
    buildDetailSheet(payload),
    "Detail Transaksi",
  );
  XLSX.utils.book_append_sheet(
    wb,
    buildPengeluaranSheet(payload),
    "Pengeluaran",
  );
  XLSX.utils.book_append_sheet(wb, buildProdukSheet(payload), "Produk Terjual");
  return wb;
}

function buildFileName(payload: ExportPayload): string {
  if (payload.startDate === payload.endDate) {
    return `Warungku_Laporan_${payload.startDate}.xlsx`;
  }
  return `Warungku_Laporan_${payload.startDate}_${payload.endDate}.xlsx`;
}

/**
 * Membuat file Excel (.xlsx) dari data laporan dan menyimpannya ke cache.
 *
 * @returns URI dan nama file yang siap dibagikan.
 */
export async function exportReportToExcel(
  payload: ExportPayload,
): Promise<ExportResult> {
  const wb = buildWorkbook(payload);
  const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const bytes = new Uint8Array(buffer);

  const fileName = buildFileName(payload);
  const file = new File(Paths.cache, fileName);
  file.create({ overwrite: true, intermediates: true });
  file.write(bytes);

  return { uri: file.uri, name: fileName };
}
