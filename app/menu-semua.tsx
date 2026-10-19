import { useRouter } from "expo-router";
import {
  BarChart3,
  BookOpen,
  ChevronLeft,
  Clock,
  Folder,
  Package,
  Receipt,
  Share2,
  Tag,
  Tags,
  Users,
  Wallet,
} from "lucide-react-native";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";

const ALL_MENU_ITEMS = [
  {
    key: "produk",
    icon: Package,
    color: "#2563EB",
    bg: "#EFF6FF",
    label: "Produk",
    route: "/produk",
    category: "Operasional",
  },
  {
    key: "kasir",
    icon: Receipt,
    color: Colors.primary,
    bg: "#E8F0FE",
    label: "Kasir",
    route: "/kasir",
    category: "Operasional",
  },
  {
    key: "kategori",
    icon: Folder,
    color: "#7C3AED",
    bg: "#F5F3FF",
    label: "Kategori",
    route: "/kategori",
    category: "Operasional",
  },
  {
    key: "laporan",
    icon: BarChart3,
    color: "#7C3AED",
    bg: "#F5F3FF",
    label: "Laporan",
    route: "/laporan",
    category: "Penjualan",
  },
  {
    key: "pelanggan",
    icon: Users,
    color: "#D97706",
    bg: "#FFFBEB",
    label: "Pelanggan",
    route: "/pelanggan",
    category: "Penjualan",
  },
  {
    key: "piutang",
    icon: Clock,
    color: "#D97706",
    bg: "#FFFBEB",
    label: "Piutang",
    route: "/piutang",
    category: "Penjualan",
  },
  {
    key: "diskon",
    icon: Tag,
    color: "#DB2777",
    bg: "#FDF2F8",
    label: "Diskon",
    route: "/diskon",
    category: "Harga & Promo",
  },
  {
    key: "harga-grosir",
    icon: Tags,
    color: "#0891B2",
    bg: "#ECFEFF",
    label: "Harga Grosir",
    route: "/harga-grosir",
    category: "Harga & Promo",
  },
  {
    key: "konsinyasi",
    icon: Share2,
    color: Colors.primary,
    bg: "#E8F0FE",
    label: "Konsinyasi",
    route: "/konsinyasi",
    category: "Harga & Promo",
  },
  {
    key: "pengeluaran",
    icon: Wallet,
    color: "#DC2626",
    bg: "#FEF2F2",
    label: "Pengeluaran",
    route: "/pengeluaran",
    category: "Lainnya",
  },
  {
    key: "katalog",
    icon: BookOpen,
    color: "#CA8A04",
    bg: "#FEFCE8",
    label: "Katalog",
    route: "/katalog",
    category: "Lainnya",
  },
];

export default function MenuSemuaScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleNavigate = (route: string) => {
    router.push(route as any);
  };

  return (
    <View
      style={[styles.screen, { paddingTop: insets.top + 12 }]}
    >
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
          <Text style={styles.headerTitle}>Menu Utama</Text>
          <Text style={styles.headerSubtitle}>Semua fitur aplikasi</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.menuGrid}>
          {ALL_MENU_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Pressable
                key={item.key}
                style={styles.menuGridCard}
                onPress={() => handleNavigate(item.route)}
              >
                <View style={[styles.menuGridIcon, { backgroundColor: item.bg }]}>
                  <Icon color={item.color} size={28} />
                </View>
                <Text style={styles.menuGridLabel}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
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
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },
  scrollContent: {
    flex: 1,
  },
  menuGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
    marginTop: 8,
  },
  menuGridCard: {
    width: "32%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 8,
    gap: 12,
  },
  menuGridIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  menuGridLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
    textAlign: "center",
    lineHeight: 16,
  },
});
