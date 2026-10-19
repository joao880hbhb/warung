import { useRouter } from "expo-router";
import {
  AlertTriangle,
  ChevronRight,
  Package,
  Plus,
  Search,
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

const LOW_STOCK_THRESHOLD = 5;

const CATEGORIES = [
  "Semua",
  "Makanan",
  "Minuman",
  "Snack",
  "Kebutuhan Rumah",
  "Lainnya",
];

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
  sku: string;
  price: number;
  stock: number;
  image: string;
};

// Foto dummy — pakai picsum.photos dengan seed unik per produk supaya
// tiap item dapat foto berbeda tapi konsisten (tidak berubah tiap reload).
// Nanti tinggal ganti field `image` ini dengan URL foto asli produk kamu.
const dummyPhoto = (seed: string) =>
  `https://picsum.photos/seed/${seed}/200/200`;

const PRODUCTS: Product[] = [
  {
    id: "1",
    name: "Indomie Goreng",
    category: "Makanan",
    sku: "SKU-001",
    price: 3500,
    stock: 42,
    image: dummyPhoto("indomie-goreng"),
  },
  {
    id: "2",
    name: "Teh Botol Sosro",
    category: "Minuman",
    sku: "SKU-002",
    price: 5000,
    stock: 3,
    image: dummyPhoto("teh-botol-sosro"),
  },
  {
    id: "3",
    name: "Chitato Sapi Panggang",
    category: "Snack",
    sku: "SKU-003",
    price: 11000,
    stock: 18,
    image: dummyPhoto("chitato-sapi"),
  },
  {
    id: "4",
    name: "Beras Rojolele 5kg",
    category: "Kebutuhan Rumah",
    sku: "SKU-004",
    price: 68000,
    stock: 7,
    image: dummyPhoto("beras-rojolele"),
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRupiah(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

// ---------------------------------------------------------------------------
// Sub components
// ---------------------------------------------------------------------------

function StatPill({
  label,
  value,
  color,
  bg,
}: {
  label: string;
  value: string;
  color: string;
  bg: string;
}) {
  return (
    <View style={styles.statPill}>
      <View style={[styles.statDot, { backgroundColor: bg }]}>
        <View style={[styles.statDotInner, { backgroundColor: color }]} />
      </View>
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

function ProductRow({ item, onPress }: { item: Product; onPress: () => void }) {
  const cat = CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS.Lainnya;
  const isLowStock = item.stock <= LOW_STOCK_THRESHOLD;

  return (
    <Pressable style={styles.productRow} onPress={onPress}>
      <View style={styles.productImageWrapper}>
        <Image source={{ uri: item.image }} style={styles.productImage} />
        <View style={[styles.categoryDot, { backgroundColor: cat.color }]}>
          <Package color="#FFFFFF" size={9} />
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.productName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.productMeta}>
          {item.category} · {item.sku}
        </Text>
      </View>

      <View style={styles.productRight}>
        <Text style={styles.productPrice}>{formatRupiah(item.price)}</Text>
        <View
          style={[
            styles.stockBadge,
            { backgroundColor: isLowStock ? "#FEF2F2" : "#ECFDF3" },
          ]}
        >
          {isLowStock && <AlertTriangle color="#DC2626" size={11} />}
          <Text
            style={[
              styles.stockBadgeText,
              { color: isLowStock ? "#DC2626" : Colors.primary },
            ]}
          >
            {item.stock} stok
          </Text>
        </View>
      </View>

      <ChevronRight color="#D1D5DB" size={18} />
    </Pressable>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconCircle}>
        <Package color="#9CA3AF" size={28} />
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

export default function ProdukScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Semua");

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

  const lowStockCount = useMemo(
    () => PRODUCTS.filter((p) => p.stock <= LOW_STOCK_THRESHOLD).length,
    [],
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          paddingHorizontal: 16,
          paddingBottom: 120,
        }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Header */}
            <View style={styles.headerRow}>
              <View>
                <Text style={styles.headerTitle}>Kelola Produk</Text>
                <Text style={styles.headerSubtitle}>
                  {PRODUCTS.length} produk terdaftar
                </Text>
              </View>
              <Pressable
                style={styles.addButton}
                onPress={() => router.push("/produk/tambah" as any)}
              >
                <Plus color="#FFFFFF" size={18} />
                <Text style={styles.addButtonText}>Tambah</Text>
              </Pressable>
            </View>

            {/* Stat pills */}
            <View style={styles.statRow}>
              <StatPill
                label="Total Produk"
                value={String(PRODUCTS.length)}
                color={Colors.primary}
                bg="#ECFDF3"
              />
              <StatPill
                label="Stok Menipis"
                value={String(lowStockCount)}
                color="#DC2626"
                bg="#FEF2F2"
              />
              <StatPill
                label="Kategori"
                value={String(CATEGORIES.length - 1)}
                color="#2563EB"
                bg="#EFF6FF"
              />
            </View>

            {/* Search bar */}
            <View style={styles.searchBar}>
              <Search color="#9CA3AF" size={18} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Cari nama produk..."
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
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <ProductRow
            item={item}
            onPress={() => router.push(`/produk/${item.id}` as any)}
          />
        )}
        ListEmptyComponent={<EmptyState />}
      />

      {/* Floating add button */}
      <Pressable
        style={[styles.fab, { bottom: insets.bottom + 90 }]}
        onPress={() => router.push("/produk/tambah" as any)}
      >
        <Plus color="#FFFFFF" size={26} />
      </Pressable>
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
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 14,
    gap: 6,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
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
    backgroundColor: "#FFFFFF",
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
  statDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
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
    backgroundColor: "#FFFFFF",
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
    backgroundColor: "#FFFFFF",
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
    color: "#FFFFFF",
  },

  listLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#9CA3AF",
    marginBottom: 4,
  },

  // Product row
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 12,
    gap: 12,
  },
  productIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  productImageWrapper: {
    width: 48,
    height: 48,
  },
  productImage: {
    width: 48,
    height: 48,
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
    borderColor: "#FFFFFF",
  },
  productName: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#111827",
  },
  productMeta: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
  },
  productRight: {
    alignItems: "flex-end",
    gap: 5,
  },
  productPrice: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  stockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  stockBadgeText: {
    fontSize: 10,
    fontWeight: "700",
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

  // FAB
  fab: {
    position: "absolute",
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
});
