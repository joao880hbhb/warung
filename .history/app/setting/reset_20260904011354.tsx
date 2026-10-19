import { useRouter } from "expo-router";
import {
    ChevronLeft,
    DatabaseZap,
    Eraser,
    ShieldAlert,
    ShieldCheck,
    TriangleAlert,
} from "lucide-react-native";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";
import { useAuthStore } from "@/lib/auth-store";
import { initDatabase } from "@/lib/database";

export default function ResetScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const authUser = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [confirmStep, setConfirmStep] = useState(0);
  const [resetting, setResetting] = useState(false);

  // Guard: hanya owner yang bisa akses
  React.useEffect(() => {
    if (authUser && authUser.role !== "owner") {
      Alert.alert(
        "Akses Ditolak",
        "Hanya owner yang bisa mengakses fitur Reset Data",
        [{ text: "OK", onPress: () => router.back() }],
      );
    }
  }, [authUser, router]);

  const handleFirstPress = () => {
    Alert.alert(
      "Factory Reset",
      "Seluruh data toko termasuk akun login dan informasi toko akan dihapus permanen.\n\nSetelah reset, aplikasi akan kembali seperti baru dan Anda harus mengatur ulang owner dari awal (input PIN baru).",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Lanjutkan",
          style: "destructive",
          onPress: () => setConfirmStep(1),
        },
      ],
    );
  };

  const handleReset = async () => {
    setConfirmStep(0);
    setResetting(true);
    try {
      await initDatabase();
      await factoryReset();
      logout();
      Alert.alert(
        "Reset Berhasil",
        "Seluruh data telah dihapus. Aplikasi akan dimulai dari awal.",
        [{ text: "OK", onPress: () => router.replace("/welcome") }],
      );
    } catch (e: any) {
      Alert.alert(
        "Reset Gagal",
        e?.message ?? "Terjadi kesalahan saat mereset data. Silakan coba lagi.",
      );
    } finally {
      setResetting(false);
    }
  };

  const handleConfirm = () => {
    Alert.alert(
      "Yakin Hapus Semua Data?",
      "Tindakan ini TIDAK BISA dibatalkan. Seluruh data termasuk akun login akan terhapus permanen.\n\nAnda harus setup owner dari awal setelah reset.",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Ya, Hapus Semua",
          style: "destructive",
          onPress: () => {
            void handleReset();
          },
        },
      ],
      { cancelable: false },
    );
  };

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
          <Text style={styles.headerTitle}>Reset Data</Text>
          <Text style={styles.headerSubtitle}>
            Hapus seluruh data operasional toko
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Danger banner */}
        <View style={styles.dangerBanner}>
          <TriangleAlert color="#DC2626" size={28} />
          <Text style={styles.dangerBannerText}>
            Reset akan menghapus data secara permanen dan tidak dapat
            dibatalkan.
          </Text>
        </View>

        {/* What gets deleted */}
        <View style={styles.card}>
          <View style={[styles.cardIconCircle, { backgroundColor: "#FEF2F2" }]}>
            <Eraser color="#DC2626" size={22} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardLabel}>Yang akan dihapus</Text>
            <Text style={styles.cardSubtext}>
              Seluruh data operasional berikut dihapus permanen:
            </Text>
            <View style={styles.chipRow}>
              {[
                "Transaksi",
                "Produk & Stok",
                "Kategori",
                "Pelanggan",
                "Diskon",
                "Pengeluaran",
                "Konsinyasi",
                "Pergerakan Stok",
              ].map((label) => (
                <View key={label} style={styles.chip}>
                  <Text style={styles.chipText}>{label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* What is kept */}
        <View style={styles.card}>
          <View style={[styles.cardIconCircle, { backgroundColor: "#ECFDF5" }]}>
            <ShieldCheck color="#16A34A" size={22} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardLabel}>Yang tetap dipertahankan</Text>
            <Text style={styles.cardSubtext}>
              Struktur tabel dan data penting berikut tidak dihapus agar
              aplikasi tetap dapat digunakan:
            </Text>
            <View style={styles.chipRow}>
              <View style={styles.keepChip}>
                <Text style={styles.keepChipText}>Informasi Toko</Text>
              </View>
              <View style={styles.keepChip}>
                <Text style={styles.keepChipText}>Akun Login</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Step 1 button */}
        {confirmStep === 0 && (
          <Pressable
            style={({ pressed }) => [
              styles.resetBtn,
              pressed && styles.resetBtnPressed,
            ]}
            onPress={handleFirstPress}
            disabled={resetting}
          >
            <DatabaseZap color={Colors.white} size={20} />
            <Text style={styles.resetBtnText}>Lanjutkan ke Reset</Text>
          </Pressable>
        )}

        {/* Step 2 button */}
        {confirmStep === 1 && (
          <View>
            <Pressable
              style={({ pressed }) => [
                styles.resetBtn,
                styles.resetBtnFinal,
                pressed && styles.resetBtnPressed,
              ]}
              onPress={handleConfirm}
              disabled={resetting}
            >
              {resetting ? (
                <>
                  <ActivityIndicator size="small" color={Colors.white} />
                  <Text style={styles.resetBtnText}>Menghapus data...</Text>
                </>
              ) : (
                <>
                  <ShieldAlert color={Colors.white} size={20} />
                  <Text style={styles.resetBtnText}>
                    Konfirmasi Terakhir: Hapus Semua
                  </Text>
                </>
              )}
            </Pressable>
            <Pressable
              style={styles.cancelBtn}
              onPress={() => setConfirmStep(0)}
              disabled={resetting}
            >
              <Text style={styles.cancelBtnText}>Batal</Text>
            </Pressable>
          </View>
        )}

        {/* Warning */}
        <View style={styles.warningCard}>
          <ShieldAlert color="#B45309" size={16} />
          <Text style={styles.warningCardText}>
            Disarankan membuat backup terlebih dahulu melalui menu Backup Data
            sebelum melakukan reset, agar data bisa dipulihkan kembali jika
            diperlukan.
          </Text>
        </View>
      </ScrollView>

      {resetting && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#DC2626" />
          <Text style={styles.overlayText}>Menghapus data...</Text>
        </View>
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },

  // Danger banner
  dangerBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  dangerBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#B91C1C",
    lineHeight: 19,
  },

  // Cards
  card: {
    flexDirection: "row",
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    gap: 14,
  },
  cardIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    flex: 1,
  },
  cardLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  cardSubtext: {
    fontSize: 12,
    color: Colors.neutral,
    lineHeight: 18,
    marginBottom: 10,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  chip: {
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  chipText: {
    fontSize: 12,
    color: "#B91C1C",
    fontWeight: "500",
  },
  keepChip: {
    backgroundColor: "#ECFDF5",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  keepChipText: {
    fontSize: 12,
    color: "#15803D",
    fontWeight: "500",
  },

  // Reset buttons
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#DC2626",
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 14,
  },
  resetBtnFinal: {
    backgroundColor: "#B91C1C",
  },
  resetBtnPressed: {
    opacity: 0.85,
  },
  resetBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
  cancelBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginBottom: 14,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#374151",
  },

  // Warning
  warningCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 12,
    padding: 14,
  },
  warningCardText: {
    flex: 1,
    fontSize: 12,
    color: "#92400E",
    lineHeight: 18,
  },

  // Overlay
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  overlayText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#DC2626",
  },
});
