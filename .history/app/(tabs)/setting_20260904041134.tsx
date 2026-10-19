import { useRouter } from "expo-router";
import {
  Bluetooth,
  ChevronRight,
  CloudDownload,
  Download,
  Key,
  LogOut,
  Printer,
  ShieldCheck,
  Store,
  Trash2,
  Upload,
  Users,
} from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import {
  Alert,
  Animated,
  Easing,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";
import { useAuthStore } from "@/lib/auth-store";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

type SettingItem = {
  key: string;
  icon: any;
  iconColor: string;
  iconBg: string;
  label: string;
  subtitle: string;
  route: string;
  danger?: boolean;
};

const SECTIONS: {
  key: string;
  icon: any;
  title: string;
  items: SettingItem[];
}[] = [
  {
    key: "toko",
    icon: Store,
    title: "Informasi Toko",
    items: [
      {
        key: "info-toko",
        icon: Store,
        iconColor: Colors.primary,
        iconBg: "#E0F7FA",
        label: "Informasi Toko",
        subtitle: "Nama, alamat, no. HP, footer struk",
        route: "/informasi-toko",
      },
    ],
  },
  {
    key: "akun",
    icon: Users,
    title: "Akun & Pengguna",
    items: [
      {
        key: "user",
        icon: Users,
        iconColor: "#16A34A",
        iconBg: "#DCFCE7",
        label: "Manajemen User",
        subtitle: "Kelola akun kasir & owner",
        route: "/manajemen-user",
      },
      {
        key: "pin",
        icon: Key,
        iconColor: "#EA580C",
        iconBg: "#FFF7ED",
        label: "Ganti PIN Saya",
        subtitle: "Ubah PIN login owner",
        route: "/ganti-pin",
      },
    ],
  },
  {
    key: "printer",
    icon: Printer,
    title: "Printer & Struk",
    items: [
      {
        key: "bt",
        icon: Bluetooth,
        iconColor: "#2563EB",
        iconBg: "#EFF6FF",
        label: "Printer Bluetooth",
        subtitle: "Hubungkan printer thermal 58mm / 80mm",
        route: "/printer-settings",
      },
    ],
  },
  {
    key: "backup",
    icon: CloudDownload,
    title: "Backup & Data",
    items: [
      {
        key: "export",
        icon: Download,
        iconColor: "#DC2626",
        iconBg: "#FEF2F2",
        label: "Backup Data",
        subtitle: "Simpan seluruh data toko ke file Excel",
        route: "/setting/export",
      },
      {
        key: "import",
        icon: Upload,
        iconColor: "#2563EB",
        iconBg: "#EFF6FF",
        label: "Restore dari Excel",
        subtitle: "Import produk & pelanggan dari file backup",
        route: "/setting/import",
      },
      {
        key: "reset",
        icon: Trash2,
        iconColor: "#DC2626",
        iconBg: "#FEF2F2",
        label: "Reset Data",
        subtitle: "Hapus semua data toko",
        route: "/setting/reset",
        danger: true,
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Primitives beranimasi
// ---------------------------------------------------------------------------

/** Wrapper generik: fade + slide-up staggered berdasarkan index saat mount. */
function Reveal({
  children,
  index = 0,
  style,
}: {
  children: React.ReactNode;
  index?: number;
  style?: any;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 420,
      delay: 80 + index * 70,
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
                outputRange: [18, 0],
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

/** Pressable dengan efek "press-in" scale + highlight, dipakai di semua baris. */
function Squeeze({
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
      friction: 6,
      tension: 200,
      useNativeDriver: true,
    }).start();

  const pressOut = () =>
    Animated.spring(scale, {
      toValue: 1,
      friction: 5,
      tension: 160,
      useNativeDriver: true,
    }).start();

  return (
    <Pressable onPress={onPress} onPressIn={pressIn} onPressOut={pressOut}>
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Sub components
// ---------------------------------------------------------------------------

function SettingRow({ item }: { item: SettingItem }) {
  const router = useRouter();
  const Icon = item.icon;
  const arrowShift = useRef(new Animated.Value(0)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(arrowShift, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(arrowShift, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
    router.push(item.route as any);
  };

  return (
    <Squeeze onPress={handlePress} style={styles.row} scaleTo={0.985}>
      <View style={[styles.rowIcon, { backgroundColor: item.iconBg }]}>
        <Icon color={item.iconColor} size={19} />
      </View>
      <View style={styles.rowInfo}>
        <Text style={[styles.rowLabel, item.danger && styles.rowLabelDanger]}>
          {item.label}
        </Text>
        <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
      </View>
      <Animated.View
        style={{
          transform: [
            {
              translateX: arrowShift.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 5],
              }),
            },
          ],
        }}
      >
        <ChevronRight color="#C7CCD3" size={18} />
      </Animated.View>
    </Squeeze>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function SettingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);

  const isOwner = user?.role === "owner";

  const handleLogout = () => {
    Alert.alert("Logout", "Yakin ingin logout?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: () => {
          logout();
          router.replace("/welcome");
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      {/* ---------- Header ---------- */}
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <Text style={styles.headerTitle}>Pengaturan</Text>
        <Text style={styles.headerSubtitle}>Kelola toko dan aplikasi kamu</Text>
      </View>

      <ScrollView
        style={styles.screen}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 110,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ---------- Kartu identitas: menggantung, "melayang" dari hero ---------- */}
        <Reveal index={0} style={styles.floatCard}>
          <View style={styles.storeRow}>
            <Image
              source={require("@/assets/images/logo/kasirkita.webp")}
              style={styles.storeLogo}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.storeName}>Kasir Kita</Text>
              <Text style={styles.storeSubtitle}>
                Sistem kasir digital UMKM
              </Text>
            </View>
          </View>

          <View style={styles.floatDivider} />

          <View style={styles.accountRow}>
            <View style={styles.accountAvatar}>
              <Text style={styles.accountInitial}>
                {(user?.name?.[0] ?? "?").toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              {user ? (
                <>
                  <Text style={styles.accountName}>{user.name}</Text>
                  <Text style={styles.accountMeta}>@{user.username}</Text>
                </>
              ) : (
                <Text style={styles.accountMeta}>Belum login</Text>
              )}
            </View>
            {user && (
              <View
                style={[
                  styles.rolePill,
                  { backgroundColor: isOwner ? "#EFF6FF" : "#FEF3C7" },
                ]}
              >
                <ShieldCheck
                  color={isOwner ? "#2563EB" : "#B45309"}
                  size={13}
                />
                <Text
                  style={[
                    styles.rolePillText,
                    { color: isOwner ? "#2563EB" : "#B45309" },
                  ]}
                >
                  {isOwner ? "Owner" : "Kasir"}
                </Text>
              </View>
            )}
          </View>
        </Reveal>

        {/* ---------- Sections ---------- */}
        {SECTIONS.map((section, sIdx) => {
          const SectionIcon = section.icon;

          const visibleItems = section.items.filter((item) => {
            if (item.key === "user" || item.key === "reset") return isOwner;
            return true;
          });

          if (visibleItems.length === 0) return null;

          return (
            <Reveal key={section.key} index={sIdx + 1} style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconChip}>
                  <SectionIcon color={Colors.primary} size={14} />
                </View>
                <Text style={styles.sectionTitle}>{section.title}</Text>
              </View>
              <View style={styles.sectionCard}>
                {visibleItems.map((item, idx) => (
                  <React.Fragment key={item.key}>
                    <SettingRow item={item} />
                    {idx < visibleItems.length - 1 && (
                      <View style={styles.rowDivider} />
                    )}
                  </React.Fragment>
                ))}
              </View>
            </Reveal>
          );
        })}

        {/* ---------- Logout ---------- */}
        <Reveal index={SECTIONS.length + 1} style={{ marginBottom: 24 }}>
          <Squeeze
            onPress={handleLogout}
            style={styles.logoutCard}
            scaleTo={0.98}
          >
            <View style={styles.logoutIconWrap}>
              <LogOut color="#DC2626" size={18} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.logoutTitle}>Keluar dari Akun</Text>
              <Text style={styles.logoutSubtitle}>
                Kamu perlu login kembali setelahnya
              </Text>
            </View>
            <ChevronRight color="#FCA5A5" size={18} />
          </Squeeze>
        </Reveal>

        {/* ---------- Footer ---------- */}
        <Reveal index={SECTIONS.length + 2} style={styles.footerPillWrap}>
          <View style={styles.footerPill}>
            <View style={styles.footerDot} />
            <Text style={styles.footerText}>Kasir Kita · v1.0.0</Text>
          </View>
        </Reveal>
      </ScrollView>
    </View>
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

  // ----- Header -----
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#6B7280",
    marginTop: 4,
  },

  // ----- Kartu melayang -----
  floatCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 16,
    marginTop: 4,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  storeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  storeLogo: {
    width: 52,
    height: 52,
    borderRadius: 14,
  },
  storeName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  storeSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  floatDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 14,
  },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  accountAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  accountInitial: {
    color: Colors.white,
    fontWeight: "800",
    fontSize: 16,
  },
  accountName: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#111827",
  },
  accountMeta: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 1,
  },
  rolePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  rolePillText: {
    fontSize: 11,
    fontWeight: "700",
  },

  // ----- Section -----
  section: {
    marginBottom: 22,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
    paddingLeft: 2,
  },
  sectionIconChip: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: "#E0F7FA",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#111827",
  },
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: 18,
    paddingHorizontal: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },

  // ----- Row -----
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 14,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  rowInfo: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  rowLabelDanger: {
    color: "#DC2626",
  },
  rowSubtitle: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 2,
  },
  rowDivider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginLeft: 66,
  },

  // ----- Logout -----
  logoutCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FEF2F2",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#FEE2E2",
  },
  logoutIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#DC2626",
  },
  logoutSubtitle: {
    fontSize: 11.5,
    color: "#EF9A9A",
    marginTop: 1,
  },

  // ----- Footer -----
  footerPillWrap: {
    alignItems: "center",
    marginTop: 4,
  },
  footerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
  },
  footerDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#9CA3AF",
  },
  footerText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#6B7280",
  },
});
