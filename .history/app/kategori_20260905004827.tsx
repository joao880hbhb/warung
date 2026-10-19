import { useRouter } from "expo-router";
import { ChevronLeft, Pencil, Plus, Tag, Trash2, X } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/constants/theme";
import {
    addCategory,
    deleteCategory,
    getAllCategories,
    initDatabase,
    isCategoryNameExists,
    updateCategory,
    type Category,
} from "@/lib/database";

// ---------------------------------------------------------------------------
// Emoji picker data
// ---------------------------------------------------------------------------

const EMOJI_OPTIONS = [
  { emoji: "🍜", label: "Makanan" },
  { emoji: "🥤", label: "Minuman" },
  { emoji: "🍪", label: "Snack" },
  { emoji: "🧴", label: "Rumah" },
  { emoji: "💊", label: "Kesehatan" },
  { emoji: "👕", label: "Pakaian" },
  { emoji: "📱", label: "Elektronik" },
  { emoji: "🧹", label: "Kebersihan" },
  { emoji: "📦", label: "Lainnya" },
  { emoji: "🛒", label: "Belanja" },
  { emoji: "🎮", label: "Hiburan" },
  { emoji: "📚", label: "Pendidikan" },
  { emoji: "🐾", label: "Hewan" },
  { emoji: "🌸", label: "Kecantikan" },
  { emoji: "🔧", label: "Servis" },
  { emoji: "🎁", label: "Hadiah" },
  { emoji: "☕", label: "Kopi" },
  { emoji: "🫖", label: "Teh" },
  { emoji: "🧊", label: "Es" },
  { emoji: "🌶️", label: "Bumbu" },
];

// ---------------------------------------------------------------------------
// Form Modal
// ---------------------------------------------------------------------------

function CategoryFormModal({
  visible,
  onClose,
  onSave,
  initial,
  bottomInset,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  initial?: Category | null;
  bottomInset: number;
}) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📦");
  const [saving, setSaving] = useState(false);

  const isEdit = !!initial;

  useEffect(() => {
    if (initial) {
      setName(initial.name);
      setIcon(initial.icon);
    } else {
      setName("");
      setIcon("📦");
    }
  }, [initial, visible]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return Alert.alert("Peringatan", "Nama kategori wajib diisi");

    const exists = await isCategoryNameExists(trimmed, initial?.id);
    if (exists)
      return Alert.alert("Peringatan", "Nama kategori sudah digunakan");

    setSaving(true);
    try {
      if (isEdit) {
        await updateCategory(initial!.id, { name: trimmed, icon });
      } else {
        await addCategory({ name: trimmed, icon });
      }
      onSave();
      onClose();
    } catch (e: any) {
      Alert.alert("Gagal", e?.message ?? "Terjadi kesalahan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        style={modalStyles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>

        <View
          style={[
            modalStyles.content,
            { paddingBottom: Math.max(bottomInset, 16) + 24 },
          ]}
        >
          {/* Header */}
          <View style={modalStyles.header}>
            <Text style={modalStyles.headerTitle}>
              {isEdit ? "Edit Kategori" : "Tambah Kategori"}
            </Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <X color="#6B7280" size={22} />
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Name */}
            <View style={modalStyles.field}>
              <Text style={modalStyles.label}>NAMA KATEGORI</Text>
              <TextInput
                style={modalStyles.input}
                value={name}
                onChangeText={setName}
                placeholder="Contoh: Makanan"
                placeholderTextColor="#C4C4C4"
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
            </View>

            {/* Emoji picker */}
            <View style={modalStyles.field}>
              <Text style={modalStyles.label}>ICON / EMOJI</Text>
              <View style={modalStyles.emojiGrid}>
                {EMOJI_OPTIONS.map((opt) => (
                  <Pressable
                    key={opt.emoji}
                    style={[
                      modalStyles.emojiBtn,
                      icon === opt.emoji && modalStyles.emojiBtnActive,
                    ]}
                    onPress={() => setIcon(opt.emoji)}
                  >
                    <Text style={modalStyles.emojiText}>{opt.emoji}</Text>
                    <Text style={modalStyles.emojiLabel}>{opt.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Preview */}
            <View style={modalStyles.previewRow}>
              <Text style={modalStyles.label}>PREVIEW</Text>
              <View style={modalStyles.previewCard}>
                <Text style={modalStyles.previewEmoji}>{icon}</Text>
                <Text style={modalStyles.previewName}>
                  {name.trim() || "Nama kategori"}
                </Text>
              </View>
            </View>

            {/* Save */}
            <Pressable
              style={({ pressed }) => [
                modalStyles.saveBtn,
                pressed && modalStyles.saveBtnPressed,
              ]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={modalStyles.saveBtnText}>
                  {isEdit ? "Simpan Perubahan" : "Tambah Kategori"}
                </Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  content: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.neutral,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#271111",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  emojiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  emojiBtn: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  emojiBtnActive: {
    backgroundColor: "#ECFDF3",
    borderColor: Colors.secondary,
  },
  emojiText: {
    fontSize: 22,
  },
  emojiLabel: {
    fontSize: 9,
    color: Colors.neutral,
    fontWeight: "600",
  },
  previewRow: {
    marginBottom: 20,
  },
  previewCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    gap: 10,
    marginTop: 8,
  },
  previewEmoji: {
    fontSize: 28,
  },
  previewName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  saveBtn: {
    backgroundColor: Colors.secondary,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
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

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function KategoriScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  const load = useCallback(async () => {
    try {
      await initDatabase();
      const data = await getAllCategories();
      setCategories(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = (cat: Category) => {
    Alert.alert("Hapus Kategori", `Yakin ingin menghapus "${cat.name}"?`, [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteCategory(cat.id);
            load();
          } catch (e: any) {
            Alert.alert("Gagal", e?.message ?? "Terjadi kesalahan");
          }
        },
      },
    ]);
  };

  const handleEdit = (cat: Category) => {
    setEditing(cat);
    setModalVisible(true);
  };

  const handleAdd = () => {
    setEditing(null);
    setModalVisible(true);
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
        <Text style={styles.headerTitle}>Kelola Kategori</Text>
        <Pressable style={styles.addBtn} onPress={handleAdd}>
          <Plus color={Colors.white} size={20} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={categories}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 100,
            paddingTop: 12,
          }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Tag color={Colors.neutral} size={40} />
              <Text style={styles.emptyTitle}>Belum ada kategori</Text>
              <Text style={styles.emptySubtitle}>
                Tekan tombol + untuk menambah kategori
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardEmoji}>{item.icon}</Text>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{item.name}</Text>
              </View>
              <View style={styles.cardActions}>
                <Pressable
                  style={styles.actionBtn}
                  onPress={() => handleEdit(item)}
                >
                  <Pencil color={Colors.primary} size={16} />
                </Pressable>
                <Pressable
                  style={styles.actionBtn}
                  onPress={() => handleDelete(item)}
                >
                  <Trash2 color="#DC2626" size={16} />
                </Pressable>
              </View>
            </View>
          )}
        />
      )}

      <CategoryFormModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setEditing(null);
        }}
        onSave={load}
        initial={editing}
        bottomInset={insets.bottom}
      />
    </View>
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
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 4,
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
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.secondary,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#374151",
  },
  emptySubtitle: {
    fontSize: 13,
    color: Colors.neutral,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  cardEmoji: {
    fontSize: 32,
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#F9FAFB",
    textAlign: "center",
    textAlignVertical: "center",
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  cardActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
});
