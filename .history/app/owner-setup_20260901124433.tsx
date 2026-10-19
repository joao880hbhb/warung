import { useRouter } from "expo-router";
import { ChevronLeft, Delete, Eye, EyeOff } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";
import { addUser, initDatabase } from "@/lib/database";

// ---------------------------------------------------------------------------
// PIN Keypad
// ---------------------------------------------------------------------------

const KEYS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["", "0", "del"],
];

function PinKeypad({
  onPress,
  onDelete,
}: {
  onPress: (key: string) => void;
  onDelete: () => void;
}) {
  return (
    <View style={keypadStyles.grid}>
      {KEYS.map((row, ri) => (
        <View key={ri} style={keypadStyles.row}>
          {row.map((key) => {
            if (key === "")
              return <View key={key + ri} style={keypadStyles.cell} />;
            if (key === "del") {
              return (
                <Pressable
                  key={key}
                  style={keypadStyles.cell}
                  onPress={onDelete}
                  hitSlop={8}
                >
                  <Delete color={Colors.neutral} size={22} />
                </Pressable>
              );
            }
            return (
              <Pressable
                key={key}
                style={({ pressed }) => [
                  keypadStyles.cell,
                  pressed && keypadStyles.cellPressed,
                ]}
                onPress={() => onPress(key)}
              >
                <Text style={keypadStyles.keyText}>{key}</Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const keypadStyles = StyleSheet.create({
  grid: {
    alignSelf: "center",
    gap: 10,
  },
  row: {
    flexDirection: "row",
    gap: 20,
    justifyContent: "center",
  },
  cell: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  cellPressed: {
    backgroundColor: "#E5E7EB",
  },
  keyText: {
    fontSize: 24,
    fontWeight: "600",
    color: "#111827",
  },
});

// ---------------------------------------------------------------------------
// PIN dots indicator
// ---------------------------------------------------------------------------

function PinDots({ length, max }: { length: number; max: number }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: max }).map((_, i) => (
        <View key={i} style={[styles.dot, i < length && styles.dotFilled]} />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

type Step = "name" | "username" | "pin" | "confirm";

export default function OwnerSetupScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [loading, setLoading] = useState(false);

  const PIN_LENGTH = 6;

  // -----------------------------------------------------------------------
  // Keypad handlers
  // -----------------------------------------------------------------------

  const handleKeyPress = (key: string) => {
    if (step === "pin") {
      if (pin.length < PIN_LENGTH) setPin((p) => p + key);
    } else if (step === "confirm") {
      if (confirmPin.length < PIN_LENGTH) setConfirmPin((p) => p + key);
    }
  };

  const handleKeyDelete = () => {
    if (step === "pin") setPin((p) => p.slice(0, -1));
    else if (step === "confirm") setConfirmPin((p) => p.slice(0, -1));
  };

  // -----------------------------------------------------------------------
  // Navigation between steps
  // -----------------------------------------------------------------------

  const goNext = () => {
    Keyboard.dismiss();
    if (step === "name") {
      if (!name.trim()) return Alert.alert("Peringatan", "Nama wajib diisi");
      setStep("username");
    } else if (step === "username") {
      if (!username.trim())
        return Alert.alert("Peringatan", "Username wajib diisi");
      setStep("pin");
    }
  };

  const goBack = () => {
    if (step === "confirm") setStep("pin");
    else if (step === "pin") setStep("username");
    else if (step === "username") setStep("name");
  };

  // -----------------------------------------------------------------------
  // Submit — hash PIN, simpan ke SQLite
  // -----------------------------------------------------------------------

  const handleSubmit = async () => {
    if (pin.length < PIN_LENGTH)
      return Alert.alert("Peringatan", "PIN harus 6 digit");
    if (pin !== confirmPin)
      return Alert.alert("Peringatan", "Konfirmasi PIN tidak cocok");

    setLoading(true);
    try {
      await initDatabase();
      await addUser({
        name: name.trim(),
        username: username.trim(),
        pin,
        role: "owner",
      });
      router.replace("/(tabs)");
    } catch (e: any) {
      Alert.alert("Gagal", e?.message ?? "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------------------------------------------------
  // Step: confirm PIN → automatically trigger submit when full
  // -----------------------------------------------------------------------

  React.useEffect(() => {
    if (step === "confirm" && confirmPin.length === PIN_LENGTH) {
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmPin, step]);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  const isPinStep = step === "pin" || step === "confirm";
  const currentPin = step === "pin" ? pin : confirmPin;

  return (
    <Pressable
      style={[styles.screen, { paddingTop: insets.top + 12 }]}
      onPress={Keyboard.dismiss}
    >
      {/* Back button */}
      {(step !== "name" || true) && (
        <Pressable style={styles.backBtn} onPress={goBack} hitSlop={10}>
          <ChevronLeft color="#111827" size={24} />
        </Pressable>
      )}

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {step === "name" && "Siapa nama kamu?"}
          {step === "username" && "Buat username"}
          {step === "pin" && "Buat PIN baru"}
          {step === "confirm" && "Konfirmasi PIN"}
        </Text>
        <Text style={styles.subtitle}>
          {step === "name" && "Nama akan ditampilkan di profil toko"}
          {step === "username" && "Username digunakan untuk login"}
          {step === "pin" && "PIN 6 digit untuk login ke kasir"}
          {step === "confirm" && "Masukkan ulang PIN yang sama"}
        </Text>
      </View>

      {/* Form area */}
      <View style={styles.formArea}>
        {step === "name" && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nama Lengkap</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Contoh: Budi Santoso"
              placeholderTextColor="#9CA3AF"
              returnKeyType="next"
              onSubmitEditing={goNext}
            />
          </View>
        )}

        {step === "username" && (
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="Contoh: budi123"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={goNext}
            />
          </View>
        )}

        {isPinStep && (
          <View style={styles.pinArea}>
            <Pressable
              style={styles.eyeToggle}
              onPress={() => setShowPin(!showPin)}
            >
              {showPin ? (
                <EyeOff color={Colors.neutral} size={20} />
              ) : (
                <Eye color={Colors.neutral} size={20} />
              )}
              <Text style={styles.eyeLabel}>
                {showPin ? "Sembunyikan" : "Tampilkan"}
              </Text>
            </Pressable>

            {showPin ? (
              <Text style={styles.pinText}>{currentPin}</Text>
            ) : (
              <PinDots length={currentPin.length} max={PIN_LENGTH} />
            )}

            <PinKeypad onPress={handleKeyPress} onDelete={handleKeyDelete} />
          </View>
        )}
      </View>

      {/* Next button */}
      {step !== "confirm" && (
        <View style={styles.footer}>
          <Pressable
            style={({ pressed }) => [
              styles.nextBtn,
              pressed && styles.nextBtnPressed,
            ]}
            onPress={() => {
              Keyboard.dismiss();
              if (step === "pin") setStep("confirm");
              else goNext();
            }}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.nextBtnText}>Lanjut</Text>
            )}
          </Pressable>
        </View>
      )}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 24,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
  },
  subtitle: {
    fontSize: 14,
    color: Colors.neutral,
    marginTop: 6,
  },
  formArea: {
    flex: 1,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },

  // PIN
  pinArea: {
    alignItems: "center",
    gap: 24,
  },
  eyeToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  eyeLabel: {
    fontSize: 12,
    color: Colors.neutral,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 14,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    backgroundColor: Colors.white,
  },
  dotFilled: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  pinText: {
    fontSize: 32,
    fontWeight: "700",
    color: "#111827",
    letterSpacing: 10,
  },

  // Footer
  footer: {
    paddingBottom: 32,
  },
  nextBtn: {
    backgroundColor: Colors.primary,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  nextBtnPressed: {
    opacity: 0.85,
  },
  nextBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
});
