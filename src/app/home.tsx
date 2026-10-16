import { router, useFocusEffect } from "expo-router";
import {
  ArrowDownToLine,
  ArrowRight,
  Clock3,
  FileText,
  ScanLine,
  Search,
  Trash2,
} from "lucide-react-native";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { theme } from "../constants/theme";
import {
  deleteDocument,
  getDocuments,
  type ScanDocument,
} from "../lib/documents";

export default function HomeScreen() {
  const [documents, setDocuments] = useState<ScanDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDocuments = useCallback(async () => {
    try {
      const saved = await getDocuments();
      setDocuments(saved);
    } catch (error) {
      console.error("Failed to load documents:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadDocuments();
    }, [loadDocuments]),
  );

  async function handleDelete(document: ScanDocument) {
    Alert.alert(
      "Delete document?",
      `"${document.title}" and its pages will be permanently removed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                await deleteDocument(document.id);
                await loadDocuments();
              } catch (error) {
                console.error("Failed to delete document:", error);
              }
            })();
          },
        },
      ],
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>scanly</Text>
            <Text style={styles.subtitle}>Your documents, organized.</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Search documents"
            style={styles.iconButton}
            // onPress={() => router.push("/search")}
          >
            <Search size={21} color={theme.colors.text} />
          </Pressable>
        </View>

        <View style={styles.welcome}>
          <Text style={styles.eyebrow}>YOUR WORKSPACE</Text>
          <Text style={styles.heading}>
            Everything important, in one place.
          </Text>
          <Text style={styles.description}>
            Scan paper documents, keep them organized, and find what you need.
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/scan")}
          style={styles.primaryButton}
        >
          <View style={styles.primaryIcon}>
            <ScanLine size={23} color={theme.colors.text} />
          </View>
          <View style={styles.primaryCopy}>
            <Text style={styles.primaryTitle}>Scan a document</Text>
            <Text style={styles.primarySubtitle}>
              Capture pages with your camera
            </Text>
          </View>
          <ArrowRight size={20} color={theme.colors.text} />
        </Pressable>

        <View style={styles.quickActions}>
          <Pressable
            style={styles.actionCard}
            // onPress={() => router.push("/import")}
            accessibilityRole="button"
          >
            <ArrowDownToLine size={21} color={theme.colors.accent} />
            <Text style={styles.actionTitle}>Import file</Text>
            <Text style={styles.actionSubtitle}>PDF or image</Text>
          </Pressable>

          <View style={styles.actionCard}>
            <Clock3 size={21} color={theme.colors.accent} />
            <Text style={styles.actionTitle}>Recent files</Text>
            <Text style={styles.actionSubtitle}>Your latest scans</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your documents</Text>
          <Text style={styles.count}>
            {loading
              ? "Loading…"
              : `${documents.length} ${documents.length === 1 ? "file" : "files"}`}
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color={theme.colors.accent} />
        ) : documents.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <FileText size={28} color={theme.colors.muted} />
            </View>
            <Text style={styles.emptyTitle}>No documents yet</Text>
            <Text style={styles.emptyDescription}>
              Your scanned and imported documents will appear here.
            </Text>
          </View>
        ) : (
          <View style={styles.documentList}>
            {documents.map((document) => (
              <View key={document.id} style={styles.documentRow}>
                <Pressable
                  style={styles.documentMain}
                  onPress={() =>
                    router.push({
                      pathname: "/document/[id]",
                      params: { id: document.id },
                    })
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Open ${document.title}`}
                >
                  {document.thumbnailUri ? (
                    <Image
                      source={{ uri: document.thumbnailUri }}
                      style={styles.thumbnail}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.thumbnail} />
                  )}
                  <View style={styles.documentInfo}>
                    <Text style={styles.documentTitle} numberOfLines={1}>
                      {document.title}
                    </Text>
                    <Text style={styles.documentDate}>
                      {new Date(document.updatedAt).toLocaleDateString()}
                      {"  ·  "}
                      {document.pageCount}{" "}
                      {document.pageCount === 1 ? "page" : "pages"}
                    </Text>
                  </View>
                </Pressable>

                <Pressable
                  style={styles.deleteButton}
                  onPress={() => void handleDelete(document)}
                  accessibilityRole="button"
                  accessibilityLabel={`Delete ${document.title}`}
                >
                  <Trash2 size={18} color={theme.colors.danger} />
                </Pressable>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  content: { paddingHorizontal: 22, paddingTop: 12, paddingBottom: 36 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 36,
  },
  brand: {
    color: theme.colors.text,
    fontSize: 25,
    fontWeight: "700",
    letterSpacing: -0.8,
  },
  subtitle: { color: theme.colors.muted, fontSize: 13, marginTop: 4 },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  welcome: { marginBottom: 24 },
  eyebrow: {
    color: theme.colors.accent,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  heading: {
    color: theme.colors.text,
    fontSize: 31,
    lineHeight: 38,
    fontWeight: "700",
    letterSpacing: -0.9,
    maxWidth: 340,
  },
  description: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 12,
    maxWidth: 330,
  },
  primaryButton: {
    backgroundColor: theme.colors.accentSurface,
    borderColor: theme.colors.accent,
    borderWidth: 1,
    borderRadius: theme.radius.lg,
    padding: 16,
    minHeight: 94,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
  },
  primaryIcon: {
    width: 46,
    height: 46,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryCopy: { flex: 1, gap: 5 },
  primaryTitle: { color: theme.colors.text, fontSize: 15, fontWeight: "600" },
  primarySubtitle: { color: theme.colors.muted, fontSize: 12 },
  quickActions: { flexDirection: "row", gap: 12, marginTop: 14 },
  actionCard: {
    flex: 1,
    minHeight: 112,
    padding: 16,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: "center",
    gap: 8,
  },
  actionTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "600",
    marginTop: 3,
  },
  actionSubtitle: { color: theme.colors.muted, fontSize: 12 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 34,
    marginBottom: 16,
  },
  sectionTitle: { color: theme.colors.text, fontSize: 18, fontWeight: "600" },
  count: { color: theme.colors.muted, fontSize: 12 },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 28,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderStyle: "dashed",
  },
  emptyIcon: {
    width: 58,
    height: 58,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.elevated,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: { color: theme.colors.text, fontSize: 16, fontWeight: "600" },
  emptyDescription: {
    color: theme.colors.muted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 8,
    maxWidth: 260,
  },
  documentList: { gap: 10 },
  documentRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    gap: 10,
  },
  documentMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  thumbnail: {
    width: 54,
    height: 66,
    borderRadius: 7,
    backgroundColor: theme.colors.elevated,
  },
  documentInfo: { flex: 1, gap: 6 },
  documentTitle: { color: theme.colors.text, fontSize: 14, fontWeight: "600" },
  documentDate: { color: theme.colors.muted, fontSize: 12 },
  deleteButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
});
