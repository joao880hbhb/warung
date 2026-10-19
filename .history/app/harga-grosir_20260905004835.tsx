import { useFocusEffect, useRouter } from "expo-router";
import {
    ChevronLeft,
    Edit,
    Image as ImageIcon,
    Package,
    Trash2,
    X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";
import {
    deleteWholesalePrice,
    getAllProducts,
    getWholesalePriceByProductId,
    initDatabase,
    saveWholesalePrice,
    type ProductWithCategory,
    type WholesalePrice,
} from "@/lib/database";

function formatRupiah(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

function parseRupiahInput(text: string) {
  const nums = text.replace(/[^0-9]/g, "");
  if (!nums) return "";
  return parseInt(nums, 10).toLocaleString("id-ID");
}

function parseRupiah(text: string): number {
  return parseInt(text.replace(/[^0-9]/g, ""), 10) || 0;
}

// ---------------------------------------------------------------------------
// Wholesale Price Modal
// ---------------------------------------------------------------------------

function WholesalePriceModal({
  visible,
  onClose,
  onSave,
  product,
  initial,
  bottomInset,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  product?: ProductWithCategory | null;
  initial?: WholesalePrice | null;
  bottomInset: number;
}) {
  const [wholesalePriceText, setWholesalePriceText] = useState("");
  const [minQtyText, setMinQtyText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) {
      setWholesalePriceText(formatRupiah(initial.wholesale_price));
      setMinQtyText(String(initial.min_qty));
    } else {
      setWholesalePriceText("");
      setMinQtyText("");
    }
  }, [initial, visible]);

  const handleSave = async () => {
    if (!product) return;

    const wholesalePrice = parseRupiah(wholesalePriceText);
    if (wholesalePrice <= 0) {
      return Alert.alert("Peringatan", "Harga grosir wajib lebih dari 0");
    }

    if (wholesalePrice >= product.sell_price) {
      return Alert.alert(
        "Peringatan",
        "Harga grosir harus lebih kecil dari harga normal",
      );
    }

    const minQty = parseInt(minQtyText, 10);
    if (!minQty || minQty <= 0) {
      return Alert.alert("Peringatan", "Minimal qty wajib lebih dari 0");
    }

    setSaving(true);
    try {
      await saveWholesalePrice({
        product_id: product.id,
        wholesale_price: wholesalePrice,
        min_qty: minQty,
      });
      onSave();
      onClose();
    } catch (e: any) {
      Alert.alert("Gagal", e?.message ?? "Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  };

  if (!product) return null;

  const normalPrice = product.sell_price;
  const wholesalePrice = parseRupiah(wholesalePriceText);
  const priceSaving = wholesalePrice > 0 ? normalPrice - wholesalePrice : 0;
  const savingPercent =
    wholesalePrice > 0 && normalPrice > 0
      ? Math.round((priceSaving / normalPrice) * 100)
      : 0;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={modalStyles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={modalStyles.content}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.headerTitle}>Atur Harga Grosir</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <X color="#6B7280" size={22} />
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Product Info */}
            <View style={modalStyles.productCard}>
              {product.image_uri ? (
                <Image
                  source={{ uri: product.image_uri }}
                  style={modalStyles.productImage}
                />
              ) : (
                <View style={modalStyles.productImagePlaceholder}>
                  <ImageIcon color="#D1D5DB" size={32} />
                </View>
              )}
              <View style={modalStyles.productInfo}>
                <Text style={modalStyles.productName}>{product.name}</Text>
                <Text style={modalStyles.productNormalPrice}>
                  Normal: {formatRupiah(normalPrice)}
                </Text>
                <Text style={modalStyles.productUnit}>
                  Unit: {product.unit}
                </Text>
              </View>
            </View>

            {/* Harga Grosir */}
            <Text style={modalStyles.sectionLabel}>HARGA GROSIR</Text>
            <View style={modalStyles.field}>
              <Text style={modalStyles.label}>HARGA GROSIR (Rp) *</Text>
              <View style={modalStyles.prefixInput}>
                <Text style={modalStyles.prefix}>Rp</Text>
                <TextInput
                  style={modalStyles.prefixField}
                  value={wholesalePriceText}
                  onChangeText={(t) =>
                    setWholesalePriceText(parseRupiahInput(t))
                  }
                  placeholder="Contoh: 3.000"
                  placeholderTextColor="#C4C4C4"
                  keyboardType="number-pad"
                />
              </View>
              {priceSaving > 0 && (
                <Text style={modalStyles.infoText}>
                  Hemat: {formatRupiah(priceSaving)} ({savingPercent}%)
                </Text>
              )}
            </View>

            {/* Minimal Qty */}
            <View style={modalStyles.field}>
              <Text style={modalStyles.label}>
                MINIMAL QUANTITY ({product.unit}) *
              </Text>
              <View style={modalStyles.qtyInput}>
                <TextInput
                  style={modalStyles.qtyField}
                  value={minQtyText}
                  onChangeText={(t) => setMinQtyText(t.replace(/[^0-9]/g, ""))}
                  placeholder="Contoh: 5"
                  placeholderTextColor="#C4C4C4"
                  keyboardType="number-pad"
                />
                <Text style={modalStyles.qtyUnit}>{product.unit}</Text>
              </View>
            </View>

            {/* Info */}
            <View style={modalStyles.infoBox}>
              <Text style={modalStyles.infoBoxTitle}>Contoh Aplikasi:</Text>
              <Text style={modalStyles.infoBoxText}>
                Jika normal Rp{formatRupiah(normalPrice).slice(3)}, grosir Rp
                {formatRupiah(wholesalePrice).slice(3)}, minimal{" "}
                {minQtyText
                  ? `${minQtyText} ${product.unit}`
                  : `X ${product.unit}`}
                :
              </Text>
              <Text style={modalStyles.infoBoxExample}>
                • Qty 1-{minQtyText ? parseInt(minQtyText) - 1 : "X"}: Rp
                {formatRupiah(normalPrice).slice(3)}
              </Text>
              <Text style={modalStyles.infoBoxExample}>
                • Qty {minQtyText || "X"}+: Rp
                {formatRupiah(wholesalePrice).slice(3)}
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                modalStyles.saveBtn,
                pressed && modalStyles.pressed,
              ]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={modalStyles.saveBtnText}>Simpan</Text>
              )}
            </Pressable>
            <View style={{ height: 24 }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  content: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  productCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
  },
  productImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  productInfo: {
    flex: 1,
    justifyContent: "center",
  },
  productName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  productNormalPrice: {
    fontSize: 12,
    color: Colors.primary,
    marginTop: 2,
  },
  productUnit: {
    fontSize: 12,
    color: Colors.neutral,
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.neutral,
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.neutral,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  prefixInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  prefixField: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
    fontWeight: "600",
  },
  prefix: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.primary,
    marginRight: 8,
  },
  infoText: {
    fontSize: 12,
    color: "#16A34A",
    marginTop: 6,
    fontWeight: "600",
  },
  qtyInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  qtyField: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
    fontWeight: "600",
  },
  qtyUnit: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.neutral,
    marginLeft: 8,
  },
  infoBox: {
    backgroundColor: "#ECFDF5",
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#16A34A",
  },
  infoBoxTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#15803D",
    marginBottom: 6,
  },
  infoBoxText: {
    fontSize: 12,
    color: "#16A34A",
    marginBottom: 6,
  },
  infoBoxExample: {
    fontSize: 11,
    color: "#16A34A",
    marginLeft: 4,
  },
  saveBtn: {
    backgroundColor: Colors.secondary,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  pressed: {
    opacity: 0.85,
  },
  saveBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
});

// ---------------------------------------------------------------------------
// Product Card
// ---------------------------------------------------------------------------

function ProductCard({
  product,
  wholesale,
  onEdit,
  onDelete,
}: {
  product: ProductWithCategory;
  wholesale: WholesalePrice | null;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <View style={styles.productCard}>
      <View style={styles.cardHeader}>
        {product.image_uri ? (
          <Image
            source={{ uri: product.image_uri }}
            style={styles.productImage}
          />
        ) : (
          <View style={styles.productImagePlaceholder}>
            <ImageIcon color="#D1D5DB" size={24} />
          </View>
        )}
        <View style={styles.productBasicInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {product.name}
          </Text>
          <Text style={styles.productUnit}>{product.unit}</Text>
          <Text style={styles.productNormalPrice}>
            Normal: {formatRupiah(product.sell_price)}
          </Text>
        </View>
      </View>

      {wholesale ? (
        <View style={styles.wholesaleInfo}>
          <View style={styles.wholesaleBadge}>
            <Text style={styles.wholesaleBadgeText}>Grosir Aktif</Text>
          </View>
          <Text style={styles.wholesalePrice}>
            {formatRupiah(wholesale.wholesale_price)}
          </Text>
          <Text style={styles.wholesaleMinQty}>
            Min: {wholesale.min_qty} {product.unit}
          </Text>
        </View>
      ) : (
        <View style={styles.emptyWholesale}>
          <Text style={styles.emptyWholesaleText}>Belum ada harga grosir</Text>
        </View>
      )}

      <View style={styles.actions}>
        <Pressable style={[styles.actionBtn, styles.editBtn]} onPress={onEdit}>
          <Edit color="#2563EB" size={16} />
          <Text style={styles.editBtnText}>Edit</Text>
        </Pressable>
        {wholesale && (
          <Pressable
            style={[styles.actionBtn, styles.deleteBtn]}
            onPress={onDelete}
          >
            <Trash2 color="#DC2626" size={16} />
            <Text style={styles.deleteBtnText}>Hapus</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function HargaGrosirScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [wholesaleMap, setWholesaleMap] = useState<Map<number, WholesalePrice>>(
    new Map(),
  );
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] =
    useState<ProductWithCategory | null>(null);
  const [selectedWholesale, setSelectedWholesale] =
    useState<WholesalePrice | null>(null);

  const loadData = useCallback(async () => {
    try {
      await initDatabase();
      const allProducts = await getAllProducts();
      setProducts(allProducts);

      // Load wholesale prices untuk semua produk
      const map = new Map<number, WholesalePrice>();
      for (const prod of allProducts) {
        const wp = await getWholesalePriceByProductId(prod.id);
        if (wp) {
          map.set(prod.id, wp);
        }
      }
      setWholesaleMap(map);
    } catch (e) {
      console.error(e);
      Alert.alert("Gagal", "Tidak bisa memuat data");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const handleEditWholesale = (product: ProductWithCategory) => {
    setSelectedProduct(product);
    setSelectedWholesale(wholesaleMap.get(product.id) || null);
    setModalVisible(true);
  };

  const handleDeleteWholesale = (productId: number) => {
    Alert.alert(
      "Hapus Harga Grosir",
      "Produk akan kembali menggunakan harga normal. Lanjutkan?",
      [
        { text: "Batal", onPress: () => {} },
        {
          text: "Hapus",
          onPress: async () => {
            try {
              await deleteWholesalePrice(productId);
              await loadData();
            } catch (e: any) {
              Alert.alert("Gagal", e?.message ?? "Terjadi kesalahan");
            }
          },
          style: "destructive",
        },
      ],
    );
  };

  const handleSaveWholesale = async () => {
    await loadData();
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
          },
        ]}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10}>
            <ChevronLeft color={Colors.primary} size={24} />
          </Pressable>
          <Text style={styles.headerTitle}>Harga Grosir</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <ChevronLeft color={Colors.primary} size={24} />
        </Pressable>
        <Text style={styles.headerTitle}>Harga Grosir</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={products}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            wholesale={wholesaleMap.get(item.id) || null}
            onEdit={() => handleEditWholesale(item)}
            onDelete={() => handleDeleteWholesale(item.id)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Package color="#D1D5DB" size={48} />
            <Text style={styles.emptyStateText}>Tidak ada produk</Text>
          </View>
        }
      />

      <WholesalePriceModal
        visible={modalVisible}
        product={selectedProduct}
        initial={selectedWholesale}
        onClose={() => {
          setModalVisible(false);
          setSelectedProduct(null);
          setSelectedWholesale(null);
        }}
        onSave={handleSaveWholesale}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  productCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cardHeader: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  productImage: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  productImagePlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  productBasicInfo: {
    flex: 1,
    justifyContent: "center",
  },
  productName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  productUnit: {
    fontSize: 12,
    color: Colors.neutral,
    marginTop: 2,
  },
  productNormalPrice: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: "600",
    marginTop: 4,
  },
  wholesaleInfo: {
    backgroundColor: "#ECFDF5",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  wholesaleBadge: {
    backgroundColor: "#16A34A",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 6,
  },
  wholesaleBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.white,
  },
  wholesalePrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#15803D",
  },
  wholesaleMinQty: {
    fontSize: 11,
    color: "#16A34A",
    marginTop: 4,
  },
  emptyWholesale: {
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    alignItems: "center",
  },
  emptyWholesaleText: {
    fontSize: 12,
    color: Colors.neutral,
    fontWeight: "500",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  editBtn: {
    backgroundColor: "#DBEAFE",
    borderColor: "#93C5FD",
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2563EB",
  },
  deleteBtn: {
    backgroundColor: "#FEE2E2",
    borderColor: "#FECACA",
  },
  deleteBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#DC2626",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.neutral,
    marginTop: 12,
  },
});
