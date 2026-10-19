import type { Printer } from "expo-bluetooth-thermal-printer";

import { isCode128BEncodable } from "@/lib/code128";

export type LabelPrintItem = {
  name: string;
  /** null = cetak label teks saja (nama + harga, tanpa barcode) */
  barcode: string | null;
  /** harga final yang dicetak besar */
  price: number;
  /**
   * harga normal (sebelum diskon). Jika diisi dan lebih besar dari `price`,
   * dicetak sebagai baris "Harga Normal" di atas harga promo.
   */
  normalPrice?: number;
};

function formatRp(value: number): string {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

const GS = 29;

/**
 * Bangun perintah ESC/POS `GS k 73` (CODE128) sebagai array byte.
 * Data diawali "{B" supaya printer eksplisit memakai Code Set B.
 * Throw jika karakter tidak didukung / data terlalu panjang (maks 255 byte).
 */
export function buildCode128Command(code: string): number[] {
  if (!isCode128BEncodable(code)) {
    throw new Error(
      "Barcode hanya mendukung karakter ASCII 32-127 untuk CODE128",
    );
  }
  const payload = `{B${code}`;
  const bytes = Array.from(payload).map((c) => c.charCodeAt(0));
  if (bytes.length > 255) {
    throw new Error("Barcode terlalu panjang (maks 255 karakter)");
  }
  return [GS, 107, 73, bytes.length, ...bytes];
}

/**
 * Cetak 1 label harga ke printer thermal (monokrom ESC/POS):
 * nama produk + barcode CODE128 (+ nomornya) + harga besar.
 * Tanpa barcode → label teks saja (nama + harga).
 */
export async function printPriceLabel(
  printer: Printer,
  item: LabelPrintItem,
): Promise<void> {
  const barcodeBytes =
    item.barcode && item.barcode.trim().length > 0
      ? buildCode128Command(item.barcode.trim())
      : null;

  await printer.initialize();
  await printer.alignCenter();

  // Nama produk
  await printer.bold(true);
  await printer.setSize("doubleHeight");
  await printer.println(item.name);
  await printer.setSize("normal");
  await printer.bold(false);

  if (barcodeBytes) {
    // Barcode CODE128 asli (bisa di-scan)
    await printer.raw([GS, 104, 80]); // tinggi barcode 80 dot
    await printer.raw([GS, 119, 2]); // lebar modul 2
    await printer.raw([GS, 72, 0]); // tanpa teks HRI bawaan printer
    await printer.raw(barcodeBytes);
    await printer.println(item.barcode!.trim());
  }

  // Harga: normal kecil (jika promo) + final besar
  if (item.normalPrice != null && item.normalPrice > item.price) {
    await printer.row("Harga Normal", formatRp(item.normalPrice));
  }
  await printer.bold(true);
  await printer.setSize("double");
  await printer.println(formatRp(item.price));
  await printer.setSize("normal");
  await printer.bold(false);

  await printer.feed(3);
}

/** Cetak beberapa label berurutan (dipakai untuk batch / pilih semua). */
export async function printPriceLabels(
  printer: Printer,
  items: LabelPrintItem[],
): Promise<void> {
  for (const item of items) {
    await printPriceLabel(printer, item);
  }
}
