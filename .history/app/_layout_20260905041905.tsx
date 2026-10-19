import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, View } from "react-native";
import "react-native-reanimated";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";
import { useAuthStore } from "@/lib/auth-store";

export default function RootLayout() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const hydrated = useAuthStore((s) => s.hydrated);
  const hydrateError = useAuthStore((s) => s.hydrateError);
  const user = useAuthStore((s) => s.user);
  const [notified, setNotified] = useState(false);
  const [loadingDelayDone, setLoadingDelayDone] = useState(false);
  const router = useRouter();

  // Animated zoom for loading logo
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const timer = setTimeout(() => setLoadingDelayDone(true), 5000);

    hydrate();

    return () => clearTimeout(timer);
  }, [hydrate]);

  useEffect(() => {
    if (!hydrated) {
      // Loop zoom in-out while loading
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.8,
            duration: 500,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }
  }, [hydrated, scaleAnim]);

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

  useEffect(() => {
    if (hydrated && loadingDelayDone) {
      if (user) {
        router.replace("/(tabs)");
      } else {
        router.replace("/welcome");
      }
    }
  }, [hydrated, loadingDelayDone, user, router]);

  if (!hydrated || !loadingDelayDone) {
    return (
      <SafeAreaProvider>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#FFFFFF",
          }}
        >
          <Animated.Image
            source={require("../assets/images/logo/kasirkitabg.webp")}
            style={{
              width: 120,
              height: 120,
              marginBottom: 24,
              transform: [{ scale: scaleAnim }],
            }}
            resizeMode="contain"
          />
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
