import { useRouter } from "expo-router";
import {
  Image,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <ImageBackground
      source={require("@/assets/images/bg-awal.jpg")}
      style={styles.background}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.brand}>
            <Image
              source={require("@/assets/images/asset vector/asset 1.png")}
              style={styles.brandImage}
              resizeMode="contain"
            />
            <Text style={styles.logo}>Warungku</Text>
            <Text style={styles.tagline}>
              Kasir warung pintar untuk usahamu
            </Text>
          </View>

          <View style={styles.footer}>
            <Pressable
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
              ]}
              onPress={() => router.replace("/(tabs)")}
            >
              <Text style={styles.buttonText}>Mulai Sekarang</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
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
    width: 180,
    height: 180,
    marginBottom: 12,
  },
  logo: {
    fontSize: 48,
    fontWeight: "800",
    color: Colors.primary,
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
