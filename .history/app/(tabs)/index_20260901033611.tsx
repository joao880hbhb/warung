import { useRouter } from "expo-router";
import {
  AlertCircle,
  Banknote,
  BarChart3,
  BookOpen,
  Clock,
  Folder,
  Layers,
  Package,
  PlusCircle,
  Receipt,
  ScanLine,
  Share2,
  Sparkles,
  Tag,
  Tags,
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
  transaksi: 3,
  item: 5,
  laba: "Rp 3.000",
};

const STATS = [
  {
    key: "transaksi",
    icon: Layers,
    color: "#3B82F6",
    bg: "#EFF6FF",
    label: "Transaksi",
    value: "3",
    caption: "hari ini",
    captionColor: Colors.primary,
  },
  {
    key: "laba",
    icon: Banknote,
    color: "#16A34A",
    bg: "#ECFDF3",
    label: "Laba Kotor",
    value: "Rp 3.000",
    caption: "dari harga modal",
    captionColor: Colors.primary,
  },
  {
    key: "diskon",
    icon: Tag,
    color: "#F59E0B",
    bg: "#FFF7ED",
    label: "Total Diskon",
    value: "Rp 1.150",
    caption: "diberikan",
    captionColor: "#111827",
    valueColor: "#111827",
  },
  {
    key: "stok",
    icon: AlertCircle,
    color: "#16A34A",
    bg: "#ECFDF3",
    label: "Stok Menipis",
    value: "0",
    caption: "produk",
    captionColor: Colors.primary,
  },
];

const QUICK_ACTIONS = [
  {
    key: "kasir",
    icon: ScanLine,
    color: Colors.primary,
    bg: "#ECFDF3",
    label: "Buka Kasir",
    route: "/kasir",
  },
  {
    key: "tambah",
    icon: PlusCircle,
    color: "#3B82F6",
    bg: "#EFF6FF",
    label: "Tambah Produk",
    route: "/produk",
  },
  {
    key: "laporan",
    icon: BarChart3,
    color: "#8B5CF6",
    bg: "#F5F3FF",
    label: "Laporan",
    route: "/laporan",
  },
];

const WEEKLY_DATA = [
  { day: "Kam", value: 0 },
  { day: "Jum", value: 0 },
  { day: "Sab", value: 0 },
  { day: "Min", value: 0 },
  { day: "Sen", value: 0 },
  { day: "Sel", value: 13000, label: "13rb" },
  { day: "Rab", value: 34000, label: "34rb", active: true },
];

const MENU_ITEMS = [
  {
    key: "produk",
    icon: Package,
    color: "#3B82F6",
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
    key: "laporan",
    icon: BarChart3,
    color: "#8B5CF6",
    bg: "#F5F3FF",
    label: "Laporan",
    route: "/laporan",
  },
  {
    key: "pelanggan",
    icon: Users,
    color: "#F97316",
    bg: "#FFF7ED",
    label: "Pelanggan",
    route: "/pelanggan",
  },
  {
    key: "diskon",
    icon: Tag,
    color: "#EC4899",
    bg: "#FDF2F8",
    label: "Diskon",
    route: "/diskon",
  },
  {
    key: "harga-grosir",
    icon: Tags,
    color: "#06B6D4",
    bg: "#ECFEFF",
    label: "Harga Grosir",
    route: "/harga-grosir",
    badge: "Baru",
    badgeColor: "#2563EB",
  },
  {
    key: "konsinyasi",
    icon: Share2,
    color: Colors.primary,
    bg: "#ECFDF3",
    label: "Konsinyasi",
    route: "/konsinyasi",
  },
  {
    key: "katalog",
    icon: BookOpen,
    color: "#EAB308",
    bg: "#FEFCE8",
    label: "Katalog",
    route: "/katalog",
  },
  {
    key: "kategori",
    icon: Folder,
    color: "#8B5CF6",
    bg: "#F5F3FF",
    label: "Kategori",
    route: "/kategori",
  },
  {
    key: "analisis",
    icon: Sparkles,
    color: "#8B5CF6",
    bg: "#F5F3FF",
    label: "Analisis Warungku",
    route: "/analisis",
    badge: "AI",
    badgeColor: "#7C3AED",
  },
  {
    key: "pengeluaran",
    icon: Wallet,
    color: "#EF4444",
    bg: "#FEF2F2",
    label: "Pengeluaran",
    route: "/pengeluaran",
  },
  {
    key: "piutang",
    icon: Clock,
    color: "#EAB308",
    bg: "#FEFCE8",
    label: "Piutang",
    route: "/piutang",
  },
  {
    key: "label-harga",
    icon: Tag,
    color: "#06B6D4",
    bg: "#ECFEFF",
    label: "Label Harga",
    route: "/label-harga",
  },
  {
    key: "lap-kasir",
    icon: Users,
    color: "#8B5CF6",
    bg: "#F5F3FF",
    label: "Lap. Kasir",
    route: "/lap-kasir",
  },
];

// ---------------------------------------------------------------------------
// Sub components
// ---------------------------------------------------------------------------

function SummaryHeader() {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLabel}>Total omset hari ini</Text>
      <Text style={styles.summaryValue}>{SUMMARY.omset}</Text>
      <View style={styles.summaryMetaRow}>
        <View style={styles.summaryMetaItem}>
          <Layers color="rgba(255,255,255,0.75)" size={14} />
          <Text style={styles.summaryMetaText}>
            {SUMMARY.transaksi} transaksi
          </Text>
        </View>
        <View style={styles.summaryMetaDivider} />
        <View style={styles.summaryMetaItem}>
          <Package color="rgba(255,255,255,0.75)" size={14} />
          <Text style={styles.summaryMetaText}>{SUMMARY.item} item</Text>
        </View>
        <View style={styles.summaryMetaDivider} />
        <View style={styles.summaryMetaItem}>
          <BarChart3 color="rgba(255,255,255,0.75)" size={14} />
          <Text style={styles.summaryMetaText}>~{SUMMARY.laba} laba</Text>
        </View>
      </View>
    </View>
  );
}

function StatCard({ item }: { item: (typeof STATS)[number] }) {
  const Icon = item.icon;
  return (
    <View style={styles.statCard}>
      <View style={[styles.iconCircle, { backgroundColor: item.bg }]}>
        <Icon color={item.color} size={20} />
      </View>
      <Text style={styles.statLabel}>{item.label}</Text>
      <Text
        style={[
          styles.statValue,
          item.valueColor ? { color: item.valueColor } : null,
        ]}
      >
        {item.value}
      </Text>
      <Text style={[styles.statCaption, { color: item.captionColor }]}>
        {item.caption}
      </Text>
    </View>
  );
}

function QuickActionCard({
  item,
  onPress,
}: {
  item: (typeof QUICK_ACTIONS)[number];
  onPress: () => void;
}) {
  const Icon = item.icon;
  return (
    <Pressable style={styles.quickAction} onPress={onPress}>
      <View style={[styles.iconCircle, { backgroundColor: item.bg }]}>
        <Icon color={item.color} size={20} />
      </View>
      <Text style={styles.quickActionLabel}>{item.label}</Text>
    </Pressable>
  );
}

function WeeklyChart() {
  const maxValue = Math.max(...WEEKLY_DATA.map((d) => d.value), 1);

  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <Text style={styles.sectionEyebrow}>Omset 7 Hari Terakhir</Text>
        <View style={styles.chartFilter}>
          <Text style={styles.chartFilterText}>Mingguan</Text>
        </View>
      </View>

      <View style={styles.chartBars}>
        {WEEKLY_DATA.map((d) => {
          const heightPct =
            d.value === 0 ? 4 : Math.max((d.value / maxValue) * 100, 8);
          return (
            <View key={d.day} style={styles.chartBarColumn}>
              {d.label ? (
                <Text
                  style={[
                    styles.chartBarValue,
                    d.active && { color: Colors.primaryDark ?? "#7A1729" },
                  ]}
                >
                  {d.label}
                </Text>
              ) : (
                <View style={styles.chartBarValuePlaceholder} />
              )}
              <View
                style={[
                  styles.chartBar,
                  {
                    height: `${heightPct}%`,
                    backgroundColor: d.active
                      ? "#7A1729"
                      : d.value > 0
                        ? "#DCE3F7"
                        : "#E5E7EB",
                  },
                ]}
              />
              <Text
                style={[
                  styles.chartBarDay,
                  d.active && styles.chartBarDayActive,
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

function MenuCard({
  item,
  onPress,
}: {
  item: (typeof MENU_ITEMS)[number];
  onPress: () => void;
}) {
  const Icon = item.icon;
  return (
    <Pressable style={styles.menuCard} onPress={onPress}>
      {item.badge ? (
        <View style={[styles.menuBadge, { backgroundColor: item.badgeColor }]}>
          <Text style={styles.menuBadgeText}>{item.badge}</Text>
        </View>
      ) : null}
      <View style={[styles.iconCircle, { backgroundColor: item.bg }]}>
        <Icon color={item.color} size={20} />
      </View>
      <Text style={styles.menuLabel} numberOfLines={1}>
        {item.label}
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

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
          {STATS.map((item) => (
            <StatCard key={item.key} item={item} />
          ))}
        </View>

        <Text style={styles.sectionEyebrow}>Aksi Cepat</Text>
        <View style={styles.quickActionRow}>
          {QUICK_ACTIONS.map((item) => (
            <QuickActionCard
              key={item.key}
              item={item}
              onPress={() => router.push(item.route as any)}
            />
          ))}
        </View>

        <WeeklyChart />

        <Text style={styles.sectionEyebrow}>Menu Utama</Text>
        <View style={styles.menuGrid}>
          {MENU_ITEMS.map((item) => (
            <MenuCard
              key={item.key}
              item={item}
              onPress={() => router.push(item.route as any)}
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const CARD_GAP = 12;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  content: {
    paddingHorizontal: 16,
  },

  // Summary / header
  summaryCard: {
    backgroundColor: "#7A1729",
    borderRadius: 20,
    padding: 20,
    marginBottom: CARD_GAP,
  },
  summaryLabel: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    marginBottom: 6,
  },
  summaryValue: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "700",
    marginBottom: 14,
  },
  summaryMetaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  summaryMetaText: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
  },
  summaryMetaDivider: {
    width: 1,
    height: 12,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginHorizontal: 10,
  },

  // Shared
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  sectionEyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 4,
  },

  // Stat grid
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: CARD_GAP,
    marginBottom: 20,
  },
  statCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
  },
  statLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  statCaption: {
    fontSize: 11,
    fontWeight: "600",
  },

  // Quick actions
  quickActionRow: {
    flexDirection: "row",
    gap: CARD_GAP,
    marginBottom: 20,
  },
  quickAction: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
    textAlign: "center",
  },

  // Chart
  chartCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  chartHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  chartFilter: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  chartFilterText: {
    color: "#3B82F6",
    fontSize: 12,
    fontWeight: "600",
  },
  chartBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 140,
    gap: 6,
  },
  chartBarColumn: {
    flex: 1,
    height: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  chartBarValue: {
    fontSize: 10,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 4,
  },
  chartBarValuePlaceholder: {
    height: 14,
    marginBottom: 4,
  },
  chartBar: {
    width: "70%",
    borderRadius: 6,
    minHeight: 4,
  },
  chartBarDay: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 8,
  },
  chartBarDayActive: {
    color: "#7A1729",
    fontWeight: "700",
  },

  // Menu grid
  menuGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: CARD_GAP,
  },
  menuCard: {
    width: "23.5%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: "center",
    position: "relative",
  },
  menuBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    zIndex: 1,
  },
  menuBadgeText: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "700",
  },
  menuLabel: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#111827",
    textAlign: "center",
  },
});
