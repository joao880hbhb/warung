import { useRouter } from "expo-router";
import {
  Check,
  ChevronRight,
  Minus,
  Package,
  Plus,
  Search,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react-native";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";

// ---------------------------------------------------------------------------
// Data mock — ganti dengan data asli dari state/API kamu
// ---------------------------------------------------------------------------

const CATEGORIES = [
  "Semua",
  "Makanan",
  "Minuman",
  "Snack",
  "Kebutuhan Rumah",
  "Lainnya",
];

// Warna per kategori — dipakai untuk dot badge di foto produk & aksen kecil,
// senada dengan pola yang dipakai di halaman Kelola Produk.
const CATEGORY_COLORS: Record<string, { color: string; bg: string }> = {
  Makanan: { color: "#D97706", bg: "#FFFBEB" },
  Minuman: { color: "#2563EB", bg: "#EFF6FF" },
  Snack: { color: "#DB2777", bg: "#FDF2F8" },
  "Kebutuhan Rumah": { color: "#7C3AED", bg: "#F5F3FF" },
  Lainnya: { color: "#6B7280", bg: "#F3F4F6" },
};

type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  image: string;
};

const dummyPhoto = (seed: string) =>
  `https://picsum.photos/seed/${seed}/200/200`;

const PRODUCTS: Product[] = [
  {
    id: "1",
    name: "Indomie Goreng",
    category: "Makanan",
    price: 3500,
    image: dummyPhoto("indomie-goreng"),
  },
  {
    id: "2",
    name: "Teh Botol Sosro",
    category: "Minuman",
    price: 5000,
    image: dummyPhoto("teh-botol-sosro"),
  },
  {
    id: "3",
    name: "Chitato Sapi Panggang",
    category: "Snack",
    price: 11000,
    image: dummyPhoto("chitato-sapi"),
  },
  {
    id: "4",
    name: "Beras Rojolele 5kg",
    category: "Kebutuhan Rumah",
    price: 68000,
    image: dummyPhoto("beras-rojolele"),
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRupiah(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

type CartItem = {
  product: Product;
  qty: number;
};

// ---------------------------------------------------------------------------
// Sub components
// ---------------------------------------------------------------------------

function StatPill({
  label,
  value,
  color,
  bg,
  icon,
}: {
  label: string;
  value: string;
  color: string;
  bg: string;
  icon: React.ReactNode;
}) {
  return (
    <View style={styles.statPill}>
      <View style={[styles.statDot, { backgroundColor: bg }]}>{icon}</View>
      <View>
        <Text style={styles.statPillValue}>{value}</Text>
        <Text style={styles.statPillLabel}>{label}</Text>
      </View>
    </View>
  );
}

function CategoryChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.categoryChip, active && styles.categoryChipActive]}
    >
      <Text
        style={[
          styles.categoryChipText,
          active && styles.categoryChipTextActive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ProductCard({
  item,
  qty,
  onAdd,
  onRemove,
}: {
  item: Product;
  qty: number;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const cat = CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS.Lainnya;
  const inCart = qty > 0;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.productCard,
        inCart && { borderColor: Colors.primary, borderWidth: 1.5 },
        pressed && { opacity: 0.85 },
      ]}
      onPress={onAdd}
    >
      <View style={styles.productImageWrapper}>
        <Image source={{ uri: item.image }} style={styles.productImage} />
        <View style={[styles.categoryDot, { backgroundColor: cat.color }]}>
          <Package color="#FFFFFF" size={9} />
        </View>
        {inCart && (
          <View style={styles.cardQtyBadge}>
            <Text style={styles.cardQtyBadgeText}>{qty}</Text>
          </View>
        )}
      </View>

      <Text style={styles.productName} numberOfLines={2}>
        {item.name}
      </Text>
      <Text style={[styles.categoryLabel, { color: cat.color }]}>
        {item.category}
      </Text>
      <Text style={styles.productPrice}>{formatRupiah(item.price)}</Text>

      {qty > 0 ? (
        <View style={styles.qtyStepper}>
          <Pressable
            style={({ pressed }) => [
              styles.qtyBtn,
              pressed && { opacity: 0.7 },
            ]}
            onPress={onRemove}
            hitSlop={6}
          >
            <Minus color={Colors.primary} size={14} />
          </Pressable>
          <Text style={styles.qtyText}>{qty}</Text>
          <Pressable
            style={({ pressed }) => [
              styles.qtyBtn,
              pressed && { opacity: 0.7 },
            ]}
            onPress={onAdd}
            hitSlop={6}
          >
            <Plus color={Colors.primary} size={14} />
          </Pressable>
        </View>
      ) : (
        <View style={styles.addCircle}>
          <Plus color="#FFFFFF" size={16} />
        </View>
      )}
    </Pressable>
  );
}

function CartRow({
  item,
  onAdd,
  onRemove,
  onDelete,
}: {
  item: CartItem;
  onAdd: () => void;
  onRemove: () => void;
  onDelete: () => void;
}) {
  const total = item.product.price * item.qty;
  const cat = CATEGORY_COLORS[item.product.category] ?? CATEGORY_COLORS.Lainnya;

  return (
    <View style={styles.cartRow}>
      <View style={styles.cartRowImageWrapper}>
        <Image
          source={{ uri: item.product.image }}
          style={styles.cartRowImage}
        />
        <View
          style={[styles.cartCategoryDot, { backgroundColor: cat.color }]}
        />
      </View>

      <View style={styles.cartRowInfo}>
        <Text style={styles.cartRowName} numberOfLines={1}>
          {item.product.name}
        </Text>
        <Text style={styles.cartRowPrice}>
          {formatRupiah(item.product.price)} × {item.qty}
        </Text>
      </View>

      <View style={styles.cartRowStepper}>
        <Pressable
          style={({ pressed }) => [
            styles.cartQtyBtn,
            pressed && { opacity: 0.7 },
          ]}
          onPress={onRemove}
          hitSlop={6}
        >
          <Minus color={Colors.primary} size={12} />
        </Pressable>
        <Text style={styles.cartRowQty}>{item.qty}</Text>
        <Pressable
          style={({ pressed }) => [
            styles.cartQtyBtn,
            pressed && { opacity: 0.7 },
          ]}
          onPress={onAdd}
          hitSlop={6}
        >
          <Plus color={Colors.primary} size={12} />
        </Pressable>
      </View>

      <Text style={styles.cartRowTotal}>{formatRupiah(total)}</Text>

      <Pressable
        onPress={onDelete}
        hitSlop={8}
        style={({ pressed }) => [
          styles.cartDeleteBtn,
          pressed && { opacity: 0.7 },
        ]}
      >
        <Trash2 color="#DC2626" size={14} />
      </Pressable>
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconCircle}>
        <Search color="#9CA3AF" size={28} />
      </View>
      <Text style={styles.emptyTitle}>Produk tidak ditemukan</Text>
      <Text style={styles.emptySubtitle}>
        Coba ubah kata kunci atau kategori pencarian kamu
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

const TAB_BAR_HEIGHT = 64;

export default function KasirScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Semua");
  const [cart, setCart] = useState<CartItem[]>([]);

  const filteredProducts = useMemo(() => {
    return PRODUCTS.filter((p) => {
      const matchesCategory =
        activeCategory === "Semua" || p.category === activeCategory;
      const matchesQuery = p.name
        .toLowerCase()
        .includes(query.trim().toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [query, activeCategory]);

  const cartMap = useMemo(() => {
    const map = new Map<string, number>();
    cart.forEach((c) => map.set(c.product.id, c.qty));
    return map;
  }, [cart]);

  const totalItems = useMemo(
    () => cart.reduce((sum, c) => sum + c.qty, 0),
    [cart],
  );
  const totalAmount = useMemo(
    () => cart.reduce((sum, c) => sum + c.product.price * c.qty, 0),
    [cart],
  );

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const found = prev.find((c) => c.product.id === product.id);
      if (found) {
        return prev.map((c) =>
          c.product.id === product.id ? { ...c, qty: c.qty + 1 } : c,
        );
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) =>
      prev
        .map((c) => (c.product.id === productId ? { ...c, qty: c.qty - 1 } : c))
        .filter((c) => c.qty > 0),
    );
  };

  const deleteFromCart = (productId: string) => {
    setCart((prev) => prev.filter((c) => c.product.id !== productId));
  };

  const clearCart = () => setCart([]);

  return (
    <View style={styles.screen}>
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.productRowCol}
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 16,
          paddingBottom: cart.length > 0 ? 320 : 120,
        }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Header */}
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.headerTitle}>Kasir</Text>
                <Text style={styles.headerSubtitle}>
                  Pilih produk untuk transaksi baru
                </Text>
              </View>
              <View style={styles.headerCartIcon}>
                <ShoppingBag color={Colors.primary} size={20} />
                {totalItems > 0 && (
                  <View style={styles.headerCartBadge}>
                    <Text style={styles.headerCartBadgeText}>
                      {totalItems > 99 ? "99+" : totalItems}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Stat pills */}
            <View style={styles.statRow}>
              <StatPill
                label="Produk"
                value={String(PRODUCTS.length)}
                color={Colors.primary}
                bg="#ECFDF3"
                icon={<Package color={Colors.primary} size={14} />}
              />
              <StatPill
                label="Kategori"
                value={String(CATEGORIES.length - 1)}
                color="#2563EB"
                bg="#EFF6FF"
                icon={
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: "#2563EB",
                    }}
                  />
                }
              />
              <StatPill
                label="Di Keranjang"
                value={String(totalItems)}
                color="#D97706"
                bg="#FFFBEB"
                icon={<ShoppingCart color="#D97706" size={14} />}
              />
            </View>

            {/* Search bar */}
            <View style={styles.searchBar}>
              <Search color="#9CA3AF" size={18} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Cari produk..."
                placeholderTextColor="#9CA3AF"
                style={styles.searchInput}
              />
              {query.length > 0 && (
                <Pressable onPress={() => setQuery("")} hitSlop={8}>
                  <X color="#9CA3AF" size={16} />
                </Pressable>
              )}
            </View>

            {/* Category chips */}
            <FlatList
              data={CATEGORIES}
              horizontal
              keyExtractor={(item) => item}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryList}
              renderItem={({ item }) => (
                <CategoryChip
                  label={item}
                  active={activeCategory === item}
                  onPress={() => setActiveCategory(item)}
                />
              )}
            />

            <Text style={styles.listLabel}>
              {filteredProducts.length} produk{" "}
              {activeCategory !== "Semua" ? `· ${activeCategory}` : ""}
            </Text>
          </View>
        }
        ListEmptyComponent={<EmptyState />}
        renderItem={({ item }) => (
          <ProductCard
            item={item}
            qty={cartMap.get(item.id) ?? 0}
            onAdd={() => addToCart(item)}
            onRemove={() => removeFromCart(item.id)}
          />
        )}
      />

      {/* Bottom cart bar */}
      {cart.length > 0 && (
        <View
          style={[
            styles.cartBar,
            {
              bottom: TAB_BAR_HEIGHT + Math.max(insets.bottom, 12),
              paddingBottom: Math.max(insets.bottom - 60, 12),
            },
          ]}
        >
          <View style={styles.cartBarHandle} />

          <View style={styles.cartBarHeader}>
            <View style={styles.cartBarTitleRow}>
              <View style={styles.cartBarIconCircle}>
                <ShoppingCart color={Colors.primary} size={15} />
              </View>
              <Text style={styles.cartBarTitle}>
                Keranjang · {totalItems} item
              </Text>
            </View>
            <Pressable
              onPress={clearCart}
              hitSlop={8}
              style={({ pressed }) => [
                styles.cartBarClearBtn,
                pressed && { opacity: 0.7 },
              ]}
            >
              <Trash2 color="#DC2626" size={13} />
              <Text style={styles.cartBarClearText}>Kosongkan</Text>
            </Pressable>
          </View>

          <FlatList
            data={cart}
            keyExtractor={(c) => c.product.id}
            showsVerticalScrollIndicator={false}
            style={styles.cartList}
            ItemSeparatorComponent={() => <View style={styles.cartSeparator} />}
            renderItem={({ item }) => (
              <CartRow
                item={item}
                onAdd={() => addToCart(item.product)}
                onRemove={() => removeFromCart(item.product.id)}
                onDelete={() => deleteFromCart(item.product.id)}
              />
            )}
          />

          <View style={styles.cartBarFooter}>
            <View>
              <Text style={styles.cartTotalLabel}>Total Bayar</Text>
              <Text style={styles.cartTotalValue}>
                {formatRupiah(totalAmount)}
              </Text>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.checkoutButton,
                pressed && { opacity: 0.85 },
              ]}
              onPress={() => router.push("/kasir/checkout" as any)}
            >
              <Check color="#FFFFFF" size={18} />
              <Text style={styles.checkoutButtonText}>Bayar</Text>
              <ChevronRight color="#FFFFFF" size={18} />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },

  // Header
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 12.5,
    color: "#9CA3AF",
    marginTop: 2,
  },
  headerCartIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#ECFDF3",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCartBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#F3F4F6",
  },
  headerCartBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
  },

  // Stat pills
  statRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  statPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 10,
    gap: 8,
  },
  statDot: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  statPillValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  statPillLabel: {
    fontSize: 9.5,
    color: "#9CA3AF",
  },

  // Search
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 8,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: "#111827",
    padding: 0,
  },

  // Category chips
  categoryList: {
    gap: 8,
    paddingBottom: 14,
  },
  categoryChip: {
    backgroundColor: Colors.white,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
  },
  categoryChipText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#6B7280",
  },
  categoryChipTextActive: {
    color: Colors.white,
  },

  listLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9CA3AF",
    marginBottom: 4,
  },

  // Product grid
  productRowCol: {
    gap: 10,
    marginBottom: 10,
  },
  productCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "transparent",
    shadowColor: "#111827",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  productImageWrapper: {
    width: "100%",
    aspectRatio: 1,
    marginBottom: 10,
  },
  productImage: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  categoryDot: {
    position: "absolute",
    bottom: -3,
    right: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.white,
  },
  cardQtyBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.white,
  },
  cardQtyBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  productName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    textAlign: "center",
    minHeight: 34,
  },
  categoryLabel: {
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  productPrice: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.primary,
    marginTop: 4,
  },
  addCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  qtyStepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  qtyBtn: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "#ECFDF3",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    minWidth: 18,
    textAlign: "center",
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    paddingHorizontal: 40,
  },

  // Bottom cart bar
  cartBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
  },
  cartBarHandle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    marginBottom: 10,
  },
  cartBarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  cartBarTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cartBarIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "#ECFDF3",
    alignItems: "center",
    justifyContent: "center",
  },
  cartBarTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  cartBarClearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  cartBarClearText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#DC2626",
  },
  cartList: {
    maxHeight: 170,
  },
  cartSeparator: {
    height: 1,
    backgroundColor: "#F3F4F6",
  },
  cartRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  cartRowImageWrapper: {
    width: 38,
    height: 38,
  },
  cartRowImage: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
  },
  cartCategoryDot: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: Colors.white,
  },
  cartRowInfo: {
    flex: 1,
  },
  cartRowName: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#111827",
  },
  cartRowPrice: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
  },
  cartRowStepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  cartQtyBtn: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: "#ECFDF3",
    alignItems: "center",
    justifyContent: "center",
  },
  cartRowQty: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
    minWidth: 14,
    textAlign: "center",
  },
  cartRowTotal: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#111827",
    minWidth: 68,
    textAlign: "right",
  },
  cartDeleteBtn: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
  },
  cartBarFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  cartTotalLabel: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  cartTotalValue: {
    fontSize: 20,
    fontWeight: "800",
    color: Colors.primary,
  },
  checkoutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  checkoutButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
});
