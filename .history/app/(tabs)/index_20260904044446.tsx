import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect, useRouter } from "expo-router";
import {
  AlertCircle,
  BarChart2,
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
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
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

function formatCompactRupiah(value: number) {
  if (Math.abs(value) >= 1_000_000) {
    return `Rp${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}jt`;
  }
  if (Math.abs(value) >= 1_000) {
    return `Rp${Math.round(value / 1000)}rb`;
  }
  return `Rp${value}`;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 10) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 18) return "Selamat sore";
  return "Selamat malam";
}

function getTodayLabel() {
  return new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

// ---------------------------------------------------------------------------
// Animation primitives
// ---------------------------------------------------------------------------

/** One orchestrated load sequence: sections fade + rise into place, staggered. */
function FadeInUp({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: any;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 480,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [14, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** Tactile spring-scale press wrapper, used for the primary CTA and menu rows. */
function Squishable({
  children,
  onPress,
  style,
  scaleTo = 0.97,
}: {
  children: React.ReactNode;
  onPress?: () => void;
  style?: any;
  scaleTo?: number;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () =>
    Animated.spring(scale, {
      toValue: scaleTo,
      useNativeDriver: true,
      speed: 60,
      bounciness: 4,
    }).start();

  const pressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 8,
    }).start();

  return (
    <Pressable onPress={onPress} onPressIn={pressIn} onPressOut={pressOut}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

/** Counts up to the target rupiah value on mount / on change. */
function useCountUp(target: number, duration = 700) {
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    const startTime = Date.now();
    let raf: number;

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (target - from) * eased));
      if (progress < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };

    raf = requestAnimationFrame(tick);
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [target, duration]);

  return display;
}

/** Soft looping pulse used to draw the eye to the low-stock alert. */
function usePulse() {
  const pulse = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.5,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return pulse;
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
  const omset = useCountUp(data.omsetHariIni);

  const topRowStats = [
    {
      key: "transaksi",
      value: String(stats.jumlahTransaksi),
      label: "Transaksi",
    },
    { key: "item", value: String(stats.itemTerjual), label: "Item Terjual" },
    {
      key: "diskon",
      value: formatRupiah(stats.totalDiskon),
      label: "Total Kembalian",
    },
  ];

  return (
    <LinearGradient
      colors={["#12AFC2", "#0295A9"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.summaryCard}
    >
      <View pointerEvents="none" style={styles.summaryGlow} />
      <View pointerEvents="none" style={styles.summaryGlowSmall} />

      <Text style={styles.summaryGreeting}>Omset hari ini</Text>
      <Text style={styles.summaryValue}>{formatRupiah(omset)}</Text>

      <View style={styles.trendChip}>
        {data.adaDataKemarin ? (
          <>
            {data.persenPerubahan >= 0 ? (
              <TrendingUp color={Colors.white} size={13} />
            ) : (
              <TrendingDown color="#FCA5A5" size={13} />
            )}
            <Text
              style={[
                styles.trendChipText,
                data.persenPerubahan < 0 && { color: "#FCA5A5" },
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
        <View style={styles.labaIconChip}>
          <Wallet color="#FFFFFF" size={14} />
        </View>
        <View style={styles.summaryStatItemLeft}>
          <Text
            style={styles.summaryStatValue}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            {formatRupiah(stats.labaBersih)}
          </Text>
          <Text style={styles.summaryStatLabel}>
            Laba bersih setelah pengeluaran
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

function QuickActions({
  onNavigate,
  stokMenipis,
}: {
  onNavigate: (route: string) => void;
  stokMenipis: number;
}) {
  const alertPulse = usePulse();

  return (
    <View style={styles.quickActionsBlock}>
      <Text style={styles.menuSectionTitle}>Aksi Cepat</Text>

      <Squishable style={styles.ctaButton} onPress={() => onNavigate("/kasir")}>
        <View style={styles.ctaIconCircle}>
          <ScanLine color="#FFFFFF" size={20} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.ctaTitle}>Buka Kasir</Text>
          <Text style={styles.ctaSubtitle}>Mulai transaksi baru</Text>
        </View>
        <ChevronRight color="rgba(255,255,255,0.85)" size={20} />
      </Squishable>

      <View style={styles.chipRow}>
        <Squishable
          style={styles.chipCard}
          onPress={() => onNavigate("/tambah-produk")}
        >
          <View style={[styles.chipIconChip, { backgroundColor: "#EFF6FF" }]}>
            <PlusCircle color="#2563EB" size={18} />
          </View>
          <Text style={styles.chipCardText} numberOfLines={2}>
            Tambah Produk
          </Text>
        </Squishable>
        <Squishable
          style={styles.chipCard}
          onPress={() => onNavigate("/history")}
        >
          <View style={[styles.chipIconChip, { backgroundColor: "#F5F3FF" }]}>
            <BarChart3 color="#7C3AED" size={18} />
          </View>
          <Text style={styles.chipCardText} numberOfLines={2}>
            History Penjualan
          </Text>
        </Squishable>
      </View>

      {stokMenipis > 0 && (
        <Pressable
          style={({ pressed }) => [
            styles.stockAlertBanner,
            pressed && { opacity: 0.85 },
          ]}
          onPress={() => onNavigate("/produk")}
        >
          <Animated.View style={{ opacity: alertPulse }}>
            <AlertCircle color="#DC2626" size={18} />
          </Animated.View>
          <Text style={styles.stockAlertText}>
            {stokMenipis} produk stoknya menipis — cek sekarang
          </Text>
          <ChevronRight color="#DC2626" size={16} />
        </Pressable>
      )}
    </View>
  );
}

function AnimatedBar({
  heightPct,
  color,
  delay,
}: {
  heightPct: number;
  color: string;
  delay: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: heightPct,
      duration: 560,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heightPct]);

  return (
    <Animated.View
      style={[
        styles.chartBarThin,
        {
          backgroundColor: color,
          height: anim.interpolate({
            inputRange: [0, 100],
            outputRange: ["0%", "100%"],
            extrapolate: "clamp",
          }),
        },
      ]}
    />
  );
}

function WeeklyChart({ data }: { data: WeeklyDayData[] }) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const hasData = data.length > 0 && data.some((d) => d.value > 0);

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

      {!hasData ? (
        <View style={styles.chartEmpty}>
          <BarChart2 color="#D1D5DB" size={26} />
          <Text style={styles.chartEmptyText}>Belum ada data penjualan</Text>
        </View>
      ) : (
        <View style={styles.chartBars}>
          {data.map((d, idx) => {
            const heightPct =
              d.value === 0 ? 4 : Math.max((d.value / maxValue) * 100, 10);
            const isSelected = selectedIdx === idx;
            return (
              <Pressable
                key={`${d.day}-${idx}`}
                style={styles.chartColumn}
                onPress={() => setSelectedIdx(isSelected ? null : idx)}
              >
                {isSelected && (
                  <View style={styles.chartTooltip}>
                    <Text style={styles.chartTooltipValue}>
                      {formatCompactRupiah(d.value)}
                    </Text>
                    <Text style={styles.chartTooltipLabel}>{d.label}</Text>
                  </View>
                )}
                <AnimatedBar
                  heightPct={heightPct}
                  delay={idx * 60}
                  color={
                    isSelected
                      ? Colors.secondary
                      : d.active
                        ? Colors.secondary
                        : "#D1FAE5"
                  }
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
      style={({ pressed }) => [
        styles.menuRow,
        !isLast && styles.menuRowDivider,
        pressed && { backgroundColor: "#FAFAFA" },
      ]}
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
        label: "History Penjualan",
        route: "/history",
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
      },
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
      contentContainerStyle={{ paddingBottom: 100 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.content}>
        <HeaderTab
          title={`${getGreeting()} 👋`}
          subtitle={getTodayLabel()}
          topInset={insets.top}
        />

        <FadeInUp delay={0}>
          <SummaryHeader data={summary} stats={stats} />
        </FadeInUp>

        <FadeInUp delay={90}>
          <QuickActions
            onNavigate={onNavigate}
            stokMenipis={stats.stokMenipis}
          />
        </FadeInUp>

        <FadeInUp delay={180}>
          <WeeklyChart data={weeklyData} />
        </FadeInUp>

        {MENU_GROUPS.map((group, idx) => (
          <FadeInUp key={group.title} delay={260 + idx * 70}>
            <MenuSection group={group} onNavigate={onNavigate} />
          </FadeInUp>
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
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E8F0FE",
    overflow: "hidden",
  },
  summaryGlow: {
    position: "absolute",
    top: -50,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255,255,255,0.10)",
  },
  summaryGlowSmall: {
    position: "absolute",
    bottom: -30,
    left: -20,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  summaryGreeting: {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
    marginBottom: 6,
    fontWeight: "600",
  },
  summaryValue: {
    fontSize: 36,
    fontWeight: "700",
    color: Colors.white,
    marginBottom: 10,
  },
  trendChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.22)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    gap: 5,
  },
  trendChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.white,
  },

  // Summary mini stats row
  summaryStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.25)",
  },
  summaryStatItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryStatItemLeft: {
    flex: 1,
    alignItems: "flex-start",
  },
  summaryStatsRowSecondary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.25)",
  },
  labaIconChip: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryStatDivider: {
    width: 1,
    height: 26,
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  summaryStatValue: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.white,
  },
  summaryStatLabel: {
    fontSize: 11,
    color: "rgba(255, 255, 255, 0.85)",
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
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    gap: 8,
  },
  chipIconChip: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  chipCardText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    lineHeight: 14,
    minHeight: 28,
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
  chartEmpty: {
    height: 110,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  chartEmptyText: {
    fontSize: 12,
    color: "#9CA3AF",
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
    alignItems: "center",
    backgroundColor: Colors.secondary,
    borderRadius: 9,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 6,
  },
  chartTooltipValue: {
    color: "#FFFFFF",
    fontSize: 10.5,
    fontWeight: "800",
  },
  chartTooltipLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 8.5,
    fontWeight: "600",
    marginTop: 1,
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
