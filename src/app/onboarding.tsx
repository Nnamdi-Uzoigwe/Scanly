import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import {
    ArrowLeft,
    ArrowRight,
    Check,
    FileSearch,
    Files,
    ScanLine,
} from "lucide-react-native";
import { useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View,
    useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { theme } from "../constants/theme";

const slides = [
  {
    eyebrow: "DOCUMENT SCANNER",
    title: "Your documents,\nwithout the paper.",
    description:
      "Turn physical documents into clear digital scans using your phone's camera.",
    Icon: ScanLine,
  },
  {
    eyebrow: "MADE TO STAY ORGANIZED",
    title: "Everything in\nits right place.",
    description:
      "Keep multi-page documents together, add tags, and find important files when you need them.",
    Icon: Files,
  },
  {
    eyebrow: "MORE THAN A SCAN",
    title: "From paper to\nsearchable files.",
    description:
      "Extract text from your scans, search your library, and share documents as PDFs.",
    Icon: FileSearch,
  },
];

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { width } = useWindowDimensions();

  const slide = slides[step];
  const Illustration = slide.Icon;
  const isLast = step === slides.length - 1;

  async function finishOnboarding() {
    if (saving) return;

    setSaving(true);
    setError("");

    try {
      await AsyncStorage.setItem("scanly.onboarding.complete", "true");
      router.replace("/");
    } catch {
      setError("Couldn't save your preference. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.brand}>
            <View style={styles.brandIcon}>
              <ScanLine size={19} color={theme.colors.accent} />
            </View>
            <Text style={styles.brandName}>scanly</Text>
          </View>

          {step < slides.length - 1 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Skip onboarding"
              hitSlop={12}
              onPress={finishOnboarding}
              disabled={saving}
            >
              <Text style={styles.skip}>Skip</Text>
            </Pressable>
          )}
        </View>

        <View
          style={styles.progress}
          accessibilityLabel={`Step ${step + 1} of 3`}
        >
          {slides.map((item, index) => (
            <View
              key={item.eyebrow}
              style={[
                styles.progressSegment,
                index <= step && styles.progressActive,
              ]}
            />
          ))}
        </View>

        <View
          style={[styles.artwork, { minHeight: Math.min(width * 0.88, 340) }]}
        >
          <View style={styles.documentBack} />
          <View style={styles.documentFront}>
            <View style={styles.iconBox}>
              <Illustration
                size={46}
                color={theme.colors.accent}
                strokeWidth={1.5}
              />
            </View>

            <View style={styles.mockLineLong} />
            <View style={styles.mockLineShort} />
            <View style={styles.mockLineLong} />
            <View style={styles.mockLineMedium} />

            <View style={styles.documentFooter}>
              <View style={styles.footerDot} />
              <View style={styles.footerLine} />
              <Check size={17} color={theme.colors.accent} />
            </View>
          </View>

          <View style={styles.pageBadge}>
            <Files size={15} color={theme.colors.text} />
            <Text style={styles.pageBadgeText}>Digital documents</Text>
          </View>
        </View>

        <View style={styles.copy}>
          <Text style={styles.eyebrow}>{slide.eyebrow}</Text>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.description}>{slide.description}</Text>
        </View>

        <View style={styles.bottom}>
          {!!error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.actions}>
            {step > 0 && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Previous screen"
                style={styles.backButton}
                onPress={() => setStep((current) => current - 1)}
                disabled={saving}
              >
                <ArrowLeft size={21} color={theme.colors.text} />
              </Pressable>
            )}

            <Pressable
              accessibilityRole="button"
              style={[styles.primaryButton, saving && styles.disabled]}
              onPress={() => {
                if (isLast) {
                  void finishOnboarding();
                } else {
                  setStep((current) => current + 1);
                }
              }}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color={theme.colors.text} />
              ) : (
                <>
                  <Text style={styles.primaryText}>
                    {isLast ? "Get started" : "Continue"}
                  </Text>
                  <ArrowRight size={19} color={theme.colors.text} />
                </>
              )}
            </Pressable>
          </View>

          <Text style={styles.privacy}>
            Your documents stay on your device.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 12,
  },
  header: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  brandIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: theme.colors.accentSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    color: theme.colors.text,
    fontSize: 21,
    fontWeight: "700",
    letterSpacing: -0.8,
  },
  skip: {
    color: theme.colors.muted,
    fontSize: 14,
    paddingVertical: 10,
    paddingLeft: 12,
  },
  progress: {
    flexDirection: "row",
    gap: 7,
    marginTop: 24,
  },
  progressSegment: {
    height: 3,
    flex: 1,
    borderRadius: 3,
    backgroundColor: theme.colors.border,
  },
  progressActive: {
    backgroundColor: theme.colors.accent,
  },
  artwork: {
    flex: 1,
    maxHeight: 340,
    minHeight: 220,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
    marginBottom: 12,
  },
  documentBack: {
    position: "absolute",
    width: 192,
    height: 242,
    borderRadius: 12,
    backgroundColor: "#202535",
    borderWidth: 1,
    borderColor: "#303748",
    transform: [{ rotate: "8deg" }, { translateX: 13 }],
  },
  documentFront: {
    width: 192,
    height: 242,
    padding: 19,
    borderRadius: 12,
    backgroundColor: theme.colors.elevated,
    borderWidth: 1,
    borderColor: "#303748",
    alignItems: "flex-start",
  },
  iconBox: {
    width: 76,
    height: 76,
    alignSelf: "center",
    borderRadius: 17,
    backgroundColor: theme.colors.accentSurface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },
  mockLineLong: {
    width: "100%",
    height: 5,
    borderRadius: 4,
    backgroundColor: "#343B4A",
    marginBottom: 8,
  },
  mockLineShort: {
    width: "58%",
    height: 5,
    borderRadius: 4,
    backgroundColor: "#343B4A",
    marginBottom: 8,
  },
  mockLineMedium: {
    width: "78%",
    height: 5,
    borderRadius: 4,
    backgroundColor: "#343B4A",
  },
  documentFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: "auto",
    alignSelf: "stretch",
  },
  footerDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.accent,
  },
  footerLine: {
    flex: 1,
    height: 4,
    borderRadius: 3,
    backgroundColor: "#343B4A",
  },
  pageBadge: {
    position: "absolute",
    bottom: 15,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#202535",
    borderWidth: 1,
    borderColor: "#343B4A",
  },
  pageBadgeText: {
    color: theme.colors.text,
    fontSize: 11,
    fontWeight: "500",
  },
  copy: {
    paddingTop: 8,
  },
  eyebrow: {
    color: theme.colors.accent,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.7,
    marginBottom: 14,
  },
  title: {
    color: theme.colors.text,
    fontSize: 36,
    lineHeight: 43,
    fontWeight: "700",
    letterSpacing: -1.4,
  },
  description: {
    color: theme.colors.muted,
    fontSize: 15,
    lineHeight: 24,
    marginTop: 13,
    maxWidth: 330,
  },
  bottom: {
    marginTop: 26,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  backButton: {
    width: 54,
    height: 54,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
    flex: 1,
    height: 54,
    borderRadius: 15,
    backgroundColor: theme.colors.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  primaryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  disabled: {
    opacity: 0.65,
  },
  privacy: {
    textAlign: "center",
    color: theme.colors.muted,
    fontSize: 12,
    marginTop: 17,
  },
  error: {
    color: "#F07178",
    fontSize: 13,
    marginBottom: 12,
  },
});
