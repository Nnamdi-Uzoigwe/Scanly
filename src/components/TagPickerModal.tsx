import { Plus, X } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { theme } from "../constants/theme";
import {
    listAllTags,
    type ScanTag,
} from "../database/repositories/tagRepository";

type Props = {
  visible: boolean;
  attachedTagIds: string[];
  onClose: () => void;
  onSelect: (name: string) => void;
};

export function TagPickerModal({
  visible,
  attachedTagIds,
  onClose,
  onSelect,
}: Props) {
  const [query, setQuery] = useState("");
  const [allTags, setAllTags] = useState<ScanTag[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    setQuery("");
    setLoading(true);
    (async () => {
      try {
        const rows = await listAllTags();
        if (active) setAllTags(rows);
      } catch (error) {
        console.error("Failed to load tags:", error);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [visible]);

  const attachedSet = useMemo(() => new Set(attachedTagIds), [attachedTagIds]);

  const trimmed = query.trim();
  const lower = trimmed.toLowerCase();

  const filtered = useMemo(() => {
    const available = allTags.filter((t) => !attachedSet.has(t.id));
    if (!lower) return available;
    return available.filter((t) => t.name.toLowerCase().includes(lower));
  }, [allTags, attachedSet, lower]);

  const hasExactMatch = allTags.some((t) => t.name.toLowerCase() === lower);
  const canCreate = trimmed.length > 0 && !hasExactMatch;

  function handleSelect(name: string) {
    onSelect(name);
    onClose();
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.backdrop}
      >
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Add tag</Text>
            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <X size={18} color={theme.colors.muted} />
            </Pressable>
          </View>

          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search or create a tag"
            placeholderTextColor={theme.colors.muted}
            style={styles.input}
            autoFocus
            autoCorrect={false}
            autoCapitalize="none"
            maxLength={40}
            returnKeyType="done"
            onSubmitEditing={() => {
              if (canCreate) handleSelect(trimmed);
              else if (filtered.length === 1) handleSelect(filtered[0].name);
            }}
          />

          {canCreate && (
            <Pressable
              style={styles.createRow}
              onPress={() => handleSelect(trimmed)}
              accessibilityRole="button"
              accessibilityLabel={`Create tag ${trimmed}`}
            >
              <View style={styles.createIcon}>
                <Plus size={14} color={theme.colors.accent} />
              </View>
              <Text style={styles.createText} numberOfLines={1}>
                Create &ldquo;{trimmed}&rdquo;
              </Text>
            </Pressable>
          )}

          {loading ? (
            <View style={styles.stateBlock}>
              <ActivityIndicator color={theme.colors.accent} />
            </View>
          ) : filtered.length === 0 && !canCreate ? (
            <View style={styles.stateBlock}>
              <Text style={styles.stateText}>
                {allTags.length === 0
                  ? "No tags yet. Type a name to create one."
                  : attachedSet.size === allTags.length
                    ? "All existing tags are already on this document."
                    : "No matching tags."}
              </Text>
            </View>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              style={styles.list}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.item}
                  onPress={() => handleSelect(item.name)}
                  accessibilityRole="button"
                  accessibilityLabel={`Add tag ${item.name}`}
                >
                  <Text style={styles.itemText} numberOfLines={1}>
                    #{item.name}
                  </Text>
                </Pressable>
              )}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 18,
    maxHeight: "70%",
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { color: theme.colors.text, fontSize: 16, fontWeight: "600" },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: theme.colors.text,
    fontSize: 14,
    backgroundColor: theme.colors.elevated,
  },
  createRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 11,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.elevated,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  createIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.accentSurface,
  },
  createText: { color: theme.colors.text, fontSize: 13, flex: 1 },
  list: { maxHeight: 260 },
  item: {
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  itemText: { color: theme.colors.text, fontSize: 14 },
  stateBlock: { paddingVertical: 22, alignItems: "center" },
  stateText: {
    color: theme.colors.muted,
    fontSize: 13,
    textAlign: "center",
    maxWidth: 260,
  },
});
