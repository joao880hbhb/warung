import { useRouter } from "expo-router";
import {
  ChevronLeft,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
  addCustomer,
  deleteCustomer,
  getAllCustomers,
  initDatabase,
  searchCustomers,
  updateCustomer,
  type Customer,
} from "@/lib/database";

// ---------------------------------------------------------------------------
// Form Modal (tambah / edit pelanggan)
// ---------------------------------------------------------------------------

function CustomerFormModal({
  visible,
  onClose,
  onSave,
  initial,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  initial?: Customer | null;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);

  const isEdit = !!initial;

  useEffect(() => {
    if (initial) {
      setName(initial.name);
      setPhone(initial.phone ?? "");
      setAddress(initial.address ?? "");
    } else {
      setName("");
      setPhone("");
      setAddress("");
    }
  }, [initial, visible]);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      return Alert.alert("Peringatan", "Nama pelanggan wajib diisi");
    }

    setSaving(true);
    try {
      if (isEdit) {
        await updateCustomer(initial!.id, {
          name: trimmed,
          phone: phone.trim(),
          address: address.trim(),
        });
      } else {
        await addCustomer({
          name: trimmed,
          phone: phone.trim(),
          address: address.trim(),
        });
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

        <View style={modalStyles.content}>
          <View style={modalStyles.header}>
            <Text style={modalStyles.headerTitle}>
              {isEdit ? "Edit Pelanggan" : "Tambah Pelanggan"}
            </Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <X color="#6B7280" size={22} />
            </Pressable>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={modalStyles.field}>
              <Text style={modalStyles.label}>NAMA PELANGGAN *</Text>
              <TextInput
                style={modalStyles.input}
                value={name}
                onChangeText={setName}
                placeholder="Contoh: Budi Santoso"
                placeholderTextColor="#C4C4C4"
              />
            </View>

            <View style={modalStyles.field}>
              <Text style={modalStyles.label}>NOMOR HANDPHONE (opsional)</Text>
              <TextInput
                style={modalStyles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="Contoh: 081234567890"
                placeholderTextColor="#C4C4C4"
                keyboardType="phone-pad"
              />
            </View>

            <View style={modalStyles.field}>
              <Text style={modalStyles.label}>ALAMAT (opsional)</Text>
              <TextInput
                style={[modalStyles.input, modalStyles.textArea]}
                value={address}
                onChangeText={setAddress}
                placeholder="Contoh: Jl. Merdeka No. 12"
                placeholderTextColor="#C4C4C4"
                multiline
                numberOfLines={3}
              />
            </View>

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
                  {isEdit ? "Simpan Perubahan" : "Tambah Pelanggan"}
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
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
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
    color: "#111827",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  saveBtn: {
    backgroundColor: Colors.secondary,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
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

export default function PelangganScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);

  const load = useCallback(async () => {
    try {
      await initDatabase();
      const q = search.trim();
      const data = q ? await searchCustomers(q) : await getAllCustomers();
      setCustomers(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = (cust: Customer) => {
    Alert.alert("Hapus Pelanggan", `Yakin ingin menghapus "${cust.name}"?`, [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteCustomer(cust.id);
            load();
          } catch (e: any) {
            Alert.alert("Gagal", e?.message ?? "Terjadi kesalahan");
          }
        },
      },
    ]);
  };

  const handleEdit = (cust: Customer) => {
    setEditing(cust);
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
        <Text style={styles.headerTitle}>Pelanggan</Text>
        <Pressable style={styles.addBtn} onPress={handleAdd}>
          <Plus color={Colors.white} size={20} />
        </Pressable>
      </View>

      {/* Search */}
      <View style={styles.searchBar}>
        <Search color="#9CA3AF" size={18} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Cari nama atau nomor HP..."
          placeholderTextColor="#9CA3AF"
          style={styles.searchInput}
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")} hitSlop={6}>
            <X color="#9CA3AF" size={16} />
          </Pressable>
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 100,
            paddingTop: 12,
          }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <Users color={Colors.neutral} size={40} />
              <Text style={styles.emptyTitle}>
                {search.trim()
                  ? "Pelanggan tidak ditemukan"
                  : "Belum ada pelanggan"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {search.trim()
                  ? "Coba kata kunci lain"
                  : "Tekan tombol + untuk menambah pelanggan"}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.avatarCircle}>
                <User color={Colors.primary} size={18} />
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{item.name}</Text>
                {item.phone ? (
                  <View style={styles.cardMetaRow}>
                    <Phone color={Colors.neutral} size={12} />
                    <Text style={styles.cardMeta}>{item.phone}</Text>
                  </View>
                ) : null}
                {item.address ? (
                  <View style={styles.cardMetaRow}>
                    <MapPin color={Colors.neutral} size={12} />
                    <Text style={styles.cardMeta} numberOfLines={1}>
                      {item.address}
                    </Text>
                  </View>
                ) : null}
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

      <CustomerFormModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setEditing(null);
        }}
        onSave={load}
        initial={editing}
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
    marginBottom: 10,
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
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingTop: 80,
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
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E8F0FE",
    alignItems: "center",
    justifyContent: "center",
  },
  cardInfo: {
    flex: 1,
    gap: 2,
  },
  cardName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cardMeta: {
    flex: 1,
    fontSize: 12,
    color: Colors.neutral,
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
