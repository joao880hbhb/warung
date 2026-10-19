import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Bluetooth,
  BluetoothOff,
  Check,
  Printer,
  RefreshCw,
  TestTube,
  Unplug,
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";
import { loadPrinterConfig, savePrinterConfig, type PaperWidth } from "@/lib/printer-config";

type StatusState = "idle" | "loading" | "connected" | "error";

export default function PrinterSettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [, setBtEnabled] = useState(true);
  const [status, setStatus] = useState<StatusState>("idle");
  const [connectedDevice, setConnectedDevice] = useState<string | null>(null);
  const [devices, setDevices] = useState<{ name: string | null; address: string }[]>([]);
  const [paperWidth, setPaperWidth] = useState<PaperWidth>("58mm");
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    (async () => {
      const config = await loadPrinterConfig();
      setPaperWidth(config.paperWidth);
      setConnectedDevice(config.deviceAddress);
      try {
        const ps = await import("@/services/printer/PrinterService");
        if (ps.isPrinterConnected()) {
          setStatus("connected");
        } else if (config.deviceAddress) {
          setStatus("loading");
          const ok = await ps.reconnectLastPrinter();
          setStatus(ok ? "connected" : "idle");
          setConnectedDevice(ok ? config.deviceAddress : null);
        }
      } catch {
        // Native module unavailable (Expo Go)
      }
    })();
  }, []);

  const handleScan = useCallback(async () => {
    setScanning(true);
    setDevices([]);
    try {
      const ps = await import("@/services/printer/PrinterService");
      const enabled = await ps.checkBluetoothEnabled();
      setBtEnabled(enabled);
      if (!enabled) {
        Alert.alert("Bluetooth Nonaktif", "Aktifkan Bluetooth untuk mencari printer.");
        setScanning(false);
        return;
      }
      const paired = await ps.scanPairedDevices();
      setDevices(paired);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Gagal memindai printer");
    } finally {
      setScanning(false);
    }
  }, []);

  const handleConnect = useCallback(
    async (device: { name: string | null; address: string }) => {
      setStatus("loading");
      try {
        const ps = await import("@/services/printer/PrinterService");
        await ps.connectPrinter(device.address, paperWidth);
        setConnectedDevice(device.address);
        setStatus("connected");
        Alert.alert("Berhasil", `Terhubung ke ${device.name || device.address}`);
      } catch (e: any) {
        setStatus("error");
        Alert.alert("Gagal", e?.message || "Tidak dapat menghubungkan ke printer");
        setStatus("idle");
      }
    },
    [paperWidth],
  );

  const handleDisconnect = useCallback(async () => {
    try {
      const ps = await import("@/services/printer/PrinterService");
      await ps.disconnectPrinter();
      setConnectedDevice(null);
      setStatus("idle");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Gagal memutuskan koneksi");
    }
  }, []);

  const handleTestPrint = useCallback(async () => {
    try {
      const ps = await import("@/services/printer/PrinterService");
      if (!ps.isPrinterConnected()) {
        Alert.alert("Tidak Terhubung", "Hubungkan printer terlebih dahulu");
        return;
      }
      await ps.printTestReceipt();
      Alert.alert("Berhasil", "Struk test berhasil dikirim ke printer");
    } catch (e: any) {
      Alert.alert("Gagal", e?.message || "Gagal mencetak struk test");
    }
  }, []);

  const handlePaperWidthChange = useCallback(
    async (w: PaperWidth) => {
      setPaperWidth(w);
      await savePrinterConfig({ paperWidth: w });
      if (connectedDevice) {
        Alert.alert(
          "Perlu Reconnect",
          "Ganti ukuran kertas, hubungkan ulang printer agar efektif.",
        );
      }
    },
    [connectedDevice],
  );

  const statusColor =
    status === "connected"
      ? Colors.primary
      : status === "loading"
        ? "#D97706"
        : status === "error"
          ? "#DC2626"
          : "#9CA3AF";

  const statusLabel =
    status === "connected"
      ? "Terhubung"
      : status === "loading"
        ? "Menghubungkan..."
        : status === "error"
          ? "Gagal"
          : "Tidak Terhubung";

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <ArrowLeft color="#111827" size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>Printer Bluetooth</Text>
        <View style={{ width: 22 }} />
      </View>

      <FlatList
        data={devices}
        keyExtractor={(item) => item.address}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 16 }}>
            <View style={styles.statusCard}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.statusLabel}>Status Koneksi</Text>
                <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
              </View>
              {status === "connected" ? (
                <Bluetooth color={Colors.primary} size={20} />
              ) : (
                <BluetoothOff color="#D1D5DB" size={20} />
              )}
            </View>

            {connectedDevice && status === "connected" && (
              <View style={styles.connectedCard}>
                <View style={styles.connectedIcon}>
                  <Printer color={Colors.primary} size={18} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.connectedLabel}>Printer Aktif</Text>
                  <Text style={styles.connectedAddress}>{connectedDevice}</Text>
                </View>
                <Pressable style={styles.disconnectBtn} onPress={handleDisconnect}>
                  <Unplug color="#DC2626" size={14} />
                  <Text style={styles.disconnectBtnText}>Putus</Text>
                </Pressable>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ukuran Kertas</Text>
              <View style={styles.paperRow}>
                {(["58mm", "80mm"] as PaperWidth[]).map((w) => (
                  <Pressable
                    key={w}
                    style={[styles.paperChip, paperWidth === w && styles.paperChipActive]}
                    onPress={() => handlePaperWidthChange(w)}
                  >
                    {paperWidth === w && <Check color={Colors.primary} size={14} />}
                    <Text style={[styles.paperChipText, paperWidth === w && styles.paperChipTextActive]}>
                      {w}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.actionRow}>
              <Pressable style={styles.scanBtn} onPress={handleScan} disabled={scanning}>
                {scanning ? (
                  <ActivityIndicator color={Colors.primary} size={16} />
                ) : (
                  <RefreshCw color={Colors.primary} size={16} />
                )}
                <Text style={styles.scanBtnText}>{scanning ? "Memindai..." : "Cari Printer"}</Text>
              </Pressable>

              <Pressable
                style={[styles.testBtn, status !== "connected" && styles.testBtnDisabled]}
                onPress={handleTestPrint}
                disabled={status !== "connected"}
              >
                <TestTube color={status === "connected" ? Colors.white : "#9CA3AF"} size={16} />
                <Text style={[styles.testBtnText, status !== "connected" && styles.testBtnTextDisabled]}>
                  Test Cetak
                </Text>
              </Pressable>
            </View>

            <Text style={styles.sectionTitle}>Printer Terpasang</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: 100 }}
        renderItem={({ item }) => {
          const isConn = connectedDevice === item.address && status === "connected";
          return (
            <Pressable
              style={[styles.deviceRow, isConn && styles.deviceRowActive]}
              onPress={() => (isConn ? handleDisconnect() : handleConnect(item))}
            >
              <View style={[styles.deviceIcon, { backgroundColor: isConn ? "#E8F0FE" : "#F3F4F6" }]}>
                <Bluetooth color={isConn ? Colors.primary : "#9CA3AF"} size={18} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.deviceName}>{item.name || "Printer Tidak Dikenal"}</Text>
                <Text style={styles.deviceAddress}>{item.address}</Text>
              </View>
              {isConn ? (
                <View style={styles.connectedBadge}>
                  <Text style={styles.connectedBadgeText}>Aktif</Text>
                </View>
              ) : (
                <Text style={styles.connectText}>Hubungkan</Text>
              )}
            </Pressable>
          );
        }}
        ListEmptyComponent={
          !scanning ? (
            <View style={styles.emptyState}>
              <BluetoothOff color="#D1D5DB" size={40} />
              <Text style={styles.emptyTitle}>Tidak ada printer ditemukan</Text>
              <Text style={styles.emptySubtitle}>
                {"Pastikan printer sudah dipasangkan di pengaturan Bluetooth perangkat Anda, lalu tekan \"Cari Printer\""}
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F3F4F6" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  statusLabel: { fontSize: 11, color: "#9CA3AF" },
  statusText: { fontSize: 14, fontWeight: "700", marginTop: 2 },
  connectedCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#E8F0FE",
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
  },
  connectedIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  connectedLabel: { fontSize: 11, color: "#6B7280" },
  connectedAddress: { fontSize: 13, fontWeight: "600", color: "#111827", marginTop: 2 },
  disconnectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  disconnectBtnText: { fontSize: 12, fontWeight: "700", color: "#DC2626" },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: "#111827", marginBottom: 10, marginTop: 8 },
  paperRow: { flexDirection: "row", gap: 8 },
  paperChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.white,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  paperChipActive: { backgroundColor: "#E8F0FE", borderWidth: 1.5, borderColor: Colors.primary },
  paperChipText: { fontSize: 13, fontWeight: "600", color: "#6B7280" },
  paperChipTextActive: { color: Colors.primary },
  actionRow: { flexDirection: "row", gap: 10, marginTop: 20 },
  scanBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  scanBtnText: { fontSize: 13, fontWeight: "700", color: Colors.primary },
  testBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
  },
  testBtnDisabled: { backgroundColor: "#F3F4F6" },
  testBtnText: { fontSize: 13, fontWeight: "700", color: Colors.white },
  testBtnTextDisabled: { color: "#9CA3AF" },
  deviceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: 14,
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
  },
  deviceRowActive: { backgroundColor: "#E8F0FE", borderWidth: 1.5, borderColor: Colors.primary },
  deviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  deviceName: { fontSize: 14, fontWeight: "600", color: "#111827" },
  deviceAddress: { fontSize: 11, color: "#9CA3AF", marginTop: 2 },
  connectedBadge: { backgroundColor: Colors.primary, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  connectedBadgeText: { fontSize: 11, fontWeight: "700", color: Colors.white },
  connectText: { fontSize: 12, fontWeight: "600", color: Colors.primary },
  emptyState: { alignItems: "center", paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: "#9CA3AF", marginTop: 8 },
  emptySubtitle: { fontSize: 12, color: "#D1D5DB", textAlign: "center", paddingHorizontal: 40, lineHeight: 18 },
});
