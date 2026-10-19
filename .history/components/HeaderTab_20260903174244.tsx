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
    <View style={[styles.header, { paddingTop: topInset + 16 }]}>
      <View style={styles.textGroup}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? (
          <Text style={styles.subtitle}>{subtitle}</Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.primary,
    marginHorizontal: -16,
    paddingHorizontal: 16,
    paddingBottom: 16,
    marginBottom: 14,
  },
  textGroup: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.white,
  },
  subtitle: {
    fontSize: 12.5,
    color: "rgba(255,255,255,0.7)",
    marginTop: 2,
  },
});
