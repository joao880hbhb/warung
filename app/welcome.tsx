import LottieView from "lottie-react-native";
import { useRouter } from "expo-router";
import React from "react";
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    useWindowDimensions,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";
import { useAuthStore } from "@/lib/auth-store";
import { hasUsers, initDatabase } from "@/lib/database";

export default function WelcomeScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { width } = useWindowDimensions();
  const [checking, setChecking] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        await initDatabase();
      } catch {
        // tetap di welcome jika error
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  // Jika sesi sudah dipulihkan (masih login) dan DB siap → langsung masuk tabs
  React.useEffect(() => {
    if (user && !checking) {
      router.replace("/(tabs)");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, checking]);

  const handleStart = async () => {
    const exists = await hasUsers();
    if (exists) {
      router.push("/users");
    } else {
      router.push("/owner-setup");
    }
  };

  // Ukuran logo animasi responsif: aset 500x500 (persegi), ikuti lebar layar.
  const brandWidth = Math.min(width * 0.85, 680);
  const brandHeight = brandWidth * (600 / 800);

  return (
    <View style={[styles.background, styles.primaryBg]}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.brand}>
            <Text style={styles.logo}>Kasir Kita</Text>
            <Text style={styles.tagline}>Kasir pintar untuk usahamu</Text>
          </View>

          <View>
            <LottieView
              source={require("@/assets/icon-gerak/shopping cart.json")}
              style={[
                styles.brandImage,
                { width: brandWidth, height: brandHeight },
              ]}
              autoPlay
              loop
              resizeMode="contain"
            />
          </View>

          <View style={styles.footer}>
            {checking || user ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator color={Colors.primary} size="large" />
              </View>
            ) : (
              <Pressable
                style={({ pressed }) => [
                  styles.button,
                  pressed && styles.buttonPressed,
                ]}
                onPress={handleStart}
              >
                <Text style={styles.buttonText}>Mulai Sekarang</Text>
              </Pressable>
            )}
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  primaryBg: {
    backgroundColor: Colors.primary,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  brand: {
    marginTop: 64,
    alignItems: "center",
  },
  brandImage: {
    width: 340,
    height: 340,
    marginBottom: 12,
  },
  logo: {
    fontSize: 48,
    fontWeight: "800",
    color: Colors.white,
    letterSpacing: 1,
  },
  tagline: {
    marginTop: 8,
    fontSize: 16,
    color: "#ffffff",
    textAlign: "center",
  },
  footer: {
    justifyContent: "flex-end",
  },
  loadingBox: {
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    backgroundColor: "#ffff",
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  buttonText: {
    color: Colors.primary,
    fontSize: 18,
    fontWeight: "700",
  },
});
