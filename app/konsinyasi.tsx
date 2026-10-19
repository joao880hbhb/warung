import { useFocusEffect, useRouter } from "expo-router";
import {
  ArrowRight,
  Boxes,
  ChevronLeft,
  ClipboardList,
  Plus,
  Share2,
  UserPlus,
  Users,
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
  getConsignmentSummary,
  initDatabase,
  type ConsignmentSummary,
  type Consignor,
  type Consignment,
  getAllConsignors,
  getAllConsignments,
} from "@/lib/database";

function formatRupiah(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

export default function KonsinyasiScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [summary, setSummary] = useState<ConsignmentSummary>({
    totalKonsinyasi: 0,
    totalTerjual: 0,
    totalTitipan: 0,
    bagiHasil: 0,
    keuntungan: 0,
    nilaiSisa: 0,
  });
  const [consignors, setConsignors] = useState<Consignor[]>([]);
  const [consignments, setConsignments] = useState<Consignment[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      await initDatabase();
      const [sum, cons, consign] = await Promise.all([
        getConsignmentSummary(),
        getAllConsignors(),
        getAllConsignments(),
      ]);
      setSummary(sum);
      setConsignors(cons);
      setConsignments(consign);
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

  const activeCount = consignments.filter(
    (c) => c.status === "ACTIVE" && c.qty_remaining > 0,
  ).length;

  const MENU = [
    {
      key: "tambah",
      label: "Buat Konsinyasi",
      subtitle: "Titipkan barang baru",
      icon: Plus,
      color: "#0891B2",
      bg: "#ECFEFF",
      route: "/tambah-konsinyasi",
    },
    {
      key: "transaksi",
      label: "Transaksi Konsinyasi",
      subtitle: "Daftar proses masuk / terjual",
      icon: Boxes,
      color: "#7C3AED",
      bg: "#F3E8FF",
      route: "/transaksi-konsinyasi",
    },
    {
      key: "laporan",
      label: "Laporan Konsinyasi",
      subtitle: "Bagi hasil & keuntungan per konsinyer",
      icon: ClipboardList,
      color: "#16A34A",
      bg: "#ECFDF5",
      route: "/laporan-konsinyasi",
    },
    {
      key: "konsinyer",
      label: "Data Konsinyer",
      subtitle: "Kelola pasangan titipan",
      icon: UserPlus,
      color: "#D97706",
      bg: "#FFFBEB",
      route: "/konsinyer",
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
        <Text style={styles.headerTitle}>Konsinyasi</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={MENU}
          keyExtractor={(item) => item.key}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListHeaderComponent={
            <View>
              {/* Ringkasan */}
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <SummaryItem
                    label="Konsinyasi Aktif"
                    value={String(activeCount)}
                    big
                  />
                  <SummaryItem
                    label="Barang Terjual"
                    value={String(summary.totalTerjual)}
                    big
                  />
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryGrid}>
                  <SummaryItem label="Total Titipan" value={formatRupiah(summary.totalTitipan)} />
                  <SummaryItem label="Bagi Hasil" value={formatRupiah(summary.bagiHasil)} />
                  <SummaryItem label="Keuntungan" value={formatRupiah(summary.keuntungan)} />
                  <SummaryItem label="Nilai Sisa" value={formatRupiah(summary.nilaiSisa)} />
                </View>
              </View>

              <Text style={styles.sectionLabel}>MENU</Text>
            </View>
          }
          ListFooterComponent={
            <View>
              {/* Konsinyer aktif */}
              <Text style={styles.sectionLabel}>
                KONSINYER AKTIF {consignors.length > 0 && `(${consignors.length})`}
              </Text>
              {consignors.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Users color="#9CA3AF" size={32} />
                  <Text style={styles.emptyTitle}>Belum ada konsinyer</Text>
                  <Text style={styles.emptySubtitle}>
                    Tambahkan konsinyer terlebih dahulu lewat menu
                    {"\u201C"}Data Konsinyer{"\u201D"}
                  </Text>
                </View>
              ) : (
                consignors.map((c) => (
                  <View key={c.id} style={styles.consignorCard}>
                    <View style={styles.consignorAvatar}>
                      <Share2 color={Colors.primary} size={16} />
                    </View>
                    <View style={styles.consignorInfo}>
                      <Text style={styles.consignorName}>{c.name}</Text>
                      {c.phone ? (
                        <Text style={styles.consignorPhone}>{c.phone}</Text>
                      ) : null}
                    </View>
                  </View>
                ))
              )}
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.menuList}>
              <Pressable
                style={({ pressed }) => [
                  styles.menuItem,
                  pressed && { opacity: 0.85 },
                ]}
                onPress={() => router.push(item.route as never)}
              >
                <View style={[styles.menuIcon, { backgroundColor: item.bg }]}>
                  <item.icon color={item.color} size={20} />
                </View>
                <View style={styles.menuInfo}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </View>
                <ArrowRight color="#9CA3AF" size={18} />
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}

function SummaryItem({
  label,
  value,
  big,
}: {
  label: string;
  value: string;
  big?: boolean;
}) {
  return (
    <View style={[styles.summaryItem, big && { flex: 1 }]}>
      <Text style={[styles.summaryValue, big && styles.summaryValueBig]}>
        {value}
      </Text>
      <Text style={styles.summaryLabel}>{label}</Text>
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
  },
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 12,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 14,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  summaryItem: {
    width: "50%",
    marginBottom: 12,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  summaryValueBig: {
    fontSize: 22,
    color: Colors.primary,
  },
  summaryLabel: {
    fontSize: 11,
    color: Colors.neutral,
    marginTop: 2,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.neutral,
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  menuList: {
    marginHorizontal: 16,
    marginBottom: 10,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  menuIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  menuInfo: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  menuSubtitle: {
    fontSize: 12,
    color: Colors.neutral,
    marginTop: 2,
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
  emptySubtitle: {
    fontSize: 12,
    color: Colors.neutral,
    textAlign: "center",
  },
  consignorCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    marginHorizontal: 16,
    marginBottom: 8,
    gap: 12,
  },
  consignorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E8F0FE",
    alignItems: "center",
    justifyContent: "center",
  },
  consignorInfo: {
    flex: 1,
  },
  consignorName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  consignorPhone: {
    fontSize: 12,
    color: Colors.neutral,
    marginTop: 2,
  },
});
