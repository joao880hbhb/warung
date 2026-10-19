import { useRouter } from "expo-router";
import {
  AlertCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Printer,
  Receipt,
  Smartphone,
  Wallet,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  getHistoryTransactions,
  getTransactionDetail,
  initDatabase,
  type HistoryPeriod,
  type RecentTransaction,
  type TransactionDetail,
} from "@/lib/database";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatTxDate(dateStr: string) {
  const d = new Date(dateStr);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FILTERS: HistoryPeriod[] = [
  "Hari Ini",
  "Minggu Ini",
  "Bulan Ini",
  "Custom",
];

const METHOD_COLORS: Record<string, string> = {
  tunai: Colors.primary,
  transfer: "#2563EB",
  qris: "#7C3AED",
  hutang: "#D97706",
};

const METHOD_ICONS: Record<string, any> = {
  tunai: Wallet,
  transfer: CreditCard,
  qris: Smartphone,
  hutang: AlertCircle,
};

const METHOD_LABELS: Record<string, string> = {
  tunai: "Tunai",
  transfer: "Transfer",
  qris: "QRIS",
  hutang: "Hutang",
};

// ---------------------------------------------------------------------------
// Filter Bar
// ---------------------------------------------------------------------------

function FilterBar({
  selected,
  onChange,
}: {
  selected: HistoryPeriod;
  onChange: (p: HistoryPeriod) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={filterStyles.row}
    >
      {FILTERS.map((f) => {
        const active = selected === f;
        return (
          <Pressable
            key={f}
            onPress={() => onChange(f)}
            style={[filterStyles.chip, active && filterStyles.chipActive]}
          >
            {f === "Custom" && (
              <Calendar
                color={active ? Colors.white : "#6B7280"}
                size={13}
                style={{ marginRight: 5 }}
              />
            )}
            <Text
              style={[
                filterStyles.chipText,
                active && filterStyles.chipTextActive,
              ]}
            >
              {f}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const filterStyles = StyleSheet.create({
  row: {
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
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
    color: Colors.white,
  },
});

// ---------------------------------------------------------------------------
// Custom Date Picker Modal
// ---------------------------------------------------------------------------

function CustomDatePicker({
  visible,
  onApply,
  onClose,
}: {
  visible: boolean;
  onApply: (start: string, end: string) => void;
  onClose: () => void;
}) {
  function getDefaultDates() {
    const now = new Date();
    const todayStr = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
    const monthAgo = new Date(now);
    monthAgo.setDate(monthAgo.getDate() - 30);
    const monthAgoStr = `${String(monthAgo.getDate()).padStart(2, "0")}/${String(monthAgo.getMonth() + 1).padStart(2, "0")}/${monthAgo.getFullYear()}`;
    return { start: monthAgoStr, end: todayStr };
  }

  const [startText, setStartText] = useState("");
  const [endText, setEndText] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (visible) {
      const defaults = getDefaultDates();
      setStartText(defaults.start);
      setEndText(defaults.end);
      setError("");
    }
  }, [visible]);

  function parseDdMmYyyy(text: string): string | null {
    const parts = text.split("/");
    if (parts.length !== 3) return null;
    const [dd, mm, yyyy] = parts.map(Number);
    if (!dd || !mm || !yyyy) return null;
    if (dd < 1 || dd > 31 || mm < 1 || mm > 12 || yyyy < 2000) return null;
    return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  }

  const handleApply = () => {
    const s = parseDdMmYyyy(startText);
    const e = parseDdMmYyyy(endText);
    if (!s || !e) {
      setError("Format tanggal tidak valid (DD/MM/YYYY)");
      return;
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
        <Pressable style={dateStyles.overlay} onPress={onClose}>
          <Pressable
            style={dateStyles.content}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={dateStyles.handle} />

            <View style={dateStyles.header}>
              <Text style={dateStyles.headerTitle}>Pilih Rentang Tanggal</Text>
              <Pressable onPress={onClose} hitSlop={10}>
                <X color="#6B7280" size={22} />
              </Pressable>
            </View>

            <View style={dateStyles.fields}>
              <View style={dateStyles.fieldGroup}>
                <Text style={dateStyles.fieldLabel}>Tanggal Mulai</Text>
                <TextInput
                  style={dateStyles.fieldInput}
                  value={startText}
                  onChangeText={(t) => {
                    setStartText(t);
                    setError("");
                  }}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor="#C4C4C4"
                  keyboardType="number-pad"
                  maxLength={10}
                />
              </View>
              <View style={dateStyles.fieldGroup}>
                <Text style={dateStyles.fieldLabel}>Tanggal Akhir</Text>
                <TextInput
                  style={dateStyles.fieldInput}
                  value={endText}
                  onChangeText={(t) => {
                    setEndText(t);
                    setError("");
                  }}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor="#C4C4C4"
                  keyboardType="number-pad"
                  maxLength={10}
                />
              </View>
              {error ? <Text style={dateStyles.errorText}>{error}</Text> : null}
            </View>

            <View style={dateStyles.footer}>
              <Pressable style={dateStyles.cancelBtn} onPress={onClose}>
                <Text style={dateStyles.cancelBtnText}>Batal</Text>
              </Pressable>
              <Pressable style={dateStyles.applyBtn} onPress={handleApply}>
                <Text style={dateStyles.applyBtnText}>Terapkan</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const dateStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  content: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  fields: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 16,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
  },
  fieldInput: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  errorText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#DC2626",
  },
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  cancelBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6B7280",
  },
  applyBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  applyBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.white,
  },
});

// ---------------------------------------------------------------------------
// Transaction Detail Modal
// ---------------------------------------------------------------------------

function DetailModal({
  visible,
  invoice,
  onClose,
}: {
  visible: boolean;
  invoice: string;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<TransactionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    if (!visible || !invoice) return;
    setLoading(true);
    setPrinting(false);
    (async () => {
      const d = await getTransactionDetail(invoice);
      setDetail(d);
      setLoading(false);
    })();
  }, [visible, invoice]);

  const handleCetakStruk = async () => {
    if (!detail) return;
    try {
      const printerService = await import("@/services/printer/PrinterService");
      const receiptFormatter = await import("@/lib/receipt-formatter");
      if (!printerService.isPrinterConnected()) {
        Alert.alert(
          "Printer Tidak Terhubung",
          "Hubungkan printer Bluetooth terlebih dahulu di Pengaturan.",
        );
        return;
      }
      setPrinting(true);
      const printer = printerService.getActivePrinter();
      if (!printer) {
        Alert.alert("Error", "Printer tidak ditemukan");
        return;
      }
      await receiptFormatter.printReceipt(printer, detail);
      Alert.alert("Berhasil", "Struk berhasil dikirim ke printer");
    } catch (e: any) {
      Alert.alert(
        "Gagal Cetak",
        e?.message || "Terjadi kesalahan saat mencetak",
      );
    } finally {
      setPrinting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={detailStyles.overlay}>
        <View style={detailStyles.content}>
          <View style={detailStyles.handle} />

          {loading ? (
            <View style={{ paddingVertical: 60, alignItems: "center" }}>
              <ActivityIndicator color={Colors.primary} size="large" />
            </View>
          ) : !detail ? (
            <View style={{ paddingVertical: 60, alignItems: "center", gap: 8 }}>
              <Receipt color="#D1D5DB" size={36} />
              <Text style={{ fontSize: 14, color: "#9CA3AF" }}>
                Transaksi tidak ditemukan
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={detailStyles.header}>
                <Text style={detailStyles.headerTitle}>Detail Transaksi</Text>
                <Pressable onPress={onClose} hitSlop={10}>
                  <X color="#6B7280" size={22} />
                </Pressable>
              </View>

              {/* Invoice card */}
              <View style={detailStyles.invoiceCard}>
                <View style={detailStyles.invoiceIcon}>
                  <Receipt color={Colors.primary} size={20} />
                </View>
                <Text style={detailStyles.invoiceNumber}>
                  {detail.invoice_number}
                </Text>
                <View
                  style={[
                    detailStyles.statusBadge,
                    {
                      backgroundColor:
                        detail.status === "PAID"
                          ? "#ECFDF3"
                          : detail.status === "PARTIAL"
                            ? "#FFFBEB"
                            : "#FEF2F2",
                    },
                  ]}
                >
                  <Text
                    style={[
                      detailStyles.statusText,
                      {
                        color:
                          detail.status === "PAID"
                            ? Colors.primary
                            : detail.status === "PARTIAL"
                              ? "#D97706"
                              : "#DC2626",
                      },
                    ]}
                  >
                    {detail.status === "PAID"
                      ? "Lunas"
                      : detail.status === "PARTIAL"
                        ? "Bayar Sebagian"
                        : "Belum Dibayar"}
                  </Text>
                </View>
              </View>

              {/* Info */}
              <View style={detailStyles.card}>
                <DetailInfoRow
                  icon={Calendar}
                  label="Waktu"
                  value={formatDate(detail.created_at)}
                />
                <DetailInfoRow
                  icon={Receipt}
                  label="Kasir"
                  value={detail.cashier_name ?? "-"}
                />
                {detail.customer_name ? (
                  <DetailInfoRow
                    icon={Receipt}
                    label="Pelanggan"
                    value={detail.customer_name}
                  />
                ) : null}
                <DetailInfoRow
                  icon={METHOD_ICONS[detail.payment_method] ?? Wallet}
                  label="Metode Pembayaran"
                  value={
                    METHOD_LABELS[detail.payment_method] ??
                    detail.payment_method
                  }
                />
              </View>

              {/* Items */}
              <View style={detailStyles.card}>
                <Text style={detailStyles.sectionTitle}>
                  Produk ({detail.items.length})
                </Text>
                {detail.items.map((item, idx) => (
                  <View
                    key={idx}
                    style={[
                      detailStyles.itemRow,
                      idx !== detail.items.length - 1 &&
                        detailStyles.itemDivider,
                    ]}
                  >
                    <View style={detailStyles.itemQtyBadge}>
                      <Text style={detailStyles.itemQtyText}>
                        {item.quantity}x
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={detailStyles.itemName} numberOfLines={1}>
                        {item.product_name}
                      </Text>
                      <Text style={detailStyles.itemPrice}>
                        {formatRupiah(item.unit_price)} / item
                      </Text>
                    </View>
                    <Text style={detailStyles.itemSubtotal}>
                      {formatRupiah(item.subtotal)}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Payment summary */}
              <View style={detailStyles.card}>
                <Text style={detailStyles.sectionTitle}>
                  Ringkasan Pembayaran
                </Text>
                <DetailSummaryRow
                  label="Subtotal"
                  value={formatRupiah(detail.total_amount)}
                />
                <DetailSummaryRow
                  label="Dibayar"
                  value={formatRupiah(detail.paid_amount)}
                />
                {detail.change_amount > 0 && (
                  <DetailSummaryRow
                    label="Kembalian"
                    value={formatRupiah(detail.change_amount)}
                  />
                )}
                <View style={detailStyles.divider} />
                <DetailSummaryRow
                  label="Total"
                  value={formatRupiah(detail.total_amount)}
                  bold
                />
              </View>

              {/* Cetak Struk */}
              <Pressable
                style={({ pressed }) => [
                  detailStyles.printBtn,
                  printing && detailStyles.printBtnDisabled,
                  pressed && !printing && { opacity: 0.85 },
                ]}
                onPress={handleCetakStruk}
                disabled={printing}
              >
                {printing ? (
                  <ActivityIndicator color={Colors.primary} size={16} />
                ) : (
                  <Printer color={Colors.primary} size={16} />
                )}
                <Text style={detailStyles.printBtnText}>
                  {printing ? "Mencetak..." : "Cetak Struk"}
                </Text>
              </Pressable>

              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function DetailInfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <View style={detailInfoStyles.row}>
      <View style={detailInfoStyles.iconWrap}>
        <Icon color={Colors.primary} size={15} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={detailInfoStyles.label}>{label}</Text>
        <Text style={detailInfoStyles.value}>{value}</Text>
      </View>
    </View>
  );
}

const detailInfoStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#ECFDF3",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  value: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
    marginTop: 1,
  },
});

function DetailSummaryRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <View style={detailSummaryStyles.row}>
      <Text
        style={[
          detailSummaryStyles.label,
          bold && { fontWeight: "700", color: "#111827" },
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          detailSummaryStyles.value,
          bold && { fontWeight: "800", fontSize: 16, color: Colors.primary },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const detailSummaryStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  label: {
    fontSize: 13,
    color: "#6B7280",
  },
  value: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
});

const detailStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  content: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
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
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  invoiceCard: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    gap: 10,
  },
  invoiceIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#ECFDF3",
    alignItems: "center",
    justifyContent: "center",
  },
  invoiceNumber: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    letterSpacing: 0.5,
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  card: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 14,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 10,
  },
  itemDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  itemQtyBadge: {
    backgroundColor: "#ECFDF3",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    minWidth: 30,
    alignItems: "center",
  },
  itemQtyText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.primary,
  },
  itemName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  itemPrice: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
  },
  itemSubtotal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 8,
  },
  printBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: "#ECFDF3",
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  printBtnDisabled: {
    opacity: 0.6,
  },
  printBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.primary,
  },
});

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [period, setPeriod] = useState<HistoryPeriod>("Hari Ini");
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const [transactions, setTransactions] = useState<RecentTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedInvoice, setSelectedInvoice] = useState("");
  const [showDetail, setShowDetail] = useState(false);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    await initDatabase();
    const data = await getHistoryTransactions(period, customStart, customEnd);
    setTransactions(data);
    setLoading(false);
  }, [period, customStart, customEnd]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handlePeriodChange = (p: HistoryPeriod) => {
    if (p === "Custom") {
      setShowCustomPicker(true);
      return;
    }
    setPeriod(p);
    setCustomStart("");
    setCustomEnd("");
  };

  const handleCustomApply = (start: string, end: string) => {
    setCustomStart(start);
    setCustomEnd(end);
    setPeriod("Custom");
  };

  const summary = useMemo(() => {
    const totalAmount = transactions.reduce(
      (sum, t) => sum + t.total_amount,
      0,
    );
    return { count: transactions.length, totalAmount };
  }, [transactions]);

  const renderItem = ({
    item,
    index,
  }: {
    item: RecentTransaction;
    index: number;
  }) => {
    const methodColor = METHOD_COLORS[item.payment_method] ?? "#6B7280";
    const MethodIcon = METHOD_ICONS[item.payment_method] ?? Receipt;
    return (
      <Pressable
        style={({ pressed }) => [styles.txRow, pressed && { opacity: 0.7 }]}
        onPress={() => {
          setSelectedInvoice(item.invoice_number);
          setShowDetail(true);
        }}
      >
        <View style={[styles.txIcon, { backgroundColor: methodColor + "15" }]}>
          <MethodIcon color={methodColor} size={17} />
        </View>
        <View style={styles.txInfo}>
          <Text style={styles.txId}>{item.invoice_number}</Text>
          <Text style={styles.txMeta}>
            {formatTxDate(item.created_at)} · {formatTime(item.created_at)} ·{" "}
            {item.item_count} item
          </Text>
        </View>
        <View style={styles.txRight}>
          <Text style={styles.txTotal}>{formatRupiah(item.total_amount)}</Text>
          <View
            style={[
              styles.txMethodBadge,
              { backgroundColor: methodColor + "15" },
            ]}
          >
            <Text style={[styles.txMethodText, { color: methodColor }]}>
              {METHOD_LABELS[item.payment_method] ?? item.payment_method}
            </Text>
          </View>
        </View>
        <ChevronRight color="#D1D5DB" size={18} />
      </Pressable>
    );
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={[styles.headerRow, { paddingTop: insets.top + 12 }]}>
        <Pressable
          style={styles.backBtn}
          onPress={() => router.back()}
          hitSlop={10}
        >
          <ChevronLeft color="#111827" size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>History Transaksi</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Filter */}
      <FilterBar selected={period} onChange={handlePeriodChange} />

      {/* Custom date range label */}
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
      {!loading && transactions.length > 0 && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Transaksi</Text>
            <Text style={styles.summaryValue}>{summary.count}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Total Omzet</Text>
            <Text style={[styles.summaryValue, { color: Colors.primary }]}>
              {formatRupiahShort(summary.totalAmount)}
            </Text>
          </View>
        </View>
      )}

      {/* Transaction list */}
      {loading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.centerStateText}>Memuat transaksi...</Text>
        </View>
      ) : transactions.length === 0 ? (
        <View style={styles.centerState}>
          <Receipt color="#D1D5DB" size={48} />
          <Text style={styles.emptyTitle}>Belum ada transaksi</Text>
          <Text style={styles.emptySubtitle}>
            Transaksi akan muncul di sini setelah ada penjualan
          </Text>
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.invoice_number}
          renderItem={renderItem}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 4,
            paddingBottom: 100,
          }}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Detail modal */}
      <DetailModal
        visible={showDetail}
        invoice={selectedInvoice}
        onClose={() => {
          setShowDetail(false);
          setSelectedInvoice("");
        }}
      />

      {/* Custom date picker */}
      <CustomDatePicker
        visible={showCustomPicker}
        onApply={handleCustomApply}
        onClose={() => setShowCustomPicker(false)}
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

  // Header
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
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

  // Range label
  rangeLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: "#ECFDF3",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  rangeLabelText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary,
  },

  // Summary card
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 14,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  summaryDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#F3F4F6",
  },
  summaryLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "600",
  },
  summaryValue: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
  },

  // Center state
  centerState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingBottom: 80,
  },
  centerStateText: {
    fontSize: 13,
    color: "#9CA3AF",
    marginTop: 4,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#9CA3AF",
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 12,
    color: "#D1D5DB",
    textAlign: "center",
    paddingHorizontal: 40,
  },

  // Transaction rows
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  txIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  txInfo: {
    flex: 1,
  },
  txId: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  txMeta: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
  },
  txRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  txTotal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  txMethodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  txMethodText: {
    fontSize: 10,
    fontWeight: "700",
  },
});
