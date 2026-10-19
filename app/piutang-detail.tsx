import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import {
    CalendarDays,
    Check,
    ChevronLeft,
    Clock,
    HandCoins,
    ReceiptText,
    X,
} from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
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
    getPiutangDetail,
    initDatabase,
    payPiutang,
    updatePiutangDueDate,
    type PiutangDetail,
    type PiutangStatus,
} from "@/lib/database";

function formatRupiah(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

function formatDateTime(iso: string) {
  try {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
  } catch {
    return iso;
  }
}

function statusMeta(status: PiutangStatus) {
  switch (status) {
    case "PAID":
      return { label: "Lunas", color: "#16A34A", bg: "#ECFDF5" };
    case "PARTIAL":
      return { label: "Sebagian", color: "#D97706", bg: "#FFFBEB" };
    default:
      return { label: "Belum Lunas", color: "#DC2626", bg: "#FEF2F2" };
  }
}

function parseRupiahInput(text: string) {
  const nums = text.replace(/[^0-9]/g, "");
  if (!nums) return "";
  return parseInt(nums, 10).toLocaleString("id-ID");
}

function isoToDdMmYyyy(iso: string | null | undefined): string {
  if (!iso) return "";
  const m = iso.slice(0, 10).split("-");
  if (m.length !== 3) return iso;
  return `${m[2]}/${m[1]}/${m[0]}`;
}

function ddMmYyyyToIso(text: string): string | null {
  const parts = text.split("/");
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts.map(Number);
  if (!dd || !mm || !yyyy) return null;
  if (dd < 1 || dd > 31 || mm < 1 || mm > 12 || yyyy < 2000) return null;
  return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

function sanitizeDateInput(text: string): string {
  // hanya angka dan slash, format DD/MM/YYYY
  let digits = text.replace(/[^0-9]/g, "");
  if (!digits) return "";
  let out = "";
  for (let i = 0; i < digits.length; i++) {
    if (i === 2 || i === 4) out += "/";
    out += digits[i];
  }
  return out.slice(0, 10);
}

function todayDdMmYyyy(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(
    d.getMonth() + 1,
  ).padStart(2, "0")}/${d.getFullYear()}`;
}

export default function PiutangDetailScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const piutangId = Number(id);

  const [detail, setDetail] = useState<PiutangDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPay, setShowPay] = useState(false);
  const [payText, setPayText] = useState("");
  const [paying, setPaying] = useState(false);
  const [showDueModal, setShowDueModal] = useState(false);
  const [dueText, setDueText] = useState("");
  const [savingDue, setSavingDue] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      await initDatabase();
      const data = await getPiutangDetail(piutangId);
      setDetail(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [piutangId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const payAmount = parseInt(payText.replace(/[^0-9]/g, ""), 10) || 0;
  const isOpen = !!detail && detail.remaining_amount > 0;
  const meta = statusMeta(detail?.status ?? "OPEN");
  const isDueOverdue =
    !!detail &&
    detail.remaining_amount > 0 &&
    !!detail.due_date &&
    detail.due_date < new Date().toISOString().slice(0, 10);

  const openPayModal = () => {
    setPayText("");
    setShowPay(true);
  };

  const handlePay = async () => {
    if (!detail || payAmount <= 0) {
      Alert.alert("Peringatan", "Masukkan nominal pembayaran");
      return;
    }
    if (payAmount > detail.remaining_amount) {
      Alert.alert(
        "Nominal Terlalu Besar",
        `Sisa piutang hanya ${formatRupiah(detail.remaining_amount)}`,
      );
      return;
    }
    setPaying(true);
    try {
      const result = await payPiutang(detail.id, payAmount);
      setShowPay(false);
      setPayText("");
      await load();
      Alert.alert(
        "Pembayaran Berhasil",
        result.status === "PAID"
          ? "Piutang telah lunas. Terima kasih!"
          : `Sisa piutang sekarang ${formatRupiah(result.remaining)}.`,
      );
    } catch (e: any) {
      Alert.alert("Gagal", e?.message ?? "Terjadi kesalahan");
    } finally {
      setPaying(false);
    }
  };

  const openDueModal = () => {
    setDueText(isoToDdMmYyyy(detail?.due_date) || todayDdMmYyyy());
    setShowDueModal(true);
  };

  const handleSaveDue = async () => {
    if (!detail) return;
    const iso = ddMmYyyyToIso(dueText);
    if (!iso) {
      Alert.alert("Tanggal Tidak Valid", "Gunakan format DD/MM/YYYY");
      return;
    }
    setSavingDue(true);
    try {
      await updatePiutangDueDate(detail.id, iso);
      setShowDueModal(false);
      await load();
      Alert.alert("Berhasil", "Tanggal jatuh tempo diperbarui");
    } catch (e: any) {
      Alert.alert("Gagal", e?.message ?? "Terjadi kesalahan");
    } finally {
      setSavingDue(false);
    }
  };

  if (loading) {
    return (
      <View
        style={[styles.screen, styles.center, { paddingTop: insets.top + 12 }]}
      >
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  if (!detail) {
    return (
      <View
        style={[styles.screen, styles.center, { paddingTop: insets.top + 12 }]}
      >
        <ReceiptText color={Colors.neutral} size={40} />
        <Text style={styles.emptyTitle}>Piutang tidak ditemukan</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Kembali</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Pressable
          style={styles.headerBackBtn}
          onPress={() => router.back()}
          hitSlop={10}
        >
          <ChevronLeft color="#111827" size={24} />
        </Pressable>
        <View style={styles.headerTitles}>
          <Text style={styles.headerTitle}>Detail Piutang</Text>
          <Text style={styles.headerSubtitle}>{detail.invoice_number}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
          <Text style={[styles.statusText, { color: meta.color }]}>
            {meta.label}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Customer */}
        <View style={styles.customerCard}>
          <View style={styles.customerLabel}>
            <Text style={styles.customerLabelText}>
              {detail.customer_name[0]?.toUpperCase() ?? "?"}
            </Text>
          </View>
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>{detail.customer_name}</Text>
            <Text style={styles.invoice}>{detail.invoice_number}</Text>
          </View>
          <View style={styles.dateBlock}>
            <Text style={styles.dateLabel}>Tanggal</Text>
            <Text style={styles.dateValue}>
              {formatDateTime(detail.created_at)}
            </Text>
          </View>
        </View>

        {/* Summary piutang */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>Total Piutang</Text>
            <Text style={styles.summaryTotal}>
              Rp {formatRupiah(detail.total_amount)}
            </Text>
          </View>
          <View style={styles.summaryCol}>
            <Text style={styles.summaryLabel}>Sisa Piutang</Text>
            <Text
              style={[
                styles.summarySisa,
                isOpen ? { color: "#DC2626" } : { color: "#16A34A" },
              ]}
            >
              {formatRupiah(detail.remaining_amount)}
            </Text>
          </View>
          <Pressable style={styles.summaryCol} onPress={openDueModal}>
            <Text style={styles.summaryLabel}>Jatuh Tempo</Text>
            <View style={styles.dueRow}>
              <Text
                style={[
                  styles.summaryValue,
                  isDueOverdue && { color: "#DC2626" },
                ]}
              >
                {detail.due_date
                  ? formatDateTime(detail.due_date).slice(0, 10)
                  : "-"}
              </Text>
              <CalendarDays color={Colors.primary} size={14} />
            </View>
          </Pressable>
        </View>

        {/* Detail transaksi */}
        <Text style={styles.sectionLabel}>DETAIL TRANSAKSI</Text>
        <View style={styles.itemsCard}>
          {detail.items.map((item, idx) => (
            <View
              key={idx}
              style={[
                styles.itemRow,
                idx < detail.items.length - 1 && styles.itemRowDivider,
              ]}
            >
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.product_name}
                </Text>
                <Text style={styles.itemMeta}>
                  {item.quantity} x {formatRupiah(item.unit_price)}
                  {item.discount_amount > 0
                    ? ` (-${formatRupiah(item.discount_amount)})`
                    : ""}
                </Text>
              </View>
              <Text style={styles.itemTotal}>{formatRupiah(item.total)}</Text>
            </View>
          ))}
          <View style={styles.itemsFooter}>
            <Text style={styles.itemsFooterLabel}>Total</Text>
            <Text style={styles.itemsFooterValue}>
              {formatRupiah(detail.total_amount)}
            </Text>
          </View>
        </View>

        {/* Riwayat pembayaran */}
        <Text style={styles.sectionLabel}>RIWAYAT PEMBAYARAN</Text>
        {detail.payments.length === 0 ? (
          <View style={styles.emptyHistory}>
            <Clock color={Colors.neutral} size={20} />
            <Text style={styles.emptyHistoryText}>Belum ada pembayaran</Text>
          </View>
        ) : (
          <View style={styles.paymentsCard}>
            {detail.payments.map((p, idx) => (
              <View
                key={p.id || `p-${idx}`}
                style={[
                  styles.paymentRow,
                  idx < detail.payments.length - 1 && styles.paymentRowDivider,
                ]}
              >
                <View
                  style={[styles.paymentIcon, { backgroundColor: "#ECFDF5" }]}
                >
                  <HandCoins color="#16A34A" size={16} />
                </View>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentAmount}>
                    {formatRupiah(p.amount)}
                  </Text>
                  <Text style={styles.paymentMeta}>
                    {formatDateTime(p.created_at)}
                    {p.note ? ` · ${p.note}` : ""}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Footer: Bayar Piutang */}
      {isOpen && (
        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom + 12, 20) },
          ]}
        >
          <Pressable style={styles.payBtn} onPress={openPayModal}>
            <HandCoins color={Colors.white} size={20} />
            <Text style={styles.payBtnText}>Bayar Piutang</Text>
          </Pressable>
        </View>
      )}

      {/* Pay modal */}
      <Modal
        visible={showPay}
        animationType="slide"
        transparent
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={modalStyles.overlay}>
            <View
              style={[
                modalStyles.content,
                { paddingBottom: Math.max(insets.bottom, 16) + 20 },
              ]}
            >
              <View style={modalStyles.handle} />
              <View style={modalStyles.header}>
                <Text style={modalStyles.title}>Bayar Piutang</Text>
                <Pressable onPress={() => setShowPay(false)} hitSlop={10}>
                  <X color="#6B7280" size={22} />
                </Pressable>
              </View>

              <View style={modalStyles.infoCard}>
                <View style={modalStyles.infoRow}>
                  <Text style={modalStyles.infoLabel}>Pelanggan</Text>
                  <Text style={modalStyles.infoValue}>
                    {detail.customer_name}
                  </Text>
                </View>
                <View style={modalStyles.infoRow}>
                  <Text style={modalStyles.infoLabel}>Total Piutang</Text>
                  <Text style={modalStyles.infoValue}>
                    {formatRupiah(detail.total_amount)}
                  </Text>
                </View>
                <View style={modalStyles.infoRow}>
                  <Text style={modalStyles.infoLabel}>Sudah Dibayar</Text>
                  <Text style={modalStyles.infoValue}>
                    {formatRupiah(detail.paid_amount)}
                  </Text>
                </View>
                <View style={[modalStyles.infoRow, modalStyles.infoRowLast]}>
                  <Text style={modalStyles.infoLabel}>Sisa Piutang</Text>
                  <Text style={modalStyles.sisaValue}>
                    {formatRupiah(detail.remaining_amount)}
                  </Text>
                </View>
              </View>

              <View style={modalStyles.section}>
                <Text style={modalStyles.sectionLabel}>NOMINAL PEMBAYARAN</Text>
                <View style={modalStyles.inputRow}>
                  <Text style={modalStyles.inputPrefix}>Rp</Text>
                  <TextInput
                    style={modalStyles.inputField}
                    value={payText}
                    onChangeText={(t) => setPayText(parseRupiahInput(t))}
                    placeholder="0"
                    placeholderTextColor="#C4C4C4"
                    keyboardType="number-pad"
                    autoFocus
                  />
                  {payText.length > 0 && (
                    <Pressable onPress={() => setPayText("")} hitSlop={6}>
                      <X color="#9CA3AF" size={16} />
                    </Pressable>
                  )}
                </View>
                <View style={modalStyles.quickRow}>
                  <Pressable
                    style={modalStyles.quickBtn}
                    onPress={() =>
                      setPayText(
                        parseRupiahInput(String(detail.remaining_amount)),
                      )
                    }
                  >
                    <Text style={modalStyles.quickBtnText}>Lunasi</Text>
                  </Pressable>
                </View>
                {payAmount > 0 && (
                  <View style={modalStyles.sisaAfter}>
                    <Text style={modalStyles.sisaAfterLabel}>
                      Sisa setelah pembayaran
                    </Text>
                    <Text style={modalStyles.sisaAfterValue}>
                      {formatRupiah(
                        Math.max(detail.remaining_amount - payAmount, 0),
                      )}
                    </Text>
                  </View>
                )}
              </View>

              <Pressable
                style={({ pressed }) => [
                  modalStyles.confirmBtn,
                  pressed && { opacity: 0.85 },
                ]}
                onPress={handlePay}
                disabled={paying}
              >
                {paying ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Check color={Colors.white} size={18} />
                )}
                <Text style={modalStyles.confirmBtnText}>
                  {paying ? "Memproses..." : "Konfirmasi Pembayaran"}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit jatuh tempo modal */}
      <Modal
        visible={showDueModal}
        animationType="slide"
        transparent
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={modalStyles.overlay}>
            <View
              style={[
                modalStyles.content,
                { paddingBottom: Math.max(insets.bottom, 16) + 20 },
              ]}
            >
              <View style={modalStyles.handle} />
              <View style={modalStyles.header}>
                <Text style={modalStyles.title}>Ubah Jatuh Tempo</Text>
                <Pressable onPress={() => setShowDueModal(false)} hitSlop={10}>
                  <X color="#6B7280" size={22} />
                </Pressable>
              </View>

              <View style={modalStyles.section}>
                <Text style={modalStyles.sectionLabel}>
                  TANGGAL JATUH TEMPO
                </Text>
                <View style={modalStyles.inputRow}>
                  <CalendarDays color={Colors.primary} size={18} />
                  <TextInput
                    style={modalStyles.inputField}
                    value={dueText}
                    onChangeText={(t) => setDueText(sanitizeDateInput(t))}
                    placeholder="DD/MM/YYYY"
                    placeholderTextColor="#C4C4C4"
                    keyboardType="number-pad"
                    autoFocus
                  />
                </View>
                <Text style={modalStyles.hint}>
                  Format: tanggal/bulan/tahun (contoh 25/12/2026)
                </Text>
              </View>

              <Pressable
                style={({ pressed }) => [
                  modalStyles.confirmBtn,
                  pressed && { opacity: 0.85 },
                ]}
                onPress={handleSaveDue}
                disabled={savingDue}
              >
                {savingDue ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Check color={Colors.white} size={18} />
                )}
                <Text style={modalStyles.confirmBtnText}>
                  {savingDue ? "Menyimpan..." : "Simpan Jatuh Tempo"}
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
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
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
  },
  backBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  backBtnText: {
    color: Colors.white,
    fontWeight: "700",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  headerBackBtn: {
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
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 110,
  },

  // Customer
  customerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  customerLabel: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  customerLabelText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  invoice: {
    fontSize: 12,
    color: Colors.neutral,
    marginTop: 2,
  },
  dateBlock: {
    alignItems: "flex-end",
  },
  dateLabel: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  dateValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    marginTop: 2,
  },

  // Summary
  summaryCard: {
    flexDirection: "row",
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
  },
  summaryCol: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  summaryTotal: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.primary,
    marginTop: 4,
  },
  summarySisa: {
    fontSize: 15,
    fontWeight: "800",
    marginTop: 4,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginTop: 4,
  },
  dueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },

  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.neutral,
    marginBottom: 8,
    letterSpacing: 0.5,
  },

  // Items
  itemsCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 18,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  itemRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  itemInfo: {
    flex: 1,
    marginRight: 10,
  },
  itemName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  itemMeta: {
    fontSize: 11,
    color: Colors.neutral,
    marginTop: 2,
  },
  itemTotal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
  },
  itemsFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 10,
    marginTop: 4,
  },
  itemsFooterLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  itemsFooterValue: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.primary,
  },

  // Payments
  paymentsCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  paymentRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  paymentIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentInfo: {
    flex: 1,
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: "#16A34A",
  },
  paymentMeta: {
    fontSize: 11,
    color: Colors.neutral,
    marginTop: 2,
  },
  emptyHistory: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
  },
  emptyHistoryText: {
    fontSize: 13,
    color: Colors.neutral,
  },

  // Footer
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  payBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Colors.secondary,
    borderRadius: 16,
    paddingVertical: 16,
  },
  payBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
});

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
    paddingHorizontal: 20,
  },
  handle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#E5E7EB",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 14,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  infoCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 16,
    marginBottom: 18,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  infoRowLast: {
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    marginTop: 6,
    paddingTop: 10,
  },
  infoLabel: {
    fontSize: 13,
    color: Colors.neutral,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  sisaValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#DC2626",
  },
  section: {
    marginBottom: 18,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.neutral,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
  },
  inputPrefix: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.neutral,
    marginRight: 8,
  },
  hint: {
    fontSize: 12,
    color: Colors.neutral,
    marginTop: 8,
  },
  inputField: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  quickRow: {
    flexDirection: "row",
    marginTop: 10,
  },
  quickBtn: {
    backgroundColor: "#E8F0FE",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  quickBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.primary,
  },
  sisaAfter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    backgroundColor: "#ECFDF5",
    borderRadius: 10,
    padding: 12,
  },
  sisaAfterLabel: {
    fontSize: 13,
    color: "#15803D",
  },
  sisaAfterValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#15803D",
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Colors.secondary,
    borderRadius: 16,
    paddingVertical: 16,
  },
  confirmBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
});
