import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CloudDownload, Clock, ChevronLeft, Database, FileText } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
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
import * as Sharing from "expo-sharing";

import { Colors } from "@/constants/theme";
import { getBackupData, initDatabase } from "@/lib/database";
import { exportBackupToExcel } from "@/services/export/BackupService";

const STORAGE_KEY = "warungku_last_backup";

const INCLUDED_TABLES = [
  { label: "Users & Akun", icon: "👤" },
  { label: "Informasi Toko", icon: "🏪" },
  { label: "Kategori Produk", icon: "📂" },
  { label: "Produk & Stok", icon: "📦" },
  { label: "Pelanggan", icon: "🧑" },
  { label: "Diskon", icon: "🏷" },
  { label: "Harga Grosir", icon: "💰" },
  { label: "Transaksi & Item", icon: "🧾" },
  { label: "Pembayaran", icon: "💳" },
  { label: "Pergerakan Stok", icon: "📊" },
  { label: "Pengeluaran", icon: "📝" },
  { label: "Konsinyasi & Konsinyer", icon: "🤝" },
];

function formatTimestamp(iso: string | null): string {
  if (!iso) return "Belum pernah";
  try {
    const d = new Date(iso);
    const day = String(d.getDate()).padStart(2, "0");
    const mon = String(d.getMonth() + 1).padStart(2, "0");
    const yr = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${day}/${mon}/${yr} ${hh}:${mm}`;
  } catch {
    return iso;
  }
}

export default function BackupScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const loadLastBackup = useCallback(async () => {
    try {
      const val = await AsyncStorage.getItem(STORAGE_KEY);
      setLastBackup(val);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLastBackup();
  }, [loadLastBackup]);

  const handleBackup = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await initDatabase();
      const tables = await getBackupData();

      if (tables.length === 0) {
        Alert.alert("Tidak Ada Data", "Tidak ada data yang bisa di-backup.");
        return;
      }

      const { uri, name, tableCount, rowCount } = await exportBackupToExcel(tables);

      const now = new Date().toISOString();
      await AsyncStorage.setItem(STORAGE_KEY, now);
      setLastBackup(now);

      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert(
          "Backup Berhasil",
          `File ${name} berhasil dibuat.\n\n${tableCount} tabel, ${rowCount} baris data.`,
        );
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        dialogTitle: "Backup Data Warungku",
        UTI: "org.openxmlformats.spreadsheetml.sheet",
      });
    } catch (e: any) {
      Alert.alert(
        "Backup Gagal",
        e?.message ?? "Terjadi kesalahan saat membuat file backup. Silakan coba lagi.",
      );
    } finally {
      setExporting(false);
    }
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
          <Text style={styles.headerTitle}>Backup Data</Text>
          <Text style={styles.headerSubtitle}>
            Simpan seluruh data toko ke file Excel
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Last backup info */}
        <View style={styles.card}>
          <View style={[styles.cardIconCircle, { backgroundColor: "#EFF6FF" }]}>
            <Clock color="#2563EB" size={22} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardLabel}>Terakhir Backup</Text>
            {loading ? (
              <ActivityIndicator size="small" color={Colors.neutral} />
            ) : (
              <Text style={styles.cardValue}>
                {formatTimestamp(lastBackup)}
              </Text>
            )}
          </View>
        </View>

        {/* What's included */}
        <View style={styles.card}>
          <View style={[styles.cardIconCircle, { backgroundColor: "#ECFDF5" }]}>
            <Database color="#16A34A" size={22} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardLabel}>Yang di-backup</Text>
            <Text style={styles.cardSubtext}>
              Seluruh data tersimpan sebagai sheet terpisah di file Excel.
              Struktur tabel dipertahankan agar bisa dijadikan sumber restore.
            </Text>
            <View style={styles.tableGrid}>
              {INCLUDED_TABLES.map((t) => (
                <View key={t.label} style={styles.tableChip}>
                  <Text style={styles.tableChipText}>
                    {t.icon} {t.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Backup button */}
        <Pressable
          style={({ pressed }) => [
            styles.backupBtn,
            (pressed || exporting) && styles.backupBtnPressed,
          ]}
          onPress={handleBackup}
          disabled={exporting}
        >
          {exporting ? (
            <>
              <ActivityIndicator size="small" color={Colors.white} />
              <Text style={styles.backupBtnText}>Membuat backup...</Text>
            </>
          ) : (
            <>
              <CloudDownload color={Colors.white} size={22} />
              <Text style={styles.backupBtnText}>Backup Sekarang</Text>
            </>
          )}
        </Pressable>

        {/* Note */}
        <View style={styles.noteCard}>
          <FileText color={Colors.neutral} size={16} />
          <Text style={styles.noteText}>
            File backup berisi seluruh data toko Anda. Simpan file di tempat
            yang aman untuk digunakan sebagai sumber restore setelah install
            ulang aplikasi.
          </Text>
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
  cardValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  cardSubtext: {
    fontSize: 12,
    color: Colors.neutral,
    lineHeight: 18,
    marginBottom: 10,
  },

  // Table chips
  tableGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  tableChip: {
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  tableChipText: {
    fontSize: 12,
    color: "#374151",
    fontWeight: "500",
  },

  // Backup button
  backupBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 14,
  },
  backupBtnPressed: {
    opacity: 0.85,
  },
  backupBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "700",
  },

  // Note
  noteCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
  },
  noteText: {
    flex: 1,
    fontSize: 12,
    color: Colors.neutral,
    lineHeight: 18,
  },
});
