import { useRouter } from "expo-router";
import {
    Check,
    CheckCircle2,
    ChevronLeft,
    Package,
    Pencil,
    Percent,
    Plus,
    Search,
    Tag,
    Trash2,
    X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
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
    Switch,
    Text,
    TextInput,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";
import {
    addDiscount,
    deleteDiscount,
    formatDiscountLabel,
    getAllDiscounts,
    getAllProducts,
    getDiscountProductIds,
    initDatabase,
    saveDiscountProducts,
    updateDiscount,
    type Discount,
    type DiscountType,
    type DiscountWithCount,
    type ProductWithCategory,
} from "@/lib/database";

const GREEN = "#16A34A";
const GREEN_BG = "#ECFDF5";

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

function typeLabel(type: DiscountType): string {
  return type === "percent" ? "Persentase" : "Nominal";
}

// ---------------------------------------------------------------------------
// Form Modal (tambah / edit diskon)
// ---------------------------------------------------------------------------

function DiscountFormModal({
  visible,
  onClose,
  onSave,
  initial,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  initial?: Discount | null;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<DiscountType>("percent");
  const [valueText, setValueText] = useState("");
  const [minText, setMinText] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const isEdit = !!initial;

  useEffect(() => {
    if (initial) {
      setName(initial.name);
      setType(initial.type);
      const raw = String(initial.value);
      setValueText(
        initial.type === "percent"
          ? raw
          : parseInt(raw, 10).toLocaleString("id-ID"),
      );
      setMinText(
        initial.minimum_purchase != null
          ? Math.round(initial.minimum_purchase).toLocaleString("id-ID")
          : "",
      );
      setIsActive(initial.is_active === 1);
    } else {
      setName("");
      setType("percent");
      setValueText("");
      setMinText("");
      setIsActive(true);
    }
  }, [initial, visible]);

  const handleTypeChange = (t: DiscountType) => {
    setType(t);
    setValueText("");
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return Alert.alert("Peringatan", "Nama diskon wajib diisi");

    const value =
      type === "percent" ? Number(valueText) : parseRupiah(valueText);
    if (!value || value <= 0) {
      return Alert.alert("Peringatan", "Nilai diskon wajib lebih dari 0");
    }
    if (type === "percent" && value > 100) {
      return Alert.alert("Peringatan", "Persentase maksimal 100%");
    }
    if (type === "nominal" && value < 0) {
      return Alert.alert("Peringatan", "Nominal diskon tidak boleh negatif");
    }

    const minVal = parseRupiah(minText);
    if (minText.trim() && minVal < 0) {
      return Alert.alert("Peringatan", "Minimal pembelian tidak boleh negatif");
    }
    const minimumPurchase = minText.trim() ? minVal : null;

    setSaving(true);
    try {
      if (isEdit) {
        await updateDiscount(initial!.id, {
          name: trimmed,
          type,
          value,
          minimumPurchase,
          isActive,
        });
      } else {
        await addDiscount({
          name: trimmed,
          type,
          value,
          minimumPurchase,
          isActive,
        });
      }
      onSave();
      onClose();
    } catch (e: any) {
      Alert.alert("Gagal", e?.message ?? "Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  };

  const showMinError = minText.trim() && parseRupiah(minText) < 0;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={modalStyles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={modalStyles.content}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.headerTitle}>
              {isEdit ? "Edit Diskon" : "Tambah Diskon"}
            </Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <X color="#6B7280" size={22} />
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Informasi Diskon */}
            <Text style={modalStyles.sectionLabel}>INFORMASI DISKON</Text>
            <View style={modalStyles.field}>
              <Text style={modalStyles.label}>NAMA DISKON *</Text>
              <TextInput
                style={modalStyles.input}
                value={name}
                onChangeText={setName}
                placeholder='Contoh: "Diskon Member"'
                placeholderTextColor="#C4C4C4"
              />
            </View>

            {/* Tipe */}
            <View style={modalStyles.field}>
              <Text style={modalStyles.label}>TIPE DISKON</Text>
              <View style={modalStyles.typeRow}>
                <Pressable
                  style={[
                    modalStyles.typeBtn,
                    type === "percent" && modalStyles.typeBtnActive,
                  ]}
                  onPress={() => handleTypeChange("percent")}
                >
                  <Percent
                    color={type === "percent" ? Colors.white : Colors.neutral}
                    size={16}
                  />
                  <Text
                    style={[
                      modalStyles.typeBtnText,
                      type === "percent" && modalStyles.typeBtnTextActive,
                    ]}
                  >
                    Persentase (%)
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    modalStyles.typeBtn,
                    type === "nominal" && modalStyles.typeBtnActive,
                  ]}
                  onPress={() => handleTypeChange("nominal")}
                >
                  <Tag
                    color={type === "nominal" ? Colors.white : Colors.neutral}
                    size={16}
                  />
                  <Text
                    style={[
                      modalStyles.typeBtnText,
                      type === "nominal" && modalStyles.typeBtnTextActive,
                    ]}
                  >
                    Nominal (Rp)
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* Nilai */}
            <View style={modalStyles.field}>
              <Text style={modalStyles.label}>
                NILAI DISKON (dalam {type === "percent" ? "%" : "Rupiah"})
              </Text>
              <View style={modalStyles.prefixInput}>
                <Text style={modalStyles.prefix}>
                  {type === "percent" ? "%" : "Rp"}
                </Text>
                <TextInput
                  style={modalStyles.prefixField}
                  value={valueText}
                  onChangeText={(t) =>
                    setValueText(
                      type === "percent"
                        ? t.replace(/[^0-9]/g, "")
                        : parseRupiahInput(t),
                    )
                  }
                  placeholder={type === "percent" ? "10" : "5.000"}
                  placeholderTextColor="#C4C4C4"
                  keyboardType="number-pad"
                />
              </View>
            </View>

            {/* Minimal pembelian */}
            <View style={modalStyles.field}>
              <Text style={modalStyles.label}>
                MINIMAL PEMBELIAN (opsional)
              </Text>
              <View
                style={[
                  modalStyles.prefixInput,
                  showMinError && modalStyles.inputError,
                ]}
              >
                <Text style={modalStyles.prefix}>Rp</Text>
                <TextInput
                  style={modalStyles.prefixField}
                  value={minText}
                  onChangeText={(t) => setMinText(parseRupiahInput(t))}
                  placeholder="Kosong = tanpa minimal"
                  placeholderTextColor="#C4C4C4"
                  keyboardType="number-pad"
                />
              </View>
              {showMinError && (
                <Text style={modalStyles.errorText}>
                  Minimal pembelian tidak boleh negatif
                </Text>
              )}
            </View>

            {/* Status */}
            <View style={modalStyles.field}>
              <Text style={modalStyles.label}>STATUS</Text>
              <View style={modalStyles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={modalStyles.switchTitle}>
                    {isActive ? "Aktif" : "Nonaktif"}
                  </Text>
                  <Text style={modalStyles.switchSubtitle}>
                    {isActive
                      ? "Diskon aktif & muncul di produk"
                      : "Diskon tidak aktif & disembunyikan"}
                  </Text>
                </View>
                <Switch
                  value={isActive}
                  onValueChange={setIsActive}
                  trackColor={{ false: "#D1D5DB", true: GREEN }}
                  thumbColor="#FFFFFF"
                />
              </View>
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
  typeRow: {
    flexDirection: "row",
    gap: 8,
  },
  typeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  typeBtnActive: {
    backgroundColor: Colors.secondary,
    borderColor: Colors.secondary,
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.neutral,
  },
  typeBtnTextActive: {
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
  inputError: {
    borderColor: "#DC2626",
  },
  errorText: {
    fontSize: 11,
    color: "#DC2626",
    marginTop: 6,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 12,
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  switchSubtitle: {
    fontSize: 11.5,
    color: Colors.neutral,
    marginTop: 2,
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
// Product Picker Bottom Sheet
// ---------------------------------------------------------------------------

function ProductPickerModal({
  visible,
  discountId,
  onClose,
  onSaved,
  bottomInset,
}: {
  visible: boolean;
  discountId: number | null;
  onClose: () => void;
  onSaved: () => void;
  bottomInset: number;
}) {
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && discountId != null) {
      setQuery("");
      setLoading(true);
      (async () => {
        try {
          await initDatabase();
          const [prods, ids] = await Promise.all([
            getAllProducts(),
            getDiscountProductIds(discountId),
          ]);
          setProducts(prods);
          setSelected(new Set(ids));
        } catch {
          // ignore
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [visible, discountId]);

  const filtered = query.trim()
    ? products.filter((p) =>
        p.name.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : products;

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    if (discountId == null) return;
    setSaving(true);
    try {
      await saveDiscountProducts(discountId, Array.from(selected));
      onSaved();
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
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={pickerStyles.overlay}>
          <View style={pickerStyles.content}>
            <View style={pickerStyles.handle} />

            <View style={pickerStyles.header}>
              <View style={{ flex: 1 }}>
                <Text style={pickerStyles.headerTitle}>Pilih Produk</Text>
                <Text style={pickerStyles.headerSubtitle}>
                  {selected.size} produk dipilih
                </Text>
              </View>
              <Pressable onPress={onClose} hitSlop={10}>
                <X color="#6B7280" size={22} />
              </Pressable>
            </View>

            {/* Search */}
            <View style={pickerStyles.searchBar}>
              <Search color="#9CA3AF" size={18} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Cari nama produk..."
                placeholderTextColor="#9CA3AF"
                style={pickerStyles.searchInput}
              />
              {query.length > 0 && (
                <Pressable onPress={() => setQuery("")} hitSlop={6}>
                  <X color="#9CA3AF" size={16} />
                </Pressable>
              )}
            </View>

            <View style={pickerStyles.listWrap}>
              {loading ? (
                <View style={pickerStyles.center}>
                  <ActivityIndicator color={Colors.primary} size="large" />
                </View>
              ) : filtered.length === 0 ? (
                <View style={pickerStyles.center}>
                  <Package color={Colors.neutral} size={36} />
                  <Text style={pickerStyles.emptyTitle}>
                    Produk tidak ditemukan
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={filtered}
                  keyExtractor={(item) => String(item.id)}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => {
                    const checked = selected.has(item.id);
                    return (
                      <Pressable
                        style={[
                          pickerStyles.productRow,
                          checked && pickerStyles.productRowChecked,
                        ]}
                        onPress={() => toggle(item.id)}
                      >
                        <View
                          style={[
                            pickerStyles.checkbox,
                            checked && pickerStyles.checkboxChecked,
                          ]}
                        >
                          {checked && (
                            <Check color="#FFFFFF" size={14} strokeWidth={3} />
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text
                            style={pickerStyles.productName}
                            numberOfLines={1}
                          >
                            {item.name}
                          </Text>
                          <Text style={pickerStyles.productMeta}>
                            {item.category_name ?? "Tanpa kategori"} ·{" "}
                            {formatRupiah(item.sell_price)}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  }}
                />
              )}
            </View>

            {/* Footer */}
            <View style={pickerStyles.footer}>
              <Pressable
                style={({ pressed }) => [
                  pickerStyles.saveBtn,
                  pressed && pickerStyles.pressed,
                ]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <>
                    <CheckCircle2 color="#FFFFFF" size={18} />
                    <Text style={pickerStyles.saveBtnText}>
                      Simpan ({selected.size} produk)
                    </Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

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
    height: "88%",
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E5E7EB",
    marginTop: 10,
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 12,
    color: GREEN,
    fontWeight: "700",
    marginTop: 2,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 12,
    marginHorizontal: 20,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
  },
  listWrap: {
    flex: 1,
    marginTop: 10,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  productRowChecked: {
    backgroundColor: GREEN_BG,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: GREEN,
    borderColor: GREEN,
  },
  productName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  productMeta: {
    fontSize: 11.5,
    color: Colors.neutral,
    marginTop: 2,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingBottom: Platform.OS === "ios" ? 30 : 16,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.secondary,
    height: 50,
    borderRadius: 25,
    gap: 8,
  },
  saveBtnText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.85,
  },
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function DiskonScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [discounts, setDiscounts] = useState<DiscountWithCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Discount | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerDiscountId, setPickerDiscountId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      await initDatabase();
      const data = await getAllDiscounts();
      setDiscounts(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = (d: DiscountWithCount) => {
    Alert.alert("Hapus Diskon", `Yakin ingin menghapus "${d.name}"?`, [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDiscount(d.id);
            load();
          } catch (e: any) {
            Alert.alert("Gagal", e?.message ?? "Terjadi kesalahan");
          }
        },
      },
    ]);
  };

  const handleEdit = (d: DiscountWithCount) => {
    setEditing(d);
    setModalVisible(true);
  };

  const handleAdd = () => {
    setEditing(null);
    setModalVisible(true);
  };

  const handlePickProducts = (d: DiscountWithCount) => {
    setPickerDiscountId(d.id);
    setPickerVisible(true);
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
        <Text style={styles.headerTitle}>Kelola Diskon</Text>
        <Pressable style={styles.addBtn} onPress={handleAdd}>
          <Plus color={Colors.white} size={20} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={discounts}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 100,
            paddingTop: 12,
          }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Tag color={Colors.neutral} size={40} />
              <Text style={styles.emptyTitle}>Belum ada diskon</Text>
              <Text style={styles.emptySubtitle}>
                Tekan tombol + untuk membuat diskon
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const active = item.is_active === 1;
            return (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.cardInfo}>
                    <Text style={styles.cardName} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <View style={styles.valueRow}>
                      <Tag color={GREEN} size={14} />
                      <Text style={styles.cardValue}>
                        {formatDiscountLabel(item.type, item.value)}
                      </Text>
                      <Text style={styles.cardType}>
                        · {typeLabel(item.type)}
                      </Text>
                    </View>
                    <Text style={styles.cardMeta}>
                      {item.minimum_purchase != null
                        ? `Min. pembelian ${formatRupiah(item.minimum_purchase)}`
                        : "Tanpa minimal pembelian"}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: active ? GREEN_BG : "#F3F4F6" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: active ? GREEN : "#6B7280" },
                      ]}
                    >
                      {active ? "Aktif" : "Nonaktif"}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.cardBottom}>
                  <Pressable
                    style={styles.pickBtn}
                    onPress={() => handlePickProducts(item)}
                  >
                    <Package color={Colors.primary} size={15} />
                    <Text style={styles.pickBtnText}>
                      Pilih Produk ({item.product_count})
                    </Text>
                  </Pressable>

                  <View style={styles.actions}>
                    <Pressable
                      style={styles.actionBtn}
                      onPress={() => handleEdit(item)}
                    >
                      <Pencil color={Colors.primary} size={16} />
                    </Pressable>
                    <Pressable
                      style={styles.actionBtn}
                      onPress={() => handleDelete(item)}
                    >
                      <Trash2 color="#DC2626" size={16} />
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      <DiscountFormModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setEditing(null);
        }}
        onSave={load}
        initial={editing}
      />

      <ProductPickerModal
        visible={pickerVisible}
        discountId={pickerDiscountId}
        onClose={() => setPickerVisible(false)}
        onSaved={load}
      />
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 4,
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
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.secondary,
    alignItems: "center",
    justifyContent: "center",
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
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  cardName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  cardValue: {
    fontSize: 16,
    fontWeight: "800",
    color: GREEN,
  },
  cardType: {
    fontSize: 12,
    color: Colors.neutral,
  },
  cardMeta: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  cardDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 12,
  },
  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pickBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F0FE",
    borderRadius: 10,
    paddingVertical: 9,
    gap: 6,
  },
  pickBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: Colors.primary,
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
});
