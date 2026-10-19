import { useFocusEffect, useRouter } from "expo-router";
import {
  AlertCircle,
  BarChart3,
  ChevronRight,
  Clock,
  Folder,
  Package,
  PlusCircle,
  Receipt,
  ScanLine,
  Share2,
  Tag,
  Tags,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react-native";
import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import HeaderTab from "@/components/HeaderTab";
import { Colors } from "@/constants/theme";
import {
  getDashboardStats,
  getDashboardSummary,
  getDashboardWeeklyTrend,
  initDatabase,
  type DashboardStats,
  type DashboardSummary,
  type WeeklyDayData,
} from "@/lib/database";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRupiah(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

// ---------------------------------------------------------------------------
// Sub components
// ---------------------------------------------------------------------------

function SummaryHeader({
  data,
  stats,
}: {
  data: DashboardSummary;
  stats: DashboardStats;
}) {
  const topRowStats = [
    {
      key: "transaksi",
      value: String(stats.jumlahTransaksi),
      label: "Transaksi",
    },
    {
      key: "item",
      value: String(stats.itemTerjual),
      label: "Item Terjual",
    },
    {
      key: "diskon",
      value: formatRupiah(stats.totalDiskon),
      label: "Total Diskon",
    },
  ];

  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryGreeting}>Ringkasan hari ini</Text>
      <Text style={styles.summaryValue}>{formatRupiah(data.omsetHariIni)}</Text>
      <View style={styles.trendChip}>
        {data.adaDataKemarin ? (
          <>
            {data.persenPerubahan >= 0 ? (
              <TrendingUp color={Colors.primary} size={13} />
            ) : (
              <TrendingDown color="#DC2626" size={13} />
            )}
            <Text
              style={[
                styles.trendChipText,
                data.persenPerubahan < 0 && { color: "#DC2626" },
              ]}
            >
              {data.persenPerubahan >= 0 ? "+" : ""}
              {data.persenPerubahan}% dari kemarin
            </Text>
          </>
        ) : (
          <Text style={styles.trendChipText}>Data baru hari ini</Text>
        )}
      </View>

      <View style={styles.summaryStatsRow}>
        {topRowStats.map((item, idx) => (
          <React.Fragment key={item.key}>
            <View style={styles.summaryStatItem}>
              <Text
                style={styles.summaryStatValue}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.6}
              >
                {item.value}
              </Text>
              <Text style={styles.summaryStatLabel}>{item.label}</Text>
            </View>
            {idx < topRowStats.length - 1 && (
              <View style={styles.summaryStatDivider} />
            )}
          </React.Fragment>
        ))}
      </View>

      <View style={styles.summaryStatsRowSecondary}>
        <View style={styles.summaryStatItem}>
          <Text
            style={styles.summaryStatValue}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            {formatRupiah(stats.labaBersih)}
          </Text>
          <Text style={styles.summaryStatLabel}>Laba Bersih</Text>
        </View>
      </View>
    </View>
  );
}

function QuickActions({
  onNavigate,
  stokMenipis,
}: {
  onNavigate: (route: string) => void;
  stokMenipis: number;
}) {
  return (
    <View style={styles.quickActionsBlock}>
      <Text style={styles.menuSectionTitle}>Aksi Cepat</Text>
      <Pressable style={styles.ctaButton} onPress={() => onNavigate("/kasir")}>
        <View style={styles.ctaIconCircle}>
          <ScanLine color="#FFFFFF" size={20} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.ctaTitle}>Buka Kasir</Text>
          <Text style={styles.ctaSubtitle}>Mulai transaksi baru</Text>
        </View>
        <ChevronRight color="rgba(255,255,255,0.85)" size={20} />
      </Pressable>

      <View style={styles.chipRow}>
        <Pressable
          style={styles.chipCard}
          onPress={() => onNavigate("/tambah-produk")}
        >
          <PlusCircle color="#2563EB" size={18} />
          <Text style={styles.chipCardText}>Tambah Produk</Text>
        </Pressable>
        <Pressable
          style={styles.chipCard}
          onPress={() => onNavigate("/laporan")}
        >
          <BarChart3 color="#7C3AED" size={18} />
          <Text style={styles.chipCardText}>Lihat Laporan</Text>
        </Pressable>
      </View>

      {stokMenipis > 0 && (
        <Pressable
          style={styles.stockAlertBanner}
          onPress={() => onNavigate("/produk")}
        >
          <AlertCircle color="#DC2626" size={18} />
          <Text style={styles.stockAlertText}>
            {stokMenipis} produk stoknya menipis
          </Text>
          <ChevronRight color="#DC2626" size={16} />
        </Pressable>
      )}
    </View>
  );
}

function WeeklyChart({ data }: { data: WeeklyDayData[] }) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <View>
          <Text style={styles.chartTitle}>Tren Omset</Text>
          <Text style={styles.chartSubtitle}>7 hari terakhir</Text>
        </View>
        <View style={styles.chartBadge}>
          <Text style={styles.chartBadgeText}>Mingguan</Text>
        </View>
      </View>

      {data.length === 0 || data.every((d) => d.value === 0) ? (
        <View
          style={{
            height: 110,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 12, color: "#9CA3AF" }}>Belum ada data</Text>
        </View>
      ) : (
        <View style={styles.chartBars}>
          {data.map((d, idx) => {
            const heightPct =
              d.value === 0 ? 6 : Math.max((d.value / maxValue) * 100, 10);
            const isSelected = selectedIdx === idx;
            return (
              <Pressable
                key={`${d.day}-${idx}`}
                style={styles.chartColumn}
                onPress={() => setSelectedIdx(isSelected ? null : idx)}
              >
                {isSelected && (
                  <View style={styles.chartTooltip}>
                    <Text style={styles.chartTooltipText}>{d.label}</Text>
                  </View>
                )}
                <View
                  style={[
                    styles.chartBarThin,
                    {
                      height: `${heightPct}%`,
                      backgroundColor: d.active ? Colors.secondary : "#D1FAE5",
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.chartDayLabel,
                    d.active && styles.chartDayLabelActive,
                  ]}
                >
                  {d.day}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

function MenuRow({
  item,
  isLast,
  onPress,
}: {
  item: {
    key: string;
    icon: any;
    color: string;
    bg: string;
    label: string;
    route: string;
    badge?: string;
    badgeColor?: string;
  };
  isLast: boolean;
  onPress: () => void;
}) {
  const Icon = item.icon;
  return (
    <Pressable
      style={[styles.menuRow, !isLast && styles.menuRowDivider]}
      onPress={onPress}
    >
      <View style={[styles.pillIconCircle, { backgroundColor: item.bg }]}>
        <Icon color={item.color} size={18} />
      </View>
      <Text style={styles.menuRowLabel}>{item.label}</Text>
      {item.badge ? (
        <View style={[styles.menuBadge, { backgroundColor: item.badgeColor }]}>
          <Text style={styles.menuBadgeText}>{item.badge}</Text>
        </View>
      ) : null}
      <ChevronRight color="#D1D5DB" size={18} />
    </Pressable>
  );
}

function MenuSection({
  group,
  onNavigate,
}: {
  group: {
    title: string;
    items: {
      key: string;
      icon: any;
      color: string;
      bg: string;
      label: string;
      route: string;
      badge?: string;
      badgeColor?: string;
    }[];
  };
  onNavigate: (route: string) => void;
}) {
  return (
    <View style={styles.menuSection}>
      <Text style={styles.menuSectionTitle}>{group.title}</Text>
      <View style={styles.menuCard}>
        {group.items.map((item, idx) => (
          <MenuRow
            key={item.key}
            item={item}
            isLast={idx === group.items.length - 1}
            onPress={() => onNavigate(item.route)}
          />
        ))}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Menu groups
// ---------------------------------------------------------------------------

const MENU_GROUPS = [
  {
    title: "Operasional Toko",
    items: [
      {
        key: "produk",
        icon: Package,
        color: "#2563EB",
        bg: "#EFF6FF",
        label: "Produk",
        route: "/produk",
      },
      {
        key: "kasir",
        icon: Receipt,
        color: Colors.primary,
        bg: "#E8F0FE",
        label: "Kasir",
        route: "/kasir",
      },
      {
        key: "kategori",
        icon: Folder,
        color: "#7C3AED",
        bg: "#F5F3FF",
        label: "Kategori",
        route: "/kategori",
      },
      // {
      //   key: "label-harga",
      //   icon: Tag,
      //   color: "#0891B2",
      //   bg: "#ECFEFF",
      //   label: "Label Harga",
      //   route: "/label-harga",
      // },
    ],
  },
  {
    title: "Penjualan & Laporan",
    items: [
      {
        key: "laporan",
        icon: BarChart3,
        color: "#7C3AED",
        bg: "#F5F3FF",
        label: "Laporan",
        route: "/laporan",
      },
      // {
      //   key: "lap-kasir",
      //   icon: Users,
      //   color: "#7C3AED",
      //   bg: "#F5F3FF",
      //   label: "Laporan Kasir",
      //   route: "/lap-kasir",
      // },
      {
        key: "pelanggan",
        icon: Users,
        color: "#D97706",
        bg: "#FFFBEB",
        label: "Pelanggan",
        route: "/pelanggan",
      },
      {
        key: "piutang",
        icon: Clock,
        color: "#D97706",
        bg: "#FFFBEB",
        label: "Piutang",
        route: "/piutang",
      },
    ],
  },
  {
    title: "Harga & Promo",
    items: [
      {
        key: "diskon",
        icon: Tag,
        color: "#DB2777",
        bg: "#FDF2F8",
        label: "Diskon",
        route: "/diskon",
      },
      {
        key: "harga-grosir",
        icon: Tags,
        color: "#0891B2",
        bg: "#ECFEFF",
        label: "Harga Grosir",
        route: "/harga-grosir",
      },
      // {
      //   key: "katalog",
      //   icon: BookOpen,
      //   color: "#CA8A04",
      //   bg: "#FEFCE8",
      //   label: "Katalog",
      //   route: "/katalog",
      // },
      {
        key: "konsinyasi",
        icon: Share2,
        color: Colors.primary,
        bg: "#E8F0FE",
        label: "Konsinyasi",
        route: "/konsinyasi",
      },
    ],
  },
  {
    title: "Lainnya",
    items: [
      {
        key: "pengeluaran",
        icon: Wallet,
        color: "#DC2626",
        bg: "#FEF2F2",
        label: "Pengeluaran",
        route: "/pengeluaran",
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const onNavigate = (route: string) => router.push(route as any);

  const [summary, setSummary] = useState<DashboardSummary>({
    omsetHariIni: 0,
    omsetKemarin: 0,
    persenPerubahan: 0,
    adaDataKemarin: false,
  });
  const [stats, setStats] = useState<DashboardStats>({
    jumlahTransaksi: 0,
    itemTerjual: 0,
    labaKotor: 0,
    pengeluaran: 0,
    labaBersih: 0,
    totalDiskon: 0,
    stokMenipis: 0,
  });
  const [weeklyData, setWeeklyData] = useState<WeeklyDayData[]>([]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        await initDatabase();
        const [s, st, w] = await Promise.all([
          getDashboardSummary(),
          getDashboardStats(),
          getDashboardWeeklyTrend(),
        ]);
        setSummary(s);
        setStats(st);
        setWeeklyData(w);
      })();
    }, []),
  );

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{
        paddingBottom: 100,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.content}>
        <HeaderTab
          title="Dashboard"
          subtitle="Ringkasan toko warung Anda"
          topInset={insets.top}
        />

        <SummaryHeader data={summary} stats={stats} />

        <QuickActions onNavigate={onNavigate} stokMenipis={stats.stokMenipis} />

        <WeeklyChart data={weeklyData} />

        {MENU_GROUPS.map((group) => (
          <MenuSection
            key={group.title}
            group={group}
            onNavigate={onNavigate}
          />
        ))}
      </View>
    </ScrollView>
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
  content: {
    paddingHorizontal: 16,
  },
  // Summary
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E8F0FE",
  },
  summaryGreeting: {
    fontSize: 13,
    color: Colors.black,
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: "700",
    color: Colors.white,
    marginBottom: 10,
  },
  trendChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#E8F0FE",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    gap: 5,
  },
  trendChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.primary,
  },

  // Summary mini stats row
  summaryStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.18)",
  },
  summaryStatItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryStatsRowSecondary: {
    flexDirection: "row",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.18)",
  },
  summaryStatDivider: {
    width: 1,
    height: 26,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  summaryStatValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  summaryStatLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },

  // Stock alert banner
  stockAlertBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginTop: 10,
  },
  stockAlertText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: "600",
    color: "#DC2626",
  },

  pillIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  // Quick actions
  quickActionsBlock: {
    marginBottom: 18,
    gap: 10,
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.secondary,
    borderRadius: 18,
    padding: 16,
    gap: 12,
  },
  ctaIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  ctaTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  ctaSubtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 11,
    marginTop: 1,
  },
  chipRow: {
    flexDirection: "row",
    gap: 10,
  },
  chipCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingVertical: 12,
    gap: 8,
  },
  chipCardText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
  },

  // Chart
  chartCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 18,
    marginBottom: 22,
  },
  chartHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 22,
  },
  chartTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  chartSubtitle: {
    fontSize: 11,
    color: Colors.neutral,
    marginTop: 2,
  },
  chartBadge: {
    backgroundColor: "#E8F0FE",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  chartBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.primary,
  },
  chartBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 110,
    gap: 8,
  },
  chartColumn: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  chartTooltip: {
    backgroundColor: Colors.secondary,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    marginBottom: 6,
  },
  chartTooltipText: {
    color: "#FFFFFF",
    fontSize: 9.5,
    fontWeight: "700",
  },
  chartBarThin: {
    width: "38%",
    borderRadius: 999,
    minHeight: 4,
  },
  chartDayLabel: {
    fontSize: 10.5,
    color: "#D1D5DB",
    marginTop: 8,
  },
  chartDayLabelActive: {
    color: Colors.primary,
    fontWeight: "700",
  },

  // Menu list
  menuSection: {
    marginBottom: 18,
  },
  menuSectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.neutral,
    letterSpacing: 0.4,
    marginBottom: 8,
    marginLeft: 2,
  },
  menuCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingHorizontal: 12,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  menuRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  menuRowLabel: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: "600",
    color: "#111827",
  },
  menuBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    marginRight: 4,
  },
  menuBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
  },
});
