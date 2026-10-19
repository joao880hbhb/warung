import { useRouter } from "expo-router";
import {
  ChevronLeft,
  MapPin,
  Phone,
  Receipt,
  Save,
  Store,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";
import { getStore, initDatabase, saveStore } from "@/lib/database";

// ---------------------------------------------------------------------------
// Field config
// ---------------------------------------------------------------------------

const FIELDS = [
  {
    key: "name" as const,
    label: "NAMA TOKO",
    placeholder: "Nama toko kamu",
    icon: Store,
    iconColor: Colors.primary,
    iconBg: "#E8F0FE",
    multiline: false,
  },
  {
    key: "address" as const,
    label: "ALAMAT",
    placeholder: "Jl. Contoh No. 1",
    icon: MapPin,
    iconColor: "#2563EB",
    iconBg: "#EFF6FF",
    multiline: true,
  },
  {
    key: "phone" as const,
    label: "NO. HP / WA",
    placeholder: "08123456789",
    icon: Phone,
    iconColor: "#F47B20",
    iconBg: "#DCFCE7",
    multiline: false,
    keyboardType: "phone-pad" as const,
  },
  {
    key: "receipt_footer" as const,
    label: "FOOTER STRUK",
    placeholder: "Terima kasih atas kunjungan Anda!",
    icon: Receipt,
    iconColor: "#D97706",
    iconBg: "#FFFBEB",
    multiline: true,
  },
];

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function InformasiTokoScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    receipt_footer: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await initDatabase();
        const store = await getStore();
        setForm({
          name: store.name,
          address: store.address,
          phone: store.phone,
          receipt_footer: store.receipt_footer,
        });
      } catch {
        // keep defaults
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!form.name.trim())
      return Alert.alert("Peringatan", "Nama toko wajib diisi");
    setSaving(true);
    try {
      await saveStore(form);
      Alert.alert("Berhasil", "Data toko tersimpan", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert("Gagal", e?.message ?? "Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top + 12 }]}>
        <View style={styles.center}>
          <Text style={styles.loadingText}>Memuat data...</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={{ paddingTop: insets.top + 12, flex: 1 }}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Pressable
            style={styles.backBtn}
            onPress={() => router.back()}
            hitSlop={10}
          >
            <ChevronLeft color="#111827" size={24} />
          </Pressable>
          <Text style={styles.headerTitle}>Informasi Toko</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            {FIELDS.map((field, idx) => {
              const Icon = field.icon;
              return (
                <React.Fragment key={field.key}>
                  <View style={styles.fieldRow}>
                    <View
                      style={[
                        styles.fieldIcon,
                        { backgroundColor: field.iconBg },
                      ]}
                    >
                      <Icon color={field.iconColor} size={18} />
                    </View>
                    <View style={styles.fieldContent}>
                      <Text style={styles.fieldLabel}>{field.label}</Text>
                      <TextInput
                        style={[
                          styles.fieldInput,
                          field.multiline && styles.fieldInputMultiline,
                        ]}
                        value={form[field.key]}
                        onChangeText={(v) => handleChange(field.key, v)}
                        placeholder={field.placeholder}
                        placeholderTextColor="#C4C4C4"
                        multiline={field.multiline}
                        keyboardType={field.keyboardType}
                        returnKeyType={field.multiline ? "default" : "next"}
                      />
                    </View>
                  </View>
                  {idx < FIELDS.length - 1 && <View style={styles.divider} />}
                </React.Fragment>
              );
            })}
          </View>
        </ScrollView>

        {/* Save button */}
        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <Pressable
            style={({ pressed }) => [
              styles.saveBtn,
              pressed && styles.saveBtnPressed,
            ]}
            onPress={handleSave}
            disabled={saving}
          >
            <Save color={Colors.white} size={18} />
            <Text style={styles.saveBtnText}>
              {saving ? "Menyimpan..." : "Simpan"}
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
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
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 14,
    color: Colors.neutral,
  },

  // Header
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },

  // Scroll
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },

  // Card
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginTop: 8,
  },

  // Field
  fieldRow: {
    flexDirection: "row",
    gap: 14,
  },
  fieldIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  fieldContent: {
    flex: 1,
    gap: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.neutral,
    letterSpacing: 0.5,
  },
  fieldInput: {
    fontSize: 15,
    color: "#111827",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  fieldInputMultiline: {
    minHeight: 60,
    textAlignVertical: "top",
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
    marginVertical: 16,
    marginLeft: 54,
  },

  // Footer
  footer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.secondary,
    height: 56,
    borderRadius: 28,
  },
  saveBtnPressed: {
    opacity: 0.85,
  },
  saveBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
});
