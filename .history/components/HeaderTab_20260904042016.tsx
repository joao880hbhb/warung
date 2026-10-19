import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { Colors } from "@/constants/theme";

type Props = {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  topInset?: number;
};

export default function HeaderTab({
  title,
  subtitle,
  right,
  topInset = 0,
}: Props) {
  return (
    <View style={[styles.wrapper, { paddingTop: topInset + 16 }]}>
      <View style={styles.header}>
        <View style={styles.textGroup}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {right ? <View style={styles.rightSlot}>{right}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Wrapper terpisah dari `header` supaya shadow tidak ikut ke-clip
  // oleh overflow milik View di dalamnya.
  wrapper: {
    backgroundColor: "#e00000",
    marginHorizontal: -16,
    paddingHorizontal: 20,
    marginBottom: 16,
    // shadow sangat tipis di tepi bawah, cukup buat kasih pemisah
    // halus dari konten tanpa terasa seperti "kotak" yang berat.
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingBottom: 18,
  },
  textGroup: {
    flex: 1,
  },
  title: {
    fontSize: 23,
    fontWeight: "800",
    color: Colors.black,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12.5,
    fontWeight: "500",
    color: "#9CA3AF",
    marginTop: 3,
  },
  rightSlot: {
    marginLeft: 12,
  },
});
