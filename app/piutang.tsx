import { useFocusEffect, useRouter } from "expo-router";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  HandCoins,
  ReceiptText,
  TriangleAlert,
  Users,
  Wallet,
} from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";
import {
  getPiutangList,
  getPiutangSummary,
  initDatabase,
  type PiutangListItem,
  type PiutangSummary,
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

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return `${String(d.getDate()).padStart(2, "0")}/${String(
      d.getMonth() + 1,
    ).padStart(2, "0")}/${d.getFullYear()}`;
  } catch {
    return iso;
  }
}

function statusMeta(status: string) {
  switch (status) {
    case "LUNAS":
      return { label: "Lunas", color: "#16A34A", bg: "#ECFDF5" };
    case "SEBAGIAN":
      return { label: "Sebagian", color: "#D97706", bg: "#FFFBEB" };
    default:
      return { label: "Belum Lunas", color: "#DC2626", bg: "#FEF2F2" };
  }
}

const EMPTY_SUMMARY: PiutangSummary = {
  totalPiutang: 0,
  belumDibayar: 0,
  jatuhTempo: 0,
  jumlahPelangganPiutang: 0,
};

export default function PiutangScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [summary, setSummary] = useState<PiutangSummary>(EMPTY_SUMMARY);
  const [list, setList] = useState<PiutangListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      await initDatabase();
      const [s, l] = await Promise.all([getPiutangSummary(), getPiutangList()]);
      setSummary(s);
      setList(l);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const summaryCards = [
    {
      key: "total",
      label: "Total Piutang",
      value: formatRupiahShort(summary.totalPiutang),
      icon: HandCoins,
      color: Colors.primary,
      bg: "#E8F0FE",
    },
    {
      key: "belum",
      label: "Belum Dibayar",
      value: formatRupiahShort(summary.belumDibayar),
      icon: Wallet,
      color: "#DC2626",
      bg: "#FEF2F2",
    },
    {
      key: "jatuh",
      label: "Jatuh Tempo",
      value: formatRupiahShort(summary.jatuhTempo),
      icon: CalendarClock,
      color: "#D97706",
      bg: "#FFFBEB",
    },
    {
      key: "pelanggan",
      label: "Pelanggan Piutang",
      value: String(summary.jumlahPelangganPiutang),
      icon: Users,
      color: "#0891B2",
      bg: "#ECFEFF",
    },
  ];

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
          <Text style={styles.headerTitle}>Piutang</Text>
          <Text style={styles.headerSubtitle}>
            Kelola transaksi yang belum dibayar pelanggan
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 100,
            paddingTop: 4,
          }}
          ListHeaderComponent={
            <View>
              {/* Summary grid */}
              <View style={styles.summaryGrid}>
                {summaryCards.map((c) => {
                  const Icon = c.icon;
                  return (
                    <View key={c.key} style={styles.summaryCard}>
                      <View
                        style={[
                          styles.summaryIcon,
                          { backgroundColor: c.bg },
                        ]}
                      >
                        <Icon color={c.color} size={18} />
                      </View>
                      <Text style={styles.summaryValue}>{c.value}</Text>
                      <Text style={styles.summaryLabel}>{c.label}</Text>
                    </View>
                  );
                })}
              </View>

              {/* Overdue banner */}
              {summary.jatuhTempo > 0 && (
                <View style={styles.overdueBanner}>
                  <TriangleAlert color="#D97706" size={18} />
                  <Text style={styles.overdueBannerText}>
                    Ada {formatRupiah(summary.jatuhTempo)} piutang yang melewati
                    tanggal jatuh tempo.
                  </Text>
                </View>
              )}

              <Text style={styles.listLabel}>DAFTAR PIUTANG</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.centerEmpty}>
              <ReceiptText color={Colors.neutral} size={40} />
              <Text style={styles.emptyTitle}>Belum ada piutang</Text>
              <Text style={styles.emptySubtitle}>
                Transaksi dengan metode pembayaran Hutang akan muncul di sini
              </Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          renderItem={({ item }) => {
            const isOpen = item.remaining_amount > 0;
            const status = item.status === "PAID" ? "LUNAS" : item.status === "PARTIAL" ? "SEBAGIAN" : "BELUM";
            const meta = statusMeta(status);
            return (
              <Pressable
                style={styles.card}
                onPress={() =>
                  router.push(`/piutang-detail?id=${item.id}` as any)
                }
              >
                <View style={styles.cardTop}>
                  <View style={styles.customerBlock}>
                    <Text style={styles.customerName} numberOfLines={1}>
                      {item.customer_name}
                    </Text>
                    <Text style={styles.invoice}>{item.invoice_number}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: meta.bg }]}>
                    <Text style={[styles.statusText, { color: meta.color }]}>
                      {meta.label}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardRow}>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Tanggal</Text>
                    <Text style={styles.metaValue}>
                      {formatDate(item.created_at)}
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Jatuh Tempo</Text>
                    <Text
                      style={[
                        styles.metaValue,
                        item.has_overdue && { color: "#DC2626" },
                      ]}
                    >
                      {item.due_date ? formatDate(item.due_date) : "-"}
                    </Text>
                  </View>
                </View>

                <View style={styles.moneyRow}>
                  <View style={styles.moneyItem}>
                    <Text style={styles.moneyLabel}>Total</Text>
                    <Text style={styles.moneyTotal}>
                      {formatRupiah(item.total_amount)}
                    </Text>
                  </View>
                  <View style={styles.moneyItem}>
                    <Text style={styles.moneyLabel}>Sudah Dibayar</Text>
                    <Text style={styles.moneyPaid}>
                      {formatRupiah(item.paid_amount)}
                    </Text>
                  </View>
                  <View style={styles.moneyItem}>
                    <Text style={styles.moneyLabel}>Sisa</Text>
                    <Text
                      style={[
                        styles.moneySisa,
                        isOpen && { color: "#DC2626" },
                      ]}
                    >
                      {formatRupiah(item.remaining_amount)}
                    </Text>
                  </View>
                </View>

                {isOpen && (
                  <View style={styles.cardFooter}>
                    <Text style={styles.cardFooterText}>
                      Tekan untuk melihat detail & bayar
                    </Text>
                    <ChevronRight color={Colors.neutral} size={16} />
                  </View>
                )}
              </Pressable>
            );
          }}
        />
      )}
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
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // Summary
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  summaryCard: {
    width: "48%",
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    flexGrow: 1,
  },
  summaryIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.neutral,
    marginTop: 2,
  },

  overdueBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  overdueBannerText: {
    flex: 1,
    fontSize: 12,
    color: "#92400E",
    lineHeight: 18,
  },

  listLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.neutral,
    marginBottom: 10,
    letterSpacing: 0.5,
  },

  centerEmpty: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 40,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151",
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12,
    color: Colors.neutral,
    marginTop: 4,
    textAlign: "center",
  },

  // Card
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  customerBlock: {
    flex: 1,
    marginRight: 10,
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
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  cardRow: {
    flexDirection: "row",
    gap: 20,
    marginTop: 12,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  metaValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginTop: 2,
  },
  moneyRow: {
    flexDirection: "row",
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 12,
    gap: 8,
  },
  moneyItem: {
    flex: 1,
  },
  moneyLabel: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  moneyTotal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    marginTop: 2,
  },
  moneyPaid: {
    fontSize: 13,
    fontWeight: "600",
    color: "#16A34A",
    marginTop: 2,
  },
  moneySisa: {
    fontSize: 13,
    fontWeight: "700",
    color: "#374151",
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  cardFooterText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "600",
  },
});
