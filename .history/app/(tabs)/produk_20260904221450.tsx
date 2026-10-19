import { useFocusEffect, useRouter } from "expo-router";
import {
    AlertTriangle,
    Boxes,
    Layers,
    Package,
    PackageSearch,
    Plus,
    Search,
    Tag,
    Trash2,
    X,
} from "lucide-react-native";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
    Alert,
    Animated,
    Easing,
    FlatList,
    Image,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import HeaderTab from "@/components/HeaderTab";
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

const RADIUS = { sm: 10, md: 14, lg: 16, xl: 20, pill: 999 };
const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 };
const NEUTRAL = {
  bg: "#F3F4F6",
  card: "#FFFFFF",
  border: "#EEF0F3",
  text: "#111827",
  textDim: "#6B7280",
  textFaint: "#9CA3AF",
  danger: "#DC2626",
  dangerBg: "#FEF2F2",
};

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
  onPress,
  active,
}: {
  label: string;
  value: string;
  color: string;
  bg: string;
  icon: any;
  onPress?: () => void;
  active?: boolean;
}) {
  return (
    <Pressable
      disabled={!onPress}
      style={({ pressed }) => [
        styles.statPill,
        active && { borderColor: color, backgroundColor: bg },
        pressed && onPress ? { opacity: 0.85 } : null,
      ]}
      onPress={onPress}
    >
      <View
        style={[
          styles.statIconChip,
          { backgroundColor: active ? "#FFFFFF" : bg },
        ]}
      >
        <Icon color={color} size={17} strokeWidth={2.3} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.statPillValue} numberOfLines={1}>
          {value}
        </Text>
        <Text style={styles.statPillLabel} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

function CategoryChip({
  label,
  count,
  active,
  onPress,
}: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.categoryChip,
        active && styles.categoryChipActive,
        pressed && { opacity: 0.85 },
      ]}
    >
      <Text
        style={[
          styles.categoryChipText,
          active && styles.categoryChipTextActive,
        ]}
      >
        {label}
      </Text>
      <View
        style={[
          styles.categoryChipCount,
          active && styles.categoryChipCountActive,
        ]}
      >
        <Text
          style={[
            styles.categoryChipCountText,
            active && styles.categoryChipCountTextActive,
          ]}
        >
          {count}
        </Text>
      </View>
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
    <Pressable
      onPress={onEdit}
      style={({ pressed }) => [
        styles.productRow,
        isLowStock && styles.productRowLowStock,
        pressed && { backgroundColor: "#FAFAFA" },
      ]}
    >
      <View style={styles.productImageWrapper}>
        {hasImage ? (
          <Image
            source={{ uri: item.image_uri! }}
            style={styles.productImage}
          />
        ) : (
          <View style={[styles.productImage, styles.productImagePlaceholder]}>
            <Package color="#B0B6BF" size={20} />
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
        <Text style={styles.productMeta} numberOfLines={1}>
          {item.category_name ?? "Tanpa kategori"} · {item.unit}
        </Text>

        <View style={styles.productTagRow}>
          {item.barcode && (
            <Text style={styles.productBarcode} numberOfLines={1}>
              {item.barcode}
            </Text>
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
      </View>

      <View style={styles.productRight}>
        <Text style={styles.productPrice}>{formatRupiah(item.sell_price)}</Text>
        <View
          style={[
            styles.stockBadge,
            { backgroundColor: isLowStock ? NEUTRAL.dangerBg : "#E8F0FE" },
          ]}
        >
          {isLowStock && <AlertTriangle color={NEUTRAL.danger} size={11} />}
          <Text
            style={[
              styles.stockBadgeText,
              { color: isLowStock ? NEUTRAL.danger : Colors.primary },
            ]}
          >
            {item.stock} stok
          </Text>
        </View>
      </View>

      <Pressable
        style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.6 }]}
        onPress={onDelete}
        hitSlop={8}
        accessibilityLabel={`Hapus ${item.name}`}
      >
        <Trash2 color={NEUTRAL.danger} size={15} />
      </Pressable>
    </Pressable>
  );
}

function SkeletonRow() {
  const pulse = useRef(new Animated.Value(0.4)).current;

  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View style={[styles.skeletonRow, { opacity: pulse }]}>
      <View style={styles.skeletonThumb} />
      <View style={{ flex: 1, gap: 8 }}>
        <View style={[styles.skeletonBar, { width: "55%" }]} />
        <View style={[styles.skeletonBar, { width: "35%", height: 8 }]} />
      </View>
      <View style={[styles.skeletonBar, { width: 60, height: 10 }]} />
    </Animated.View>
  );
}

function EmptyState({
  isFiltering,
  onReset,
  onAdd,
}: {
  isFiltering: boolean;
  onReset: () => void;
  onAdd: () => void;
}) {
  if (isFiltering) {
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconCircle}>
          <PackageSearch color="#B0B6BF" size={26} />
        </View>
        <Text style={styles.emptyTitle}>Tidak ada yang cocok</Text>
        <Text style={styles.emptySubtitle}>
          Coba kata kunci lain atau ubah filter yang aktif
        </Text>
        <Pressable style={styles.emptyResetBtn} onPress={onReset}>
          <Text style={styles.emptyResetText}>Hapus semua filter</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconCircle}>
        <Package color="#B0B6BF" size={26} />
      </View>
      <Text style={styles.emptyTitle}>Belum ada produk</Text>
      <Text style={styles.emptySubtitle}>
        Produk yang kamu tambahkan akan muncul di sini
      </Text>
      <Pressable style={styles.emptyResetBtn} onPress={onAdd}>
        <Plus color={Colors.primary} size={14} />
        <Text style={styles.emptyResetText}>Tambah produk pertama</Text>
      </Pressable>
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
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeCategory, setActiveCategory] = useState("Semua");
  const loadData = useCallback(async (opts?: { silent?: boolean }) => {
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
      if (!opts?.silent) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData({ silent: true });
  }, [loadData]);

  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    map.set("Semua", products.length);
    for (const c of categories) {
      map.set(
        c.name,
        products.filter((p) => p.category_name === c.name).length,
      );
    }
    return map;
  }, [products, categories]);

  const categoryNames = useMemo(
    () => ["Semua", ...categories.map((c) => c.name)],
    [categories],
  );

  const lowStockCount = useMemo(
    () => products.filter((p) => p.stock <= LOW_STOCK_THRESHOLD).length,
    [products],
  );

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      const matchesCategory =
        activeCategory === "Semua" || p.category_name === activeCategory;
      const matchesQuery = !q || p.name.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [query, activeCategory, products]);

  const isFiltering = query.trim().length > 0 || activeCategory !== "Semua";

  const resetFilters = useCallback(() => {
    setQuery("");
    setActiveCategory("Semua");
  }, []);

  const goToAdd = useCallback(() => router.push("/tambah-produk"), [router]);

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
        <View style={{ paddingHorizontal: 16 }}>
          <HeaderTab
            title="Kelola Produk"
            subtitle="Memuat produk..."
            topInset={0}
          />
          <View style={{ gap: 10, marginTop: 20 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </View>
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
          paddingHorizontal: 16,
          paddingBottom: 120,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
          />
        }
        ListHeaderComponent={
          <View>
            <HeaderTab
              title="Kelola Produk"
              subtitle={`${products.length} produk terdaftar`}
              topInset={insets.top}
            />

            {/* Stat pills */}
            <View style={styles.statRow}>
              <StatPill
                icon={Boxes}
                label="Total Produk"
                value={String(products.length)}
                color={Colors.primary}
                bg="#E8F0FE"
              />
              <StatPill
                icon={AlertTriangle}
                label="Stok Menipis"
                value={String(lowStockCount)}
                color={NEUTRAL.danger}
                bg={NEUTRAL.dangerBg}
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
            <View
              style={[
                styles.searchBar,
                searchFocused && styles.searchBarFocused,
              ]}
            >
              <Search
                color={searchFocused ? Colors.primary : "#9CA3AF"}
                size={18}
              />
              <TextInput
                value={query}
                onChangeText={setQuery}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                placeholder="Cari nama produk..."
                placeholderTextColor="#9CA3AF"
                style={styles.searchInput}
                returnKeyType="search"
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
                  count={categoryCounts.get(item) ?? 0}
                  active={activeCategory === item}
                  onPress={() =>
                    setActiveCategory((prev) =>
                      prev === item ? "Semua" : item,
                    )
                  }
                />
              )}
            />

            <View style={styles.listLabelRow}>
              <Text style={styles.listLabel}>
                {filteredProducts.length} produk ditemukan
              </Text>
              {isFiltering && (
                <Pressable onPress={resetFilters} hitSlop={6}>
                  <Text style={styles.listLabelReset}>Reset</Text>
                </Pressable>
              )}
            </View>
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
        ListEmptyComponent={
          <EmptyState
            isFiltering={isFiltering}
            onReset={resetFilters}
            onAdd={goToAdd}
          />
        }
      />

      {/* Floating add button */}
      <Pressable
        style={({ pressed }) => [
          styles.fab,
          { bottom: Math.max(insets.bottom + 12, 80) },
          pressed && { transform: [{ scale: 0.94 }] },
        ]}
        onPress={goToAdd}
        accessibilityLabel="Tambah produk baru"
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
    backgroundColor: NEUTRAL.bg,
  },

  // Stat pills
  statRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: SPACE.lg,
    marginTop: SPACE.sm,
  },
  statPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: NEUTRAL.card,
    borderRadius: RADIUS.lg,
    padding: 10,
    gap: 8,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  statIconChip: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  statPillValue: {
    fontSize: 15,
    fontWeight: "800",
    color: NEUTRAL.text,
  },
  statPillLabel: {
    fontSize: 10,
    color: NEUTRAL.textFaint,
    marginTop: 1,
  },

  // Search
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: NEUTRAL.card,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACE.md,
    paddingVertical: 11,
    gap: 8,
    marginBottom: SPACE.md,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  searchBarFocused: {
    borderColor: Colors.primary,
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
    paddingBottom: SPACE.md + 2,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: NEUTRAL.card,
    borderRadius: RADIUS.pill,
    paddingVertical: 7,
    paddingHorizontal: 6,
    paddingLeft: 14,
    gap: 6,
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
  categoryChipCount: {
    backgroundColor: "#F3F4F6",
    borderRadius: RADIUS.pill,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  categoryChipCountActive: {
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  categoryChipCountText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#9CA3AF",
  },
  categoryChipCountTextActive: {
    color: "#FFFFFF",
  },

  listLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACE.xs + 2,
  },
  listLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: NEUTRAL.textFaint,
  },
  listLabelReset: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primary,
  },

  // Product row
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: NEUTRAL.card,
    borderRadius: RADIUS.xl,
    padding: 12,
    gap: 12,
    borderLeftWidth: 3,
    borderLeftColor: "transparent",
  },
  productRowLowStock: {
    borderLeftColor: NEUTRAL.danger,
  },
  productImageWrapper: {
    width: 48,
    height: 48,
    position: "relative",
  },
  productImage: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
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
    borderColor: NEUTRAL.border,
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
  productTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  productBarcode: {
    fontSize: 10,
    color: "#D1D5DB",
  },
  discountBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#16A34A",
    borderRadius: RADIUS.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
    gap: 4,
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
    borderRadius: RADIUS.pill,
  },
  stockBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  deleteBtn: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.sm,
    backgroundColor: NEUTRAL.dangerBg,
    alignItems: "center",
    justifyContent: "center",
  },

  // Skeleton
  skeletonRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: NEUTRAL.card,
    borderRadius: RADIUS.xl,
    padding: 12,
    gap: 12,
  },
  skeletonThumb: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: "#E5E7EB",
  },
  skeletonBar: {
    height: 10,
    borderRadius: 4,
    backgroundColor: "#E5E7EB",
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
    marginBottom: 16,
  },
  emptyResetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F3F4F6",
    borderRadius: RADIUS.pill,
    paddingVertical: 9,
    paddingHorizontal: 16,
  },
  emptyResetText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: Colors.primary,
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
