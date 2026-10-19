import { useFocusEffect, useRouter } from "expo-router";
import {
    Calendar,
    ChevronLeft,
    Package,
    Pencil,
    Trash2,
    X,
} from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
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
    deleteOrCompleteConsignment,
    getAllConsignors,
    getAllProducts,
    getConsignmentsFiltered,
    initDatabase,
    updateConsignment,
    type Consignment,
    type ConsignmentStatus,
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

type Filter = "SEMUA" | ConsignmentStatus;

const chipStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
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
    color: "#374151",
  },
  chipTextActive: {
    color: Colors.white,
  },
});

function EditableConsignModal({
  visible,
  consignment,
  consignors,
  products,
  onClose,
  onSave,
  bottomInset,
}: {
  visible: boolean;
  consignment: Consignment | null;
  consignors: Consignor[];
  products: ProductWithCategory[];
  onClose: () => void;
  onSave: (params: {
    consignor_id: number;
    product_id: number;
    qty_in: number;
    selling_price: number;
    consignor_price: number;
    entry_date: string;
    notes?: string;
  }) => Promise<void>;
  bottomInset: number;
}) {
  const [consignorId, setConsignorId] = useState<number | null>(null);
  const [productId, setProductId] = useState<number | null>(null);
  const [qtyText, setQtyText] = useState("");
  const [sellingText, setSellingText] = useState("");
  const [consignorPriceText, setConsignorPriceText] = useState("");
  const [entryDate, setEntryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const activeProduct = products.find((p) => p.id === productId) ?? null;

  const reset = useCallback(() => {
    if (!consignment) return;
    setConsignorId(consignment.consignor_id);
    setProductId(consignment.product_id);
    setQtyText(String(consignment.qty_in));
    setSellingText(formatRupiah(consignment.selling_price));
    setConsignorPriceText(formatRupiah(consignment.consignor_price));
    setEntryDate(consignment.entry_date);
    setNotes(consignment.notes ?? "");
  }, [consignment]);

  React.useEffect(() => {
    if (visible) reset();
  }, [visible, reset]);

  if (!consignment) return null;

  const qty = parseInt(qtyText.replace(/[^0-9]/g, ""), 10) || 0;
  const sellingPrice = parseRupiah(sellingText);
  const consignorPrice = parseRupiah(consignorPriceText);

  const handleSave = async () => {
    if (!consignorId) return Alert.alert("Peringatan", "Pilih konsinyer");
    if (!productId) return Alert.alert("Peringatan", "Pilih produk");
    if (qty <= 0) return Alert.alert("Peringatan", "Jumlah wajib > 0");
    if (sellingPrice <= 0 || consignorPrice <= 0) {
      return Alert.alert("Peringatan", "Harga wajib > 0");
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
      await onSave({
        consignor_id: consignorId,
        product_id: productId,
        qty_in: qty,
        selling_price: sellingPrice,
        consignor_price: consignorPrice,
        entry_date: entryDate.trim(),
        notes: notes.trim(),
      });
      onClose();
    } catch (e: any) {
      Alert.alert("Gagal", e?.message ?? "Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={modalStyles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View
          style={[
            modalStyles.content,
            { paddingBottom: Math.max(bottomInset, 16) + 24 },
          ]}
        >
          <View style={modalStyles.header}>
            <Text style={modalStyles.headerTitle}>Edit Konsinyasi</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <X color="#6B7280" size={22} />
            </Pressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={modalStyles.label}>KONSINYER</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={modalStyles.chipScroll}
            >
              {consignors.map((c) => (
                <Pressable
                  key={c.id}
                  style={[
                    modalStyles.chip,
                    consignorId === c.id && modalStyles.chipActive,
                  ]}
                  onPress={() => setConsignorId(c.id)}
                >
                  <Text
                    style={[
                      modalStyles.chipText,
                      consignorId === c.id && modalStyles.chipTextActive,
                    ]}
                  >
                    {c.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={modalStyles.label}>PRODUK</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={modalStyles.chipScroll}
            >
              {products.map((p) => (
                <Pressable
                  key={p.id}
                  style={[
                    modalStyles.chip,
                    productId === p.id && modalStyles.chipActive,
                  ]}
                  onPress={() => setProductId(p.id)}
                >
                  <Text
                    style={[
                      modalStyles.chipText,
                      productId === p.id && modalStyles.chipTextActive,
                    ]}
                  >
                    {p.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={modalStyles.label}>
              JUMLAH TITIPAN ({activeProduct?.unit ?? "unit"}) *
            </Text>
            <View style={modalStyles.prefixInput}>
              <TextInput
                style={modalStyles.field}
                value={qtyText}
                onChangeText={(t) => setQtyText(t.replace(/[^0-9]/g, ""))}
                keyboardType="number-pad"
                placeholder="Contoh: 10"
                placeholderTextColor="#C4C4C4"
              />
              <Text style={modalStyles.unit}>
                {activeProduct?.unit ?? "unit"}
              </Text>
            </View>

            <Text style={modalStyles.label}>HARGA JUAL / UNIT (Rp) *</Text>
            <View style={modalStyles.prefixInput}>
              <Text style={modalStyles.prefix}>Rp</Text>
              <TextInput
                style={modalStyles.field}
                value={sellingText}
                onChangeText={(t) => setSellingText(parseRupiahInput(t))}
                keyboardType="number-pad"
                placeholder="Contoh: 10.000"
                placeholderTextColor="#C4C4C4"
              />
            </View>

            <Text style={modalStyles.label}>
              HARGA KONSINYASI / UNIT (Rp) *
            </Text>
            <View style={modalStyles.prefixInput}>
              <Text style={modalStyles.prefix}>Rp</Text>
              <TextInput
                style={modalStyles.field}
                value={consignorPriceText}
                onChangeText={(t) => setConsignorPriceText(parseRupiahInput(t))}
                keyboardType="number-pad"
                placeholder="Contoh: 7.000"
                placeholderTextColor="#C4C4C4"
              />
            </View>

            <Text style={modalStyles.label}>TANGGAL MASUK (YYYY-MM-DD) *</Text>
            <View style={modalStyles.prefixInput}>
              <Calendar color={Colors.neutral} size={18} />
              <TextInput
                style={modalStyles.field}
                value={entryDate}
                onChangeText={setEntryDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#C4C4C4"
                autoCapitalize="none"
              />
            </View>

            <Text style={modalStyles.label}>CATATAN (opsional)</Text>
            <TextInput
              style={[modalStyles.input, modalStyles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Catatan"
              placeholderTextColor="#C4C4C4"
              multiline
              numberOfLines={3}
            />

            <Pressable
              style={({ pressed }) => [
                modalStyles.saveBtn,
                pressed && { opacity: 0.85 },
              ]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={modalStyles.saveBtnText}>Simpan Perubahan</Text>
              )}
            </Pressable>
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
    maxHeight: "88%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.neutral,
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 14,
  },
  chipScroll: {
    marginBottom: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  chipTextActive: {
    color: Colors.white,
  },
  prefixInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  field: {
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
  unit: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.neutral,
    marginLeft: 8,
  },
  input: {
    backgroundColor: "#F9FAFB",
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
  saveBtn: {
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  saveBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
});

export default function TransaksiKonsinyasiScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [filter, setFilter] = useState<Filter>("SEMUA");
  const [consignments, setConsignments] = useState<Consignment[]>([]);
  const [consignors, setConsignors] = useState<Consignor[]>([]);
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Consignment | null>(null);
  const [editVisible, setEditVisible] = useState(false);

  const load = useCallback(async () => {
    try {
      await initDatabase();
      const [data, consignorsData, productsData] = await Promise.all([
        getConsignmentsFiltered({ status: filter }),
        getAllConsignors(),
        getAllProducts(),
      ]);
      setConsignments(data);
      setConsignors(consignorsData);
      setProducts(productsData);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleDelete = (c: Consignment) => {
    if (c.qty_sold > 0) {
      Alert.alert(
        "Nonaktifkan Konsinyasi",
        `Konsinyasi "${c.product_name}" sudah pernah terjual. Riwayat tidak akan dihapus; konsinyasi akan ditandai selesai dan sisa barang dianggap dikembalikan. Lanjutkan?`,
        [
          { text: "Batal", style: "cancel" },
          {
            text: "Nonaktifkan",
            style: "destructive",
            onPress: async () => {
              await deleteOrCompleteConsignment(c.id);
              load();
            },
          },
        ],
      );
    } else {
      Alert.alert(
        "Hapus Konsinyasi",
        `Yakin ingin menghapus konsinyasi "${c.product_name}"?`,
        [
          { text: "Batal", style: "cancel" },
          {
            text: "Hapus",
            style: "destructive",
            onPress: async () => {
              await deleteOrCompleteConsignment(c.id);
              load();
            },
          },
        ],
      );
    }
  };

  const handleEdit = (c: Consignment) => {
    if (c.qty_sold > 0) {
      return Alert.alert(
        "Tidak Bisa Diedit",
        "Konsinyasi ini sudah pernah terjual, sehingga tidak bisa diedit agar riwayat tetap akurat. Gunakan 'Nonaktifkan' bila ingin mengakhiri.",
      );
    }
    setEditing(c);
    setEditVisible(true);
  };

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
        <Text style={styles.headerTitle}>Transaksi Konsinyasi</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Filter */}
      <View style={chipStyles.row}>
        {(["SEMUA", "ACTIVE", "COMPLETED"] as Filter[]).map((f) => (
          <Pressable
            key={f}
            style={[chipStyles.chip, filter === f && chipStyles.chipActive]}
            onPress={() => setFilter(f)}
          >
            <Text
              style={[
                chipStyles.chipText,
                filter === f && chipStyles.chipTextActive,
              ]}
            >
              {f === "SEMUA" ? "Semua" : f === "ACTIVE" ? "Aktif" : "Selesai"}
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
          data={consignments}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 100,
            paddingTop: 12,
          }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Package color={Colors.neutral} size={40} />
              <Text style={styles.emptyTitle}>Belum ada konsinyasi</Text>
              <Text style={styles.emptySubtitle}>
                Buat konsinyasi baru dari menu
                {"\u201C"}Buat Konsinyasi{"\u201D"}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={1}>
                    {item.product_name}
                  </Text>
                  <Text style={styles.productMeta}>{item.consignor_name}</Text>
                </View>
                {item.status === "COMPLETED" ? (
                  <View style={[styles.statusBadge, styles.statusCompleted]}>
                    <Text
                      style={[styles.statusText, styles.statusTextComplete]}
                    >
                      Selesai
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.statusBadge, styles.statusActive]}>
                    <Text style={[styles.statusText, styles.statusTextActive]}>
                      Aktif
                    </Text>
                  </View>
                )}
              </View>

              {/* Progress */}
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(
                        item.qty_in > 0
                          ? (item.qty_sold / item.qty_in) * 100
                          : 0,
                        100,
                      )}%`,
                    },
                  ]}
                />
              </View>

              <View style={styles.metricsRow}>
                <Metric label="Masuk" value={String(item.qty_in)} />
                <Metric
                  label="Terjual"
                  value={String(item.qty_sold)}
                  color="#16A34A"
                />
                <Metric
                  label="Kembali"
                  value={String(item.qty_returned)}
                  color="#D97706"
                />
                <Metric
                  label="Sisa"
                  value={String(item.qty_remaining)}
                  color="#DC2626"
                />
              </View>

              <View style={styles.priceRow}>
                <Price label="Jual" value={formatRupiah(item.selling_price)} />
                <Price
                  label="Konsinyasi"
                  value={formatRupiah(item.consignor_price)}
                />
                <Price
                  label="Untung/pcs"
                  value={formatRupiah(item.profit_per_item)}
                  color="#16A34A"
                />
              </View>

              <View style={styles.dateRow}>
                <Calendar color={Colors.neutral} size={12} />
                <Text style={styles.dateText}>Masuk: {item.entry_date}</Text>
              </View>

              {item.qty_sold > 0 ? (
                <Text style={styles.lockedHint}>
                  Sudah terjual, tidak dapat diedit agar riwayat akurat.
                </Text>
              ) : null}

              <View style={styles.actions}>
                <Pressable
                  style={[
                    styles.actionBtn,
                    styles.editBtn,
                    item.qty_sold > 0 && { opacity: 0.4 },
                  ]}
                  onPress={() => handleEdit(item)}
                >
                  <Pencil color="#2563EB" size={15} />
                  <Text style={styles.editBtnText}>Edit</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionBtn, styles.deleteBtn]}
                  onPress={() => handleDelete(item)}
                >
                  <Trash2 color="#DC2626" size={15} />
                  <Text style={styles.deleteBtnText}>
                    {item.qty_sold > 0 ? "Nonaktif" : "Hapus"}
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}

      <EditableConsignModal
        visible={editVisible}
        consignment={editing}
        consignors={consignors}
        products={products}
        onClose={() => {
          setEditVisible(false);
          setEditing(null);
        }}
        onSave={async (params) => {
          if (editing) {
            await updateConsignment(editing.id, params);
            load();
          }
        }}
      />
    </View>
  );
}

function Metric({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricValue, color ? { color } : null]}>
        {value}
      </Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function Price({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.priceValue, color ? { color } : null]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
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
    gap: 8,
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.neutral,
    textAlign: "center",
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  productMeta: {
    fontSize: 12,
    color: Colors.neutral,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusActive: {
    backgroundColor: "#ECFDF5",
  },
  statusCompleted: {
    backgroundColor: "#F3F4F6",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  statusTextActive: {
    color: "#16A34A",
  },
  statusTextComplete: {
    color: "#6B7280",
  },
  progressTrack: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#7C3AED",
    borderRadius: 999,
  },
  metricsRow: {
    flexDirection: "row",
    marginTop: 12,
  },
  metric: {
    flex: 1,
    alignItems: "center",
  },
  metricValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  priceValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  metricLabel: {
    fontSize: 11,
    color: Colors.neutral,
    marginTop: 2,
  },
  priceRow: {
    flexDirection: "row",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 12,
  },
  dateText: {
    fontSize: 12,
    color: Colors.neutral,
  },
  lockedHint: {
    fontSize: 11,
    color: "#D97706",
    marginTop: 10,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  editBtn: {
    backgroundColor: "#DBEAFE",
    borderColor: "#93C5FD",
  },
  editBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2563EB",
  },
  deleteBtn: {
    backgroundColor: "#FEE2E2",
    borderColor: "#FECACA",
  },
  deleteBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#DC2626",
  },
});
