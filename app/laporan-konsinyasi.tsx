import { useFocusEffect, useRouter } from "expo-router";
import {
  ChevronLeft,
  ClipboardList,
  Handshake,
  TrendingUp,
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
  getConsignmentSummary,
  getPerConsignorSummaries,
  initDatabase,
  type ConsignmentSummary,
  type PerConsignorSummary,
} from "@/lib/database";

function formatRupiah(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

export default function LaporanKonsinyasiScreen() {
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
  const [perConsignor, setPerConsignor] = useState<PerConsignorSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      await initDatabase();
      const [sum, per] = await Promise.all([
        getConsignmentSummary(),
        getPerConsignorSummaries(),
      ]);
      setSummary(sum);
      setPerConsignor(per);
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
        <Text style={styles.headerTitle}>Laporan Konsinyasi</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={perConsignor}
          keyExtractor={(item) => String(item.consignor_id)}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 100,
            paddingTop: 12,
          }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          ListHeaderComponent={
            <View>
              {/* Ringkasan Keseluruhan */}
              <View style={styles.overallCard}>
                <Text style={styles.overallTitle}>RINGKASAN KESELURUHAN</Text>
                <OverallRow
                  icon={ClipboardList}
                  color="#0891B2"
                  label="Total Konsinyasi"
                  value={String(summary.totalKonsinyasi)}
                />
                <OverallRow
                  icon={TrendingUp}
                  color="#16A34A"
                  label="Barang Terjual"
                  value={String(summary.totalTerjual)}
                />
                <OverallRow
                  icon={Wallet}
                  color="#D97706"
                  label="Total Titipan"
                  value={formatRupiah(summary.totalTitipan)}
                />
                <OverallRow
                  icon={Handshake}
                  color="#7C3AED"
                  label="Bagi Hasil (Hak Konsinyer)"
                  value={formatRupiah(summary.bagiHasil)}
                />
                <OverallRow
                  icon={TrendingUp}
                  color="#16A34A"
                  label="Keuntungan Toko"
                  value={formatRupiah(summary.keuntungan)}
                />
                <OverallRow
                  icon={Wallet}
                  color="#DC2626"
                  label="Nilai Sisa (Belum Terjual)"
                  value={formatRupiah(summary.nilaiSisa)}
                />
              </View>

              <Text style={styles.sectionLabel}>PER KONSINYER</Text>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <ClipboardList color={Colors.neutral} size={40} />
              <Text style={styles.emptyTitle}>Belum ada data konsinyasi</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.consignorCard}>
              <View style={styles.consignorHeader}>
                <View style={styles.avatar}>
                  <Handshake color={Colors.primary} size={16} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.name}</Text>
                  {item.phone ? (
                    <Text style={styles.phone}>{item.phone}</Text>
                  ) : null}
                </View>
                <Text style={styles.count}>
                  {item.totalKonsinyasi} konsinyasi
                </Text>
              </View>

              <View style={styles.bigNumbers}>
                <BigNumber
                  label="Terjual"
                  value={String(item.totalTerjual)}
                  color="#16A34A"
                />
                <BigNumber
                  label="Sisa"
                  value={String(item.totalSisa)}
                  color="#DC2626"
                />
                <BigNumber
                  label="Masuk"
                  value={String(item.totalMasuk)}
                  color="#0891B2"
                />
              </View>

              <View style={styles.moneyRows}>
                <MoneyRow
                  label="Bagi Hasil (Hak Konsinyer)"
                  value={formatRupiah(item.bagiHasil)}
                />
                <MoneyRow
                  label="Keuntungan Toko"
                  value={formatRupiah(item.keuntungan)}
                  accent
                />
                <MoneyRow
                  label="Nilai Sisa"
                  value={formatRupiah(item.nilaiSisa)}
                />
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
}

function OverallRow({
  icon: Icon,
  color,
  label,
  value,
}: {
  icon: any;
  color: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.overallRow}>
      <View style={[styles.overallIcon, { backgroundColor: `${color}1A` }]}>
        <Icon color={color} size={16} />
      </View>
      <Text style={styles.overallLabel}>{label}</Text>
      <Text style={styles.overallValue}>{value}</Text>
    </View>
  );
}

function BigNumber({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={styles.bigNumber}>
      <Text style={[styles.bigNumberValue, { color }]}>{value}</Text>
      <Text style={styles.bigNumberLabel}>{label}</Text>
    </View>
  );
}

function MoneyRow({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <View style={styles.moneyRow}>
      <Text style={styles.moneyLabel}>{label}</Text>
      <Text
        style={[styles.moneyValue, accent && { color: "#16A34A" }]}
      >
        {value}
      </Text>
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
  overallCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
  },
  overallTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.neutral,
    letterSpacing: 0.5,
    marginBottom: 14,
  },
  overallRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  overallIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  overallLabel: {
    flex: 1,
    fontSize: 13,
    color: "#374151",
  },
  overallValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.neutral,
    marginTop: 20,
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  consignorCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
  },
  consignorHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E8F0FE",
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  phone: {
    fontSize: 12,
    color: Colors.neutral,
    marginTop: 2,
  },
  count: {
    fontSize: 11,
    color: Colors.neutral,
  },
  bigNumbers: {
    flexDirection: "row",
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    paddingVertical: 10,
    marginBottom: 12,
  },
  bigNumber: {
    flex: 1,
    alignItems: "center",
  },
  bigNumberValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  bigNumberLabel: {
    fontSize: 11,
    color: Colors.neutral,
    marginTop: 2,
  },
  moneyRows: {
    gap: 8,
  },
  moneyRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  moneyLabel: {
    fontSize: 12,
    color: "#374151",
  },
  moneyValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
});
