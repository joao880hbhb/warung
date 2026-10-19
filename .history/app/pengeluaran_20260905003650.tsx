import { useFocusEffect, useRouter } from "expo-router";
import {
    Calendar,
    Car,
    ChevronLeft,
    Home,
    Lightbulb,
    Package,
    Pencil,
    Plus,
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
    Text,
    TextInput,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";
import {
    addExpense,
    deleteExpense,
    getExpensesByPeriod,
    getTotalExpensesByPeriod,
    initDatabase,
    updateExpense,
    type Expense,
    type ExpenseCategory,
    type ReportPeriod,
} from "@/lib/database";

function formatRupiah(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

function formatRupiahShort(value: number) {
  if (value >= 1_000_000) {
    return `Rp ${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}jt`;
  }
  if (value >= 1_000) {
    return `Rp ${(value / 1_000).toFixed(0)}rb`;
  }
  return formatRupiah(value);
}

function parseRupiahInput(text: string) {
  const nums = text.replace(/[^0-9]/g, "");
  if (!nums) return "";
  return parseInt(nums, 10).toLocaleString("id-ID");
}

function parseRupiah(text: string): number {
  return parseInt(text.replace(/[^0-9]/g, ""), 10) || 0;
}

function todayDdMmYyyy() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1,
  ).padStart(2, "0")}/${d.getFullYear()}`;
}

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function ddMmYyyyToIso(text: string): string | null {
  const parts = text.split("/");
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts.map(Number);
  if (!dd || !mm || !yyyy) return null;
  if (dd < 1 || dd > 31 || mm < 1 || mm > 12 || yyyy < 2000) return null;
  return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

const CATEGORIES: {
  value: ExpenseCategory;
  label: string;
  icon: any;
  color: string;
  bg: string;
  placeholder: string;
}[] = [
  {
    value: "RENT",
    label: "Sewa",
    icon: Home,
    color: "#2563EB",
    bg: "#EFF6FF",
    placeholder: "Contoh: Sewa toko",
  },
  {
    value: "ELECTRICITY",
    label: "Listrik",
    icon: Lightbulb,
    color: "#D97706",
    bg: "#FFFBEB",
    placeholder: "Contoh: Bayar listrik bulan Mei",
  },
  {
    value: "TRANSPORT",
    label: "Transport",
    icon: Car,
    color: "#0891B2",
    bg: "#ECFEFF",
    placeholder: "Contoh: Ongkos kirim",
  },
  {
    value: "OTHER",
    label: "Lainnya",
    icon: Tag,
    color: "#7C3AED",
    bg: "#F3E8FF",
    placeholder: "Contoh: Beli perlengkapan",
  },
];

function categoryMeta(value: ExpenseCategory) {
  return (
    CATEGORIES.find((c) => c.value === value) ??
    CATEGORIES[CATEGORIES.length - 1]
  );
}

function formatExpenseDate(iso: string) {
  const d = iso.split("-");
  if (d.length !== 3) return iso;
  return `${d[2]}/${d[1]}/${d[0]}`;
}

// ---------------------------------------------------------------------------
// Single Date Picker
// ---------------------------------------------------------------------------

function DatePickerModal({
  visible,
  initial,
  onApply,
  onClose,
  bottomInset,
}: {
  visible: boolean;
  initial: string; // ISO yyyy-mm-dd
  onApply: (iso: string, display: string) => void;
  onClose: () => void;
  bottomInset: number;
}) {
  const [text, setText] = useState("");

  useEffect(() => {
    if (visible) {
      if (initial) {
        const parts = initial.split("-");
        setText(`${parts[2]}/${parts[1]}/${parts[0]}`);
      } else {
        setText(todayDdMmYyyy());
      }
    }
  }, [visible, initial]);

  const handleApply = () => {
    const iso = ddMmYyyyToIso(text);
    if (!iso) {
      return Alert.alert(
        "Tanggal Tidak Valid",
        "Gunakan format tanggal DD/MM/YYYY",
      );
    }
    onApply(iso, text);
    onClose();
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
              <Text style={pickerStyles.headerTitle}>Pilih Tanggal</Text>
              <Pressable onPress={onClose} hitSlop={10}>
                <X color="#6B7280" size={22} />
              </Pressable>
            </View>
            <View style={pickerStyles.body}>
              <Text style={pickerStyles.fieldLabel}>Tanggal (DD/MM/YYYY)</Text>
              <TextInput
                style={pickerStyles.fieldInput}
                value={text}
                onChangeText={setText}
                placeholder="DD/MM/YYYY"
                placeholderTextColor="#C4C4C4"
                keyboardType="number-pad"
                maxLength={10}
              />
            </View>
            <View
              style={[
                pickerStyles.footer,
                { paddingBottom: Math.max(bottomInset, 12) },
              ]}
            >
              <Pressable style={pickerStyles.cancelBtn} onPress={onClose}>
                <Text style={pickerStyles.cancelBtnText}>Batal</Text>
              </Pressable>
              <Pressable style={pickerStyles.applyBtn} onPress={handleApply}>
                <Text style={pickerStyles.applyBtnText}>Pilih</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Form Modal (Tambah / Edit)
// ---------------------------------------------------------------------------

function ExpenseFormModal({
  visible,
  onClose,
  onSave,
  initial,
  bottomInset,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  initial?: Expense | null;
  bottomInset: number;
}) {
  const [category, setCategory] = useState<ExpenseCategory>("RENT");
  const [description, setDescription] = useState("");
  const [amountText, setAmountText] = useState("");
  const [dateIso, setDateIso] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const isEdit = !!initial;

  useEffect(() => {
    if (initial) {
      setCategory(initial.category);
      setDescription(initial.description);
      setAmountText(formatRupiah(initial.amount));
      setDateIso(initial.expense_date);
    } else {
      setCategory("RENT");
      setDescription("");
      setAmountText("");
      setDateIso(todayIso());
    }
  }, [initial, visible]);

  const handleSave = async () => {
    const desc = description.trim();
    if (!desc) {
      return Alert.alert("Peringatan", "Deskripsi wajib diisi");
    }
    const amount = parseRupiah(amountText);
    if (amount <= 0) {
      return Alert.alert("Peringatan", "Jumlah pengeluaran wajib lebih dari 0");
    }
    if (!dateIso) {
      return Alert.alert("Peringatan", "Tanggal wajib diisi");
    }

    setSaving(true);
    try {
      if (isEdit) {
        await updateExpense(initial!.id, {
          category,
          description: desc,
          amount,
          expense_date: dateIso,
        });
      } else {
        await addExpense({
          category,
          description: desc,
          amount,
          expense_date: dateIso,
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

  const dateDisplay = dateIso ? formatExpenseDate(dateIso) : todayDdMmYyyy();

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={modalStyles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={modalStyles.content}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.headerTitle}>
              {isEdit ? "Edit Pengeluaran" : "Tambah Pengeluaran"}
            </Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <X color="#6B7280" size={22} />
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Kategori */}
            <Text style={modalStyles.label}>KATEGORI *</Text>
            <View style={modalStyles.categoryGrid}>
              {CATEGORIES.map((c) => (
                <Pressable
                  key={c.value}
                  style={[
                    modalStyles.categoryChip,
                    category === c.value && modalStyles.categoryChipActive,
                  ]}
                  onPress={() => setCategory(c.value)}
                >
                  <c.icon
                    color={category === c.value ? Colors.white : c.color}
                    size={18}
                  />
                  <Text
                    style={[
                      modalStyles.categoryChipText,
                      category === c.value &&
                        modalStyles.categoryChipTextActive,
                    ]}
                  >
                    {c.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Deskripsi */}
            <Text style={modalStyles.label}>DESKRIPSI *</Text>
            <TextInput
              style={[modalStyles.input, modalStyles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder={categoryMeta(category).placeholder}
              placeholderTextColor="#C4C4C4"
              multiline
              numberOfLines={3}
            />

            {/* Jumlah */}
            <Text style={modalStyles.label}>JUMLAH (Rp) *</Text>
            <View style={modalStyles.prefixInput}>
              <Text style={modalStyles.prefix}>Rp</Text>
              <TextInput
                style={modalStyles.prefixField}
                value={amountText}
                onChangeText={(t) => setAmountText(parseRupiahInput(t))}
                placeholder="Contoh: 25.000"
                placeholderTextColor="#C4C4C4"
                keyboardType="number-pad"
              />
            </View>

            {/* Tanggal */}
            <Text style={modalStyles.label}>TANGGAL *</Text>
            <Pressable
              style={modalStyles.dateBtn}
              onPress={() => setShowDatePicker(true)}
            >
              <Calendar color={Colors.primary} size={18} />
              <Text style={modalStyles.dateBtnText}>{dateDisplay}</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                modalStyles.saveBtn,
                pressed && modalStyles.saveBtnPressed,
              ]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={modalStyles.saveBtnText}>
                  {isEdit ? "Simpan Perubahan" : "Simpan Pengeluaran"}
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>

      <DatePickerModal
        visible={showDatePicker}
        initial={dateIso || todayIso()}
        onApply={(iso) => setDateIso(iso)}
        onClose={() => setShowDatePicker(false)}
        bottomInset={bottomInset}
      />
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
    marginBottom: 16,
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
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  categoryChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  categoryChipTextActive: {
    color: Colors.white,
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
  dateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  dateBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  saveBtn: {
    backgroundColor: Colors.primary,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  saveBtnPressed: {
    opacity: 0.85,
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
    paddingBottom: Platform.OS === "ios" ? 40 : 20,
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
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  body: {
    paddingHorizontal: 20,
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.neutral,
  },
  fieldInput: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  cancelBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3F4F6",
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
  },
  applyBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
  },
  applyBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.white,
  },
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function PengeluaranScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const PERIODS: { key: ReportPeriod; label: string }[] = [
    { key: "Hari Ini", label: "Hari ini" },
    { key: "Minggu Ini", label: "Minggu ini" },
    { key: "Bulan Ini", label: "Bulan ini" },
    { key: "Custom", label: "Custom" },
  ];

  const [period, setPeriod] = useState<ReportPeriod>("Hari Ini");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);

  const load = useCallback(async () => {
    try {
      await initDatabase();
      const [data, sum] = await Promise.all([
        getExpensesByPeriod({ period, customStart, customEnd }),
        getTotalExpensesByPeriod({ period, customStart, customEnd }),
      ]);
      setExpenses(data);
      setTotal(sum);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [period, customStart, customEnd]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handlePeriodChange = (nextPeriod: ReportPeriod) => {
    if (nextPeriod === "Custom") {
      setShowCustomPicker(true);
      return;
    }
    setPeriod(nextPeriod);
    setCustomStart("");
    setCustomEnd("");
  };

  const handleCustomApply = (start: string, end: string) => {
    setCustomStart(start);
    setCustomEnd(end);
    setPeriod("Custom");
  };

  const handleDelete = (item: Expense) => {
    Alert.alert(
      "Hapus Pengeluaran",
      `Yakin ingin menghapus "${item.description}"?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteExpense(item.id);
              load();
            } catch (e: any) {
              Alert.alert("Gagal", e?.message ?? "Terjadi kesalahan");
            }
          },
        },
      ],
    );
  };

  const handleEdit = (item: Expense) => {
    setEditing(item);
    setModalVisible(true);
  };

  const handleAdd = () => {
    setEditing(null);
    setModalVisible(true);
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
        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle}>Pengeluaran</Text>
          <Text style={styles.headerSubtitle}>
            Catat biaya operasional toko
          </Text>
        </View>
        <Pressable style={styles.addBtn} onPress={handleAdd}>
          <Plus color={Colors.white} size={20} />
        </Pressable>
      </View>

      {/* Filter periode */}
      <View style={styles.periodRow}>
        {PERIODS.map((p) => (
          <Pressable
            key={p.key}
            style={[
              styles.periodChip,
              period === p.key && styles.periodChipActive,
            ]}
            onPress={() => handlePeriodChange(p.key)}
          >
            <Text
              style={[
                styles.periodChipText,
                period === p.key && styles.periodChipTextActive,
              ]}
            >
              {p.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {period === "Custom" && customStart && customEnd && (
        <View style={styles.rangeLabel}>
          <Calendar color={Colors.primary} size={14} />
          <Text style={styles.rangeLabelText}>
            {customStart} — {customEnd}
          </Text>
          <Pressable
            onPress={() => {
              setPeriod("Hari Ini");
              setCustomStart("");
              setCustomEnd("");
            }}
            hitSlop={6}
          >
            <X color="#9CA3AF" size={14} />
          </Pressable>
        </View>
      )}

      {/* Summary card */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Total Pengeluaran</Text>
        <Text style={styles.summaryValue}>{formatRupiah(total)}</Text>
        <Text style={styles.summarySubtext}>Total biaya operasional</Text>
      </View>

      <Text style={styles.listLabel}>DAFTAR PENGELUARAN</Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={expenses}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 100,
            paddingTop: 8,
          }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Package color={Colors.neutral} size={40} />
              <Text style={styles.emptyTitle}>Belum ada pengeluaran</Text>
              <Text style={styles.emptySubtitle}>
                Tekan {"\u201C+ Tambah\u201D"} untuk mencatat biaya operasional
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const meta = categoryMeta(item.category);
            const Icon = meta.icon;
            return (
              <View style={styles.card}>
                <View style={[styles.iconCircle, { backgroundColor: meta.bg }]}>
                  <Icon color={meta.color} size={18} />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardCategory}>{meta.label}</Text>
                  <Text style={styles.cardDescription} numberOfLines={1}>
                    {item.description}
                  </Text>
                  <View style={styles.cardMetaRow}>
                    <Calendar color={Colors.neutral} size={11} />
                    <Text style={styles.cardDate}>
                      {formatExpenseDate(item.expense_date)}
                    </Text>
                  </View>
                </View>
                <View style={styles.cardRight}>
                  <Text style={styles.cardAmount}>
                    {formatRupiahShort(item.amount)}
                  </Text>
                  <View style={styles.cardActions}>
                    <Pressable
                      style={styles.actionBtn}
                      onPress={() => handleEdit(item)}
                    >
                      <Pencil color={Colors.primary} size={15} />
                    </Pressable>
                    <Pressable
                      style={styles.actionBtn}
                      onPress={() => handleDelete(item)}
                    >
                      <Trash2 color="#DC2626" size={15} />
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          }}
        />
      )}

      <ExpenseFormModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setEditing(null);
        }}
        onSave={load}
        initial={editing}
      />

      <CustomDateRangePicker
        visible={showCustomPicker}
        onApply={handleCustomApply}
        onClose={() => setShowCustomPicker(false)}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Custom date range picker (for period filter)
// ---------------------------------------------------------------------------

function CustomDateRangePicker({
  visible,
  onApply,
  onClose,
  bottomInset,
}: {
  visible: boolean;
  onApply: (start: string, end: string) => void;
  onClose: () => void;
  bottomInset: number;
}) {
  const [startText, setStartText] = useState("");
  const [endText, setEndText] = useState("");

  useEffect(() => {
    if (visible) {
      const now = new Date();
      const today = `${String(now.getDate()).padStart(2, "0")}/${String(
        now.getMonth() + 1,
      ).padStart(2, "0")}/${now.getFullYear()}`;
      const monthAgo = new Date(now);
      monthAgo.setDate(monthAgo.getDate() - 30);
      const ago = `${String(monthAgo.getDate()).padStart(2, "0")}/${String(
        monthAgo.getMonth() + 1,
      ).padStart(2, "0")}/${monthAgo.getFullYear()}`;
      setStartText(ago);
      setEndText(today);
    }
  }, [visible]);

  const handleApply = () => {
    const s = ddMmYyyyToIso(startText);
    const e = ddMmYyyyToIso(endText);
    if (!s || !e) {
      return Alert.alert(
        "Tanggal Tidak Valid",
        "Gunakan format tanggal DD/MM/YYYY",
      );
    }
    onApply(s, e);
    onClose();
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
              <Text style={pickerStyles.headerTitle}>
                Pilih Rentang Tanggal
              </Text>
              <Pressable onPress={onClose} hitSlop={10}>
                <X color="#6B7280" size={22} />
              </Pressable>
            </View>
            <View style={pickerStyles.body}>
              <Text style={pickerStyles.fieldLabel}>Tanggal Mulai</Text>
              <TextInput
                style={pickerStyles.fieldInput}
                value={startText}
                onChangeText={setStartText}
                placeholder="DD/MM/YYYY"
                placeholderTextColor="#C4C4C4"
                keyboardType="number-pad"
                maxLength={10}
              />
              <Text style={pickerStyles.fieldLabel}>Tanggal Akhir</Text>
              <TextInput
                style={pickerStyles.fieldInput}
                value={endText}
                onChangeText={setEndText}
                placeholder="DD/MM/YYYY"
                placeholderTextColor="#C4C4C4"
                keyboardType="number-pad"
                maxLength={10}
              />
            </View>
            <View
              style={[
                pickerStyles.footer,
                { paddingBottom: Math.max(bottomInset, 12) },
              ]}
            >
              <Pressable style={pickerStyles.cancelBtn} onPress={onClose}>
                <Text style={pickerStyles.cancelBtnText}>Batal</Text>
              </Pressable>
              <Pressable style={pickerStyles.applyBtn} onPress={handleApply}>
                <Text style={pickerStyles.applyBtnText}>Terapkan</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  headerTitles: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 12,
    color: Colors.neutral,
    marginTop: 2,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  periodRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  periodChip: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  periodChipActive: {
    backgroundColor: Colors.primary,
  },
  periodChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  periodChipTextActive: {
    color: Colors.white,
  },
  rangeLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.white,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    marginBottom: 14,
    alignSelf: "flex-start",
  },
  rangeLabelText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
  },
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 18,
    marginHorizontal: 16,
  },
  summaryLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.neutral,
  },
  summaryValue: {
    fontSize: 30,
    fontWeight: "800",
    color: "#DC2626",
    marginTop: 4,
  },
  summarySubtext: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 4,
  },
  listLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.neutral,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingTop: 40,
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
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  cardCategory: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  cardDescription: {
    fontSize: 12,
    color: "#374151",
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  cardDate: {
    fontSize: 11,
    color: Colors.neutral,
  },
  cardRight: {
    alignItems: "flex-end",
    gap: 8,
  },
  cardAmount: {
    fontSize: 15,
    fontWeight: "700",
    color: "#DC2626",
  },
  cardActions: {
    flexDirection: "row",
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
});
