import { useFocusEffect, useRouter } from "expo-router";
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  Image as ImageIcon,
  Package,
  Save,
  User,
  X,
} from "lucide-react-native";
import React, { useCallback, useState } from "react";
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
  addConsignment,
  getActiveConsignmentsMap,
  getAllConsignors,
  getAllProducts,
  initDatabase,
  type Consignor,
  type ProductWithCategory,
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

function todayDate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export default function TambahKonsinyasiScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [consignors, setConsignors] = useState<Consignor[]>([]);
  const [productOptions, setProductOptions] = useState<ProductWithCategory[]>(
    [],
  );
  const [loading, setLoading] = useState(true);

  const [consignor, setConsignor] = useState<Consignor | null>(null);
  const [product, setProduct] = useState<ProductWithCategory | null>(null);
  const [qtyText, setQtyText] = useState("");
  const [sellingText, setSellingText] = useState("");
  const [consignorPriceText, setConsignorPriceText] = useState("");
  const [entryDate, setEntryDate] = useState(todayDate());
  const [notes, setNotes] = useState("");

  const [showConsignorPicker, setShowConsignorPicker] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      await initDatabase();
      const [cons, prods, activeMap] = await Promise.all([
        getAllConsignors(),
        getAllProducts(),
        getActiveConsignmentsMap(),
      ]);
      setConsignors(cons);
      // Produk yang boleh dipilih = belum punya konsinyasi aktif
      setProductOptions(prods.filter((p) => !activeMap.has(p.id)));
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const qty = parseInt(qtyText.replace(/[^0-9]/g, ""), 10) || 0;
  const sellingPrice = parseRupiah(sellingText);
  const consignorPrice = parseRupiah(consignorPriceText);
  const profitPerItem = Math.max(sellingPrice - consignorPrice, 0);
  const totalTitipan = qty * consignorPrice;
  const estimatedProfit = qty * profitPerItem;

  const pickConsignor = (c: Consignor) => {
    setConsignor(c);
    setShowConsignorPicker(false);
  };

  const pickProduct = (p: ProductWithCategory) => {
    setProduct(p);
    setSellingText(formatRupiah(p.sell_price));
    setShowProductPicker(false);
  };

  const handleSave = async () => {
    if (!consignor) {
      return Alert.alert("Peringatan", "Pilih konsinyer terlebih dahulu");
    }
    if (!product) {
      return Alert.alert("Peringatan", "Pilih produk terlebih dahulu");
    }
    if (qty <= 0) {
      return Alert.alert("Peringatan", "Jumlah titipan wajib lebih dari 0");
    }
    if (sellingPrice <= 0 || consignorPrice <= 0) {
      return Alert.alert(
        "Peringatan",
        "Harga jual dan harga konsinyasi wajib lebih dari 0",
      );
    }
    if (consignorPrice > sellingPrice) {
      return Alert.alert(
        "Peringatan",
        "Harga konsinyasi harus lebih kecil dari harga jual",
      );
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate.trim())) {
      return Alert.alert(
        "Peringatan",
        "Tanggal masuk harus berformat YYYY-MM-DD",
      );
    }

    setSaving(true);
    try {
      await addConsignment({
        consignor_id: consignor.id,
        product_id: product.id,
        qty_in: qty,
        selling_price: sellingPrice,
        consignor_price: consignorPrice,
        entry_date: entryDate.trim(),
        notes: notes.trim(),
      });
      Alert.alert("Berhasil", "Konsinyasi baru berhasil dibuat", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert("Gagal", e?.message ?? "Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
        <HeaderBar onBack={() => router.back()} title="Buat Konsinyasi" />
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
      <HeaderBar onBack={() => router.back()} title="Buat Konsinyasi" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        >
          {/* Konsinyer */}
          <Text style={styles.label}>KONSINYER *</Text>
          <Pressable
            style={styles.selectBtn}
            onPress={() => setShowConsignorPicker(true)}
          >
            {consignor ? (
              <>
                <User color={Colors.primary} size={18} />
                <Text style={styles.selectText}>{consignor.name}</Text>
              </>
            ) : (
              <>
                <User color="#9CA3AF" size={18} />
                <Text style={styles.selectPlaceholder}>Pilih konsinyer...</Text>
              </>
            )}
            <ChevronDown color="#9CA3AF" size={18} />
          </Pressable>

          {/* Produk */}
          <Text style={styles.label}>PRODUK *</Text>
          <Pressable
            style={styles.selectBtn}
            onPress={() => setShowProductPicker(true)}
          >
            {product ? (
              <View style={styles.selectProductRow}>
                {product.image_uri ? (
                  <Image
                    source={{ uri: product.image_uri }}
                    style={styles.selectThumb}
                  />
                ) : (
                  <View style={styles.selectThumbPlaceholder}>
                    <ImageIcon color="#D1D5DB" size={16} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.selectText}>{product.name}</Text>
                  <Text style={styles.selectSubtext}>
                    {product.unit} · {formatRupiah(product.sell_price)}
                  </Text>
                </View>
              </View>
            ) : (
              <>
                <Package color="#9CA3AF" size={18} />
                <Text style={styles.selectPlaceholder}>
                  Pilih produk untuk dititip...
                </Text>
              </>
            )}
            <ChevronDown color="#9CA3AF" size={18} />
          </Pressable>

          {/* Jumlah */}
          <Text style={styles.label}>
            JUMLAH TITIPAN ({product?.unit ?? "unit"}) *
          </Text>
          <View style={styles.qtyInput}>
            <TextInput
              style={styles.qtyField}
              value={qtyText}
              onChangeText={(t) => setQtyText(t.replace(/[^0-9]/g, ""))}
              placeholder="Contoh: 10"
              placeholderTextColor="#C4C4C4"
              keyboardType="number-pad"
            />
            <Text style={styles.qtyUnit}>{product?.unit ?? "unit"}</Text>
          </View>

          {/* Harga jual */}
          <Text style={styles.label}>
            HARGA JUAL / {product?.unit ?? "UNIT"} (Rp) *
          </Text>
          <View style={styles.prefixInput}>
            <Text style={styles.prefix}>Rp</Text>
            <TextInput
              style={styles.prefixField}
              value={sellingText}
              onChangeText={(t) => setSellingText(parseRupiahInput(t))}
              placeholder="Contoh: 10.000"
              placeholderTextColor="#C4C4C4"
              keyboardType="number-pad"
            />
          </View>

          {/* Harga konsinyasi */}
          <Text style={styles.label}>
            HARGA KONSINYASI / {product?.unit ?? "UNIT"} (Rp) *
          </Text>
          <View style={styles.prefixInput}>
            <Text style={styles.prefix}>Rp</Text>
            <TextInput
              style={styles.prefixField}
              value={consignorPriceText}
              onChangeText={(t) => setConsignorPriceText(parseRupiahInput(t))}
              placeholder="Contoh: 7.000"
              placeholderTextColor="#C4C4C4"
              keyboardType="number-pad"
            />
          </View>

          {/* Tanggal */}
          <Text style={styles.label}>TANGGAL MASUK (YYYY-MM-DD) *</Text>
          <View style={styles.prefixInput}>
            <Calendar color={Colors.neutral} size={18} />
            <TextInput
              style={styles.dateField}
              value={entryDate}
              onChangeText={setEntryDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#C4C4C4"
              autoCapitalize="none"
            />
          </View>

          {/* Catatan */}
          <Text style={styles.label}>CATATAN (opsional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Contoh: Kesepakatan bagi hasil 60/40"
            placeholderTextColor="#C4C4C4"
            multiline
            numberOfLines={3}
          />

          {/* Ringkasan */}
          <View style={styles.summaryBox}>
            <Text style={styles.summaryTitle}>RINGKASAN</Text>
            <SummaryRow
              label="Untung / pcs"
              value={formatRupiah(profitPerItem)}
              accent
            />
            <SummaryRow
              label="Total Titipan"
              value={formatRupiah(totalTitipan)}
            />
            <SummaryRow
              label="Estimasi Keuntungan"
              value={formatRupiah(estimatedProfit)}
            />
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.saveBtn,
              pressed && { opacity: 0.85 },
            ]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <Save color={Colors.white} size={18} />
                <Text style={styles.saveBtnText}>Simpan Konsinyasi</Text>
              </>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <ConsignorPicker
        visible={showConsignorPicker}
        consignors={consignors}
        onClose={() => setShowConsignorPicker(false)}
        onSelect={pickConsignor}
      />
      <ProductPicker
        visible={showProductPicker}
        products={productOptions}
        onClose={() => setShowProductPicker(false)}
        onSelect={pickProduct}
      />
    </View>
  );
}

function HeaderBar({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <View style={styles.headerRow}>
      <Pressable style={styles.backBtn} onPress={onBack} hitSlop={10}>
        <ChevronLeft color="#111827" size={24} />
      </Pressable>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={{ width: 40 }} />
    </View>
  );
}

function SummaryRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, accent && { color: "#16A34A" }]}>
        {value}
      </Text>
    </View>
  );
}

function ConsignorPicker({
  visible,
  consignors,
  onClose,
  onSelect,
}: {
  visible: boolean;
  consignors: Consignor[];
  onClose: () => void;
  onSelect: (c: Consignor) => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={pickerStyles.overlay}>
        <View style={pickerStyles.content}>
          <View style={pickerStyles.header}>
            <Text style={pickerStyles.title}>Pilih Konsinyer</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <X color="#6B7280" size={22} />
            </Pressable>
          </View>
          {consignors.length === 0 ? (
            <View style={pickerStyles.empty}>
              <Text style={pickerStyles.emptyText}>
                Belum ada konsinyer. Tambahkan lewat
                {"\u201C"}Data Konsinyer{"\u201D"}.
              </Text>
            </View>
          ) : (
            <FlatList
              data={consignors}
              keyExtractor={(item) => String(item.id)}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              renderItem={({ item }) => (
                <Pressable
                  style={pickerStyles.option}
                  onPress={() => onSelect(item)}
                >
                  <View style={pickerStyles.avatar}>
                    <User color={Colors.primary} size={16} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={pickerStyles.optionName}>{item.name}</Text>
                    {item.phone ? (
                      <Text style={pickerStyles.optionSub}>{item.phone}</Text>
                    ) : null}
                  </View>
                </Pressable>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

function ProductPicker({
  visible,
  products,
  onClose,
  onSelect,
}: {
  visible: boolean;
  products: ProductWithCategory[];
  onClose: () => void;
  onSelect: (p: ProductWithCategory) => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={pickerStyles.overlay}>
        <View style={pickerStyles.content}>
          <View style={pickerStyles.header}>
            <Text style={pickerStyles.title}>Pilih Produk</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <X color="#6B7280" size={22} />
            </Pressable>
          </View>
          {products.length === 0 ? (
            <View style={pickerStyles.empty}>
              <Text style={pickerStyles.emptyText}>
                Tidak ada produk yang tersedia untuk dititip (produk dengan
                konsinyasi aktif tidak dapat ditumpuk).
              </Text>{" "}
            </View>
          ) : (
            <FlatList
              data={products}
              keyExtractor={(item) => String(item.id)}
              ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              renderItem={({ item }) => (
                <Pressable
                  style={pickerStyles.option}
                  onPress={() => onSelect(item)}
                >
                  {item.image_uri ? (
                    <Image
                      source={{ uri: item.image_uri }}
                      style={pickerStyles.thumb}
                    />
                  ) : (
                    <View style={pickerStyles.thumbPlaceholder}>
                      <ImageIcon color="#D1D5DB" size={16} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={pickerStyles.optionName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={pickerStyles.optionSub}>
                      {item.unit} · {formatRupiah(item.sell_price)}
                    </Text>
                  </View>
                </Pressable>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 10,
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
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.neutral,
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 18,
  },
  selectBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 10,
  },
  selectText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  selectPlaceholder: {
    flex: 1,
    fontSize: 15,
    color: "#9CA3AF",
  },
  selectSubtext: {
    fontSize: 12,
    color: Colors.neutral,
    marginTop: 2,
  },
  selectProductRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  selectThumb: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
  },
  selectThumbPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
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
  prefixInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
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
    marginRight: 4,
  },
  dateField: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  summaryBox: {
    backgroundColor: "#F3E8FF",
    borderRadius: 14,
    padding: 16,
    marginTop: 24,
    borderLeftWidth: 4,
    borderLeftColor: "#7C3AED",
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B21A8",
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: "#7E22CE",
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.secondary,
    height: 52,
    borderRadius: 26,
    marginTop: 20,
  },
  saveBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
});

const pickerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  content: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    maxHeight: "70%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#E8F0FE",
    alignItems: "center",
    justifyContent: "center",
  },
  thumb: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
  },
  thumbPlaceholder: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  optionName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  optionSub: {
    fontSize: 12,
    color: Colors.neutral,
    marginTop: 2,
  },
  empty: {
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 13,
    color: Colors.neutral,
    textAlign: "center",
  },
});
