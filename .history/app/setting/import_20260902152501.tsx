import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import {
  ChevronLeft,
  FileWarning,
  FolderOpen,
  HardDriveDownload,
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
import {
  BACKUP_TABLES,
  initDatabase,
  restoreFromBackup,
  type BackupTableData,
} from "@/lib/database";
import { parseBackupFile, type ParsedBackupSheet } from "@/services/export/BackupService";

const TABLE_LABELS: Record<string, string> = {
  users: "Users & Akun",
  store: "Informasi Toko",
  categories: "Kategori Produk",
  products: "Produk & Stok",
  customers: "Pelanggan",
  discounts: "Diskon",
  discount_products: "Produk Diskon",
  wholesale_prices: "Harga Grosir",
  transactions: "Transaksi",
  transaction_items: "Detail Transaksi",
  transaction_payments: "Pembayaran",
  stock_movements: "Pergerakan Stok",
  expenses: "Pengeluaran",
  consignors: "Konsinyer",
  consignments: "Konsinyasi",
};

function formatCount(value: number): string {
  return `${value.toLocaleString("id-ID")} baris`;
}

export default function RestoreScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [picking, setPicking] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [sheets, setSheets] = useState<ParsedBackupSheet[]>([]);
  const [parsedTables, setParsedTables] = useState<BackupTableData[]>([]);
  const [restoring, setRestoring] = useState(false);

  const validSheets = sheets.filter((s) =>
    BACKUP_TABLES.includes(s.table),
  );

  const handlePickFile = async () => {
    if (picking || restoring) return;
    setPicking(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "*/*",
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset.uri.toLowerCase().endsWith(".xlsx")) {
        Alert.alert(
          "File Tidak Valid",
          "Pilih file backup berformat .xlsx yang dibuat dari fitur Backup Data.",
        );
        setFileName(null);
        setSheets([]);
        return;
      }
      await initDatabase();
      const parsed = await parseBackupFile(asset.uri);
      if (parsed.length === 0) {
        Alert.alert(
          "File Tidak Valid",
          "File tidak berisi sheet yang dikenali sebagai data Warungku.",
        );
        setFileName(null);
        setSheets([]);
        setParsedTables([]);
        return;
      }
      setFileName(asset.name);
      setSheets(
        parsed.map((p) => ({ table: p.table, rowCount: p.rows.length })),
      );
      setParsedTables(parsed);
    } catch (e: any) {
      Alert.alert(
        "Gagal Membaca File",
        e?.message ?? "Terjadi kesalahan saat membaca file backup.",
      );
      setFileName(null);
      setSheets([]);
      setParsedTables([]);
    } finally {
      setPicking(false);
    }
  };

  const handleRestore = () => {
    if (restoring || validSheets.length === 0) return;

    const summary = validSheets
      .map(
        (s) =>
          `• ${TABLE_LABELS[s.table] ?? s.table} (${formatCount(s.rowCount)})`,
      )
      .join("\n");

    Alert.alert(
      "Restore Data",
      `File "${fileName}" berisi ${validSheets.length} tabel yang akan diperbarui:\n\n${summary}\n\nData lama pada tabel tersebut akan diganti seluruhnya dengan data backup. Pastikan file ini berasal dari fitur Backup Data Warungku.\n\nLanjutkan restore?`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Ya, Restore",
          style: "destructive",
          onPress: () => {
            void performRestore();
          },
        },
      ],
    );
  };

  const performRestore = async () => {
    setRestoring(true);
    try {
      const result = await restoreFromBackup(parsedTables);
      if (result.tableCount === 0) {
        Alert.alert(
          "Restore Gagal",
          "File tidak berisi sheet yang cocok dengan tabel Warungku.",
        );
        return;
      }
      Alert.alert(
        "Data Berhasil Dipulihkan",
        `${result.tableCount} tabel dipulihkan dengan ${formatCount(result.rowCount)} data.`,
        [{ text: "OK", onPress: () => router.replace("/(tabs)") }],
      );
    } catch (e: any) {
      Alert.alert(
        "Restore Gagal",
        e?.message ??
          "Terjadi kesalahan saat restore. Perubahan dibatalkan, data lama tetap utuh.",
      );
    } finally {
      setRestoring(false);
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
          <Text style={styles.headerTitle}>Restore Data</Text>
          <Text style={styles.headerSubtitle}>
            Pulihkan seluruh data dari file backup
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Step 1: pick file */}
        <View style={styles.card}>
          <View style={[styles.cardIconCircle, { backgroundColor: "#EFF6FF" }]}>
            <FolderOpen color="#2563EB" size={22} />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardLabel}>1. Pilih File Backup</Text>
            <Text style={styles.cardSubtext}>
              Pilih file .xlsx hasil dari fitur Backup Data Warungku.
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.pickBtn,
                (pressed || picking) && styles.pickBtnPressed,
              ]}
              onPress={handlePickFile}
              disabled={picking || restoring}
            >
              {picking ? (
                <>
                  <ActivityIndicator size="small" color={Colors.white} />
                  <Text style={styles.pickBtnText}>Membaca file...</Text>
                </>
              ) : (
                <>
                  <FolderOpen color={Colors.white} size={20} />
                  <Text style={styles.pickBtnText}>Pilih File .xlsx</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>

        {/* Step 2: preview */}
        {fileName ? (
          <View style={styles.card}>
            <View style={[styles.cardIconCircle, { backgroundColor: "#ECFDF5" }]}>
              <HardDriveDownload color="#16A34A" size={22} />
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.cardLabel}>2. Periksa File</Text>
              <Text style={styles.fileName}>{fileName}</Text>
              {validSheets.length === 0 ? (
                <View style={styles.warningRow}>
                  <TriangleAlert color="#B45309" size={16} />
                  <Text style={styles.warningText}>
                    Tidak ada sheet yang dikenali sebagai data Warungku.
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={styles.cardSubtext}>
                    {validSheets.length} tabel akan dipulihkan:
                  </Text>
                  <View style={styles.sheetList}>
                    {validSheets.map((s) => (
                      <View key={s.table} style={styles.sheetRow}>
                        <Text style={styles.sheetName}>
                          {TABLE_LABELS[s.table] ?? s.table}
                        </Text>
                        <Text style={styles.sheetCount}>
                          {formatCount(s.rowCount)}
                        </Text>
                      </View>
                    ))}
                  </View>
                  <Pressable
                    style={({ pressed }) => [
                      styles.restoreBtn,
                      pressed && styles.restoreBtnPressed,
                    ]}
                    onPress={handleRestore}
                    disabled={restoring}
                  >
                    {restoring ? (
                      <>
                        <ActivityIndicator
                          size="small"
                          color={Colors.white}
                        />
                        <Text style={styles.restoreBtnText}>Memulihkan...</Text>
                      </>
                    ) : (
                      <>
                        <HardDriveDownload color={Colors.white} size={20} />
                        <Text style={styles.restoreBtnText}>
                          Konfirmasi & Restore
                        </Text>
                      </>
                    )}
                  </Pressable>
                </>
              )}
            </View>
          </View>
        ) : null}

        {/* Warning */}
        <View style={styles.warningCard}>
          <FileWarning color="#B45309" size={16} />
          <Text style={styles.warningCardText}>
            Sebelum restore, pastikan Anda sudah membuat backup terbaru. Data
            lama pada tabel yang dipulihkan akan diganti dan tidak bisa
            dikembalikan. Restore diproses dalam satu transaksi — jika gagal,
            seluruh perubahan akan dibatalkan.
          </Text>
        </View>

        {/* Note */}
        <View style={styles.noteCard}>
          <ShieldCheck color={Colors.neutral} size={16} />
          <Text style={styles.noteText}>
            Setelah restore berhasil, aplikasi akan dimuat ulang otomatis dan
            data terbaru langsung digunakan.
          </Text>
        </View>
      </ScrollView>

      {restoring && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.overlayText}>Memulihkan data...</Text>
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
  fileName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },

  // Pick file button
  pickBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
  },
  pickBtnPressed: {
    opacity: 0.85,
  },
  pickBtnText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: "700",
  },

  // Sheet list
  sheetList: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 12,
  },
  sheetRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#F9FAFB",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  sheetName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    flex: 1,
  },
  sheetCount: {
    fontSize: 12,
    color: Colors.neutral,
  },
  warningRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFFBEB",
    borderRadius: 10,
    padding: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: "#B45309",
    lineHeight: 18,
  },

  // Restore button
  restoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#DC2626",
    borderRadius: 12,
    paddingVertical: 14,
  },
  restoreBtnPressed: {
    opacity: 0.85,
  },
  restoreBtnText: {
    color: Colors.white,
    fontSize: 15,
    fontWeight: "700",
  },

  // Warning & note
  warningCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
  },
  warningCardText: {
    flex: 1,
    fontSize: 12,
    color: "#92400E",
    lineHeight: 18,
  },
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
    color: Colors.primary,
  },
});