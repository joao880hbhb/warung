import type { WholesalePrice } from "@/lib/database";

/**
 * Pricing type untuk transaksi.
 * NORMAL = menggunakan sell_price produk
 * WHOLESALE = menggunakan wholesale_price
 */
export type PricingType = "NORMAL" | "WHOLESALE";

/**
 * Hasil perhitungan harga akhir produk.
 */
export type PricingResult = {
  normal_price: number;
  wholesale_price: number | null;
  min_qty: number | null;
  final_unit_price: number;
  pricing_type: PricingType;
  wholesale_saving: number;
};

/**
 * Hitung harga final untuk satu item berdasarkan quantity.
 *
 * Aturan:
 * - Jika qty < min_qty atau tidak ada wholesale_price: gunakan normal_price (NORMAL)
 * - Jika qty >= min_qty dan ada wholesale_price: gunakan wholesale_price (WHOLESALE)
 *
 * @param normalPrice harga normal/jual produk (dari products.sell_price)
 * @param quantity jumlah item
 * @param wholesaleConfig konfigurasi grosir (atau null jika tidak ada)
 * @returns hasil perhitungan harga
 */
export function calculateFinalPrice(
  normalPrice: number,
  quantity: number,
  wholesaleConfig: WholesalePrice | null | undefined,
): PricingResult {
  if (!wholesaleConfig || quantity < wholesaleConfig.min_qty) {
    // Gunakan harga normal
    return {
      normal_price: normalPrice,
      wholesale_price: wholesaleConfig?.wholesale_price ?? null,
      min_qty: wholesaleConfig?.min_qty ?? null,
      final_unit_price: normalPrice,
      pricing_type: "NORMAL",
      wholesale_saving: 0,
    };
  }

  // Gunakan harga grosir
  const wholesaleSaving = normalPrice - wholesaleConfig.wholesale_price;
  return {
    normal_price: normalPrice,
    wholesale_price: wholesaleConfig.wholesale_price,
    min_qty: wholesaleConfig.min_qty,
    final_unit_price: wholesaleConfig.wholesale_price,
    pricing_type: "WHOLESALE",
    wholesale_saving: wholesaleSaving,
  };
}

/**
 * Hitung subtotal (quantity * unit_price).
 */
export function calculateSubtotal(
  unitPrice: number,
  quantity: number,
): number {
  return Math.round(unitPrice * quantity);
}
