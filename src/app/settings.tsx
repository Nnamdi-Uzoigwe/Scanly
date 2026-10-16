import { router, useFocusEffect } from "expo-router";
import { ArrowLeft, ChevronRight } from "lucide-react-native";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { theme } from "../constants/theme";
import { formatBytes } from "../lib/format";
import { notifySuccess } from "../lib/haptics";
import {
    clearAllData,
    measureStorage,
    type StorageReport,
} from "../lib/storage";
import { usePreferences } from "../store/preferences";

export default function SettingsScreen() {
  const hapticsEnabled = usePreferences((s) => s.hapticsEnabled);
  const setHapticsEnabled = usePreferences((s) => s.setHapticsEnabled);

  const [report, setReport] = useState<StorageReport | null>(null);
  const [loadingStorage, setLoadingStorage] = useState(true);
  const [clearing, setClearing] = useState(false);

  const loadStorage = useCallback(async () => {
    setLoadingStorage(true);
    try {
      setReport(await measureStorage());
    } catch (error) {
      console.error("Failed to measure storage:", error);
    } finally {
      setLoadingStorage(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadStorage();
    }, [loadStorage]),
  );

  function handleToggleHaptics(value: boolean) {
    setHapticsEnabled(value);
    if (value) {
      // Fire one immediately so the user feels what they just enabled.
      notifySuccess();
    }
  }

  function confirmClearFirst() {
    Alert.alert(
      "Delete all data?",
      "Every document, page, PDF, and tag will be permanently removed from this device. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          style: "destructive",
          onPress: confirmClearSecond,
        },
      ],
    );
  }

  function confirmClearSecond() {
    Alert.alert(
      "Are you absolutely sure?",
      "This is your last chance to cancel. All local documents will be lost.",
      [
        { text: "Keep my data", style: "cancel" },
        {
          text: "Yes, delete all",
          style: "destructive",
          onPress: () => void runClear(),
        },
      ],
    );
  }

  async function runClear() {
    setClearing(true);
    try {
      await clearAllData();
      notifySuccess();
      await loadStorage();
      Alert.alert("Data cleared", "All local documents were removed.");
    } catch (error) {
      console.error("Failed to clear data:", error);
      Alert.alert("Couldn't clear data", "Please try again.");
    } finally {
      setClearing(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          style={styles.iconButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ArrowLeft size={20} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <SectionLabel>Behavior</SectionLabel>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>Haptic feedback</Text>
              <Text style={styles.rowSubtitle}>
                Subtle vibration on taps and confirmations
              </Text>
            </View>
            <Switch
              value={hapticsEnabled}
              onValueChange={handleToggleHaptics}
              trackColor={{
                false: theme.colors.border,
                true: theme.colors.accent,
              }}
              thumbColor="#FFFFFF"
              ios_backgroundColor={theme.colors.border}
            />
          </View>
        </View>

        <SectionLabel>Storage</SectionLabel>
        <View style={styles.card}>
          <InfoRow
            title="Documents"
            value={
              loadingStorage
                ? "Measuring…"
                : report
                  ? `${report.documentCount}`
                  : "—"
            }
          />
          <InfoRow
            title="Total size"
            value={
              loadingStorage
                ? "Measuring…"
                : report
                  ? formatBytes(report.totalBytes)
                  : "—"
            }
          />
          <InfoRow
            title="Images"
            value={
              loadingStorage
                ? "Measuring…"
                : report
                  ? formatBytes(report.imageBytes)
                  : "—"
            }
            last
          />
        </View>

        <SectionLabel>Data</SectionLabel>
        <View style={styles.card}>
          <Pressable
            onPress={confirmClearFirst}
            disabled={clearing}
            style={({ pressed }) => [
              styles.row,
              (pressed || clearing) && { opacity: 0.6 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Clear all local data"
          >
            <View style={styles.rowCopy}>
              <Text style={[styles.rowTitle, { color: theme.colors.danger }]}>
                Clear all local data
              </Text>
              <Text style={styles.rowSubtitle}>
                Permanently delete every document and file
              </Text>
            </View>
            {clearing ? (
              <ActivityIndicator color={theme.colors.danger} />
            ) : (
              <ChevronRight size={18} color={theme.colors.muted} />
            )}
          </Pressable>
        </View>

        <SectionLabel>Privacy</SectionLabel>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowCopy}>
              <Text style={styles.rowTitle}>Local-only storage</Text>
              <Text style={styles.rowSubtitle}>
                Documents stay on this device. No account, no cloud, no uploads.
              </Text>
            </View>
          </View>
        </View>

        <SectionLabel>About</SectionLabel>
        <View style={styles.card}>
          <InfoRow title="App" value="Scanly" />
          <InfoRow title="Version" value="1.0.0" last />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function InfoRow({
  title,
  value,
  last,
}: {
  title: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, !last && styles.rowDivider]}>
      <Text style={styles.rowTitle}>{title}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 12,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
  },
  headerSpacer: { width: 42 },
  content: {
    paddingHorizontal: 18,
    paddingBottom: 40,
  },
  sectionLabel: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginTop: 22,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  card: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
  },
  rowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  rowCopy: { flex: 1, gap: 4 },
  rowTitle: { color: theme.colors.text, fontSize: 14, fontWeight: "500" },
  rowSubtitle: {
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  rowValue: {
    color: theme.colors.muted,
    fontSize: 13,
    fontVariant: ["tabular-nums"],
  },
});
