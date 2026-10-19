import { useFocusEffect, useRouter } from "expo-router";
import {
  Check,
  ChevronLeft,
  Eye,
  Minus,
  Package,
  Plus,
  Printer,
  Search,
  X,
} from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Rect, Svg } from "react-native-svg";

import { Colors } from "@/constants/theme";
import {
  bitsToBars,
  encodeCode128B,
} from "@/lib/code128";
import {
  getActiveDiscountsMap,
  getAllProducts,
  initDatabase,
  type Discount,
  type ProductWithCategory,
} from "@/lib/database";
import { printPriceLabel, printPriceLabels } from "@/lib/label-print";

function formatRupiah(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

/**
 * Hitung harga label: normal + final setelah diskon terbaik.
 * Basis 1 pc (qty=1): syarat minimum belanja diuji terhadap harga satuan,
 * sama seperti kasir saat beli 1 pc. Tanpa diskon yang lolos → final = normal.
 */
function getLabelPrice(
  product: ProductWithCategory,
  discountMap: Map<number, Discount[]>,
): { normal: number; final: number; discountName: string | null } {
  const normal = product.sell_price;
  const linked = discountMap.get(product.id) ?? [];
  const eligible = linked.filter(
    (d) => d.minimum_purchase == null || normal >= d.minimum_purchase,
  );
  let best: Discount | null = null;
  let bestAmount = 0;
  for (const d of eligible) {
    const raw =
      d.type === "percent"
        ? Math.round((normal * d.value) / 100)
        : Math.round(d.value);
    const amount = Math.min(raw, normal);
    if (amount > bestAmount) {
      bestAmount = amount;
      best = d;
    }
  }
  if (!best || bestAmount <= 0) {
    return { normal, final: normal, discountName: null };
  }
  return { normal, final: normal - bestAmount, discountName: best.name };
}

type PromoFilter = "semua" | "promo" | "reguler";

/** Preview barcode CODE128 sebagai SVG (hitam di atas putih). */
function BarcodePreview({
  code,
  width = 220,
  height = 72,
}: {
  code: string;
  width?: number;
  height?: number;
}) {
  let bits = "";
  try {
    bits = encodeCode128B(code);
  } catch {
    return (
      <Text style={{ fontSize: 11, color: "#DC2626" }}>
        Barcode tidak didukung
      </Text>
    );
  }
  const bars = bitsToBars(bits);
  const modules = bits.length;
  const barHeight = 50;
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${modules} ${barHeight}`}>
      <Rect x={0} y={0} width={modules} height={barHeight} fill="#FFFFFF" />
      {bars.map((b, i) => (
        <Rect
          key={i}
          x={b.x}
          y={0}
          width={b.width}
          height={barHeight}
          fill="#111111"
        />
      ))}
    </Svg>
  );
}

export default function LabelHargaScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [discountMap, setDiscountMap] = useState<Map<number, Discount[]>>(
    new Map(),
  );
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [promoFilter, setPromoFilter] = useState<PromoFilter>("semua");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [printing, setPrinting] = useState(false);

  // Preview modal: produk + mode lihat/cetak + jumlah label
  const [previewProduct, setPreviewProduct] =
    useState<ProductWithCategory | null>(null);
  const [previewMode, setPreviewMode] = useState<"view" | "print">("view");
  const [labelQty, setLabelQty] = useState(1);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        try {
          await initDatabase();
          const [list, dMap] = await Promise.all([
            getAllProducts(),
            getActiveDiscountsMap(),
          ]);
          setProducts(list);
          setDiscountMap(dMap);
        } catch {
          // biarkan kosong jika gagal
        } finally {
          setLoading(false);
        }
      })();
    }, []),
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      if (promoFilter === "promo" && p.discount_id == null) return false;
      if (promoFilter === "reguler" && p.discount_id != null) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.barcode ?? "").toLowerCase().includes(q)
      );
    });
  }, [products, query, promoFilter]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((p) => selected.has(p.id));

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((p) => p.id)));
    }
  };

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openPreview = (
    product: ProductWithCategory,
    mode: "view" | "print",
  ) => {
    setPreviewProduct(product);
    setPreviewMode(mode);
    setLabelQty(1);
  };

  const closePreview = () => {
    setPreviewProduct(null);
  };

  const getPrinterOrAlert = async () => {
    const printerService = await import("@/services/printer/PrinterService");
    if (!printerService.isPrinterConnected()) {
      Alert.alert(
        "Printer Tidak Terhubung",
        "Hubungkan printer Bluetooth terlebih dahulu di Pengaturan.",
      );
      return null;
    }
    if (printerService.isPrintingActive()) {
      return null;
    }
    const printer = printerService.getActivePrinter();
    if (!printer) {
      Alert.alert("Error", "Printer tidak ditemukan");
      return null;
    }
    return printerService;
  };

  const handlePrintOne = async () => {
    if (!previewProduct || printing) return;
    setPrinting(true);
    try {
      const printerService = await getPrinterOrAlert();
      if (!printerService) return;
      const printer = printerService.getActivePrinter();
      if (!printer) {
        Alert.alert("Error", "Printer tidak ditemukan");
        return;
      }
      const item = {
        name: previewProduct.name,
        barcode: previewProduct.barcode,
        price: previewLp.final,
        normalPrice: previewIsPromo ? previewLp.normal : undefined,
      };
      const ran = await printerService.runWithPrintLock(async () => {
        for (let i = 0; i < labelQty; i++) {
          await printPriceLabel(printer, item);
        }
      });
      if (ran) {
        Alert.alert("Berhasil", "Label berhasil dikirim ke printer");
        closePreview();
      }
    } catch (e: any) {
      Alert.alert(
        "Gagal Cetak",
        e?.message || "Terjadi kesalahan saat mencetak",
      );
    } finally {
      setPrinting(false);
    }
  };

  const handlePrintBatch = async () => {
    if (selected.size === 0 || printing) return;
    const items = products
      .filter((p) => selected.has(p.id))
      .map((p) => {
        const lp = getLabelPrice(p, discountMap);
        return {
          name: p.name,
          barcode: p.barcode,
          price: lp.final,
          normalPrice: lp.final < lp.normal ? lp.normal : undefined,
        };
      });
    if (items.length === 0) return;
    setPrinting(true);
    try {
      const printerService = await getPrinterOrAlert();
      if (!printerService) return;
      const printer = printerService.getActivePrinter();
      if (!printer) {
        Alert.alert("Error", "Printer tidak ditemukan");
        return;
      }
      const ran = await printerService.runWithPrintLock(async () => {
        await printPriceLabels(printer, items);
      });
      if (ran) {
        Alert.alert(
          "Berhasil",
          `${items.length} label berhasil dikirim ke printer`,
        );
        setSelected(new Set());
      }
    } catch (e: any) {
      Alert.alert(
        "Gagal Cetak",
        e?.message || "Terjadi kesalahan saat mencetak",
      );
    } finally {
      setPrinting(false);
    }
  };

  const previewBarcode = (previewProduct?.barcode ?? "").trim();
  const previewHasBarcode = previewBarcode.length > 0;
  const previewLp = previewProduct
    ? getLabelPrice(previewProduct, discountMap)
    : { normal: 0, final: 0, discountName: null as string | null };
  const previewIsPromo = previewLp.final < previewLp.normal;

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={10}
        >
          <ChevronLeft color="#111827" size={24} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Cetak Label Harga</Text>
          <Text style={styles.headerSubtitle}>
            {filtered.length} produk
          </Text>
        </View>
        <Pressable
          style={[
            styles.selectAllBtn,
            allFilteredSelected && styles.selectAllBtnActive,
          ]}
          onPress={toggleSelectAll}
          disabled={filtered.length === 0}
        >
          <Text
            style={[
              styles.selectAllText,
              allFilteredSelected && styles.selectAllTextActive,
            ]}
          >
            {allFilteredSelected ? "Batal Semua" : "Pilih Semua"}
          </Text>
        </Pressable>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Search color="#9CA3AF" size={18} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Cari produk / barcode..."
          placeholderTextColor="#9CA3AF"
          style={styles.searchInput}
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery("")} hitSlop={8}>
            <X color="#9CA3AF" size={16} />
          </Pressable>
        )}
      </View>

      {/* Filter promo */}
      <View style={styles.chipRow}>
        {(
          [
            { key: "semua", label: "Semua" },
            { key: "promo", label: "Promo" },
            { key: "reguler", label: "Reguler" },
          ] as const
        ).map((c) => (
          <Pressable
            key={c.key}
            style={[
              styles.chip,
              promoFilter === c.key && styles.chipActive,
            ]}
            onPress={() => setPromoFilter(c.key)}
          >
            <Text
              style={[
                styles.chipText,
                promoFilter === c.key && styles.chipTextActive,
              ]}
            >
              {c.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ paddingBottom: 170 }}
          ListEmptyComponent={
            <View style={styles.emptyCard}>
              <Package color="#9CA3AF" size={32} />
              <Text style={styles.emptyTitle}>Produk tidak ditemukan</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isSelected = selected.has(item.id);
            const hasBarcode = (item.barcode ?? "").trim().length > 0;
            const lp = getLabelPrice(item, discountMap);
            const isPromo = lp.final < lp.normal;
            return (
              <View style={styles.productCard}>
                <Pressable
                  style={[
                    styles.checkbox,
                    isSelected && styles.checkboxActive,
                  ]}
                  onPress={() => toggleSelect(item.id)}
                  hitSlop={8}
                >
                  {isSelected && <Check color="#FFF" size={14} />}
                </Pressable>
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={2}>
                    {item.name}
                  </Text>
                  {hasBarcode ? (
                    <Text style={styles.productBarcode}>{item.barcode}</Text>
                  ) : (
                    <Text style={styles.noBarcodeBadge}>Tanpa barcode</Text>
                  )}
                  {isPromo ? (
                    <>
                      <Text style={styles.normalPriceStrike}>
                        {formatRupiah(lp.normal)}
                      </Text>
                      <Text style={styles.productPrice}>
                        {formatRupiah(lp.final)}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.productPrice}>
                      {formatRupiah(lp.normal)}
                    </Text>
                  )}
                  {item.discount_name ? (
                    <Text style={styles.promoBadge}>
                      Promo: {item.discount_name}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.rowActions}>
                  <Pressable
                    style={styles.viewBtn}
                    onPress={() => openPreview(item, "view")}
                  >
                    <Eye color={Colors.primary} size={15} />
                    <Text style={styles.viewBtnText}>Lihat</Text>
                  </Pressable>
                  <Pressable
                    style={styles.printRowBtn}
                    onPress={() => openPreview(item, "print")}
                  >
                    <Printer color="#FFF" size={15} />
                    <Text style={styles.printRowBtnText}>Cetak</Text>
                  </Pressable>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Batch bar */}
      {selected.size > 0 && (
        <View
          style={[
            styles.batchBar,
            { bottom: Math.max(insets.bottom, 12) + 12 },
          ]}
        >
          <Text style={styles.batchText}>
            {selected.size} produk dipilih
          </Text>
          <Pressable
            style={[
              styles.batchBtn,
              printing && { opacity: 0.6 },
            ]}
            onPress={handlePrintBatch}
            disabled={printing}
          >
            {printing ? (
              <ActivityIndicator color="#FFF" size={16} />
            ) : (
              <Printer color="#FFF" size={16} />
            )}
            <Text style={styles.batchBtnText}>
              {printing ? "Mencetak..." : `Cetak ${selected.size} Label`}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Preview modal */}
      <Modal
        visible={previewProduct != null}
        animationType="slide"
        transparent
        onRequestClose={closePreview}
      >
        <View style={styles.overlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Preview Label</Text>
                <Text style={styles.modalSubtitle}>LABEL BIASA · CODE128</Text>
              </View>
              <Pressable onPress={closePreview} hitSlop={10}>
                <X color="#6B7280" size={22} />
              </Pressable>
            </View>

            {/* Label preview */}
            <View style={styles.labelPreview}>
              <View style={styles.labelLeft}>
                <Text style={styles.labelName} numberOfLines={2}>
                  {previewProduct?.name}
                </Text>
                {previewHasBarcode ? (
                  <>
                    <BarcodePreview code={previewBarcode} />
                    <Text style={styles.labelBarcodeNumber}>
                      {previewBarcode}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.labelNoBarcode}>
                    Produk ini belum punya barcode — label dicetak teks saja
                    (nama + harga).
                  </Text>
                )}
              </View>
              <View style={styles.labelPriceBox}>
                {previewIsPromo && (
                  <>
                    <Text style={styles.labelNormalStrike}>
                      {formatRupiah(previewLp.normal)}
                    </Text>
                    <Text style={styles.labelPromoTag}>PROMO</Text>
                  </>
                )}
                <Text style={styles.labelPrice}>
                  {formatRupiah(previewLp.final)}
                </Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Jenis Barcode:</Text>
              <Text style={styles.metaValue}>
                {previewHasBarcode ? "CODE128" : "-"}
              </Text>
            </View>

            {previewMode === "print" && (
              <>
                <Text style={styles.qtyLabel}>JUMLAH LABEL</Text>
                <View style={styles.qtyRow}>
                  <Pressable
                    style={styles.qtyBtn}
                    onPress={() => setLabelQty((q) => Math.max(1, q - 1))}
                  >
                    <Minus color={Colors.primary} size={18} />
                  </Pressable>
                  <Text style={styles.qtyValue}>{labelQty}</Text>
                  <Pressable
                    style={styles.qtyBtn}
                    onPress={() => setLabelQty((q) => Math.min(99, q + 1))}
                  >
                    <Plus color={Colors.primary} size={18} />
                  </Pressable>
                </View>

                <View style={styles.modalFooter}>
                  <Pressable
                    style={styles.cancelBtn}
                    onPress={closePreview}
                    disabled={printing}
                  >
                    <Text style={styles.cancelBtnText}>Batal</Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.printBtn,
                      printing && { opacity: 0.6 },
                    ]}
                    onPress={handlePrintOne}
                    disabled={printing}
                  >
                    {printing ? (
                      <ActivityIndicator color="#FFF" size={16} />
                    ) : (
                      <Printer color="#FFF" size={16} />
                    )}
                    <Text style={styles.printBtnText}>
                      {printing ? "Mencetak..." : "Cetak Sekarang"}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}

            {previewMode === "view" && (
              <Pressable style={styles.closeBtn} onPress={closePreview}>
                <Text style={styles.closeBtnText}>Tutup</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 10,
    gap: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.neutral,
    marginTop: 2,
  },
  selectAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  selectAllBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  selectAllText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primary,
  },
  selectAllTextActive: {
    color: "#FFF",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#111827",
  },
  chipRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 10,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
  },
  chipTextActive: {
    color: "#FFF",
  },
  productCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 10,
    gap: 10,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  productBarcode: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  noBarcodeBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: "#D97706",
    marginTop: 2,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.primary,
    marginTop: 2,
  },
  normalPriceStrike: {
    fontSize: 12,
    color: "#9CA3AF",
    textDecorationLine: "line-through",
    marginTop: 2,
  },
  promoBadge: {
    fontSize: 11,
    fontWeight: "600",
    color: "#16A34A",
    marginTop: 2,
  },
  rowActions: {
    gap: 6,
  },
  viewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#E8F0FE",
  },
  viewBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primary,
  },
  printRowBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: Colors.primary,
  },
  printRowBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFF",
  },
  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 16,
    alignItems: "center",
    gap: 6,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
  },
  batchBar: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 12,
    paddingLeft: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  batchText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  batchBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  batchBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFF",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 18,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  modalSubtitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9CA3AF",
    marginTop: 2,
    letterSpacing: 0.5,
  },
  labelPreview: {
    flexDirection: "row",
    borderWidth: 1.5,
    borderColor: "#111827",
    borderRadius: 10,
    overflow: "hidden",
  },
  labelLeft: {
    flex: 1,
    padding: 12,
    gap: 6,
    backgroundColor: "#FFF",
  },
  labelName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  labelBarcodeNumber: {
    fontSize: 12,
    color: "#111827",
    letterSpacing: 1,
  },
  labelNoBarcode: {
    fontSize: 11,
    color: "#D97706",
    lineHeight: 16,
  },
  labelPriceBox: {
    width: 120,
    backgroundColor: "#FACC15",
    alignItems: "center",
    justifyContent: "center",
    padding: 8,
  },
  labelPrice: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },
  labelNormalStrike: {
    fontSize: 11,
    color: "#111827",
    textDecorationLine: "line-through",
    textAlign: "center",
  },
  labelPromoTag: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFF",
    backgroundColor: "#DC2626",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: "hidden",
    textAlign: "center",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  metaLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
  metaValue: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  qtyLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 14,
    letterSpacing: 0.5,
  },
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    marginTop: 8,
  },
  qtyBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E8F0FE",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    minWidth: 32,
    textAlign: "center",
  },
  modalFooter: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
    height: 52,
    borderRadius: 14,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#6B7280",
  },
  printBtn: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: 14,
  },
  printBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFF",
  },
  closeBtn: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: 14,
    marginTop: 16,
  },
  closeBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFF",
  },
});
