import { useRouter } from "expo-router";
import {
  Bluetooth,
  ChevronRight,
  CloudDownload,
  Download,
  Key,
  LogOut,
  Printer,
  Store,
  Trash2,
  Upload,
  Users,
} from "lucide-react-native";
import React from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import HeaderTab from "@/components/HeaderTab";
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
    key: "akun",
    icon: Users,
    title: "Akun & Pengguna",
    items: [
      {
        key: "user",
        icon: Users,
        iconColor: "#F47B20",
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
// Sub components
// ---------------------------------------------------------------------------

function SettingRow({ item }: { item: SettingItem }) {
  const router = useRouter();
  const Icon = item.icon;
  return (
    <Pressable
      style={styles.row}
      onPress={() => router.push(item.route as any)}
    >
      <View style={[styles.rowIcon, { backgroundColor: item.iconBg }]}>
        <Icon color={item.iconColor} size={18} />
      </View>
      <View style={styles.rowInfo}>
        <Text style={[styles.rowLabel, item.danger && styles.rowLabelDanger]}>
          {item.label}
        </Text>
        <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
      </View>
      <ChevronRight color="#D1D5DB" size={18} />
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function SettingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  const handleLogout = () => {
    Alert.alert("Logout", "Yakin ingin logout?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: () => {
          logout();
          // router.dismissAll();
          router.replace("/welcome");
        },
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingBottom: 100,
      }}
      showsVerticalScrollIndicator={false}
    >
      <HeaderTab
        title="Pengaturan"
        subtitle="Kelola toko dan aplikasi"
        topInset={insets.top}
      />

      {/* Store identity card */}
      <View style={styles.storeCard}>
        <Image
          source={require("@/assets/images/logo/kasirkita.webp")}
          style={styles.storeLogo}
        />
        <View style={styles.storeInfo}>
          <Text style={styles.storeName}>Kasir Kita</Text>
          <Text style={styles.storeSubtitle}>Sistem kasir digital UMKM</Text>
        </View>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Store color="#EA580C" size={18} />
          <Text style={styles.sectionTitle}>Informasi Toko</Text>
        </View>
        <View style={styles.sectionCard}>
          <SettingRow
            item={{
              key: "info-toko",
              icon: Store,
              iconColor: Colors.primary,
              iconBg: "#E8F0FE",
              label: "Informasi Toko",
              subtitle: "Nama, alamat, no. HP, footer struk",
              route: "/informasi-toko",
            }}
          />
        </View>
      </View>

      {SECTIONS.map((section) => {
        const SectionIcon = section.icon;
        return (
          <View key={section.key} style={styles.section}>
            <View style={styles.sectionHeader}>
              <SectionIcon color="#EA580C" size={18} />
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
            <View style={styles.sectionCard}>
              {section.items.map((item, idx) => (
                <React.Fragment key={item.key}>
                  <SettingRow item={item} />
                  {idx < section.items.length - 1 && (
                    <View style={styles.rowDivider} />
                  )}
                </React.Fragment>
              ))}
            </View>
          </View>
        );
      })}

      {/* Logout */}
      <View style={styles.section}>
        <Pressable
          style={({ pressed }) => [
            styles.logoutBtn,
            pressed && styles.logoutBtnPressed,
          ]}
          onPress={handleLogout}
        >
          <LogOut color="#DC2626" size={20} />
          <Text style={styles.logoutText}>Keluar</Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerLeft}>Versi Aplikasi</Text>
        <Text style={styles.footerRight}>Kasir Kita v1.0.0</Text>
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
  // Store card
  storeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: Colors.secondary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  storeLogo: {
    width: 56,
    height: 56,
    borderRadius: 14,
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.white,
  },
  storeSubtitle: {
    fontSize: 12,
    color: Colors.white,
    marginTop: 2,
  },

  // Section
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingHorizontal: 4,
  },

  // Row
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
    borderRadius: 12,
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

  // Logout
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
    paddingVertical: 14,
  },
  logoutBtnPressed: {
    opacity: 0.85,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#DC2626",
  },

  // Footer
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  footerLeft: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  footerRight: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
  },
});
