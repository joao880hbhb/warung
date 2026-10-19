import { useRouter } from "expo-router";
import {
  Check,
  ChevronRight,
  Minus,
  Plus,
  Search,
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
  { id: "1", name: "Indomie Goreng", category: "Makanan", price: 3500, image: dummyPhoto("indomie-goreng") },
  { id: "2", name: "Teh Botol Sosro", category: "Minuman", price: 5000, image: dummyPhoto("teh-botol-sosro") },
  { id: "3", name: "Chitato Sapi Panggang", category: "Snack", price: 11000, image: dummyPhoto("chitato-sapi") },
  { id: "4", name: "Beras Rojolele 5kg", category: "Kebutuhan Rumah", price: 68000, image: dummyPhoto("beras-rojolele") },
  { id: "5", name: "Aqua Botol 600ml", category: "Minuman", price: 4000, image: dummyPhoto("aqua-botol") },
  { id: "6", name: "Sabun Cuci Piring", category: "Kebutuhan Rumah", price: 9500, image: dummyPhoto("sabun-cuci-piring") },
  { id: "7", name: "Roti Tawar Sari Roti", category: "Makanan", price: 14000, image: dummyPhoto("roti-tawar") },
  { id: "8", name: "Kopi Kapal Api Sachet", category: "Minuman", price: 1500, image: dummyPhoto("kopi-kapal-api") },
  { id: "9", name: "Oreo Original", category: "Snack", price: 8500, image: dummyPhoto("oreo-original") },
  { id: "10", name: "Baterai ABC AA", category: "Lainnya", price: 6000, image: dummyPhoto("baterai-abc") },
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
  return (
    <Pressable style={styles.productCard} onPress={onAdd}>
      <Image source={{ uri: item.image }} style={styles.productImage} />
      <Text style={styles.productName} numberOfLines={2}>
        {item.name}
      </Text>
      <Text style={styles.productPrice}>{formatRupiah(item.price)}</Text>
      {qty > 0 ? (
        <View style={styles.qtyStepper}>
          <Pressable
            style={styles.qtyBtn}
            onPress={onRemove}
            hitSlop={6}
          >
            <Minus color={Colors.primary} size={14} />
          </Pressable>
          <Text style={styles.qtyText}>{qty}</Text>
          <Pressable style={styles.qtyBtn} onPress={onAdd} hitSlop={6}>
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
  return (
    <View style={styles.cartRow}>
      <Image source={{ uri: item.product.image }} style={styles.cartRowImage} />
      <View style={styles.cartRowInfo}>
        <Text style={styles.cartRowName} numberOfLines={1}>
          {item.product.name}
        </Text>
        <Text style={styles.cartRowPrice}>
          {formatRupiah(item.product.price)} × {item.qty}
        </Text>
      </View>
      <Text style={styles.cartRowTotal}>{formatRupiah(total)}</Text>
      <Pressable onPress={onDelete} hitSlop={8}>
        <Trash2 color="#DC2626" size={16} />
      </Pressable>
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
        .map((c) =>
          c.product.id === productId ? { ...c, qty: c.qty - 1 } : c,
        )
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
          paddingBottom: cart.length > 0 ? 300 : 120,
        }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Header */}
            <Text style={styles.headerTitle}>Kasir</Text>
            <Text style={styles.headerSubtitle}>
              Pilih produk untuk transaksi baru
            </Text>

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
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Search color="#9CA3AF" size={28} />
            <Text style={styles.emptyText}>Produk tidak ditemukan</Text>
          </View>
        }
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
          <View style={styles.cartBarHeader}>
            <View style={styles.cartBarTitleRow}>
              <ShoppingCart color={Colors.primary} size={16} />
              <Text style={styles.cartBarTitle}>
                Keranjang · {totalItems} item
              </Text>
            </View>
            <Pressable onPress={clearCart} hitSlop={8}>
              <Trash2 color="#DC2626" size={16} />
            </Pressable>
          </View>

          <FlatList
            data={cart}
            keyExtractor={(c) => c.product.id}
            showsVerticalScrollIndicator={false}
            style={styles.cartList}
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
              <Text style={styles.cartTotalLabel}>Total</Text>
              <Text style={styles.cartTotalValue}>
                {formatRupiah(totalAmount)}
              </Text>
            </View>
            <Pressable
              style={styles.checkoutButton}
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
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 12.5,
    color: "#9CA3AF",
    marginTop: 2,
    marginBottom: 14,
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
  },
  productImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    marginBottom: 10,
  },
  productName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    textAlign: "center",
    minHeight: 34,
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

  // Empty
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
    color: "#9CA3AF",
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
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 12,
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
    gap: 6,
  },
  cartBarTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  cartList: {
    maxHeight: 170,
  },
  cartRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  cartRowImage: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
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
  cartRowTotal: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#111827",
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
  },
  checkoutButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: "700",
  },
});
