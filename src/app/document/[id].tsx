import { formatBytes } from "@/lib/format";
import { exportDocumentPdf } from "@/lib/pdf";
import { sharePdf } from "@/lib/pdf/share";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  FileText,
  Image as ImageIcon,
  ListOrdered,
  Pencil,
  Plus,
  RotateCcw,
  RotateCw,
  Tag as TagIcon,
  Trash2,
  X,
} from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TagPickerModal } from "../../components/TagPickerModal";
import {
  addTagToDocument,
  listTagsForDocument,
  removeTagFromDocument,
  type ScanTag,
} from "../../database/repositories/tagRepository";
import { notifySuccess, notifyWarning, tapLight } from "../../lib/haptics";

import { theme } from "@/constants/theme";
import {
  getDocumentById,
  renameDocument,
  setDocumentPdfUri,
  setDocumentThumbnail,
  touchDocument,
  type ScanDocument,
} from "@/database/repositories/documentRepository";
import {
  deletePageRow,
  listPages,
  replacePageOrder,
  updatePageImageUri,
  type ScanPage,
} from "@/database/repositories/pageRepository";
import { deleteDocument as deleteDocumentCascade } from "@/lib/documents";
import { deleteFileSafe } from "@/lib/fileStorage";
import { rotateImage } from "@/lib/imageOperations";

const SCREEN_WIDTH = Dimensions.get("window").width;
const PAGE_GAP = 12;

export default function DocumentDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const documentId = typeof params.id === "string" ? params.id : params.id?.[0];

  const [document, setDocument] = useState<ScanDocument | null>(null);
  const [pages, setPages] = useState<ScanPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reorderMode, setReorderMode] = useState(false);
  const [renameVisible, setRenameVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tags, setTags] = useState<ScanTag[]>([]);
  const [tagModalVisible, setTagModalVisible] = useState(false);

  const carouselRef = useRef<FlatList<ScanPage>>(null);

  const load = useCallback(async () => {
    if (!documentId) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    try {
      const [doc, pageRows, tagRows] = await Promise.all([
        getDocumentById(documentId),
        listPages(documentId),
        listTagsForDocument(documentId),
      ]);
      if (!doc) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setDocument(doc);
      setPages(pageRows);
      setTags(tagRows);
      setCurrentIndex((prev) =>
        Math.min(prev, Math.max(pageRows.length - 1, 0)),
      );
    } catch (error) {
      console.error("Failed to load document:", error);
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const pageCount = pages.length;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ index: number | null }> }) => {
      const first = viewableItems[0];
      if (first?.index != null) {
        setCurrentIndex(first.index);
      }
    },
  ).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  // ---- Actions ------------------------------------------------------------

  async function handleRename(nextTitle: string) {
    if (!document) return;
    const trimmed = nextTitle.trim();
    if (!trimmed || trimmed === document.title) {
      setRenameVisible(false);
      return;
    }
    try {
      await renameDocument(document.id, trimmed);
      setDocument((prev) => (prev ? { ...prev, title: trimmed } : prev));
    } catch (error) {
      console.error("Failed to rename document:", error);
      Alert.alert("Couldn't rename", "Please try again.");
    } finally {
      setRenameVisible(false);
    }
  }

  async function handleAddTag(name: string) {
    if (!document) return;
    try {
      tapLight();
      const tag = await addTagToDocument(document.id, name);
      setTags((prev) => {
        if (prev.some((t) => t.id === tag.id)) return prev;
        return [...prev, tag].sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
        );
      });
    } catch (error) {
      console.error("Failed to add tag:", error);
      Alert.alert("Couldn't add tag", "Please try again.");
    }
  }

  async function handleRemoveTag(tagId: string) {
    if (!document) return;
    try {
      tapLight();
      await removeTagFromDocument(document.id, tagId);
      setTags((prev) => prev.filter((t) => t.id !== tagId));
    } catch (error) {
      console.error("Failed to remove tag:", error);
      Alert.alert("Couldn't remove tag", "Please try again.");
    }
  }

  async function handleRotate(direction: "cw" | "ccw") {
    if (!document || busy) return;
    const page = pages[currentIndex];
    if (!page) return;

    setBusy(true);
    tapLight();
    try {
      const result = await rotateImage(
        page.imageUri,
        direction === "cw" ? 90 : 270,
      );

      // Persist the new URI first, then clean up the old file. If the DB write
      // fails we still have the old file and can retry.
      await updatePageImageUri(page.id, result.uri);
      setDocumentPdfUri(document.id, null);
      await deleteFileSafe(page.imageUri);

      // If we just rotated page 0, refresh the document thumbnail too.
      if (page.position === 0) {
        await setDocumentThumbnail(document.id, result.uri);
      } else {
        await touchDocument(document.id);
      }

      setPages((prev) =>
        prev.map((p, i) =>
          i === currentIndex ? { ...p, imageUri: result.uri } : p,
        ),
      );
    } catch (error) {
      console.error("Failed to rotate page:", error);
      Alert.alert("Couldn't rotate page", "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleExportPdf() {
    if (!document || busy) return;
    setBusy(true);
    try {
      const result = await exportDocumentPdf(document.id);
      notifySuccess();
      setDocument((prev) =>
        prev
          ? { ...prev, pdfUri: result.uri, pageCount: result.pageCount }
          : prev,
      );

      const outcome = await sharePdf(result.uri, document.title);
      if (outcome === "unavailable") {
        Alert.alert(
          "PDF generated",
          `Saved to your device (${formatBytes(result.byteSize)}). Sharing is not available on this platform.`,
        );
      }
    } catch (error) {
      console.error("Failed to export PDF:", error);
      Alert.alert(
        "Couldn't generate PDF",
        "Please try again. Your pages are unchanged.",
      );
    } finally {
      setBusy(false);
    }
  }

  function handleDeletePage() {
    if (!document) return;
    const page = pages[currentIndex];
    if (!page) return;

    notifyWarning();
    Alert.alert(
      "Delete this page?",
      `Page ${currentIndex + 1} of ${pageCount} will be permanently removed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete page",
          style: "destructive",
          onPress: () => {
            void (async () => {
              setBusy(true);
              try {
                await deletePageRow(page.id);
                setDocumentPdfUri(document.id, null);
                const remaining = pages.filter((p) => p.id !== page.id);

                // Re-index the remaining pages so positions stay contiguous.
                await replacePageOrder(
                  document.id,
                  remaining.map((p) => p.id),
                );

                // Update thumbnail if we removed the first page.
                if (remaining.length === 0) {
                  await setDocumentThumbnail(document.id, null);
                } else if (page.position === 0) {
                  await setDocumentThumbnail(
                    document.id,
                    remaining[0].imageUri,
                  );
                } else {
                  await touchDocument(document.id);
                }

                await deleteFileSafe(page.imageUri);
                if (page.originalUri) {
                  await deleteFileSafe(page.originalUri);
                }

                const nextIndex = Math.min(
                  currentIndex,
                  Math.max(remaining.length - 1, 0),
                );
                setPages(remaining);
                setCurrentIndex(nextIndex);
              } catch (error) {
                console.error("Failed to delete page:", error);
                Alert.alert("Couldn't delete page", "Please try again.");
              } finally {
                setBusy(false);
              }
            })();
          },
        },
      ],
    );
  }

  function handleDeleteDocument() {
    if (!document) return;
    notifyWarning();
    Alert.alert(
      "Delete document?",
      `"${document.title}" and all ${pageCount} ${
        pageCount === 1 ? "page" : "pages"
      } will be permanently removed.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete document",
          style: "destructive",
          onPress: () => {
            void (async () => {
              try {
                await deleteDocumentCascade(document.id);
                router.replace("/home");
              } catch (error) {
                console.error("Failed to delete document:", error);
                Alert.alert("Couldn't delete document", "Please try again.");
              }
            })();
          },
        },
      ],
    );
  }

  function movePage(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= pages.length) return;
    tapLight();
    const next = [...pages];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved);
    setPages(next);
  }

  async function commitReorder() {
    if (!document) return;
    setBusy(true);
    try {
      await replacePageOrder(
        document.id,
        pages.map((p) => p.id),
      );
      setDocumentPdfUri(document.id, null);
      const first = pages[0];
      if (first) {
        await setDocumentThumbnail(document.id, first.imageUri);
      } else {
        await touchDocument(document.id);
      }
      setReorderMode(false);
    } catch (error) {
      console.error("Failed to save page order:", error);
      Alert.alert("Couldn't save order", "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function cancelReorder() {
    void load();
    setReorderMode(false);
  }

  // ---- Render -------------------------------------------------------------

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator color={theme.colors.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (notFound || !document) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Document not found</Text>
          <Text style={styles.emptyBody}>
            It may have been deleted from another screen.
          </Text>
          <Pressable
            style={styles.secondaryButton}
            onPress={() => router.replace("/home")}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryButtonText}>Back to home</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          style={styles.iconButton}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <ArrowLeft size={20} color={theme.colors.text} />
        </Pressable>

        <Pressable
          style={styles.titleBlock}
          onPress={() => setRenameVisible(true)}
          accessibilityRole="button"
          accessibilityLabel={`Rename ${document.title}`}
        >
          <Text style={styles.titleText} numberOfLines={1}>
            {document.title}
          </Text>
          <View style={styles.titleMeta}>
            <Pencil size={11} color={theme.colors.muted} />
            <Text style={styles.titleMetaText}>
              {pageCount} {pageCount === 1 ? "page" : "pages"}
            </Text>
          </View>
        </Pressable>

        <Pressable
          style={styles.iconButton}
          onPress={handleDeleteDocument}
          accessibilityRole="button"
          accessibilityLabel="Delete document"
        >
          <Trash2 size={18} color={theme.colors.danger} />
        </Pressable>
      </View>

      <TagRow
        tags={tags}
        onAdd={() => setTagModalVisible(true)}
        onRemove={handleRemoveTag}
      />

      {pageCount === 0 ? (
        <View style={styles.center}>
          <View style={styles.emptyIconWrap}>
            <ImageIcon size={26} color={theme.colors.muted} />
          </View>
          <Text style={styles.emptyTitle}>No pages in this document</Text>
          <Text style={styles.emptyBody}>
            This document has no pages. Delete it or add pages from the scanner.
          </Text>
        </View>
      ) : reorderMode ? (
        <ReorderList
          pages={pages}
          onMove={movePage}
          onCancel={cancelReorder}
          onCommit={commitReorder}
          busy={busy}
        />
      ) : (
        <>
          <View style={styles.carouselWrap}>
            <FlatList
              ref={carouselRef}
              data={pages}
              keyExtractor={(item) => item.id}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onViewableItemsChanged={onViewableItemsChanged}
              viewabilityConfig={viewabilityConfig}
              getItemLayout={(_, index) => ({
                length: SCREEN_WIDTH,
                offset: SCREEN_WIDTH * index,
                index,
              })}
              renderItem={({ item }) => (
                <View style={styles.pageSlide}>
                  <Image
                    source={{ uri: item.imageUri }}
                    style={styles.pageImage}
                    resizeMode="contain"
                  />
                </View>
              )}
            />
          </View>

          <View style={styles.pageIndicatorRow}>
            <Text style={styles.pageIndicator}>
              {currentIndex + 1} / {pageCount}
            </Text>
            <Pressable
              style={styles.reorderButton}
              onPress={() => setReorderMode(true)}
              accessibilityRole="button"
              accessibilityLabel="Reorder pages"
            >
              <ListOrdered size={14} color={theme.colors.text} />
              <Text style={styles.reorderButtonText}>Reorder</Text>
            </Pressable>
          </View>

          <View style={styles.actionBar}>
            <ActionButton
              label="Rotate left"
              icon={<RotateCcw size={20} color={theme.colors.text} />}
              onPress={() => handleRotate("ccw")}
              disabled={busy}
            />
            <ActionButton
              label="Rotate right"
              icon={<RotateCw size={20} color={theme.colors.text} />}
              onPress={() => handleRotate("cw")}
              disabled={busy}
            />
            <ActionButton
              label="Export PDF"
              icon={<FileText size={20} color={theme.colors.text} />}
              onPress={handleExportPdf}
              disabled={busy || pageCount === 0}
            />
            <ActionButton
              label="Delete page"
              icon={<Trash2 size={20} color={theme.colors.danger} />}
              onPress={handleDeletePage}
              disabled={busy}
              destructive
            />
          </View>
        </>
      )}

      {busy ? (
        <View style={styles.busyOverlay} pointerEvents="auto">
          <ActivityIndicator color={theme.colors.accent} />
        </View>
      ) : null}

      <RenameModal
        visible={renameVisible}
        initialValue={document.title}
        onCancel={() => setRenameVisible(false)}
        onSubmit={handleRename}
      />
      <TagPickerModal
        visible={tagModalVisible}
        attachedTagIds={tags.map((t) => t.id)}
        onClose={() => setTagModalVisible(false)}
        onSelect={handleAddTag}
      />
    </SafeAreaView>
  );
}

// ---- Subcomponents --------------------------------------------------------

function ActionButton({
  label,
  icon,
  onPress,
  disabled,
  destructive,
}: {
  label: string;
  icon: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.actionButton,
        destructive && styles.actionButtonDestructive,
        (pressed || disabled) && { opacity: 0.6 },
      ]}
    >
      {icon}
      <Text
        style={[
          styles.actionButtonLabel,
          destructive && { color: theme.colors.danger },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ReorderList({
  pages,
  onMove,
  onCancel,
  onCommit,
  busy,
}: {
  pages: ScanPage[];
  onMove: (index: number, direction: -1 | 1) => void;
  onCancel: () => void;
  onCommit: () => void;
  busy: boolean;
}) {
  return (
    <View style={styles.reorderRoot}>
      <Text style={styles.reorderHelp}>
        Move pages up or down. Page 1 becomes the document thumbnail.
      </Text>

      <ScrollView
        contentContainerStyle={styles.reorderList}
        showsVerticalScrollIndicator={false}
      >
        {pages.map((page, index) => (
          <View key={page.id} style={styles.reorderRow}>
            <Image
              source={{ uri: page.imageUri }}
              style={styles.reorderThumb}
              resizeMode="cover"
            />
            <View style={styles.reorderIndexWrap}>
              <Text style={styles.reorderIndex}>{index + 1}</Text>
            </View>
            <View style={styles.reorderSpacer} />
            <Pressable
              onPress={() => onMove(index, -1)}
              disabled={index === 0 || busy}
              style={[styles.reorderArrow, index === 0 && { opacity: 0.3 }]}
              accessibilityRole="button"
              accessibilityLabel={`Move page ${index + 1} up`}
            >
              <ChevronUp size={20} color={theme.colors.text} />
            </Pressable>
            <Pressable
              onPress={() => onMove(index, 1)}
              disabled={index === pages.length - 1 || busy}
              style={[
                styles.reorderArrow,
                index === pages.length - 1 && { opacity: 0.3 },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Move page ${index + 1} down`}
            >
              <ChevronDown size={20} color={theme.colors.text} />
            </Pressable>
          </View>
        ))}
      </ScrollView>

      <View style={styles.reorderFooter}>
        <Pressable
          style={[styles.footerButton, styles.footerButtonGhost]}
          onPress={onCancel}
          disabled={busy}
          accessibilityRole="button"
        >
          <Text style={styles.footerButtonGhostText}>Cancel</Text>
        </Pressable>
        <Pressable
          style={[styles.footerButton, styles.footerButtonPrimary]}
          onPress={onCommit}
          disabled={busy}
          accessibilityRole="button"
        >
          <Text style={styles.footerButtonPrimaryText}>Save order</Text>
        </Pressable>
      </View>
    </View>
  );
}

function RenameModal({
  visible,
  initialValue,
  onCancel,
  onSubmit,
}: {
  visible: boolean;
  initialValue: string;
  onCancel: () => void;
  onSubmit: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);

  // Reset the input whenever the modal is opened for a (possibly new) doc.
  const lastInitialRef = useRef(initialValue);
  if (visible && lastInitialRef.current !== initialValue) {
    lastInitialRef.current = initialValue;
    setValue(initialValue);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.modalBackdrop}
      >
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Rename document</Text>
            <Pressable
              onPress={onCancel}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={styles.modalClose}
            >
              <X size={18} color={theme.colors.muted} />
            </Pressable>
          </View>
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder="Document title"
            placeholderTextColor={theme.colors.muted}
            style={styles.modalInput}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => onSubmit(value)}
            maxLength={120}
          />
          <View style={styles.modalActions}>
            <Pressable
              style={[styles.footerButton, styles.footerButtonGhost]}
              onPress={onCancel}
              accessibilityRole="button"
            >
              <Text style={styles.footerButtonGhostText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.footerButton, styles.footerButtonPrimary]}
              onPress={() => onSubmit(value)}
              accessibilityRole="button"
            >
              <Text style={styles.footerButtonPrimaryText}>Save</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function TagRow({
  tags,
  onAdd,
  onRemove,
}: {
  tags: ScanTag[];
  onAdd: () => void;
  onRemove: (tagId: string) => void;
}) {
  return (
    <View style={styles.tagRow}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tagRowContent}
        keyboardShouldPersistTaps="handled"
      >
        {tags.map((tag) => (
          <View key={tag.id} style={styles.tagChip}>
            <Text style={styles.tagChipText} numberOfLines={1}>
              #{tag.name}
            </Text>
            <Pressable
              onPress={() => onRemove(tag.id)}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityLabel={`Remove tag ${tag.name}`}
            >
              <X size={12} color={theme.colors.muted} />
            </Pressable>
          </View>
        ))}

        <Pressable
          onPress={onAdd}
          style={styles.tagAddChip}
          accessibilityRole="button"
          accessibilityLabel="Add tag"
        >
          {tags.length === 0 ? (
            <TagIcon size={13} color={theme.colors.accent} />
          ) : (
            <Plus size={13} color={theme.colors.accent} />
          )}
          <Text style={styles.tagAddChipText}>
            {tags.length === 0 ? "Add tags" : "Add"}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

// ---- Styles ---------------------------------------------------------------

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 10,
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
  titleBlock: { flex: 1, alignItems: "center", gap: 4 },
  titleText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "600",
    maxWidth: "100%",
  },
  titleMeta: { flexDirection: "row", alignItems: "center", gap: 5 },
  titleMetaText: { color: theme.colors.muted, fontSize: 11 },

  carouselWrap: { flex: 1, justifyContent: "center" },
  pageSlide: {
    width: SCREEN_WIDTH,
    paddingHorizontal: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  pageImage: {
    width: SCREEN_WIDTH - 44,
    height: "92%",
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.elevated,
  },

  pageIndicatorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    marginTop: 6,
  },
  pageIndicator: {
    color: theme.colors.muted,
    fontSize: 13,
    fontVariant: ["tabular-nums"],
  },
  reorderButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  reorderButtonText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: "500",
  },

  actionBar: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 8,
  },
  actionButton: {
    flex: 1,
    minHeight: 64,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  actionButtonDestructive: {
    borderColor: "rgba(240,113,120,0.35)",
  },
  actionButtonLabel: {
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: "500",
  },

  busyOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(11,13,18,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.elevated,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  emptyTitle: { color: theme.colors.text, fontSize: 16, fontWeight: "600" },
  emptyBody: {
    color: theme.colors.muted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 280,
  },
  secondaryButton: {
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  secondaryButtonText: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: "500",
  },

  // Reorder mode
  reorderRoot: { flex: 1, paddingHorizontal: 22, paddingTop: 6 },
  reorderHelp: {
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  reorderList: { gap: 10, paddingBottom: 20 },
  reorderRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    gap: 10,
  },
  reorderThumb: {
    width: 44,
    height: 58,
    borderRadius: 6,
    backgroundColor: theme.colors.elevated,
  },
  reorderIndexWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.colors.elevated,
    alignItems: "center",
    justifyContent: "center",
  },
  reorderIndex: { color: theme.colors.text, fontSize: 12, fontWeight: "600" },
  reorderSpacer: { flex: 1 },
  reorderArrow: {
    width: 38,
    height: 38,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  reorderFooter: { flexDirection: "row", gap: 10, paddingVertical: 12 },

  // Buttons + modal
  footerButton: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: theme.radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  footerButtonGhost: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  footerButtonGhostText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "500",
  },
  footerButtonPrimary: { backgroundColor: theme.colors.accent },
  footerButtonPrimaryText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "600",
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 18,
    gap: 14,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: { color: theme.colors.text, fontSize: 16, fontWeight: "600" },
  modalClose: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.colors.text,
    fontSize: 15,
    backgroundColor: theme.colors.elevated,
  },
  modalActions: { flexDirection: "row", gap: 10 },
  tagRow: {
    paddingBottom: 8,
  },
  tagRowContent: {
    paddingHorizontal: 22,
    gap: 8,
    alignItems: "center",
  },
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.elevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
    maxWidth: 180,
  },
  tagChipText: { color: theme.colors.text, fontSize: 12, fontWeight: "500" },
  tagAddChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.full,
    backgroundColor: theme.colors.accentSurface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tagAddChipText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: "500",
  },
});
