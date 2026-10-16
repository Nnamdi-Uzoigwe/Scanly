import { router } from "expo-router";
import {
    ArrowLeft,
    FileText,
    Search as SearchIcon,
    X,
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { theme } from "../constants/theme";
import {
    searchDocuments,
    type ScanDocument,
} from "../database/repositories/documentRepository";

const DEBOUNCE_MS = 220;

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ScanDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Guards against out-of-order async results when the user types fast.
  const requestId = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();

    if (!trimmed) {
      setResults([]);
      setSearched(false);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const current = ++requestId.current;
    const timer = setTimeout(async () => {
      try {
        const found = await searchDocuments(trimmed);
        if (current !== requestId.current) return;
        setResults(found);
        setSearched(true);
      } catch (err) {
        if (current !== requestId.current) return;
        console.error("Search failed:", err);
        setError("Search failed. Please try again.");
        setResults([]);
        setSearched(true);
      } finally {
        if (current === requestId.current) {
          setLoading(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  function openDocument(id: string) {
    router.push({ pathname: "/document/[id]", params: { id } });
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={20} color={theme.colors.text} />
          </Pressable>

          <View style={styles.searchField}>
            <SearchIcon size={17} color={theme.colors.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search titles, tags, text"
              placeholderTextColor={theme.colors.muted}
              style={styles.searchInput}
              autoFocus
              autoCorrect={false}
              autoCapitalize="none"
              returnKeyType="search"
              accessibilityLabel="Search documents"
            />
            {query.length > 0 && (
              <Pressable
                onPress={() => setQuery("")}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                style={styles.clearButton}
              >
                <X size={16} color={theme.colors.muted} />
              </Pressable>
            )}
          </View>
        </View>

        <Body
          query={query}
          results={results}
          loading={loading}
          searched={searched}
          error={error}
          onOpen={openDocument}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Body({
  query,
  results,
  loading,
  searched,
  error,
  onOpen,
}: {
  query: string;
  results: ScanDocument[];
  loading: boolean;
  searched: boolean;
  error: string | null;
  onOpen: (id: string) => void;
}) {
  const trimmed = query.trim();

  if (!trimmed) {
    return (
      <View style={styles.center}>
        <View style={styles.emptyIconWrap}>
          <SearchIcon size={24} color={theme.colors.muted} />
        </View>
        <Text style={styles.emptyTitle}>Search your documents</Text>
        <Text style={styles.emptyBody}>
          Find a scan by its title, tags, or text recognized inside it.
        </Text>
      </View>
    );
  }

  if (loading && !searched) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>Something went wrong</Text>
        <Text style={styles.emptyBody}>{error}</Text>
      </View>
    );
  }

  if (results.length === 0) {
    return (
      <View style={styles.center}>
        <View style={styles.emptyIconWrap}>
          <FileText size={24} color={theme.colors.muted} />
        </View>
        <Text style={styles.emptyTitle}>No matches</Text>
        <Text style={styles.emptyBody}>
          Nothing matches &ldquo;{trimmed}&rdquo;. Try a different word or check
          the document title.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={results}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <Text style={styles.resultCount}>
          {results.length} {results.length === 1 ? "result" : "results"}
        </Text>
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => onOpen(item.id)}
          style={styles.row}
          accessibilityRole="button"
          accessibilityLabel={`Open ${item.title}`}
        >
          {item.thumbnailUri ? (
            <Image
              source={{ uri: item.thumbnailUri }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.thumbnail} />
          )}
          <View style={styles.rowInfo}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.rowMeta}>
              {new Date(item.updatedAt).toLocaleDateString()}
              {"  ·  "}
              {item.pageCount} {item.pageCount === 1 ? "page" : "pages"}
            </Text>
          </View>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  flex: { flex: 1 },
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
  searchField: {
    flex: 1,
    height: 42,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 14,
    paddingVertical: 0,
  },
  clearButton: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 10,
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
  emptyTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  emptyBody: {
    color: theme.colors.muted,
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    maxWidth: 300,
  },
  list: { paddingHorizontal: 16, paddingBottom: 24, gap: 10 },
  resultCount: {
    color: theme.colors.muted,
    fontSize: 12,
    marginBottom: 6,
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    gap: 12,
  },
  thumbnail: {
    width: 48,
    height: 60,
    borderRadius: 7,
    backgroundColor: theme.colors.elevated,
  },
  rowInfo: { flex: 1, gap: 6 },
  rowTitle: { color: theme.colors.text, fontSize: 14, fontWeight: "600" },
  rowMeta: { color: theme.colors.muted, fontSize: 12 },
});
