import { useRouter } from "expo-router";
import {
  AlertCircle,
  Banknote,
  BarChart3,
  BookOpen,
  ChevronRight,
  Clock,
  Folder,
  Layers,
  Package,
  PlusCircle,
  Receipt,
  ScanLine,
  Share2,
  Tag,
  Tags,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react-native";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";

// ---------------------------------------------------------------------------
// Data mock — ganti dengan data asli dari state/API kamu
// ---------------------------------------------------------------------------

const SUMMARY = {
  omset: "Rp 33.750",
  trendLabel: "+12% dari kemarin",
};

const STAT_PILLS = [
  {
    key: "transaksi",
    icon: Layers,
    color: "#2563EB",
    bg: "#EFF6FF",
    value: "3",
    label: "Transaksi",
  },
  {
    key: "item",
    icon: Package,
    color: "#D97706",
    bg: "#FFFBEB",
    value: "5",
    label: "Item Terjual",
  },
  {
    key: "laba",
    icon: Banknote,
    color: Colors.primary,
    bg: "#ECFDF3",
    value: "Rp 3.000",
    label: "Laba Kotor",
  },
  {
    key: "diskon",
    icon: Tag,
    color: "#DB2777",
    bg: "#FDF2F8",
    value: "Rp 1.150",
    label: "Total Diskon",
  },
  {
    key: "stok",
    icon: AlertCircle,
    color: "#DC2626",
    bg: "#FEF2F2",
    value: "0",
    label: "Stok Menipis",
  },
];

const WEEKLY_DATA = [
  { day: "K", value: 0 },
  { day: "J", value: 0 },
  { day: "S", value: 0 },
  { day: "M", value: 0 },
  { day: "S", value: 0 },
  { day: "S", value: 13000 },
  { day: "R", value: 34000, label: "Rp 34rb", active: true },
];

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
        bg: "#ECFDF3",
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
      {
        key: "label-harga",
        icon: Tag,
        color: "#0891B2",
        bg: "#ECFEFF",
        label: "Label Harga",
        route: "/label-harga",
      },
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
      {
        key: "lap-kasir",
        icon: Users,
        color: "#7C3AED",
        bg: "#F5F3FF",
        label: "Laporan Kasir",
        route: "/lap-kasir",
      },
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
        // badge: "Baru",
        // badgeColor: "#2563EB",
      },
      {
        key: "katalog",
        icon: BookOpen,
        color: "#CA8A04",
        bg: "#FEFCE8",
        label: "Katalog",
        route: "/katalog",
      },
      {
        key: "konsinyasi",
        icon: Share2,
        color: Colors.primary,
        bg: "#ECFDF3",
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
      // {
      //   key: "analisis",
      //   icon: Sparkles,
      //   color: "#7C3AED",
      //   bg: "#F5F3FF",
      //   label: "Analisis Warungku",
      //   route: "/analisis",
      //   badge: "AI",
      //   badgeColor: "#7C3AED",
      // },
    ],
  },
];

// ---------------------------------------------------------------------------
// Sub components
// ---------------------------------------------------------------------------

function SummaryHeader() {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryGreeting}>Ringkasan hari ini</Text>
      <Text style={styles.summaryValue}>{SUMMARY.omset}</Text>
      <View style={styles.trendChip}>
        <TrendingUp color={Colors.primary} size={13} />
        <Text style={styles.trendChipText}>{SUMMARY.trendLabel}</Text>
      </View>
    </View>
  );
}

function StatPill({ item }: { item: (typeof STAT_PILLS)[number] }) {
  const Icon = item.icon;
  return (
    <View style={styles.statPill}>
      <View style={[styles.pillIconCircle, { backgroundColor: item.bg }]}>
        <Icon color={item.color} size={16} />
      </View>
      <View style={styles.statPillText}>
        <Text
          style={styles.statPillValue}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {item.value}
        </Text>
        <Text style={styles.statPillLabel} numberOfLines={1}>
          {item.label}
        </Text>
      </View>
    </View>
  );
}

function QuickActions({ onNavigate }: { onNavigate: (route: string) => void }) {
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
          onPress={() => onNavigate("/produk")}
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
    </View>
  );
}

function WeeklyChart() {
  const maxValue = Math.max(...WEEKLY_DATA.map((d) => d.value), 1);

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

      <View style={styles.chartBars}>
        {WEEKLY_DATA.map((d, idx) => {
          const heightPct =
            d.value === 0 ? 6 : Math.max((d.value / maxValue) * 100, 10);
          return (
            <View key={`${d.day}-${idx}`} style={styles.chartColumn}>
              {d.active && (
                <View style={styles.chartTooltip}>
                  <Text style={styles.chartTooltipText}>{d.label}</Text>
                </View>
              )}
              <View
                style={[
                  styles.chartBarThin,
                  {
                    height: `${heightPct}%`,
                    backgroundColor: d.active ? Colors.primary : "#D1FAE5",
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
            </View>
          );
        })}
      </View>
    </View>
  );
}

function MenuRow({
  item,
  isLast,
  onPress,
}: {
  item: (typeof MENU_GROUPS)[number]["items"][number];
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
  group: (typeof MENU_GROUPS)[number];
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
// Screen
// ---------------------------------------------------------------------------

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const onNavigate = (route: string) => router.push(route as any);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{
        paddingTop: insets.top + 12,
        paddingBottom: 100,
      }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.content}>
        <SummaryHeader />

        <View style={styles.statGrid}>
          {STAT_PILLS.map((item) => (
            <StatPill key={item.key} item={item} />
          ))}
        </View>

        <QuickActions onNavigate={onNavigate} />

        <WeeklyChart />

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
    borderColor: "#ECFDF3",
  },
  summaryGreeting: {
    fontSize: 13,
    color: Colors.neutral,
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
  },
  trendChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#ECFDF3",
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

  // Stat pills
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 18,
  },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    width: "48%",
    flexGrow: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  statPillText: {
    flexShrink: 1,
    maxWidth: 140,
  },
  pillIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  statPillValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  statPillLabel: {
    fontSize: 10.5,
    color: Colors.neutral,
    marginTop: 1,
  },

  // Quick actions
  quickActionsBlock: {
    marginBottom: 18,
    gap: 10,
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
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
    backgroundColor: "#ECFDF3",
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
    backgroundColor: Colors.primary,
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
