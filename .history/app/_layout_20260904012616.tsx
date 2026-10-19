import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "react-native-reanimated";

import { Colors } from "@/constants/theme";
import { useAuthStore } from "@/lib/auth-store";

export const unstable_settings = {
  anchor: "(tabs)",
};

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const hydrated = useAuthStore((s) => s.hydrated);
  const hydrateError = useAuthStore((s) => s.hydrateError);
  const [notified, setNotified] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hydrateError && !notified) {
      setNotified(true);
      Alert.alert(
        "Gagal Memuat Sesi",
        "Sesi login tidak dapat dibaca. Silakan login ulang.",
        [{ text: "OK" }],
      );
    }
  }, [hydrateError, notified]);

  if (!hydrated) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" }}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
        <StatusBar style="auto" />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="welcome" />
        <Stack.Screen name="owner-setup" />
        <Stack.Screen name="users" />
        <Stack.Screen name="informasi-toko" />
        <Stack.Screen name="manajemen-user" />
        <Stack.Screen name="ganti-pin" />
        <Stack.Screen name="kategori" />
        <Stack.Screen name="pelanggan" />
        <Stack.Screen name="diskon" />
        <Stack.Screen name="tambah-produk" />
        <Stack.Screen name="edit-produk/[id]" />
        <Stack.Screen name="login" />
        <Stack.Screen name="history" />
        <Stack.Screen name="printer-settings" />
        <Stack.Screen name="pengeluaran" />
        <Stack.Screen name="piutang" />
        <Stack.Screen name="piutang-detail" />
        <Stack.Screen name="harga-grosir" />
        <Stack.Screen name="konsinyasi" />
        <Stack.Screen name="konsinyer" />
        <Stack.Screen name="tambah-konsinyasi" />
        <Stack.Screen name="transaksi-konsinyasi" />
        <Stack.Screen name="laporan-konsinyasi" />
        <Stack.Screen name="setting/export" />
        <Stack.Screen name="setting/import" />
        <Stack.Screen name="setting/reset" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}