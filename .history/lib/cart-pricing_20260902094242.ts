import {
  formatDiscountLabel,
  type Discount,
  type ProductWithCategory,
  type WholesalePrice,
} from "@/lib/database";
import {
  calculateFinalPrice,
  type PricingType,
} from "@/lib/wholesale-pricing";

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
 * Hitung harga keranjang dengan diskon aktif.
 * - Diskon diambil dari relasi discount_products (produk -> diskon aktif).
 * - Satu produk memakai satu diskon terbaik, tidak menumpuk.
 * - Diskon hanya dipakai jika subtotal keranjang sudah memenuhi minimum_purchase.
 * - Harga asli produk tidak pernah berubah; diskon tidak membuat harga negatif.
 */
export function computeCart(
  cart: CartItem[],
  discountMap: Map<number, Discount[]>,
): CartSummary {
  const subtotal = cart.reduce(
    (sum, it) => sum + it.product.sell_price * it.qty,
    0,
  );

  const lines: CartLine[] = cart.map((it) => {
    const unit_price = it.product.sell_price;
    const lineSubtotal = unit_price * it.qty;

    const linked = discountMap.get(it.product.id) ?? [];
    const eligible = linked.filter(
      (d) => d.minimum_purchase == null || subtotal >= d.minimum_purchase,
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

    return {
      product: it.product,
      qty: it.qty,
      unit_price,
      subtotal: lineSubtotal,
      discount_id,
      discount_name,
      discount_label,
      discount_amount,
      total: lineSubtotal - discount_amount,
    };
  });

  const total_discount = lines.reduce((sum, l) => sum + l.discount_amount, 0);
  const grand_total = Math.max(subtotal - total_discount, 0);

  return { lines, subtotal, total_discount, grand_total };
}