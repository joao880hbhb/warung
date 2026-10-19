import {
  formatDiscountLabel,
  type Discount,
  type ProductWithCategory,
  type WholesalePrice,
} from "@/lib/database";
import { calculateFinalPrice, type PricingType } from "@/lib/wholesale-pricing";

export type CartItem = {
  product: ProductWithCategory;
  qty: number;
};

export type CartLine = {
  product: ProductWithCategory;
  qty: number;
  normal_price: number;
  wholesale_price: number | null;
  wholesale_min_qty: number | null;
  pricing_type: PricingType;
  unit_price: number;
  subtotal: number;
  discount_id: number | null;
  discount_name: string | null;
  discount_label: string | null;
  discount_amount: number;
  total: number;
};

export type CartSummary = {
  lines: CartLine[];
  subtotal: number;
  total_discount: number;
  grand_total: number;
};

/** Pilih satu diskon paling menguntungkan (tanpa menumpuk). */
function pickBestDiscount(
  discounts: Discount[],
  lineSubtotal: number,
): Discount | null {
  if (discounts.length === 0) return null;
  let best: Discount | null = null;
  let bestAmount = -1;
  for (const d of discounts) {
    const raw =
      d.type === "percent"
        ? Math.round((lineSubtotal * d.value) / 100)
        : Math.round(d.value);
    const amount = Math.min(raw, lineSubtotal);
    if (amount > bestAmount) {
      bestAmount = amount;
      best = d;
    }
  }
  return best;
}

/**
 * Hitung harga keranjang dengan harga grosir dan diskon aktif.
 * - Harga grosir ditentukan oleh quantity dan konfigurasi wholesale_prices.
 * - Diskon diambil dari relasi discount_products (produk -> diskon aktif).
 * - Satu produk memakai satu diskon terbaik, tidak menumpuk.
 * - Aturan: tentukan harga normal/grosir dulu, baru hitung diskon.
 */
export function computeCart(
  cart: CartItem[],
  discountMap: Map<number, Discount[]>,
  wholesalePricesMap: Map<number, WholesalePrice>,
): CartSummary {
  // Hitung subtotal dengan harga akhir (grosir/normal sesuai qty)
  let totalSubtotal = 0;
  const lines: CartLine[] = [];

  for (const it of cart) {
    const productId = it.product.id;
    const normalPrice = it.product.sell_price;
    const quantity = it.qty;

    // Tentukan harga: normal atau grosir
    const wholesaleConfig = wholesalePricesMap.get(productId);
    const pricingResult = calculateFinalPrice(
      normalPrice,
      quantity,
      wholesaleConfig,
    );

    const unitPrice = pricingResult.final_unit_price;
    const lineSubtotal = Math.round(unitPrice * quantity);
    totalSubtotal += lineSubtotal;

    // Tentukan diskon terbaik (minimum_purchase diukur dari total keranjang)
    const linked = discountMap.get(productId) ?? [];
    const eligible = linked.filter(
      (d) => d.minimum_purchase == null || totalSubtotal >= d.minimum_purchase,
    );
    const best = pickBestDiscount(eligible, lineSubtotal);

    let discount_amount = 0;
    let discount_id: number | null = null;
    let discount_name: string | null = null;
    let discount_label: string | null = null;

    if (best) {
      const raw =
        best.type === "percent"
          ? Math.round((lineSubtotal * best.value) / 100)
          : Math.round(best.value);
      discount_amount = Math.min(raw, lineSubtotal);
      discount_id = best.id;
      discount_name = best.name;
      discount_label = formatDiscountLabel(best.type, best.value);
    }

    lines.push({
      product: it.product,
      qty: quantity,
      normal_price: pricingResult.normal_price,
      wholesale_price: pricingResult.wholesale_price,
      wholesale_min_qty: pricingResult.min_qty,
      pricing_type: pricingResult.pricing_type,
      unit_price: unitPrice,
      subtotal: lineSubtotal,
      discount_id,
      discount_name,
      discount_label,
      discount_amount,
      total: lineSubtotal - discount_amount,
    });
  }

  const subtotal = totalSubtotal;
  const total_discount = lines.reduce((sum, l) => sum + l.discount_amount, 0);
  const grand_total = Math.max(subtotal - total_discount, 0);

  return { lines, subtotal, total_discount, grand_total };
}
