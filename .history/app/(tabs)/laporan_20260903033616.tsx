import { useFocusEffect, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  ChevronRight,
  CreditCard,
  Download,
  Printer,
  Receipt,
  Smartphone,
  TrendingUp,
  User,
  Wallet,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Circle, Line, Path, Svg } from "react-native-svg";

import { Colors } from "@/constants/theme";
import {
  getExportExpenses,
  getExportProducts,
  getExportSummaryReport,
  getExportTransactionItems,
  getExportTransactions,
  getRecentTransactions,
  getReportSummary,
  getSalesChart,
  getTopProducts,
  getTransactionDetail,
  initDatabase,
  type RecentTransaction,
  type ReportPeriod,
  type ReportSummary,
  type SalesChartPoint,
  type TopProduct,
  type TransactionDetail,
} from "@/lib/database";
import { exportReportToExcel } from "@/services/export/ExcelExportService";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRupiah(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

const PERIODS: ReportPeriod[] = [
  "Hari Ini",
  "Minggu Ini",
  "Bulan Ini",
  "Custom",
];

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
    backgroundColor: Colors.secondary,
  },
  applyBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.white,
  },
});

// ---------------------------------------------------------------------------
// Sub components
// ---------------------------------------------------------------------------

function PeriodSelector({
  selected,
  onChange,
}: {
  selected: ReportPeriod;
  onChange: (p: ReportPeriod) => void;
}) {
  return (
    <View style={styles.periodRow}>
      {PERIODS.map((p) => {
        const active = selected === p;
        return (
          <Pressable
            key={p}
            onPress={() => onChange(p)}
            style={[styles.periodChip, active && styles.periodChipActive]}
          >
            {p === "Custom" && (
              <Calendar
                color={active ? Colors.white : "#6B7280"}
                size={12}
                style={{ marginRight: 4 }}
              />
            )}
            <Text
              style={[
                styles.periodChipText,
                active && styles.periodChipTextActive,
              ]}
            >
              {p}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

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

  useEffect(() => {
    if (visible) {
      const defaults = getDefaultDates();
      setStartText(defaults.start);
      setEndText(defaults.end);
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
      Alert.alert("Format tanggal salah", "Gunakan format DD/MM/YYYY");
      return;
    }
    onApply(s, e);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={dateStyles.overlay}>
        <View style={dateStyles.content}>
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
                onChangeText={setStartText}
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
                onChangeText={setEndText}
                placeholder="DD/MM/YYYY"
                placeholderTextColor="#C4C4C4"
                keyboardType="number-pad"
                maxLength={10}
              />
            </View>
          </View>

          <View style={dateStyles.footer}>
            <Pressable style={dateStyles.cancelBtn} onPress={onClose}>
              <Text style={dateStyles.cancelBtnText}>Batal</Text>
            </Pressable>
            <Pressable style={dateStyles.applyBtn} onPress={handleApply}>
              <Text style={dateStyles.applyBtnText}>Terapkan</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function SummaryCard({
  label,
  value,
  change,
  up,
  color,
  bg,
  icon: Icon,
}: {
  label: string;
  value: string;
  change: string;
  up: boolean;
  color: string;
  bg: string;
  icon: any;
}) {
  return (
    <View style={styles.summaryCard}>
      <View style={[styles.summaryIcon, { backgroundColor: bg }]}>
        <Icon color={color} size={18} />
      </View>
      <Text style={styles.summaryValue}>{value}</Text>
      <View style={styles.summaryFooter}>
        <View
          style={[
            styles.summaryChange,
            { backgroundColor: up ? "#E8F0FE" : "#FEF2F2" },
          ]}
        >
          {up ? (
            <ArrowUpRight color={Colors.primary} size={12} />
          ) : (
            <ArrowDownRight color="#DC2626" size={12} />
          )}
          <Text
            style={[
              styles.summaryChangeText,
              { color: up ? Colors.primary : "#DC2626" },
            ]}
          >
            {change}
          </Text>
        </View>
        <Text style={styles.summaryLabel}>{label}</Text>
      </View>
    </View>
  );
}

function SalesChart({
  data,
  period,
}: {
  data: SalesChartPoint[];
  period: ReportPeriod;
}) {
  const width = 340;
  const height = 140;
  const padding = 8;

  const maxValue = Math.max(...data.map((d) => d.value), 1);

  const points = data.map((d, idx) => {
    const x = padding + (idx * (width - padding * 2)) / (data.length - 1 || 1);
    const y = height - padding - (d.value / maxValue) * (height - padding * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const areaPath = `M ${points[0]} L ${points
    .slice(1)
    .map((p) => p)
    .join(" L ")} L ${width - padding},${height} L ${padding},${height} Z`;

  const badgeLabel =
    period === "Hari Ini"
      ? "Harian"
      : period === "Minggu Ini"
        ? "Mingguan"
        : "Bulanan";
  const subtitleLabel =
    period === "Hari Ini"
      ? "Per jam"
      : period === "Minggu Ini"
        ? "7 hari terakhir"
        : "4 minggu terakhir";

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardTitle}>Tren Penjualan</Text>
          <Text style={styles.cardSubtitle}>{subtitleLabel}</Text>
        </View>
        <View style={styles.cardBadge}>
          <Text style={styles.cardBadgeText}>{badgeLabel}</Text>
        </View>
      </View>

      {data.length === 0 || data.every((d) => d.value === 0) ? (
        <View
          style={{
            height: height,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 12, color: "#9CA3AF" }}>Belum ada data</Text>
        </View>
      ) : (
        <>
          <Svg width={width} height={height}>
            <Path d={areaPath} fill="#E8F0FE" />
            <Line
              x1={padding}
              y1={height - padding}
              x2={width - padding}
              y2={height - padding}
              stroke="#E5E7EB"
              strokeWidth={1}
            />
            <Path
              d={`M ${points.join(" L ")}`}
              fill="none"
              stroke={Colors.primary}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {points.map((p, idx) => {
              const [x, y] = p.split(",").map(Number);
              return (
                <Circle key={idx} cx={x} cy={y} r={3.5} fill={Colors.primary} />
              );
            })}
          </Svg>

          <View style={styles.chartLabels}>
            {data.map((d) => (
              <Text key={d.label} style={styles.chartLabel}>
                {d.label}
              </Text>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

function TopProducts({ data }: { data: TopProduct[] }) {
  const maxQty = data.length > 0 ? data[0].qty : 1;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Produk Terlaris</Text>
      <Text style={styles.cardSubtitle}>Berdasarkan jumlah terjual</Text>

      {data.length === 0 ? (
        <View style={{ paddingVertical: 20, alignItems: "center" }}>
          <Text style={{ fontSize: 12, color: "#9CA3AF" }}>Belum ada data</Text>
        </View>
      ) : (
        data.map((p, idx) => {
          const barPct = Math.max((p.qty / maxQty) * 100, 12);
          return (
            <View key={p.product_id} style={styles.topRow}>
              <Text style={styles.topRank}>{idx + 1}</Text>
              <View style={styles.topInfo}>
                <View style={styles.topInfoRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.topName}>{p.product_name}</Text>
                    {p.has_wholesale === 1 && (
                      <View style={styles.wholesaleBadgeSmall}>
                        <Text style={styles.wholesaleBadgeSmallText}>
                          Harga Grosir Aktif
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.topTotal}>{formatRupiah(p.total)}</Text>
                </View>
                <View style={styles.topBarTrack}>
                  <View
                    style={[
                      styles.topBarFill,
                      { width: `${barPct}%`, backgroundColor: Colors.primary },
                    ]}
                  />
                </View>
                <Text style={styles.topQty}>{p.qty} terjual</Text>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

function RecentTransactions({
  data,
  onSelect,
  onLihatSemua,
}: {
  data: RecentTransaction[];
  onSelect: (invoice: string) => void;
  onLihatSemua: () => void;
}) {
  function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.cardTitle}>Transaksi Terakhir</Text>
          <Text style={styles.cardSubtitle}>Transaksi terbaru</Text>
        </View>
        <Pressable onPress={onLihatSemua}>
          <Text style={styles.cardLinkText}>Lihat Semua</Text>
        </Pressable>
      </View>

      {data.length === 0 ? (
        <View style={{ paddingVertical: 20, alignItems: "center" }}>
          <Text style={{ fontSize: 12, color: "#9CA3AF" }}>
            Belum ada transaksi
          </Text>
        </View>
      ) : (
        data.map((t, idx) => (
          <Pressable
            key={t.invoice_number}
            style={[
              styles.txRow,
              idx !== data.length - 1 && styles.txRowDivider,
            ]}
            onPress={() => onSelect(t.invoice_number)}
          >
            <View style={styles.txIcon}>
              <Receipt color={Colors.primary} size={16} />
            </View>
            <View style={styles.txInfo}>
              <Text style={styles.txId}>{t.invoice_number}</Text>
              <Text style={styles.txMeta}>
                {formatTime(t.created_at)} · {t.item_count} item ·{" "}
                {t.payment_method}
              </Text>
            </View>
            <Text style={styles.txTotal}>{formatRupiah(t.total_amount)}</Text>
            <ChevronRight color="#D1D5DB" size={16} />
          </Pressable>
        ))
      )}
    </View>
  );
}

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
      if (printerService.isPrintingActive()) {
        return;
      }
      setPrinting(true);
      const printer = printerService.getActivePrinter();
      if (!printer) {
        Alert.alert("Error", "Printer tidak ditemukan");
        return;
      }
      const ran = await printerService.runWithPrintLock(async () => {
        await receiptFormatter.printReceipt(printer, detail);
      });
      if (ran) {
        Alert.alert("Berhasil", "Struk berhasil dikirim ke printer");
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

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
  }

  const METHOD_ICONS: Record<string, any> = {
    tunai: Wallet,
    transfer: CreditCard,
    qris: Smartphone,
    hutang: X,
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={detailStyles.overlay}>
        <View style={detailStyles.content}>
          {/* Handle */}
          <View style={detailStyles.handle} />

          {loading ? (
            <View style={{ paddingVertical: 60, alignItems: "center" }}>
              <ActivityIndicator color={Colors.primary} size="large" />
            </View>
          ) : !detail ? (
            <View style={{ paddingVertical: 60, alignItems: "center" }}>
              <Text style={{ fontSize: 14, color: "#9CA3AF" }}>
                Transaksi tidak ditemukan
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Header */}
              <View style={detailStyles.header}>
                <Text style={detailStyles.headerTitle}>Detail Transaksi</Text>
                <Pressable onPress={onClose} hitSlop={10}>
                  <X color="#6B7280" size={22} />
                </Pressable>
              </View>

              {/* Invoice */}
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
                          ? "#E8F0FE"
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
                  icon={User}
                  label="Kasir"
                  value={detail.cashier_name ?? "-"}
                />
                {detail.customer_name ? (
                  <DetailInfoRow
                    icon={User}
                    label="Pelanggan"
                    value={detail.customer_name}
                  />
                ) : null}
                <DetailInfoRow
                  icon={METHOD_ICONS[detail.payment_method] ?? Wallet}
                  label="Metode Pembayaran"
                  value={
                    detail.payment_method === "tunai"
                      ? "Tunai"
                      : detail.payment_method === "transfer"
                        ? "Transfer"
                        : detail.payment_method === "qris"
                          ? "QRIS"
                          : "Hutang"
                  }
                />
              </View>

              {/* Items */}
              <View style={detailStyles.card}>
                <Text style={detailStyles.sectionTitle}>Produk</Text>
                {detail.items.map((item, idx) => (
                  <View
                    key={idx}
                    style={[
                      detailStyles.itemRow,
                      idx !== detail.items.length - 1 &&
                        detailStyles.itemDivider,
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={detailStyles.itemName}>
                        {item.product_name}
                      </Text>
                      {item.pricing_type === "KONSINYASI" ? (
                        <View style={detailStyles.consignBox}>
                          <Text style={detailStyles.pricingLabel}>
                            Harga Jual:
                          </Text>
                          <Text style={detailStyles.consignPrice}>
                            {formatRupiah(item.unit_price)}
                          </Text>
                          <Text style={detailStyles.pricingLabel}>
                            Harga Konsinyasi:
                          </Text>
                          <Text style={detailStyles.consignPrice}>
                            {formatRupiah(item.consignor_price_snapshot ?? 0)}
                          </Text>
                          <Text style={detailStyles.pricingLabel}>
                            Subtotal ({item.quantity} item):
                          </Text>
                          <Text style={detailStyles.consignPrice}>
                            {formatRupiah(item.subtotal)}
                          </Text>
                          <Text style={detailStyles.pricingLabel}>
                            Keuntungan:
                          </Text>
                          <Text style={detailStyles.consignProfit}>
                            {formatRupiah(
                              (item.consignor_profit_snapshot ?? 0) *
                                item.quantity,
                            )}
                          </Text>
                        </View>
                      ) : item.pricing_type === "WHOLESALE" &&
                        item.wholesale_price_snapshot ? (
                        <View style={detailStyles.pricingBox}>
                          <Text style={detailStyles.pricingLabel}>
                            Harga Normal:
                          </Text>
                          <Text style={detailStyles.normalPrice}>
                            {formatRupiah(item.unit_price)}
                          </Text>
                          <Text style={detailStyles.pricingLabel}>
                            Harga Grosir (Dipakai):
                          </Text>
                          <Text style={detailStyles.wholesalePrice}>
                            {formatRupiah(item.wholesale_price_snapshot)}
                          </Text>
                          <Text style={detailStyles.qtyInfo}>
                            Qty: {item.quantity} item
                          </Text>
                        </View>
                      ) : (
                        <Text style={detailStyles.itemPrice}>
                          {formatRupiah(item.unit_price)} x {item.quantity}
                        </Text>
                      )}
                      {item.discount_amount > 0 && item.discount_name ? (
                        <Text style={detailStyles.itemDiscount}>
                          Diskon: {item.discount_name} (-
                          {formatRupiah(item.discount_amount)})
                        </Text>
                      ) : null}
                    </View>
                    <Text style={detailStyles.itemSubtotal}>
                      {formatRupiah(item.total)}
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
                  value={formatRupiah(detail.subtotal)}
                />
                {detail.discount_amount > 0 && (
                  <DetailSummaryRow
                    label="Diskon"
                    value={`-${formatRupiah(detail.discount_amount)}`}
                  />
                )}
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
                style={[
                  detailStyles.printBtn,
                  printing && detailStyles.printBtnDisabled,
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

              <View style={{ height: 30 }} />
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
    backgroundColor: "#E8F0FE",
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
          bold && { fontWeight: "800", fontSize: 16 },
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
    backgroundColor: "#E8F0FE",
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
  itemDiscount: {
    fontSize: 10.5,
    color: "#16A34A",
    fontWeight: "700",
    marginTop: 2,
  },
  pricingBox: {
    marginTop: 4,
    backgroundColor: "#ECFDF5",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 2,
  },
  pricingLabel: {
    fontSize: 10,
    color: "#15803D",
    fontWeight: "600",
  },
  normalPrice: {
    fontSize: 12,
    color: "#16A34A",
    fontWeight: "600",
  },
  wholesalePrice: {
    fontSize: 13,
    color: "#15803D",
    fontWeight: "800",
  },
  qtyInfo: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 2,
  },
  consignBox: {
    marginTop: 4,
    backgroundColor: "#F3E8FF",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 2,
  },
  consignPrice: {
    fontSize: 12,
    color: "#7C3AED",
    fontWeight: "600",
  },
  consignProfit: {
    fontSize: 13,
    color: "#6B21A8",
    fontWeight: "800",
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
    backgroundColor: "#E8F0FE",
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

export default function LaporanScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [period, setPeriod] = useState<ReportPeriod>("Hari Ini");
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const [summary, setSummary] = useState<ReportSummary>({
    omset: 0,
    labaKotor: 0,
    pengeluaran: 0,
    labaBersih: 0,
    jumlahTransaksi: 0,
    itemTerjual: 0,
  });
  const [chartData, setChartData] = useState<SalesChartPoint[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [recentTx, setRecentTx] = useState<RecentTransaction[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState("");
  const [showDetail, setShowDetail] = useState(false);
  const [exporting, setExporting] = useState(false);

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

  const toIsoDate = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate(),
    ).padStart(2, "0")}`;

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await initDatabase();
      const now = new Date();
      const today = toIsoDate(now);

      let start: string;
      let end: string;
      if (period === "Hari Ini") {
        start = today;
        end = today;
      } else if (period === "Minggu Ini") {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(now);
        monday.setDate(diff);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        start = toIsoDate(monday);
        end = toIsoDate(sunday);
      } else if (period === "Bulan Ini") {
        start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
          2,
          "0",
        )}-01`;
        const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        end = toIsoDate(last);
      } else {
        start = customStart || today;
        end = customEnd || today;
      }

      const [summary, transactions, items, expenses, products] =
        await Promise.all([
          getExportSummaryReport(period, customStart, customEnd),
          getExportTransactions(period, customStart, customEnd),
          getExportTransactionItems(period, customStart, customEnd),
          getExportExpenses(period, customStart, customEnd),
          getExportProducts(period, customStart, customEnd),
        ]);

      const { uri } = await exportReportToExcel({
        startDate: start,
        endDate: end,
        isSingleDay: start === end,
        summary,
        transactions,
        items,
        expenses,
        products,
      });

      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert("Export", "Berbagi file tidak tersedia di perangkat ini.");
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        dialogTitle: "Export Laporan Excel",
        UTI: "org.openxmlformats.spreadsheetml.sheet",
      });
    } catch (e: any) {
      Alert.alert(
        "Export Gagal",
        e?.message ??
          "Terjadi kesalahan saat membuat file Excel. Silakan coba lagi.",
      );
    } finally {
      setExporting(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      (async () => {
        await initDatabase();
        const [s, c, tp, rt] = await Promise.all([
          getReportSummary(period, customStart, customEnd),
          getSalesChart(period, customStart, customEnd),
          getTopProducts(period, 5, customStart, customEnd),
          getRecentTransactions(period, 10, customStart, customEnd),
        ]);
        setSummary(s);
        setChartData(c);
        setTopProducts(tp);
        setRecentTx(rt);
      })();
    }, [period, customStart, customEnd]),
  );

  // Date badge label
  function dateLabel() {
    const now = new Date();
    const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "Mei",
      "Jun",
      "Jul",
      "Agu",
      "Sep",
      "Okt",
      "Nov",
      "Des",
    ];
    return `${days[now.getDay()]}, ${now.getDate()} ${months[now.getMonth()]}`;
  }

  const summaryData = [
    {
      key: "omset",
      label: "Omset",
      value: formatRupiah(summary.omset),
      change: "",
      up: true,
      color: Colors.primary,
      bg: "#E8F0FE",
      icon: Wallet,
    },
    {
      key: "pengeluaran",
      label: "Pengeluaran",
      value: formatRupiah(summary.pengeluaran),
      change: "",
      up: false,
      color: "#DC2626",
      bg: "#FEF2F2",
      icon: Wallet,
    },
    {
      key: "labaKotor",
      label: "Laba Kotor",
      value: formatRupiah(summary.labaKotor),
      change: "",
      up: true,
      color: "#2563EB",
      bg: "#EFF6FF",
      icon: TrendingUp,
    },
    {
      key: "labaBersih",
      label: "Laba Bersih",
      value: formatRupiah(summary.labaBersih),
      change: "",
      up: true,
      color: "#16A34A",
      bg: "#ECFDF5",
      icon: TrendingUp,
    },
  ];

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        paddingHorizontal: 16,
        paddingBottom: 160,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerTitle}>Laporan</Text>
          <Text style={styles.headerSubtitle}>Ringkasan penjualan warung</Text>
        </View>
        {/* Export Excel */}
        <Pressable
          style={({ pressed }) => [
            styles.exportBtn,
            (pressed || exporting) && styles.exportBtnPressed,
          ]}
          onPress={handleExport}
          disabled={exporting}
        >
          {exporting ? (
            <>
              <ActivityIndicator size="small" color={Colors.white} />
              <Text style={styles.exportBtnText}>Menyiapkan laporan...</Text>
            </>
          ) : (
            <>
              <Download color={Colors.white} size={18} />
              <Text style={styles.exportBtnText}>Export Excel</Text>
            </>
          )}
        </Pressable>
        <View style={styles.dateBadge}>
          <Calendar color={Colors.primary} size={14} />
          <Text style={styles.dateBadgeText}>{dateLabel()}</Text>
        </View>
      </View>

      {/* Period selector */}
      <PeriodSelector selected={period} onChange={handlePeriodChange} />

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

      {/* Summary grid */}
      <View style={styles.summaryGrid}>
        {summaryData.map((s) => {
          const { key, ...props } = s;
          return <SummaryCard key={key} {...props} />;
        })}
      </View>

      {/* Chart */}
      <SalesChart data={chartData} period={period} />

      {/* Top products */}
      <TopProducts data={topProducts} />

      {/* Recent transactions */}
      <RecentTransactions
        data={recentTx}
        onSelect={(inv) => {
          setSelectedInvoice(inv);
          setShowDetail(true);
        }}
        onLihatSemua={() => router.push("/history" as any)}
      />

      {/* Detail modal */}
      <DetailModal
        visible={showDetail}
        invoice={selectedInvoice}
        onClose={() => {
          setShowDetail(false);
          setSelectedInvoice("");
        }}
      />

      <CustomDatePicker
        visible={showCustomPicker}
        onApply={handleCustomApply}
        onClose={() => setShowCustomPicker(false)}
      />
    </ScrollView>
  );
}

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
    backgroundColor: "#F3F4F6",
    marginBottom: 14,
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
  dateBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.white,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  dateBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
  },

  // Export Excel
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.secondary,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 16,
  },
  exportBtnPressed: {
    opacity: 0.85,
  },
  exportBtnText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: "700",
  },

  // Period selector
  periodRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  periodChip: {
    flex: 1,
    minWidth: 90,
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  periodChipActive: {
    backgroundColor: Colors.secondary,
  },
  periodChipText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#6B7280",
  },
  periodChipTextActive: {
    color: Colors.white,
  },
  rangeLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E8F0FE",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 12,
  },
  rangeLabelText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary,
  },

  // Summary grid
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  summaryIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  summaryFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryChange: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
  },
  summaryChangeText: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  summaryLabel: {
    fontSize: 11,
    color: "#9CA3AF",
  },

  // Card
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  cardSubtitle: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
  },
  cardBadge: {
    backgroundColor: "#E8F0FE",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  cardBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.primary,
  },
  cardLinkText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary,
  },

  // Chart
  chartLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  chartLabel: {
    fontSize: 10.5,
    color: "#9CA3AF",
  },

  // Top products
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
  },
  topRank: {
    width: 24,
    fontSize: 13,
    fontWeight: "800",
    color: "#9CA3AF",
    textAlign: "center",
  },
  topInfo: {
    flex: 1,
    gap: 5,
  },
  topInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  topTotal: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#111827",
  },
  topBarTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#F3F4F6",
    overflow: "hidden",
  },
  topBarFill: {
    height: 6,
    borderRadius: 3,
  },
  topQty: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  wholesaleBadgeSmall: {
    marginTop: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  wholesaleBadgeSmallText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#16A34A",
  },

  // Recent transactions
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
  },
  txRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  txIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#E8F0FE",
    alignItems: "center",
    justifyContent: "center",
  },
  txInfo: {
    flex: 1,
  },
  txId: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  txMeta: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2,
  },
  txTotal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
});
