import { useFocusEffect, useRouter } from "expo-router";
import {
    AlertTriangle,
    Layers,
    Package,
    Pencil,
    Plus,
    Search,
    Tag,
    Trash2,
    X,
} from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
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
import {
    deleteProduct,
    formatDiscountLabel,
    getAllCategories,
    getAllProducts,
    initDatabase,
    type Category,
    type ProductWithCategory,
} from "@/lib/database";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const LOW_STOCK_THRESHOLD = 10;

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
  icon: Icon,
}: {
  label: string;
  value: string;
  color: string;
  bg: string;
  icon: any;
}) {
  return (
    <View style={styles.statPill}>
      <View style={[styles.statDot, { backgroundColor: bg }]}>
        <Icon color={color} size={18} strokeWidth={2.5} />
      </View>
      <View style={styles.statPillText}>
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

function ProductRow({
  item,
  onEdit,
  onDelete,
}: {
  item: ProductWithCategory;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isLowStock = item.stock <= LOW_STOCK_THRESHOLD;
  const hasImage = !!item.image_uri;

  return (
    <View style={styles.productRow}>
      <View style={styles.productImageWrapper}>
        {hasImage ? (
          <Image
            source={{ uri: item.image_uri! }}
            style={styles.productImage}
          />
        ) : (
          <View style={[styles.productImage, styles.productImagePlaceholder]}>
            <Package color="#9CA3AF" size={20} />
          </View>
        )}
        {item.category_icon && (
          <View style={styles.categoryDot}>
            <Text style={styles.categoryDotText}>{item.category_icon}</Text>
          </View>
        )}
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.productName} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.productMeta}>
          {item.category_name ?? "Tanpa kategori"} · {item.unit}
        </Text>
        {item.barcode && (
          <Text style={styles.productBarcode}>{item.barcode}</Text>
        )}
        {item.discount_id != null &&
          item.discount_type &&
          item.discount_value != null && (
            <View style={styles.discountBadge}>
              <Tag color="#FFFFFF" size={10} />
              <Text style={styles.discountBadgeText}>
                {formatDiscountLabel(item.discount_type, item.discount_value)}
              </Text>
            </View>
          )}
      </View>

      <View style={styles.productRight}>
        <Text style={styles.productPrice}>{formatRupiah(item.sell_price)}</Text>
        <View
          style={[
            styles.stockBadge,
            { backgroundColor: isLowStock ? "#FEF2F2" : "#E8F0FE" },
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

      <View style={styles.productActions}>
        <Pressable style={styles.actionBtn} onPress={onEdit}>
          <Pencil color={Colors.primary} size={14} />
        </Pressable>
        <Pressable style={styles.actionBtn} onPress={onDelete}>
          <Trash2 color="#DC2626" size={14} />
        </Pressable>
      </View>
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconCircle}>
        <Package color="#9CA3AF" size={28} />
      </View>
      <Text style={styles.emptyTitle}>Belum ada produk</Text>
      <Text style={styles.emptySubtitle}>
        Tekan tombol + untuk menambah produk baru
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

  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("Semua");

  const loadData = useCallback(async () => {
    try {
      await initDatabase();
      const [prods, cats] = await Promise.all([
        getAllProducts(),
        getAllCategories(),
      ]);
      setProducts(prods);
      setCategories(cats);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const categoryNames = useMemo(
    () => ["Semua", ...categories.map((c) => c.name)],
    [categories],
  );

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory =
        activeCategory === "Semua" || p.category_name === activeCategory;
      const matchesQuery = p.name
        .toLowerCase()
        .includes(query.trim().toLowerCase());
      return matchesCategory && matchesQuery;
    });
  }, [query, activeCategory, products]);

  const lowStockCount = useMemo(
    () => products.filter((p) => p.stock <= LOW_STOCK_THRESHOLD).length,
    [products],
  );

  const handleDelete = (item: ProductWithCategory) => {
    Alert.alert("Hapus Produk", `Yakin ingin menghapus "${item.name}"?`, [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteProduct(item.id);
            loadData();
          } catch (e: any) {
            Alert.alert("Gagal", e?.message ?? "Terjadi kesalahan");
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <FlatList
        data={filteredProducts}
        keyExtractor={(item) => String(item.id)}
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
                  {products.length} produk terdaftar
                </Text>
              </View>
              <Pressable
                style={styles.addButton}
                onPress={() => router.push("/tambah-produk")}
              >
                <Plus color="#FFFFFF" size={18} />
                <Text style={styles.addButtonText}>Tambah</Text>
              </Pressable>
            </View>

            {/* Stat pills */}
            <View style={styles.statRow}>
              <StatPill
                icon={Package}
                label="Total Produk"
                value={String(products.length)}
                color={Colors.primary}
                bg="#E8F0FE"
              />
              <StatPill
                icon={AlertTriangle}
                label="Stok Menipis"
                value={String(lowStockCount)}
                color="#DC2626"
                bg="#FEF2F2"
              />
              <StatPill
                icon={Layers}
                label="Kategori"
                value={String(categories.length)}
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
              data={categoryNames}
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
            onEdit={() => router.push(`/edit-produk/${item.id}` as any)}
            onDelete={() => handleDelete(item)}
          />
        )}
        ListEmptyComponent={<EmptyState />}
      />

      {/* Floating add button */}
      <Pressable
        style={[styles.fab, { bottom: insets.bottom + 90 }]}
        onPress={() => router.push("/tambah-produk")}
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
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
    backgroundColor: Colors.secondary,
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
    width: 40,
    height: 40,
    borderRadius: 12,
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
    color: "#271111",
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
    backgroundColor: Colors.secondary,
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
  productImageWrapper: {
    width: 48,
    height: 48,
    position: "relative",
  },
  productImage: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  productImagePlaceholder: {
    alignItems: "center",
    justifyContent: "center",
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
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  categoryDotText: {
    fontSize: 10,
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
  productBarcode: {
    fontSize: 10,
    color: "#D1D5DB",
    marginTop: 1,
  },
  discountBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#16A34A",
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
    gap: 4,
    marginTop: 4,
  },
  discountBadgeText: {
    color: "#FFFFFF",
    fontSize: 9.5,
    fontWeight: "700",
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
  productActions: {
    flexDirection: "column",
    gap: 6,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
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
    backgroundColor: Colors.secondary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
});
